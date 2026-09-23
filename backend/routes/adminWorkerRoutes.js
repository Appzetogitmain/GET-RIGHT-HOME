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
  getWorkerPayments,
  assignWorkerToBooking,
  approveWorkerSkill,
  rejectWorkerSkill,
  removeWorkerSkill
} from '../controllers/adminWorkerController.js';
import {
  getAllComplaints,
  updateComplaintStatus
} from '../controllers/workerComplaintController.js';
import {
  getAllOfflineRequests,
  approveOfflineRequest,
  rejectOfflineRequest,
  adjustOfflineRequestTime,
  forceWorkerOnline
} from '../controllers/workerControllers/workerOfflineController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizedRoles('admin', 'superadmin'));

// Specific collection-level list endpoints (MUST be defined before /:id)
router.get('/jobs', getAllJobs);
router.post('/jobs/:id/assign', assignWorkerToBooking);
router.get('/payments', getWorkerPayments);
router.get('/complaints', getAllComplaints);
router.patch('/complaints/:id/status', updateComplaintStatus);

// Worker Offline Request Management
router.get('/offline-requests', getAllOfflineRequests);
router.post('/offline-requests/:id/approve', approveOfflineRequest);
router.post('/offline-requests/:id/reject', rejectOfflineRequest);
router.patch('/offline-requests/:id/adjust-time', adjustOfflineRequestTime);
router.put('/offline-requests/:id/adjust-time', adjustOfflineRequestTime);

// CRUD / Specific Worker details
router.get('/', getAllWorkers);
router.post('/:id/force-online', forceWorkerOnline);
router.get('/:id', getWorkerDetails);
router.post('/:id/approve', approveWorker);
router.post('/:id/reject', rejectWorker);
router.post('/:id/suspend', suspendWorker);
router.patch('/:id/status', toggleStatus);
router.delete('/:id', deleteWorker);
router.get('/:id/jobs', getWorkerJobs);
router.get('/:id/earnings', getWorkerEarnings);
router.post('/:id/pay', payWorker);

// Skill Verification Routes
router.post('/:id/skills/approve', approveWorkerSkill);
router.post('/:id/skills/reject', rejectWorkerSkill);
router.delete('/:id/skills', removeWorkerSkill);

export default router;
