import express from 'express';
import {
  getDashboardStats,
  getDashboardRevenue,
  getAllUsers,
  getAllPartners,
  getAllHotels,
  getAllBookings,
  getPropertyRequests,
  updateHotelStatus,
  getReviewStats,
  getReviewModeration,
  deleteReview,
  updateReviewStatus,
  updateUserStatus,
  updatePartnerStatus,
  deleteUser,
  deletePartner,
  getUserDetails,
  getPartnerDetails,
  updatePartnerApprovalStatus,
  getLegalPages,
  upsertLegalPage,
  getContactMessages,
  updateContactStatus,
  getPlatformSettings,
  updatePlatformSettings,
  verifyPropertyDocuments,
  getHotelDetails,
  getBookingDetails,
  updateBookingStatus,
  deleteHotel,
  updateFcmToken,
  getAdminNotifications,
  createBroadcastNotification,
  markAllAdminNotificationsRead,
  deleteAdminNotifications,
  getFinanceStats,
  getReelAnalysis,
  createAdminProperty,
  getAbandonedCarts,
  sendTargetedNotification,
  updateAdminProperty
} from '../controllers/adminController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
    adminGetAllEnquiries,
    adminUpdateEnquiry,
    adminDeleteEnquiry
} from '../controllers/enquiryController.js';
import { 
  getWorkerAnalytics,
  getWorkerWithdrawals,
  approveWorkerWithdrawal,
  rejectWorkerWithdrawal
} from '../controllers/adminWorkerController.js';
import { checkManagerPermission, requireAdminOrManager } from '../middlewares/managerPermission.js';

import builderRoutes from './builderRoutes.js';

const router = express.Router();

router.use(protect);
router.use(authorizedRoles('admin', 'superadmin', 'manager'));

router.use('/builders', builderRoutes);

// Enquiries (dedicated Enquiry collection — not Booking)
router.get('/enquiries', checkManagerPermission('enquiries', 'view'), adminGetAllEnquiries);
router.put('/enquiries/:id', checkManagerPermission('enquiries', 'edit'), adminUpdateEnquiry);
router.delete('/enquiries/:id', checkManagerPermission('enquiries', 'delete'), adminDeleteEnquiry);

// Featured Properties Management
import { 
  getAdminFeaturedProperties, 
  updateFeaturedProperty,
  getFeaturedPlans,
  createFeaturedPlan,
  updateFeaturedPlan,
  deleteFeaturedPlan 
} from '../controllers/adminPropertyController.js';

router.get('/featured-properties', checkManagerPermission('properties', 'view'), getAdminFeaturedProperties);
router.put('/featured-properties/:id', checkManagerPermission('properties', 'edit'), updateFeaturedProperty);

router.get('/featured-plans', checkManagerPermission('properties', 'view'), getFeaturedPlans);
router.post('/featured-plans', checkManagerPermission('properties', 'edit'), createFeaturedPlan);
router.put('/featured-plans/:id', checkManagerPermission('properties', 'edit'), updateFeaturedPlan);
router.delete('/featured-plans/:id', checkManagerPermission('properties', 'delete'), deleteFeaturedPlan);

// Notifications
router.get('/notifications', checkManagerPermission('notifications', 'view'), getAdminNotifications);
router.post('/notifications/send', checkManagerPermission('notifications', 'add'), createBroadcastNotification);
router.put('/notifications/read-all', checkManagerPermission('notifications', 'edit'), markAllAdminNotificationsRead);
router.delete('/notifications', checkManagerPermission('notifications', 'delete'), deleteAdminNotifications);
router.get('/abandoned-carts', checkManagerPermission('notifications', 'view'), getAbandonedCarts);
router.post('/notifications/send-targeted', checkManagerPermission('notifications', 'add'), sendTargetedNotification);

