import express from 'express';
import { authenticate, isWorker } from '../../middlewares/authMiddleware.js';
import { getMyAvailability, updateMyAvailability } from '../../controllers/workerControllers/workerAvailabilityController.js';

const router = express.Router();

router.use(authenticate);
router.use(isWorker);

router.get('/', getMyAvailability);
router.put('/', updateMyAvailability);

export default router;
