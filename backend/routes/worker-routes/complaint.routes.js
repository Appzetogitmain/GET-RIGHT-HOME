import express from 'express';
import { createComplaint, getWorkerComplaints } from '../../controllers/workerComplaintController.js';
import { protect, authorizedRoles } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizedRoles('worker'));

router.post('/', createComplaint);
router.get('/', getWorkerComplaints);

export default router;
