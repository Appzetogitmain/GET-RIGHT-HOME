import express from 'express';
import { getHomeContent, updateHomeContent, getPublicHomeContent } from '../controllers/homeContentController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public
router.get('/public', getPublicHomeContent);

// Admin
router.get('/', protect, authorizedRoles('admin', 'superadmin'), getHomeContent);
router.put('/', protect, authorizedRoles('admin', 'superadmin'), updateHomeContent);

export default router;
