import mongoose from 'mongoose';

const infoPageSchema = new mongoose.Schema(
  {
    audience: {
      type: String,
      enum: ['user', 'partner', 'worker'],
      required: true
    },
    slug: {
      type: String,
      enum: ['terms', 'privacy', 'about', 'contact', 'support'],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

infoPageSchema.index({ audience: 1, slug: 1 }, { unique: true });

const InfoPage = mongoose.model('InfoPage', infoPageSchema);
export default InfoPage;

