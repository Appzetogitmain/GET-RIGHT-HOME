import mongoose from 'mongoose';

const homeServiceSubCategorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeServiceCategory', required: true },
  imageUrl: { type: String },
  icon: { type: String },
  isActive: { type: Boolean, default: true },
  cityId: { type: String, default: 'default' },
  page: { type: Object, default: {} }
}, { timestamps: true });

export default mongoose.model('HomeServiceSubCategory', homeServiceSubCategorySchema);
