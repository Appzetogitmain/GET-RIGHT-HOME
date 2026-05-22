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
    videoType: {
      type: String,
      enum: ['file', 'url'],
      default: 'file',
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
    title: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    budgetRange: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Ready to move', 'Under construction'],
      default: 'Ready to move',
    },
    propertyType: {
      type: String,
      trim: true,
    },
    configurations: [
      {
        bhk: { type: String, trim: true },
        price: { type: String, trim: true }
      }
    ],
    contactNumber: {
      type: String,
      trim: true,
    },
    brochureUrl: {
      type: String,
      default: null,
    },
    shortlistedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
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
