import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import { getDevStats, purgeData } from '../controllers/adminDevController.js';

const router = express.Router();

// Destructive developer tools: superadmin only.
router.use(protect);
router.use(authorizedRoles('superadmin'));

router.get('/stats', getDevStats);
router.post('/purge', purgeData);

export default router;
