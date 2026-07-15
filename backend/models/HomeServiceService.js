import mongoose from 'mongoose';

const homeServiceServiceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subheading: { type: String, default: "" },
  slug: { type: String, required: true, unique: true },
  subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeServiceSubCategory' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeServiceCategory', required: true },
  cityIds: [{ type: String, default: ['default'] }],
  imageUrl: { type: String },
  icon: { type: String },
  isActive: { type: Boolean, default: true },
  basePrice: { type: Number, default: 0 },
  discountPrice: { type: Number },
  gstPercentage: { type: Number, default: 18 },
  description: { type: String },
  isTexture: { type: Boolean, default: false },
  isIdea: { type: Boolean, default: false },
  isRecentProject: { type: Boolean, default: false },
  workerName: { type: String, default: "" },
  projectImages: [{ type: String }]
}, { timestamps: true });

export default mongoose.model('HomeServiceService', homeServiceServiceSchema);
