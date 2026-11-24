import mongoose from 'mongoose';

// Offices where an approved worker brings original documents for the offline
// (in-person) verification step. Fully managed from the admin panel.
const verificationOfficeSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Office name is required'], trim: true },
  address: { type: String, required: [true, 'Office address is required'], trim: true },
  landmark: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  state: { type: String, trim: true, default: '' },
  pincode: { type: String, trim: true, default: '' },
  // Optional pin for "Get Directions". mapUrl wins when both are set.
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  mapUrl: { type: String, trim: true, default: '' },
  contactPerson: { type: String, trim: true, default: '' },
  contactPhone: { type: String, trim: true, default: '' },
  workingHours: { type: String, trim: true, default: '' }, // e.g. "Mon–Sat, 10:00 AM – 6:00 PM"
  instructions: { type: String, trim: true, default: '' },
  // Empty = shown to workers of every zone.
  zoneIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Zone' }],
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

verificationOfficeSchema.index({ isActive: 1, sortOrder: 1 });

export default mongoose.model('VerificationOffice', verificationOfficeSchema);
