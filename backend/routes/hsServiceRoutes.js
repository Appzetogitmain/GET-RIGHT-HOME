import express from 'express';
import { getServices, createService, updateService, deleteService } from '../controllers/homeServiceController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorizedRoles('admin', 'superadmin'), getServices);
router.post('/', protect, authorizedRoles('admin', 'superadmin'), createService);
router.put('/:id', protect, authorizedRoles('admin', 'superadmin'), updateService);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin'), deleteService);

export default router;
