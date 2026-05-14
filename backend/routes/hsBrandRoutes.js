import express from 'express';
import { getBrands, createBrand } from '../controllers/homeServiceController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorizedRoles('admin', 'superadmin'), getBrands);
router.post('/', protect, authorizedRoles('admin', 'superadmin'), createBrand);

export default router;
