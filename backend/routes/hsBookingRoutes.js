import express from 'express';
import { createBooking } from '../controllers/hsBookingController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createBooking);

export default router;
