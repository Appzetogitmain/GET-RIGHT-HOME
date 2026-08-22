// routes/propertySubscriptionRoutes.js
//
// Mounted at /api/property-subscriptions.
//
// Deliberately separate from the older /api/subscriptions routes, which stay in
// place so the three existing account-level subscribers keep working while both
// systems run side by side.

import express from 'express';
import {
    getCatalog,
    getEligibleProperties,
    createCheckout,
    verifyCheckout,
    getMySubscriptions,
    getSubscriptionDetail,
    getPropertyStatus,
    getFeatureCatalog,
} from '../controllers/propertySubscriptionController.js';
import {
    listFeatures,
    createFeature,
    updateFeature,
    deleteFeature,
    listPlans,
    createPlan,
    updatePlan,
    deactivatePlan,
    listSubscriptions,
    getSummary,
    assignOfflineSubscription,
    extendSubscription,
    cancelSubscription,
    getSubscriptionAudit,
    searchAssignableUsers,
    getUserProperties,
} from '../controllers/adminSubscriptionController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import { checkManagerPermission } from '../middlewares/managerPermission.js';

const router = express.Router();

// ── Admin ────────────────────────────────────────────────────────────────────
// Declared before the subscriber routes so "/admin/..." is never swallowed by
// the "/:id" detail route below.
const admin = express.Router();
admin.use(protect);
admin.use(authorizedRoles('admin', 'superadmin', 'manager'));

admin.get('/features', checkManagerPermission('subscriptions', 'view'), listFeatures);
admin.post('/features', checkManagerPermission('subscriptions', 'add'), createFeature);
admin.put('/features/:id', checkManagerPermission('subscriptions', 'edit'), updateFeature);
admin.delete('/features/:id', checkManagerPermission('subscriptions', 'delete'), deleteFeature);

admin.get('/plans', checkManagerPermission('subscriptions', 'view'), listPlans);
admin.post('/plans', checkManagerPermission('subscriptions', 'add'), createPlan);
admin.put('/plans/:id', checkManagerPermission('subscriptions', 'edit'), updatePlan);
admin.delete('/plans/:id', checkManagerPermission('subscriptions', 'delete'), deactivatePlan);

admin.get('/summary', checkManagerPermission('subscriptions', 'view'), getSummary);
admin.get('/users', checkManagerPermission('subscriptions', 'view'), searchAssignableUsers);
admin.get('/users/:userId/properties', checkManagerPermission('subscriptions', 'view'), getUserProperties);

admin.post('/assign', checkManagerPermission('subscriptions', 'add'), assignOfflineSubscription);
admin.patch('/:id/extend', checkManagerPermission('subscriptions', 'edit'), extendSubscription);
admin.patch('/:id/cancel', checkManagerPermission('subscriptions', 'edit'), cancelSubscription);
admin.get('/:id/audit', checkManagerPermission('subscriptions', 'view'), getSubscriptionAudit);

// The bare list must come last so it does not shadow the specific paths above.
admin.get('/', checkManagerPermission('subscriptions', 'view'), listSubscriptions);

router.use('/admin', admin);

// ── Subscriber ───────────────────────────────────────────────────────────────
router.use(protect);

router.get('/features', getFeatureCatalog);
router.get('/catalog', getCatalog);
router.get('/properties', getEligibleProperties);
router.get('/mine', getMySubscriptions);
router.get('/property/:propertyId/status', getPropertyStatus);

router.post('/checkout', createCheckout);
router.post('/verify', verifyCheckout);

// Keep the catch-all id route at the bottom.
router.get('/:id', getSubscriptionDetail);

export default router;
