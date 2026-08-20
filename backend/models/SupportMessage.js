import mongoose from 'mongoose';

const supportMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportConversation',
      required: true,
      index: true,
    },
    // Denormalized so a message can be queried straight off the user without
    // an extra hop through the conversation doc.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderType: {
      type: String,
      enum: ['user', 'admin'],
      required: true,
    },
    // Which admin actually sent it, when senderType is 'admin' — any
    // admin/superadmin can reply, so this is purely attribution (shown in
    // the thread as "Priya (Support)"), never used for access control.
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

supportMessageSchema.index({ conversationId: 1, createdAt: -1 });

const SupportMessage = mongoose.model('SupportMessage', supportMessageSchema);
export default SupportMessage;
