import express from 'express';
import { getPublicPage, getPublicPlatformStatus, getFinancialSettings, getTrialSettings, getAdminContact } from '../controllers/infoController.js';

const router = express.Router();

router.get('/platform/status', getPublicPlatformStatus);
router.get('/platform/financials', getFinancialSettings);
router.get('/platform/trial-settings', getTrialSettings);
router.get('/contact', getAdminContact);
router.get('/:audience/:slug', getPublicPage);

export default router;
