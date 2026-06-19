import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
  uploadImages,
  uploadImagesBase64,
  getAddressFromCoordinates,
  searchLocation,
  calculateDistance,
  deleteImage,
  updatePartnerFcmToken
} from '../controllers/hotelController.js';
import upload from '../utils/multer.js';

const router = express.Router();

// Upload routes
router.post('/upload', protect, authorizedRoles('partner', 'admin', 'superadmin', 'user', 'owner', 'broker', 'builder'), upload.array('images', 10), uploadImages);
router.post('/upload-base64', protect, authorizedRoles('partner', 'admin', 'superadmin', 'user', 'owner', 'broker', 'builder'), uploadImagesBase64);
router.post('/delete-image', protect, authorizedRoles('partner', 'admin', 'superadmin', 'user', 'owner', 'broker', 'builder'), deleteImage);
router.post('/location/address', protect, authorizedRoles('partner', 'admin', 'superadmin', 'user', 'owner', 'broker', 'builder'), getAddressFromCoordinates);
router.get('/location/search', protect, authorizedRoles('partner', 'admin', 'superadmin', 'user', 'owner', 'broker', 'builder'), searchLocation);
router.get('/location/distance', protect, authorizedRoles('partner', 'admin', 'superadmin', 'user', 'owner', 'broker', 'builder'), calculateDistance);

// Notification Routes (Reusing userController logic as it handles 'partner' role check)
import { getNotifications, markNotificationRead, deleteNotifications, markAllNotificationsRead } from '../controllers/userController.js';

router.get('/notifications', protect, authorizedRoles('partner', 'admin'), getNotifications);
router.put('/notifications/read-all', protect, authorizedRoles('partner', 'admin'), markAllNotificationsRead);
router.put('/notifications/:id/read', protect, authorizedRoles('partner', 'admin'), markNotificationRead);
router.delete('/notifications', protect, authorizedRoles('partner', 'admin'), deleteNotifications);

// FCM Token Route - Partner Only
router.put('/fcm-token', protect, authorizedRoles('partner'), updatePartnerFcmToken);

export default router;
