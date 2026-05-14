import express from 'express';
import {
    createPlan,
    getAllPlans,
    updatePlan,
    deletePlan,
    getActivePlans,
    getCurrentSubscription,
    createSubscriptionOrder,
    verifySubscription
} from '../controllers/subscriptionController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// --- ADMIN ROUTES ---
const adminRouter = express.Router();
adminRouter.use(protect);
adminRouter.use(authorizedRoles('admin', 'superadmin'));

adminRouter.post('/create', createPlan);
adminRouter.get('/all', getAllPlans);
adminRouter.put('/:id', updatePlan);
adminRouter.delete('/:id', deletePlan);

router.use('/admin', adminRouter);

// --- PARTNER ROUTES ---
const partnerRouter = express.Router();
partnerRouter.use(protect);
partnerRouter.use(authorizedRoles('partner'));

partnerRouter.get('/plans', getActivePlans);
partnerRouter.get('/current', getCurrentSubscription);
partnerRouter.post('/checkout', createSubscriptionOrder);
partnerRouter.post('/verify', verifySubscription);

router.use('/', partnerRouter);

export default router;
