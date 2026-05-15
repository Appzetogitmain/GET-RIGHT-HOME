import express from 'express';
import { getSubCategories, createSubCategory, updateSubCategory, deleteSubCategory } from '../controllers/homeServiceController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getSubCategories);
router.post('/', protect, authorizedRoles('admin', 'superadmin'), createSubCategory);
router.put('/:id', protect, authorizedRoles('admin', 'superadmin'), updateSubCategory);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin'), deleteSubCategory);

export default router;