router.put('/fcm-token', requireAdminOrManager, updateFcmToken);
router.get('/dashboard-stats', checkManagerPermission('dashboard', 'view'), getDashboardStats);
router.get('/dashboard/revenue', checkManagerPermission('dashboard', 'view'), getDashboardRevenue);
router.get('/finance', checkManagerPermission('finance', 'view'), getFinanceStats);
router.get('/users', checkManagerPermission('users', 'view'), getAllUsers);
router.get('/partners', checkManagerPermission('partners', 'view'), getAllPartners);
router.get('/hotels', checkManagerPermission('properties', 'view'), getAllHotels);
router.post('/properties', checkManagerPermission('properties', 'add'), createAdminProperty);
router.put('/properties/:id', checkManagerPermission('properties', 'edit'), updateAdminProperty);
router.get('/bookings', checkManagerPermission('bookings', 'view'), getAllBookings);

router.get('/property-requests', checkManagerPermission('properties', 'view'), getPropertyRequests);
router.put('/hotel-status', checkManagerPermission('properties', 'approve'), updateHotelStatus);
router.put('/update-hotel-status', checkManagerPermission('properties', 'approve'), updateHotelStatus);
router.get('/reviews/stats', checkManagerPermission('reviews', 'view'), getReviewStats);
router.get('/reviews', checkManagerPermission('reviews', 'view'), getReviewModeration);
router.delete('/delete-review', checkManagerPermission('reviews', 'delete'), deleteReview);
router.patch('/reviews/:id/status', checkManagerPermission('reviews', 'edit'), updateReviewStatus);
router.put('/update-review-status', checkManagerPermission('reviews', 'edit'), updateReviewStatus);
router.put('/update-user-status', checkManagerPermission('users', 'edit'), updateUserStatus);
router.put('/update-partner-status', checkManagerPermission('partners', 'edit'), updatePartnerStatus);
router.put('/update-partner-approval', checkManagerPermission('partners', 'approve'), updatePartnerApprovalStatus);
router.delete('/delete-user', checkManagerPermission('users', 'delete'), deleteUser);
router.delete('/delete-partner', checkManagerPermission('partners', 'delete'), deletePartner);
router.delete('/delete-hotel', checkManagerPermission('properties', 'delete'), deleteHotel);
router.get('/user-details/:id', checkManagerPermission('users', 'view'), getUserDetails);
router.get('/partner-details/:id', checkManagerPermission('partners', 'view'), getPartnerDetails);
router.put('/verify-documents', checkManagerPermission('properties', 'approve'), verifyPropertyDocuments);
router.get('/hotel-details/:id', checkManagerPermission('properties', 'view'), getHotelDetails);
router.get('/booking-details/:id', checkManagerPermission('bookings', 'view'), getBookingDetails);
router.put('/booking-status', checkManagerPermission('bookings', 'edit'), updateBookingStatus);
router.put('/update-booking-status', checkManagerPermission('bookings', 'edit'), updateBookingStatus);
router.get('/legal-pages', checkManagerPermission('legal', 'view'), getLegalPages);
router.post('/legal-pages', checkManagerPermission('legal', 'edit'), upsertLegalPage);
router.get('/contact-messages', checkManagerPermission('contact_messages', 'view'), getContactMessages);
router.put('/contact-messages/:id/status', checkManagerPermission('contact_messages', 'edit'), updateContactStatus);
router.get('/platform-settings', checkManagerPermission('settings', 'view'), getPlatformSettings);
router.put('/platform-settings', checkManagerPermission('settings', 'edit'), updatePlatformSettings);
router.get('/reel-analysis', checkManagerPermission('reel_analysis', 'view'), getReelAnalysis);
router.get('/reports/workers', checkManagerPermission('dashboard', 'view'), getWorkerAnalytics);

// Worker Withdrawals
router.get('/worker-withdrawals', checkManagerPermission('finance', 'view'), getWorkerWithdrawals);
router.put('/worker-withdrawals/:id/approve', checkManagerPermission('finance', 'edit'), approveWorkerWithdrawal);
router.put('/worker-withdrawals/:id/reject', checkManagerPermission('finance', 'edit'), rejectWorkerWithdrawal);

export default router;
