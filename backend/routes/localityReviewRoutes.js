import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  createLocalityReview,
  getLocalityReviewStats,
  getLocalityReviews
} from '../controllers/localityReviewController.js';

const router = express.Router();

router.get('/stats', getLocalityReviewStats);
router.get('/', getLocalityReviews);
router.post('/', protect, createLocalityReview);

export default router;
