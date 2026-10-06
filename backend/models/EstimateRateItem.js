import mongoose from 'mongoose';

// One line of an estimate-based category's rate card (e.g. Home Painting):
//   group "Interior Painting" > name "Bedroom (up to 150 sq ft)" > ₹5,500 per room.
// The worker picks these and enters the quantity; the price always comes from here.
const estimateRateItemSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeServiceCategory', required: true, index: true },
  group: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  unitLabel: { type: String, default: 'room', trim: true },   // room, sq ft, door, wall ...
  price: { type: Number, required: true, min: 0 },            // per unit
  minQty: { type: Number, default: 1, min: 1 },
  maxQty: { type: Number, default: 20, min: 1 },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

estimateRateItemSchema.index({ categoryId: 1, group: 1, name: 1 }, { unique: true });

export default mongoose.model('EstimateRateItem', estimateRateItemSchema);
