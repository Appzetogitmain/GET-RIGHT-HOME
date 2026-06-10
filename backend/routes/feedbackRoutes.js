import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getMyFeedback,
  createOrUpdateFeedback,
  deleteFeedback
} from '../controllers/feedbackController.js';

const router = express.Router();

// All feedback routes are authenticated
router.use(protect);

router.get('/my', getMyFeedback);
router.post('/', createOrUpdateFeedback);
router.delete('/', deleteFeedback);

export default router;
