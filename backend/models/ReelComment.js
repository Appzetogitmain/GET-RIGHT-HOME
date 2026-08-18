import mongoose from 'mongoose';

const reelCommentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    // Null for a top-level comment; set to the parent comment's _id for a
    // reply. Replies are never nested further than one level (matches
    // Instagram/most reel UIs — a "reply to a reply" still attaches to the
    // original top-level comment).
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReelComment',
      default: null,
      index: true,
    },
    repliesCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

reelCommentSchema.index({ reel: 1, parentComment: 1, createdAt: -1 });

const ReelComment = mongoose.model('ReelComment', reelCommentSchema);
export default ReelComment;
