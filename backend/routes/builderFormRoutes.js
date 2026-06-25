import express from 'express';
import { 
  getBuilderTemplate, 
  saveBuilderTemplate, 
  getAvailableBuilderConfigurations,
  seedBuilderTemplatesController
} from '../controllers/builderFormController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public / User routes
router.get('/configs', getAvailableBuilderConfigurations);
router.get('/template', getBuilderTemplate);
router.get('/seed', seedBuilderTemplatesController); // Added for seeding

// Admin routes
router.post('/template', protect, authorizedRoles('admin', 'superadmin', 'manager'), saveBuilderTemplate);

export default router;
