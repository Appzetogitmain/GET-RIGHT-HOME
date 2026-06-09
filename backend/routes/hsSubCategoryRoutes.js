import express from 'express';
import { getSubCategories, createSubCategory, updateSubCategory, deleteSubCategory } from '../controllers/homeServiceController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import { checkManagerPermission } from '../middlewares/managerPermission.js';

const router = express.Router();

router.get('/', getSubCategories);
router.post('/', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'add'), createSubCategory);
router.put('/:id', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'edit'), updateSubCategory);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'delete'), deleteSubCategory);

export default router;
