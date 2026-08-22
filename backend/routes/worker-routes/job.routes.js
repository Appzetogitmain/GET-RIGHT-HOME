import express from 'express';
const router = express.Router();
import { body } from 'express-validator';
import { authenticate } from '../../middlewares/authMiddleware.js';
import { isWorker } from '../../middlewares/authMiddleware.js';
import {
  getAssignedJobs,
  getPendingRequests,
  getJobById,
  updateJobStatus,
  startJob,
  completeJob,
  releaseJob,
  addWorkerNotes,
  verifyVisit,
  workerReachedLocation,
  collectCash,
  respondToJob,
  getBill,
  createBill,
  initiateCashCollection,
  generateEstimate
} from '../../controllers/workerControllers/workerBookingController.js';

// Validation rules
const updateStatusValidation = [
  body('status').isIn(['in_progress', 'completed'])
    .withMessage('Invalid status')
];

const respondValidation = [
  body('status').isIn(['ACCEPTED', 'REJECTED']).withMessage('Invalid status')
];

const addNotesValidation = [
  body('notes').trim().notEmpty().withMessage('Notes are required')
];

// Routes
router.get('/', authenticate, isWorker, getAssignedJobs);
// Must come before '/:id' — otherwise Express would match "pending-requests"
// as an :id param and route it into getJobById instead.
router.get('/pending-requests', authenticate, isWorker, getPendingRequests);
router.get('/:id', authenticate, isWorker, getJobById);
router.put('/:id/respond', authenticate, isWorker, respondValidation, respondToJob);
router.put('/:id/status', authenticate, isWorker, updateStatusValidation, updateJobStatus);
router.post('/:id/start', authenticate, isWorker, startJob);
router.post('/:id/reached', authenticate, isWorker, workerReachedLocation);
router.post('/:id/visit/verify', authenticate, isWorker, verifyVisit);
router.post('/:id/complete', authenticate, isWorker, completeJob);
// Worker drops an accepted job -> booking returns for reassignment (never cancelled).
router.post('/:id/release', authenticate, isWorker, releaseJob);
router.post('/:id/payment/collect', authenticate, isWorker, collectCash);
router.post('/:id/payment/initiate-cash', authenticate, isWorker, initiateCashCollection);
router.post('/:id/notes', authenticate, isWorker, addNotesValidation, addWorkerNotes);
router.get('/:id/bill', authenticate, isWorker, getBill);
router.post('/:id/bill', authenticate, isWorker, createBill);
router.patch('/:id/estimate', authenticate, isWorker, generateEstimate);

export default router;
