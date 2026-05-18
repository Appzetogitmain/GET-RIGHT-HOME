import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
  createBooking,
  getMyBookings,
  getPartnerBookings,
  cancelBooking,
  getPartnerBookingDetail,
  markBookingAsPaid,
  markBookingNoShow,
  markCheckIn,
  markCheckOut,
  getBookingDetail,
  updateInquiryStatus,
  getReceivedBookings,
  confirmBookingByOwner,
  declineBookingByOwner
} from '../controllers/bookingController.js';

const router = express.Router();

// Property Owner (user or partner) - view bookings on their listed properties
router.get('/received', protect, authorizedRoles('user', 'partner', 'admin', 'superadmin', 'owner', 'broker'), getReceivedBookings);
router.post('/:id/confirm', protect, authorizedRoles('user', 'partner', 'admin', 'superadmin', 'owner', 'broker'), confirmBookingByOwner);
router.post('/:id/decline', protect, authorizedRoles('user', 'partner', 'admin', 'superadmin', 'owner', 'broker'), declineBookingByOwner);

// User (guest) - book & view own bookings
router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);
router.post('/:id/cancel', protect, cancelBooking);
router.get('/:id', protect, getBookingDetail);

// Partner/Admin only
router.get('/partner', protect, authorizedRoles('partner', 'admin'), getPartnerBookings);
router.get('/:id/partner-detail', protect, authorizedRoles('partner', 'admin'), getPartnerBookingDetail);
router.put('/:id/mark-paid', protect, authorizedRoles('partner', 'admin'), markBookingAsPaid);
router.put('/:id/no-show', protect, authorizedRoles('partner', 'admin'), markBookingNoShow);
router.put('/:id/check-in', protect, authorizedRoles('partner', 'admin'), markCheckIn);
router.put('/:id/check-out', protect, authorizedRoles('partner', 'admin'), markCheckOut);
router.put('/:id/inquiry-status', protect, authorizedRoles('partner', 'admin'), updateInquiryStatus);

export default router;
