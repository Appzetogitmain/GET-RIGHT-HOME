import express from 'express';
import {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  addReview,
  getUserRatings
} from '../controllers/hsBookingController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', createBooking);
router.get('/my', getUserBookings);
router.get('/ratings', getUserRatings);
router.get('/:id', getBookingById);
router.post('/:id/cancel', cancelBooking);
router.put('/:id/reschedule', rescheduleBooking);
router.post('/:id/review', addReview);

export default router;
