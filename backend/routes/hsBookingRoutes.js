import express from 'express';
import {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  approveEstimate,
  addReview,
  getUserRatings
} from '../controllers/hsBookingController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { body } from 'express-validator';

const router = express.Router();

router.use(protect);

/**
 * createBooking already calls validationResult(req), but no validator chain was
 * ever registered — so that check always passed and malformed payloads fell
 * through to Mongoose, surfacing as a generic 500 ("Failed to create booking")
 * with no indication of which field was wrong.
 */
const createBookingValidators = [
  body('serviceId').notEmpty().withMessage('serviceId is required'),

  // `address` was dereferenced unguarded (address.lat), so a missing address
  // threw a TypeError and returned 500 instead of a 400.
  body('address').isObject().withMessage('address is required'),
  body('address.addressLine1').trim().notEmpty().withMessage('Address line 1 is required'),
  body('address.city').trim().notEmpty().withMessage('City is required'),
  body('address.state').trim().notEmpty().withMessage('State is required'),
  body('address.pincode').trim().notEmpty().withMessage('Pincode is required'),

  body('scheduledDate')
    .notEmpty().withMessage('scheduledDate is required')
    .bail()
    .isISO8601().withMessage('scheduledDate must be a valid date')
    .bail()
    .custom((value) => {
      // Bookings dated in the past were accepted (a 2020 date created a live
      // booking). Allow a small grace window so "book now" and clock skew
      // between client and server don't trip the check.
      const when = new Date(value);
      const graceMs = 15 * 60 * 1000;
      if (when.getTime() < Date.now() - graceMs) {
        throw new Error('scheduledDate cannot be in the past');
      }
      return true;
    }),

  // Amounts are recomputed server-side, but a negative figure signals a broken
  // or hostile client and shouldn't be quietly reinterpreted.
  body('amount').optional().isFloat({ min: 0 }).withMessage('amount cannot be negative'),
  body('basePrice').optional().isFloat({ min: 0 }).withMessage('basePrice cannot be negative'),
  body('tax').optional().isFloat({ min: 0 }).withMessage('tax cannot be negative'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('discount cannot be negative'),
  body('visitingCharges').optional().isFloat({ min: 0 }),
  body('visitationFee').optional().isFloat({ min: 0 })
];

router.post('/', createBookingValidators, createBooking);
router.get('/my', getUserBookings);
router.get('/ratings', getUserRatings);
router.get('/:id', getBookingById);
router.post('/:id/cancel', cancelBooking);
router.put('/:id/reschedule', rescheduleBooking);
router.post('/:id/approve-estimate', approveEstimate);
router.post('/:id/review', addReview);

export default router;
