import express from 'express';
import { getServices, createService, updateService, deleteService } from '../controllers/homeServiceController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import { checkManagerPermission } from '../middlewares/managerPermission.js';

const router = express.Router();

router.get('/', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'view'), getServices);
router.post('/', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'add'), createService);
router.put('/:id', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'edit'), updateService);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('categories', 'delete'), deleteService);

export default router;
