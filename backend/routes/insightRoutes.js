import express from 'express';
const router = express.Router();
import { getInsights, getLocalityDetail, submitLocalityReview } from '../controllers/insightController.js';
import { protect } from '../middlewares/authMiddleware.js';

// Routes
router.get('/', getInsights);
router.get('/:locality', getLocalityDetail);
router.post('/:locality/review', protect, submitLocalityReview);

export default router;
