import mongoose from 'mongoose';

const reelCommentLikeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReelComment',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

reelCommentLikeSchema.index({ user: 1, comment: 1 }, { unique: true });

const ReelCommentLike = mongoose.model('ReelCommentLike', reelCommentLikeSchema);
export default ReelCommentLike;
