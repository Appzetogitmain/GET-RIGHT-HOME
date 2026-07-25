import express from 'express';
const router = express.Router();
import {  body  } from 'express-validator';
import {  authenticate  } from '../../middlewares/authMiddleware.js';
import {  isWorker  } from '../../middlewares/authMiddleware.js';
import {  getProfile, updateProfile, updateLocation, toggleOnline, getReferrals  } from '../../controllers/workerControllers/workerProfileController.js';

// Validation rules
const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('serviceCategory').optional().trim().isLength({ max: 50 }).withMessage('Service category must be less than 50 characters'),
  body('skills').optional().isArray().withMessage('Skills must be an array')
];

// Routes
router.get('/profile', authenticate, isWorker, getProfile);
router.put('/profile', authenticate, isWorker, updateProfileValidation, updateProfile);
router.put('/profile/location', authenticate, isWorker, updateLocation);
router.post('/toggle-online', authenticate, isWorker, toggleOnline);
router.get('/referrals', authenticate, isWorker, getReferrals);

export default router;

