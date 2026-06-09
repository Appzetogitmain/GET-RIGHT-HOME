import express from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory, updateCategoryOrder } from '../controllers/homeServiceController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import { checkManagerPermission } from '../middlewares/managerPermission.js';

const router = express.Router();

router.get('/', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'view'), getCategories);
router.post('/', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'add'), createCategory);
router.put('/:id', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'edit'), updateCategory);
router.patch('/:id/order', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'edit'), updateCategoryOrder);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'delete'), deleteCategory);

export default router;
