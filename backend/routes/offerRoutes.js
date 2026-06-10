import express from 'express';
import { getActiveOffers, createOffer, validateOffer, getAllOffers, updateOffer, deleteOffer } from '../controllers/offerController.js';
import { protect, authorizedRoles, optionalProtect } from '../middlewares/authMiddleware.js';
import upload from '../utils/multer.js';
import { checkManagerPermission } from '../middlewares/managerPermission.js';

const router = express.Router();

router.get('/', optionalProtect, getActiveOffers);
router.post('/validate', protect, validateOffer);

// Admin Routes
router.get('/all', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('offers', 'view'), getAllOffers);
router.post('/', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('offers', 'add'), upload.single('image'), createOffer);
router.put('/:id', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('offers', 'edit'), upload.single('image'), updateOffer);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('offers', 'delete'), deleteOffer);

export default router;
