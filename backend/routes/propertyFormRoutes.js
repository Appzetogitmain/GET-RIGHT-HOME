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
import { checkManagerPermission } from '../middlewares/managerPermission.js';

const router = express.Router();

// Public / User routes
router.get('/configs', getAvailableConfigurations);
router.get('/template', getTemplate);
router.get('/seed-templates', seedTemplatesController);

// Admin routes
router.post('/template', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('property_forms', 'edit'), saveTemplate);
router.post('/create-combination', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('property_forms', 'add'), createTemplateCombination);
router.post('/rename-transaction-type', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('property_forms', 'edit'), renameTransactionType);
router.post('/delete-transaction-type', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('property_forms', 'delete'), deleteTransactionType);
router.post('/rename-category', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('property_forms', 'edit'), renameCategory);
router.post('/delete-category', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('property_forms', 'delete'), deleteCategory);
router.post('/rename-property-type', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('property_forms', 'edit'), renamePropertyType);
router.post('/delete-property-type', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('property_forms', 'delete'), deletePropertyType);

export default router;
