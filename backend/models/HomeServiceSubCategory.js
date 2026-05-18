import mongoose from 'mongoose';

const homeServiceSubCategorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeServiceCategory', required: true },
  imageUrl: { type: String },
  icon: { type: String },
  bannerUrl: { type: String },
  badge: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  cityIds: { type: [String], default: ['default'] },
  page: { type: Object, default: {} }
}, { timestamps: true });

export default mongoose.model('HomeServiceSubCategory', homeServiceSubCategorySchema);
