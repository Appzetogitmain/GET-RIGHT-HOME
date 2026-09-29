import mongoose from 'mongoose';

// A worker "profession" (e.g. Electrician) is a named bundle of home-service
// categories. A worker who holds a profession only receives bookings whose
// category is one of the categories bundled here.
const professionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'HomeServiceCategory' }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

professionSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export default mongoose.model('Profession', professionSchema);
