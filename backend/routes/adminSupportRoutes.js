import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
  getConversations,
  getConversationMessages,
  sendAdminMessage,
  updateConversationStatus,
} from '../controllers/supportChatController.js';

const router = express.Router();
const isAdmin = authorizedRoles('admin', 'superadmin');

router.get('/conversations', protect, isAdmin, getConversations);
router.get('/conversations/:userId/messages', protect, isAdmin, getConversationMessages);
router.post('/conversations/:userId/messages', protect, isAdmin, sendAdminMessage);
router.patch('/conversations/:userId/status', protect, isAdmin, updateConversationStatus);

export default router;
