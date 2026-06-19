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
import { checkManagerPermission } from '../middlewares/managerPermission.js';

const router = express.Router();

// --- ADMIN ROUTES ---
const adminRouter = express.Router();
adminRouter.use(protect);
adminRouter.use(authorizedRoles('admin', 'superadmin', 'manager'));

adminRouter.post('/create', checkManagerPermission('subscriptions', 'add'), createPlan);
adminRouter.get('/all', checkManagerPermission('subscriptions', 'view'), getAllPlans);
adminRouter.put('/:id', checkManagerPermission('subscriptions', 'edit'), updatePlan);
adminRouter.delete('/:id', checkManagerPermission('subscriptions', 'delete'), deletePlan);

// Admin Tier Management
adminRouter.get('/tiers', checkManagerPermission('subscriptions', 'view'), getAllTiers);
adminRouter.post('/tiers', checkManagerPermission('subscriptions', 'add'), createTier);
adminRouter.put('/tiers/:id', checkManagerPermission('subscriptions', 'edit'), updateTier);
adminRouter.delete('/tiers/:id', checkManagerPermission('subscriptions', 'delete'), deleteTier);

router.use('/admin', adminRouter);

// --- USER & PARTNER ROUTES ---
const partnerRouter = express.Router();
partnerRouter.use(protect);
partnerRouter.use(authorizedRoles('partner', 'user', 'admin', 'owner', 'broker', 'builder'));

partnerRouter.get('/plans', getActivePlans);
partnerRouter.get('/current', getCurrentSubscription);
partnerRouter.post('/checkout', createSubscriptionOrder);
partnerRouter.post('/verify', verifySubscription);
partnerRouter.get('/tiers', getAllTiers); // Read-only access for partners/users

router.use('/', partnerRouter);

export default router;
