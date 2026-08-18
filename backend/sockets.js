let ioInstance = null;

export const initIO = (io) => {
  ioInstance = io;
  
  io.on('connection', (socket) => {
    console.log('🔌 New Socket.io client connected:', socket.id);

    // User joins a tracking room (e.g., their booking ID or just a hotel room)
    socket.on('join_tracking', (room) => {
      socket.join(room);
      console.log(`User ${socket.id} joined tracking room: ${room}`);
    });

    // Worker joins their specific room
    socket.on('join_worker_room', (workerId) => {
      const room = `worker_${workerId}`;
      socket.join(room);
      console.log(`Worker ${workerId} joined room: ${room}`);
    });

    // User joins their specific room
    socket.on('join_user_room', (userId) => {
      const room = `user_${userId}`;
      socket.join(room);
      console.log(`User ${userId} joined room: ${room}`);
    });

    // Vendor joins their specific room
    socket.on('join_vendor_room', (vendorId) => {
      const room = `vendor_${vendorId}`;
      socket.join(room);
      console.log(`Vendor ${vendorId} joined room: ${room}`);
    });

    // Admin/superadmin joins the shared admin room — one broadcast (e.g. a
    // new property submitted for approval) reaches every admin session at
    // once, since there's no per-admin targeting needed for these alerts.
    socket.on('join_admin_room', () => {
      socket.join('admin_room');
      console.log(`Admin ${socket.id} joined room: admin_room`);
    });

    // User/Worker emits location updates
    socket.on('update_location', (data) => {
      const room = data.room || data.bookingId;
      const location = data.location || {
        lat: data.lat,
        lng: data.lng,
        heading: data.heading
      };
      if (room && location.lat && location.lng) {
        socket.to(room).emit('live_location_update', location);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => ioInstance;
