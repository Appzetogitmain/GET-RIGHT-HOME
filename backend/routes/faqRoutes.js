import express from 'express';
import { createFaq, getFaqs, getAllFaqsAdmin, updateFaq, deleteFaq } from '../controllers/faqController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import { checkManagerPermission } from '../middlewares/managerPermission.js';

const router = express.Router();

// Public route to fetch FAQs (e.g. /api/faqs?audience=user)
router.get('/', getFaqs);

// Admin / Manager Routes
router.get('/admin', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('faqs', 'view'), getAllFaqsAdmin);
router.post('/', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('faqs', 'add'), createFaq);
router.put('/:id', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('faqs', 'edit'), updateFaq);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin', 'manager'), checkManagerPermission('faqs', 'delete'), deleteFaq);

export default router;
