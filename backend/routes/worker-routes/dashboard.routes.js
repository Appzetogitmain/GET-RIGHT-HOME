import express from 'express';
const router = express.Router();
import {  authenticate  } from '../../middlewares/authMiddleware.js';
import {  isWorker  } from '../../middlewares/authMiddleware.js';
import {  getDashboardStats  } from '../../controllers/workerControllers/workerDashboardController.js';

// Routes
router.get('/stats', authenticate, isWorker, getDashboardStats);

export default router;
