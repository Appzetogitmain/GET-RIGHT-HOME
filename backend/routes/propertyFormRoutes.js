import express from 'express';
import { 
  getTemplate, 
  saveTemplate, 
  getAvailableConfigurations, 
  seedTemplatesController,
  createTemplateCombination,
  renameTransactionType,
  deleteTransactionType,
  renameCategory,
  deleteCategory,
  renamePropertyType,
  deletePropertyType
} from '../controllers/propertyFormController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public / User routes
router.get('/configs', getAvailableConfigurations);
router.get('/template', getTemplate);
router.get('/seed-templates', seedTemplatesController);

// Admin routes
router.post('/template', protect, authorizedRoles('admin', 'superadmin'), saveTemplate);
router.post('/create-combination', protect, authorizedRoles('admin', 'superadmin'), createTemplateCombination);
router.post('/rename-transaction-type', protect, authorizedRoles('admin', 'superadmin'), renameTransactionType);
router.post('/delete-transaction-type', protect, authorizedRoles('admin', 'superadmin'), deleteTransactionType);
router.post('/rename-category', protect, authorizedRoles('admin', 'superadmin'), renameCategory);
router.post('/delete-category', protect, authorizedRoles('admin', 'superadmin'), deleteCategory);
router.post('/rename-property-type', protect, authorizedRoles('admin', 'superadmin'), renamePropertyType);
router.post('/delete-property-type', protect, authorizedRoles('admin', 'superadmin'), deletePropertyType);

export default router;
