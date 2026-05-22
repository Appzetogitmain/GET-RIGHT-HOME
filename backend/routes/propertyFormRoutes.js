import express from 'express';
import { getTemplate, saveTemplate, getAvailableConfigurations, seedTemplatesController } from '../controllers/propertyFormController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public / User routes
router.get('/configs', getAvailableConfigurations);
router.get('/template', getTemplate);
router.get('/seed-templates', seedTemplatesController);

// Admin routes
router.post('/template', protect, authorizedRoles('admin'), saveTemplate);

export default router;
