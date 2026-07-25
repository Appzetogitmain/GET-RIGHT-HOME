import express from 'express';
import { checkManagerPermission } from '../middlewares/managerPermission.js';
const router = express.Router();
import { saveInsight, getAllInsights, deleteInsight } from '../controllers/adminInsightController.js';
// Add protect and restrictTo admin middlewares later if needed, assuming admin base route handles it.

router.route('/')
    .post(checkManagerPermission('locality_insights', 'add'), saveInsight)
    .get(checkManagerPermission('locality_insights', 'view'), getAllInsights); 

router.route('/:id')
    .delete(checkManagerPermission('locality_insights', 'delete'), deleteInsight);

export default router;
