import mongoose from 'mongoose';

const reelSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    videoPublicId: {
      type: String,
      default: null,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    caption: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      enum: ['PG', 'Rent', 'Buy', 'Plot', 'General'],
      default: 'General',
      index: true,
    }
  },
  { timestamps: true }
);

reelSchema.index({ createdAt: -1 });
reelSchema.index({ user: 1, createdAt: -1 });

const Reel = mongoose.model('Reel', reelSchema);
export default Reel;
