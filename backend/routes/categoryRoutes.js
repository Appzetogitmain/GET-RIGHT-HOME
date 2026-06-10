import express from 'express';
import {
    getActiveCategories,
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories
} from '../controllers/categoryController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import { checkManagerPermission } from '../middlewares/managerPermission.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveCategories);

// Admin routes - Protected
router.get('/all', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'view'), getAllCategories);
router.post('/', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'add'), createCategory);
router.put('/reorder', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'edit'), reorderCategories);
router.put('/:id', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'edit'), updateCategory);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'delete'), deleteCategory);

export default router;
