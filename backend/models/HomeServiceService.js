import mongoose from 'mongoose';

const homeServiceServiceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeServiceBrand', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeServiceCategory', required: true },
  imageUrl: { type: String },
  isActive: { type: Boolean, default: true },
  price: { type: Number },
  description: { type: String }
}, { timestamps: true });

export default mongoose.model('HomeServiceService', homeServiceServiceSchema);
