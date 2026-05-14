import mongoose from 'mongoose';

const homeServiceCategorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  icon: { type: String },
  imageUrl: { type: String },
  homeIconUrl: { type: String },
  homeBadge: { type: String },
  hasSaleBadge: { type: Boolean, default: false },
  homeOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false },
  showOnHome: { type: Boolean, default: true },
  cityIds: { type: [String], default: ['default'] }
}, { timestamps: true });

export default mongoose.model('HomeServiceCategory', homeServiceCategorySchema);
