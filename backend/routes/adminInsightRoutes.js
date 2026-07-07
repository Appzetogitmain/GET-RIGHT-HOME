import express from 'express';
const router = express.Router();
import { saveInsight, getAllInsights, deleteInsight } from '../controllers/adminInsightController.js';
// Add protect and restrictTo admin middlewares later if needed, assuming admin base route handles it.

router.route('/')
    .post(saveInsight)
    .get(getAllInsights);

router.route('/:id')
    .delete(deleteInsight);

export default router;
