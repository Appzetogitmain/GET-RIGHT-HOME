import express from 'express';
import {
    createPlan,
    getAllPlans,
    updatePlan,
    deletePlan,
    getActivePlans,
    getCurrentSubscription,
    createSubscriptionOrder,
    verifySubscription,
    getAllTiers,
    createTier,
    updateTier,
    deleteTier
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

// Admin Tier Management
adminRouter.get('/tiers', getAllTiers);
adminRouter.post('/tiers', createTier);
adminRouter.put('/tiers/:id', updateTier);
adminRouter.delete('/tiers/:id', deleteTier);

router.use('/admin', adminRouter);

// --- USER & PARTNER ROUTES ---
const partnerRouter = express.Router();
partnerRouter.use(protect);
partnerRouter.use(authorizedRoles('partner', 'user', 'admin', 'owner', 'broker'));

partnerRouter.get('/plans', getActivePlans);
partnerRouter.get('/current', getCurrentSubscription);
partnerRouter.post('/checkout', createSubscriptionOrder);
partnerRouter.post('/verify', verifySubscription);
partnerRouter.get('/tiers', getAllTiers); // Read-only access for partners/users

router.use('/', partnerRouter);

export default router;
