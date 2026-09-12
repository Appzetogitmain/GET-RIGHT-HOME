import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { requireAdminOrManager } from '../middlewares/managerPermission.js';
import {
  adminGetLoanLeads,
  adminUpdateLoanLead,
  adminDeleteLoanLead
} from '../controllers/loanLeadController.js';

const router = express.Router();

// Admin / Manager protected routes
router.use(protect, requireAdminOrManager);

// Get all loan leads with filters & stats
router.get('/', adminGetLoanLeads);

// Update lead status & admin notes
router.put('/:id', adminUpdateLoanLead);

// Delete lead
router.delete('/:id', adminDeleteLoanLead);

export default router;
