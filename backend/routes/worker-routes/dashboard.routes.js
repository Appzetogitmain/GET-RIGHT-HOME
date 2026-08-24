import express from 'express';
const router = express.Router();
import {  authenticate  } from '../../middlewares/authMiddleware.js';
import {  isWorker  } from '../../middlewares/authMiddleware.js';
import {  getDashboardStats, getPublicSettings, sendEmergencyAlert  } from '../../controllers/workerControllers/workerDashboardController.js';

// Routes
router.get('/stats', authenticate, isWorker, getDashboardStats);
router.get('/public-settings', getPublicSettings);
router.post('/emergency', authenticate, isWorker, sendEmergencyAlert);

export default router;
