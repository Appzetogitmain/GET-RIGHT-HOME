import jwt from 'jsonwebtoken';

let ioInstance = null;

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'super_admin', 'manager']);

// Reads the JWT the client sent in the handshake (`auth.token`, which the
// frontend already sets) or, for cookie-based admin sessions, the `token` cookie.
const extractToken = (socket) => {
  const fromAuth = socket.handshake.auth?.token;
  if (fromAuth && fromAuth !== 'null' && fromAuth !== 'undefined') return String(fromAuth).replace(/^Bearer\s+/i, '');

  const header = socket.handshake.headers?.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);

  const cookie = socket.handshake.headers?.cookie;
  if (cookie) {
    for (const part of cookie.split(';')) {
      const idx = part.indexOf('=');
      if (idx !== -1 && part.slice(0, idx).trim() === 'token') {
        const v = part.slice(idx + 1).trim();
        if (v && v !== 'null' && v !== 'undefined') return decodeURIComponent(v);
      }
    }
  }
  return null;
};

export const initIO = (io) => {
  ioInstance = io;

  // Authenticate every connection. Unauthenticated sockets may still connect
  // (public pages), but cannot join any room or broadcast anything.
  io.use((socket, next) => {
    const token = extractToken(socket);
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.data.user = { id: String(decoded.id), role: decoded.role };
      } catch {
        // invalid/expired token → treat as anonymous
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    const me = () => socket.data.user;
    const isAdmin = () => !!me() && ADMIN_ROLES.has(me().role);
    const isSelf = (id) => !!me() && String(id) === me().id;

    // Room names that identify a specific account. They may only be joined by
    // that account (or an admin) — previously anyone could join any of them,
    // including `admin_room`, and receive other people's live notifications.
    const canJoin = (room) => {
      if (!me() || typeof room !== 'string' || !room || room.length > 100) return false;
      if (room === 'admin_room') return isAdmin();
      const m = room.match(/^(user|worker|vendor)_(.+)$/);
      if (m) return isSelf(m[2]) || isAdmin();
      // Anything else is a booking/tracking id (unguessable ObjectId). Requires login.
      return true;
    };

    const join = (room, label) => {
      if (!canJoin(room)) {
        socket.emit('room_join_denied', { room });
        return;
      }
      socket.join(room);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`${label} ${me()?.id} joined room: ${room}`);
      }
    };

    socket.on('join_tracking', (room) => join(String(room ?? ''), 'Tracking'));
    socket.on('join_worker_room', (workerId) => join(`worker_${workerId}`, 'Worker'));
    socket.on('join_user_room', (userId) => join(`user_${userId}`, 'User'));
    socket.on('join_vendor_room', (vendorId) => join(`vendor_${vendorId}`, 'Vendor'));
    socket.on('join_admin_room', () => join('admin_room', 'Admin'));

    // Location updates may only be broadcast by a logged-in socket, and only
    // into a room it is allowed to be in (never into someone's personal
    // user_/worker_/vendor_/admin room).
    socket.on('update_location', (data) => {
      if (!me() || !data || typeof data !== 'object') return;
      const room = String(data.room || data.bookingId || '');
      const location = data.location || {
        lat: data.lat,
        lng: data.lng,
        heading: data.heading
      };
      if (!room || !location.lat || !location.lng) return;
      if (!socket.rooms.has(room)) {
        if (!canJoin(room)) return;
        socket.join(room);
      }
      socket.to(room).emit('live_location_update', location);
    });
  });

  return io;
};

export const getIO = () => ioInstance;
