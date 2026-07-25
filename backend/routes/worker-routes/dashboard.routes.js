import express from 'express';
const router = express.Router();
import {  authenticate  } from '../../middlewares/authMiddleware.js';
import {  isWorker  } from '../../middlewares/authMiddleware.js';
import {  getDashboardStats, getPublicSettings  } from '../../controllers/workerControllers/workerDashboardController.js';

// Routes
router.get('/stats', authenticate, isWorker, getDashboardStats);
router.get('/public-settings', getPublicSettings);

export default router;
