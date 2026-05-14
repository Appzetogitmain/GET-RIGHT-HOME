import express from 'express';
import { getServices, createService } from '../controllers/homeServiceController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorizedRoles('admin', 'superadmin'), getServices);
router.post('/', protect, authorizedRoles('admin', 'superadmin'), createService);

export default router;
