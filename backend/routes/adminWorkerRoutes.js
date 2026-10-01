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
  getJobById,
  getWorkerEarnings,
  payWorker,
  getWorkerPayments,
  assignWorkerToBooking,
  rebroadcastBooking,
  adminCancelBooking,
  approveWorkerSkill,
  rejectWorkerSkill,
  removeWorkerSkill,
  updateWorker,
  assignWorkerPlan,
  createWorkerByAdmin
} from '../controllers/adminWorkerController.js';
import {
  getWorkerPlans
} from '../controllers/adminWorkerPlanController.js';
import {
  getZones
} from '../controllers/zoneController.js';
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
import { addHelper, removeHelper, rejectHelperRequest, getJobHelpers } from '../controllers/helperController.js';
import {
  getAvailabilityRequests,
  approveAvailabilityRequests,
  rejectAvailabilityRequest,
  revokeAvailabilityRequest
} from '../controllers/workerControllers/workerAvailabilityRequestController.js';
import {
  getProfessions,
  createProfession,
  updateProfession,
  deleteProfession
} from '../controllers/professionController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import { getWorkerAvailabilityAdmin, updateWorkerAvailabilityAdmin } from '../controllers/workerControllers/workerAvailabilityController.js';

const router = express.Router();

router.use(protect);
router.use(authorizedRoles('admin', 'superadmin'));

// Specific collection-level list endpoints (MUST be defined before /:id)
router.get('/jobs', getAllJobs);
router.get('/jobs/:id', getJobById);
router.post('/jobs/:id/assign', assignWorkerToBooking);
router.get('/jobs/:id/helpers', getJobHelpers);
router.post('/jobs/:id/helpers', addHelper);
router.delete('/jobs/:id/helpers/:workerId', removeHelper);
router.post('/jobs/:id/helper-requests/:requestId/reject', rejectHelperRequest);
router.post('/jobs/:id/rebroadcast', rebroadcastBooking);
router.post('/jobs/:id/cancel', adminCancelBooking);
router.get('/payments', getWorkerPayments);
router.get('/complaints', getAllComplaints);
router.patch('/complaints/:id/status', updateComplaintStatus);

// Profession management (profession -> home-service categories)
router.get('/professions', getProfessions);
router.post('/professions', createProfession);
router.put('/professions/:id', updateProfession);
router.delete('/professions/:id', deleteProfession);

// Worker Availability Approval
router.get('/availability-requests', getAvailabilityRequests);
router.post('/availability-requests/approve', approveAvailabilityRequests);
router.post('/availability-requests/:id/approve', approveAvailabilityRequests);
router.post('/availability-requests/:id/reject', rejectAvailabilityRequest);
router.post('/availability-requests/:id/revoke', revokeAvailabilityRequest);

// Worker Offline Request Management
router.get('/offline-requests', getAllOfflineRequests);
router.post('/offline-requests/:id/approve', approveOfflineRequest);
router.post('/offline-requests/:id/reject', rejectOfflineRequest);
router.patch('/offline-requests/:id/adjust-time', adjustOfflineRequestTime);
router.put('/offline-requests/:id/adjust-time', adjustOfflineRequestTime);

// Reference Data for Dropdowns
router.get('/zones', getZones);
router.get('/plans', getWorkerPlans);

// CRUD / Specific Worker details
router.get('/', getAllWorkers);
router.post('/', createWorkerByAdmin);
router.post('/:id/force-online', forceWorkerOnline);
router.get('/:id/availability', getWorkerAvailabilityAdmin);
router.put('/:id/availability', updateWorkerAvailabilityAdmin);
router.get('/:id', getWorkerDetails);
router.put('/:id', updateWorker);
router.patch('/:id', updateWorker);
router.post('/:id/subscription', assignWorkerPlan);
router.post('/:id/plan', assignWorkerPlan);
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
