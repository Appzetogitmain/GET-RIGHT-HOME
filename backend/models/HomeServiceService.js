import mongoose from 'mongoose';

const homeServiceServiceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeServiceBrand', required: false },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeServiceCategory', required: true },
  cityIds: [{ type: String, default: ['default'] }],
  imageUrl: { type: String },
  icon: { type: String },
  isActive: { type: Boolean, default: true },
  basePrice: { type: Number, default: 0 },
  discountPrice: { type: Number },
  gstPercentage: { type: Number, default: 18 },
  description: { type: String }
}, { timestamps: true });

export default mongoose.model('HomeServiceService', homeServiceServiceSchema);
