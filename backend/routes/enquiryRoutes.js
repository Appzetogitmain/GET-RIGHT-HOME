// routes/enquiryRoutes.js
import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
    createEnquiry,
    getMyEnquiries,
    getReceivedEnquiries,
    updateEnquiryStatus
} from '../controllers/enquiryController.js';

const router = express.Router();

// ── User/Buyer routes ─────────────────────────────────────────────────────────
// Submit a new enquiry for a property
router.post('/', protect, createEnquiry);

// View enquiries I've submitted (buyer)
router.get('/my', protect, getMyEnquiries);

// ── Owner routes ──────────────────────────────────────────────────────────────
// View enquiries received on my properties (owner)
router.get('/received', protect, authorizedRoles('user', 'owner', 'broker', 'partner', 'admin', 'superadmin'), getReceivedEnquiries);

// Update status of an enquiry on my property
router.put('/:id/status', protect, authorizedRoles('user', 'owner', 'broker', 'partner', 'admin', 'superadmin'), updateEnquiryStatus);

export default router;
