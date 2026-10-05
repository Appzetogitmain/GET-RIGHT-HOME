import mongoose from 'mongoose';

// One selectable line in the Packers & Movers inventory, e.g.
//   room "bedrooms" > group "Bed" > name "Queen Size Bed - With Storage".
// `units` is the volume the item adds to the move; the admin's rate card turns
// units into rupees (see MoverSettings).
export const MOVER_ROOMS = ['bedrooms', 'living_room', 'kitchen', 'miscellaneous', 'cartons'];

const moverInventoryItemSchema = new mongoose.Schema({
  room: { type: String, enum: MOVER_ROOMS, required: true, index: true },
  group: { type: String, required: true, trim: true },   // accordion heading
  name: { type: String, required: true, trim: true },    // the variant the customer adds
  units: { type: Number, default: 1, min: 0 },
  maxQty: { type: Number, default: 20, min: 1 },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

moverInventoryItemSchema.index({ room: 1, group: 1, name: 1 }, { unique: true });

export default mongoose.model('MoverInventoryItem', moverInventoryItemSchema);
