import { getFirebaseAdmin } from '../config/firebase.js';
import NotificationLog from '../models/NotificationLog.js';
import User from '../models/User.js';

export const sendNotificationToUser = async (userId, payload, userType = 'User') => {
  try {
    const admin = getFirebaseAdmin();
    if (!admin) {
      console.warn('[Firebase] Admin SDK not initialized');
      return null;
    }

    // Generate unique ID based on payload data or random
    const type = payload.data?.type || 'general';
    const relatedId = payload.data?.id || Date.now().toString();
    const notificationId = `${userId}_${type}_${relatedId}`;

    // Prevent duplicate
    const exists = await NotificationLog.findOne({ notificationId });
    if (exists) {
      console.log(`[Firebase] Duplicate notification prevented: ${notificationId}`);
      return;
    }

    let user;
    if (userType === 'Admin') {
      const Admin = (await import('../models/Admin.js')).default;
      user = await Admin.findById(userId);
    } else if (userType === 'Partner') {
      const Partner = (await import('../models/Partner.js')).default;
      user = await Partner.findById(userId);
    } else if (userType === 'Worker') {
      const Worker = (await import('../models/Worker.js')).default;
      user = await Worker.findById(userId);
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      console.warn(`[Firebase] User not found: ${userId} (${userType})`);
      return;
    }

    let tokens = [];
    if (user.fcmTokens) {
      if (Array.isArray(user.fcmTokens)) {
        tokens.push(...user.fcmTokens);
      } else {
        if (user.fcmTokens.app) tokens.push(user.fcmTokens.app);
        if (user.fcmTokens.web) tokens.push(user.fcmTokens.web);
      }
    }
    if (user.fcmTokenMobile && Array.isArray(user.fcmTokenMobile)) {
      tokens.push(...user.fcmTokenMobile);
    }
    tokens = [...new Set(tokens.filter(Boolean))];

    if (!tokens.length) {
      console.warn(`[Firebase] No FCM tokens found for user: ${userId}`);
      return;
    }

    // Convert all data values to strings
    const stringifiedData = {};
    if (payload.data) {
      for (const [key, value] of Object.entries(payload.data)) {
        if (value !== null && value !== undefined) {
          stringifiedData[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }
      }
    }
    stringifiedData.notificationId = notificationId;

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title || 'Notification',
        body: payload.body || ''
      },
      data: stringifiedData
    });

    console.log(`[Firebase] Push sent. Success: ${response.successCount}, Failures: ${response.failureCount}`);

    // Save log to prevent duplicate later
    await NotificationLog.create({
      notificationId,
      userId,
      tokens
    });

    return response;
  } catch (error) {
    console.error('[Firebase] Error sending notification:', error);
  }
};

export const sendNotificationToVendor = async (vendorId, payload) => {
  return sendNotificationToUser(vendorId, payload, 'Partner');
};

export const sendNotificationToWorker = async (workerId, payload) => {
  return sendNotificationToUser(workerId, payload, 'Worker');
};

export const sendPushNotification = async (...args) => {
  console.log('[Firebase Stub] sendPushNotification called - use sendNotificationToUser instead');
  return null;
};

export const saveFcmToken = async (...args) => {
  console.log('[Firebase Stub] saveFcmToken called - handled via API routes now');
  return null;
};

export default {
  sendNotificationToUser,
  sendNotificationToVendor,
  sendNotificationToWorker,
  sendPushNotification,
  saveFcmToken
};
