import mongoose from 'mongoose';

const homeServiceSubCategorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeServiceCategory', required: true },
  // Set when this is a nested sub-category (e.g. "Bathroom cleaning" under "Home cleaning")
  parentSubCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeServiceSubCategory', default: null },
  imageUrl: { type: String },
  icon: { type: String },
  bannerUrl: { type: String },
  badge: { type: String, default: '' },
  description: { type: String, default: '' },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: String, default: '' },
  bookingModes: [{ type: String, enum: ['instant', 'slot'] }],
  isActive: { type: Boolean, default: true },
  cityIds: { type: [String], default: ['default'] },
  page: { type: Object, default: {} }
}, { timestamps: true });

export default mongoose.model('HomeServiceSubCategory', homeServiceSubCategorySchema);
