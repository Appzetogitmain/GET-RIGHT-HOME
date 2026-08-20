import express from 'express';
import { 
  getBuilderTemplate, 
  saveBuilderTemplate, 
  getAvailableBuilderConfigurations,
  seedBuilderTemplatesController
} from '../controllers/builderFormController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import { checkManagerPermission } from '../middlewares/managerPermission.js';

const router = express.Router();

// Public / User routes
router.get('/configs', getAvailableBuilderConfigurations);
router.get('/template', getBuilderTemplate);

// Admin routes
// NOTE: seeding drops and recreates every builder template, so it is
// admin-only. Templates also self-seed on version change via ensureSeeded(),
// so this is only needed to force a rebuild.
router.post('/seed', protect, authorizedRoles('admin', 'superadmin'), seedBuilderTemplatesController);
router.post('/template', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('property_forms', 'edit'), saveBuilderTemplate);

export default router;
