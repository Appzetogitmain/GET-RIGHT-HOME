import Notification from '../../models/Notification.js';
import { getIO } from '../../sockets.js';
import notificationService from '../../services/notificationService.js';

export const createNotification = async (data) => {
  try {
    const body = data.body || data.message || 'Notification';
    const title = data.title || 'New Notification';
    const recipientType = data.workerId || data.recipientType === 'worker' || data.userType === 'worker'
      ? 'worker'
      : data.vendorId || data.recipientType === 'partner' || data.recipientType === 'vendor' || data.userType === 'partner' || data.userType === 'vendor'
        ? 'partner'
        : data.recipientType === 'admin' || data.userType === 'admin'
          ? 'admin'
          : 'user';

    let recipientId = data.workerId || data.vendorId || data.userId;
    if (!recipientId && recipientType === 'admin') {
      try {
        const Admin = (await import('../../models/Admin.js')).default;
        const admin = await Admin.findOne();
        if (admin) {
          recipientId = admin._id;
        }
      } catch (adminErr) {
        console.warn('Could not find admin user for notification:', adminErr.message);
      }
    }

    if (!recipientId) {
      console.warn('[Notification] Skipping notification without a recipient');
      return null;
    }

    const userModelByType = {
      admin: 'Admin',
      partner: 'Partner',
      worker: 'Worker',
      user: 'User'
    };
    const dbData = {
      ...data,
      userId: recipientId,
      userType: recipientType,
      userModel: userModelByType[recipientType],
      title,
      body
    };

    const notification = await Notification.create(dbData);

    // Emit real-time socket notification to the relevant user/worker/vendor
    try {
      const io = getIO();
      console.log(`[Notification] io available: ${!!io}, recipientId: ${recipientId}, type: ${data.type}`);
      if (io && notification) {
        const notifObj = notification.toObject();
        const payload = {
          ...notifObj,
          bookingId: String(data.relatedId || ''),
          relatedId: String(data.relatedId || ''),
          message: notifObj.message || notifObj.body || data.message,
          title: notifObj.title || title,
        };

        const roomPrefix = recipientType === 'partner' ? 'vendor' : recipientType;
        const recipientRoom = recipientType === 'admin'
          ? 'admin_room'
          : `${roomPrefix}_${String(recipientId)}`;
        console.log(`[Socket] Emitting 'notification' to room: ${recipientRoom}`);
        io.to(recipientRoom).emit('notification', payload);
        if (recipientType === 'user') {
          io.to(recipientRoom).emit('booking_updated', {
            bookingId: String(data.relatedId || ''),
            ...payload
          });
        }
      } else {
        console.warn(`[Socket] ⚠️ io is ${io ? 'available' : 'NULL'} — cannot emit notification`);
      }
    } catch (socketErr) {
      console.error('[Socket] Failed to emit notification:', socketErr.message);
    }

    // Trigger FCM Push Notification — push-only, since the Notification
    // document was already created above. sendToUser would create a SECOND,
    // duplicate record here (see sendPushOnly's doc comment for why).
    try {
      await notificationService.sendPushOnly(
        recipientId,
        { title, body },
        data.pushData || data.data || {},
        recipientType
      );
    } catch (pushErr) {
      console.error('[FCM] Failed to send push notification:', pushErr.message);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

export const getWorkerNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      userId: req.user._id,
      userType: 'worker'
    };

    if (req.query.isRead !== undefined) {
      filter.isRead = req.query.isRead === 'true';
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

    // Format for frontend (mapping body to message)
    const formattedNotifications = notifications.map(notif => {
      const obj = notif.toObject();
      return {
        ...obj,
        id: obj._id,
        message: obj.body, // frontend expects message
        read: obj.isRead,
        time: new Date(obj.createdAt).toLocaleString()
      };
    });

    res.json({
      success: true,
      data: formattedNotifications,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        unreadCount
      }
    });
  } catch (error) {
    console.error('Get Worker Notifications Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
};

export const getUserNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      userId: req.user._id,
      userType: req.user.role === 'partner' ? 'partner' : 'user'
    };

    if (req.query.isRead !== undefined) {
      filter.isRead = req.query.isRead === 'true';
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

    const formattedNotifications = notifications.map(notif => {
      const obj = notif.toObject();
      return {
        ...obj,
        id: obj._id,
        message: obj.body, // frontend expects message
        read: obj.isRead,
        time: new Date(obj.createdAt).toLocaleString()
      };
    });

    res.json({
      success: true,
      data: formattedNotifications,
      unreadCount,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        unreadCount
      }
    });
  } catch (error) {
    console.error('Get User Notifications Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    notification.readAt = Date.now();
    await notification.save();

    const obj = notification.toObject();
    const formatted = {
      ...obj,
      id: obj._id,
      message: obj.body,
      read: obj.isRead,
      time: new Date(obj.createdAt).toLocaleString()
    };

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Mark Notification Read Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating notification' });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark All Read Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete Notification Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({
      userId: req.user._id
    });

    res.json({ success: true, message: 'All notifications deleted' });
  } catch (error) {
    console.error('Delete All Notifications Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export default {
  createNotification,
  getWorkerNotifications,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications
};
