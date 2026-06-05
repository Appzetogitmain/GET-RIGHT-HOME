// Firebase Admin - STUB (configure properly later with serviceAccountKey.json)
// All functions are no-ops so backend starts without Firebase setup

export const sendNotificationToUser = async (...args) => {
  console.log('[Firebase Stub] sendNotificationToUser called - Firebase not configured yet');
  return null;
};

export const sendNotificationToVendor = async (...args) => {
  console.log('[Firebase Stub] sendNotificationToVendor called - Firebase not configured yet');
  return null;
};

export const sendNotificationToWorker = async (...args) => {
  console.log('[Firebase Stub] sendNotificationToWorker called - Firebase not configured yet');
  return null;
};

export const sendPushNotification = async (...args) => {
  console.log('[Firebase Stub] sendPushNotification called - Firebase not configured yet');
  return null;
};

export const saveFcmToken = async (...args) => {
  console.log('[Firebase Stub] saveFcmToken called - Firebase not configured yet');
  return null;
};

export default {
  sendNotificationToUser,
  sendNotificationToVendor,
  sendNotificationToWorker,
  sendPushNotification,
  saveFcmToken
};
