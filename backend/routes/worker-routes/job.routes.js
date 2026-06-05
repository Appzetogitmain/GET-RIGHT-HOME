import express from 'express';
const router = express.Router();
import { body } from 'express-validator';
import { authenticate } from '../../middlewares/authMiddleware.js';
import { isWorker } from '../../middlewares/authMiddleware.js';
import { 
  getAssignedJobs,
  getJobById,
  updateJobStatus,
  startJob,
  completeJob,
  addWorkerNotes,
  verifyVisit,
  workerReachedLocation,
  collectCash,
  respondToJob
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
router.get('/:id', authenticate, isWorker, getJobById);
router.put('/:id/respond', authenticate, isWorker, respondValidation, respondToJob);
router.put('/:id/status', authenticate, isWorker, updateStatusValidation, updateJobStatus);
router.post('/:id/start', authenticate, isWorker, startJob);
router.post('/:id/reached', authenticate, isWorker, workerReachedLocation);
router.post('/:id/visit/verify', authenticate, isWorker, verifyVisit);
router.post('/:id/complete', authenticate, isWorker, completeJob);
router.post('/:id/payment/collect', authenticate, isWorker, collectCash);
router.post('/:id/notes', authenticate, isWorker, addNotesValidation, addWorkerNotes);

export default router;
