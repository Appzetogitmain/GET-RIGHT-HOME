import express from 'express';

import authRoutes from './worker-routes/auth.routes.js';
import dashboardRoutes from './worker-routes/dashboard.routes.js';
import fcmTokenRoutes from './worker-routes/fcmToken.routes.js';
import jobRoutes from './worker-routes/job.routes.js';
import profileRoutes from './worker-routes/profile.routes.js';
import subscriptionRoutes from './worker-routes/subscription.routes.js';
import walletRoutes from './worker-routes/wallet.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/', dashboardRoutes);        // exposes /api/workers/stats
router.use('/fcm-tokens', fcmTokenRoutes); // exposes /api/workers/fcm-tokens/save
router.use('/jobs', jobRoutes);
router.use('/', profileRoutes);          // exposes /api/workers/profile
router.use('/subscription', subscriptionRoutes); // exposes /api/workers/subscription/status
router.use('/wallet', walletRoutes);

export default router;
