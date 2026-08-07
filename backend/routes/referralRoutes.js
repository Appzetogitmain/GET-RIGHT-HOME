import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
    getMyReferral,
    createReferralProgram,
    getActiveProgram,
    generateCustomCode,
    getAllReferralPrograms,
    updateReferralProgram,
    deleteReferralProgram,
    getReferralAdminStats
} from '../controllers/referralController.js';

const router = express.Router();

// Public / User Routes
router.get('/my-stats', protect, getMyReferral);
router.get('/program/active', getActiveProgram);

// Admin Routes
router.get('/program/all', protect, authorizedRoles('admin', 'superadmin'), getAllReferralPrograms);
router.post('/program', protect, authorizedRoles('admin', 'superadmin'), createReferralProgram);
router.put('/program/:id', protect, authorizedRoles('admin', 'superadmin'), updateReferralProgram);
router.delete('/program/:id', protect, authorizedRoles('admin', 'superadmin'), deleteReferralProgram);
router.get('/admin/stats', protect, authorizedRoles('admin', 'superadmin'), getReferralAdminStats);
router.post('/code/generate', protect, authorizedRoles('admin', 'superadmin'), generateCustomCode);

export default router;
