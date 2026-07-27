import express from 'express';
import { getUserProfile, updateUserProfile, updateFcmToken, getNotifications, markNotificationRead, deleteNotifications, markAllNotificationsRead, getSavedPlaces, toggleSavedPlace, updateUserRole, getCheckoutData, validatePromo, getRecommendedBrokers, getBrokerProfile, syncCart } from '../controllers/userController.js';
import { createVipOrder, verifyVipPayment } from '../controllers/vipController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public Routes
router.get('/recommended-brokers', getRecommendedBrokers);
router.get('/broker/:id', getBrokerProfile);

// Protected Routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/checkout-data', protect, getCheckoutData);
router.put('/role', protect, updateUserRole);
router.put('/fcm-token', protect, updateFcmToken);
router.post('/validate-promo', protect, validatePromo);
router.post('/cart/sync', protect, syncCart);

// Wishlist Routes
router.get('/saved-places', protect, getSavedPlaces);
router.post('/saved-places/toggle', protect, toggleSavedPlace);

// Notification Routes
router.get('/notifications', protect, getNotifications);
router.put('/notifications/read-all', protect, markAllNotificationsRead); // Must be before :id
router.put('/notifications/:id/read', protect, markNotificationRead);
router.delete('/notifications', protect, deleteNotifications);

// VIP Membership Routes
router.post('/vip/purchase', protect, createVipOrder);
router.post('/vip/verify', protect, verifyVipPayment);

export default router;
