import express from 'express';
import {
  getAllWorkers,
  getWorkerDetails,
  approveWorker,
  rejectWorker,
  suspendWorker,
  toggleStatus,
  deleteWorker,
  getWorkerJobs,
  getAllJobs,
  getWorkerEarnings,
  payWorker,
  getWorkerPayments
} from '../controllers/adminWorkerController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizedRoles('admin', 'superadmin'));

// Specific collection-level list endpoints (MUST be defined before /:id)
router.get('/jobs', getAllJobs);
router.get('/payments', getWorkerPayments);

// CRUD / Specific Worker details
router.get('/', getAllWorkers);
router.get('/:id', getWorkerDetails);
router.post('/:id/approve', approveWorker);
router.post('/:id/reject', rejectWorker);
router.post('/:id/suspend', suspendWorker);
router.patch('/:id/status', toggleStatus);
router.delete('/:id', deleteWorker);
router.get('/:id/jobs', getWorkerJobs);
router.get('/:id/earnings', getWorkerEarnings);
router.post('/:id/pay', payWorker);

export default router;
