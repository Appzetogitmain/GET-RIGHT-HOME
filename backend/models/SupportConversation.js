import mongoose from 'mongoose';

/**
 * One conversation per user — the whole point of this being 1:1 with the
 * user (not one row per ticket) is that a user only ever needs a single
 * ongoing thread with "admin" as a role, not a specific admin. Any
 * admin/superadmin can read and reply to any conversation.
 */
const supportConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open',
      index: true,
    },
    subject: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    lastMessage: {
      type: String,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastSenderType: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // Denormalized counters — kept on the conversation itself so the admin
    // inbox list and the user's own unread badge are cheap reads (no
    // per-row COUNT over SupportMessage on every list render).
    unreadByAdmin: {
      type: Number,
      default: 0,
    },
    unreadByUser: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

supportConversationSchema.index({ status: 1, lastMessageAt: -1 });

const SupportConversation = mongoose.model('SupportConversation', supportConversationSchema);
export default SupportConversation;
