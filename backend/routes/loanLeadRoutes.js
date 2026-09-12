import express from 'express';
import { protect, optionalProtect } from '../middlewares/authMiddleware.js';
import {
  createLoanLead,
  getUserLoanLeads
} from '../controllers/loanLeadController.js';

const router = express.Router();

// Public / User loan application submission (works for both guests and logged-in users)
router.post('/', optionalProtect, createLoanLead);

// Logged-in user view their submitted loan applications
router.get('/my', protect, getUserLoanLeads);

export default router;
