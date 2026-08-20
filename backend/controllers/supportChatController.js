import mongoose from 'mongoose';
import SupportConversation from '../models/SupportConversation.js';
import SupportMessage from '../models/SupportMessage.js';
import User from '../models/User.js';
import { getIO } from '../sockets.js';

const MAX_MESSAGE_LENGTH = 2000;

// ---------------------------------------------------------------------
// USER SIDE
// ---------------------------------------------------------------------

/**
 * GET /api/support/my-conversation
 * Finds (or lazily creates) the single conversation this user has with
 * support. Nothing to configure on the user's end — the first message they
 * send is what actually starts the thread; this just gives the frontend
 * something to point at before that happens.
 */
export const getMyConversation = async (req, res) => {
  try {
    let conversation = await SupportConversation.findOne({ userId: req.user._id });
    if (!conversation) {
      conversation = await SupportConversation.create({ userId: req.user._id });
    }
    res.json({ success: true, conversation });
  } catch (err) {
    console.error('getMyConversation error:', err);
    res.status(500).json({ success: false, message: 'Failed to load support conversation' });
  }
};

/**
 * GET /api/support/messages?cursor=&limit=
 * Also marks every admin-sent message as read, since fetching the thread
 * IS opening it.
 */
export const getMyMessages = async (req, res) => {
  try {
    const conversation = await SupportConversation.findOne({ userId: req.user._id });
    if (!conversation) {
      return res.json({ success: true, messages: [], nextCursor: null, hasMore: false });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 50);
    const query = { conversationId: conversation._id };
    if (req.query.cursor) query._id = { $lt: new mongoose.Types.ObjectId(req.query.cursor) };

    const messages = await SupportMessage.find(query).sort({ createdAt: -1 }).limit(limit + 1).lean();
    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1]._id.toString() : null;

    if (!req.query.cursor && conversation.unreadByUser > 0) {
      await SupportMessage.updateMany(
        { conversationId: conversation._id, senderType: 'admin', isRead: false },
        { $set: { isRead: true } }
      );
      conversation.unreadByUser = 0;
      await conversation.save();
    }

    res.json({ success: true, messages: items.reverse(), nextCursor, hasMore });
  } catch (err) {
    console.error('getMyMessages error:', err);
    res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
};

/**
 * POST /api/support/messages { text }
 */
export const sendMyMessage = async (req, res) => {
  try {
    const text = (req.body.text || '').trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return res.status(400).json({ success: false, message: 'Message text is required' });

    let conversation = await SupportConversation.findOne({ userId: req.user._id });
    if (!conversation) {
      conversation = await SupportConversation.create({ userId: req.user._id });
    }

    const message = await SupportMessage.create({
      conversationId: conversation._id,
      userId: req.user._id,
      senderType: 'user',
      text,
    });

    conversation.lastMessage = text;
    conversation.lastMessageAt = message.createdAt;
    conversation.lastSenderType = 'user';
    conversation.unreadByAdmin += 1;
    // A new message from the user re-opens a conversation admin had marked
    // resolved — silently, so the user isn't blocked by a status they never
    // set themselves.
    if (conversation.status === 'resolved') conversation.status = 'open';
    await conversation.save();

    try {
      const io = getIO();
      if (io) {
        io.to('admin_room').emit('support_message', {
          conversationId: conversation._id,
          userId: req.user._id,
          userName: req.user.name,
          userPhone: req.user.phone,
          senderType: 'user',
          text,
          createdAt: message.createdAt,
        });
      }
    } catch (socketErr) {
      console.warn('Could not emit support_message to admin_room:', socketErr.message);
    }

    res.status(201).json({ success: true, message });
  } catch (err) {
    console.error('sendMyMessage error:', err);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

// ---------------------------------------------------------------------
// ADMIN SIDE
// ---------------------------------------------------------------------

/**
 * GET /api/admin/support/conversations?status=&search=&page=&limit=
 */
export const getConversations = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status && ['open', 'resolved'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    let userIdFilter = null;
    if (req.query.search) {
      const regex = new RegExp(req.query.search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
      const matchingUsers = await User.find({ $or: [{ name: regex }, { phone: regex }] }).select('_id').lean();
      userIdFilter = matchingUsers.map((u) => u._id);
      filter.userId = { $in: userIdFilter };
    }

    const total = await SupportConversation.countDocuments(filter);
    const conversations = await SupportConversation.find(filter)
      .populate('userId', 'name phone profileImage role')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalUnread = await SupportConversation.aggregate([
      { $match: { unreadByAdmin: { $gt: 0 } } },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      conversations,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      unreadConversationsCount: totalUnread[0]?.count || 0,
    });
  } catch (err) {
    console.error('getConversations error:', err);
    res.status(500).json({ success: false, message: 'Failed to load conversations' });
  }
};

/**
 * GET /api/admin/support/conversations/:userId/messages?cursor=&limit=
 */
export const getConversationMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const conversation = await SupportConversation.findOne({ userId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 50);
    const query = { conversationId: conversation._id };
    if (req.query.cursor) query._id = { $lt: new mongoose.Types.ObjectId(req.query.cursor) };

    const messages = await SupportMessage.find(query).sort({ createdAt: -1 }).limit(limit + 1).lean();
    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1]._id.toString() : null;

    if (!req.query.cursor && conversation.unreadByAdmin > 0) {
      await SupportMessage.updateMany(
        { conversationId: conversation._id, senderType: 'user', isRead: false },
        { $set: { isRead: true } }
      );
      conversation.unreadByAdmin = 0;
      await conversation.save();
    }

    res.json({ success: true, conversation, messages: items.reverse(), nextCursor, hasMore });
  } catch (err) {
    console.error('getConversationMessages error:', err);
    res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
};

/**
 * POST /api/admin/support/conversations/:userId/messages { text }
 */
export const sendAdminMessage = async (req, res) => {
  try {
    const { userId } = req.params;
    const text = (req.body.text || '').trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return res.status(400).json({ success: false, message: 'Message text is required' });

    const conversation = await SupportConversation.findOne({ userId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const message = await SupportMessage.create({
      conversationId: conversation._id,
      userId,
      senderType: 'admin',
      adminId: req.user._id,
      text,
    });

    conversation.lastMessage = text;
    conversation.lastMessageAt = message.createdAt;
    conversation.lastSenderType = 'admin';
    conversation.unreadByUser += 1;
    await conversation.save();

    try {
      const io = getIO();
      if (io) {
        const payload = {
          conversationId: conversation._id,
          userId,
          senderType: 'admin',
          adminName: req.user.name,
          text,
          createdAt: message.createdAt,
        };
        io.to(`user_${userId}`).emit('support_message', payload);
        // So a second admin's open inbox also updates live, not just the one who replied.
        io.to('admin_room').emit('support_message', payload);
      }
    } catch (socketErr) {
      console.warn('Could not emit support_message:', socketErr.message);
    }

    res.status(201).json({ success: true, message });
  } catch (err) {
    console.error('sendAdminMessage error:', err);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

/**
 * PATCH /api/admin/support/conversations/:userId/status { status }
 */
export const updateConversationStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    if (!['open', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const conversation = await SupportConversation.findOneAndUpdate(
      { userId },
      { status },
      { new: true }
    );
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.json({ success: true, conversation });
  } catch (err) {
    console.error('updateConversationStatus error:', err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};
