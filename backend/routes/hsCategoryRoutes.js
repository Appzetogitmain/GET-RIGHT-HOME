import express from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/homeServiceController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorizedRoles('admin', 'superadmin'), getCategories);
router.post('/', protect, authorizedRoles('admin', 'superadmin'), createCategory);
router.put('/:id', protect, authorizedRoles('admin', 'superadmin'), updateCategory);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin'), deleteCategory);

export default router;
