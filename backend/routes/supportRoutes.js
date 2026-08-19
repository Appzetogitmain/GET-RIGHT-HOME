import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { getMyConversation, getMyMessages, sendMyMessage } from '../controllers/supportChatController.js';

const router = express.Router();

router.get('/my-conversation', protect, getMyConversation);
router.get('/messages', protect, getMyMessages);
router.post('/messages', protect, sendMyMessage);

export default router;
