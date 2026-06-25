import express from 'express';
const router = express.Router();
import {  authenticate  } from '../../middlewares/authMiddleware.js';
import {  isWorker  } from '../../middlewares/authMiddleware.js';
import { 
  getWallet,
  getTransactions,
  requestPayout,
  requestWithdrawal,
  payAdminDuesInitiate,
  payAdminDuesVerify
 } from '../../controllers/workerControllers/workerWalletController.js';

// Get wallet balance
router.get('/', authenticate, isWorker, getWallet);

// Get transaction history
router.get('/transactions', authenticate, isWorker, getTransactions);

// Request payout from vendor (Legacy - for vendor bookings)
router.post('/request-payout', authenticate, isWorker, requestPayout);

// Request withdrawal from admin (Direct Worker Model)
router.post('/withdraw', authenticate, isWorker, requestWithdrawal);

// Pay Admin Dues (Cash Collection)
router.post('/dues/pay', authenticate, isWorker, payAdminDuesInitiate);
router.post('/dues/verify', authenticate, isWorker, payAdminDuesVerify);

export default router;
