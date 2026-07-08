import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import {
  saveFcmToken,
  removeFcmToken,
  testPushNotification
} from '../controllers/fcmController.js';

const router = express.Router();

router.post('/save', protect, saveFcmToken);
router.delete('/remove', protect, removeFcmToken);
router.post('/test', protect, testPushNotification);

export default router;
