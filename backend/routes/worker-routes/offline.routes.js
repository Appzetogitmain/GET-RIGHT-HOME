import express from 'express';
import { authenticate, isWorker } from '../../middlewares/authMiddleware.js';
import {
  createOfflineRequest,
  getActiveOfflineRequest,
  cancelOfflineRequest
} from '../../controllers/workerControllers/workerOfflineController.js';

const router = express.Router();

router.use(authenticate);
router.use(isWorker);

router.post('/', createOfflineRequest);
router.get('/active', getActiveOfflineRequest);
router.delete('/:id', cancelOfflineRequest);

export default router;
