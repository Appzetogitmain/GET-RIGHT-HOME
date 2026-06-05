import express from 'express';
import {
  getWorkerNotifications,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications
} from '../controllers/notificationControllers/notificationController.js';
import { protect, isWorker } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/worker', protect, isWorker, getWorkerNotifications);
router.get('/user', protect, getUserNotifications);
router.put('/:id/read', protect, markNotificationRead);
router.put('/read-all', protect, markAllNotificationsRead);
router.delete('/delete-all', protect, deleteAllNotifications);
router.delete('/:id', protect, deleteNotification);

export default router;
