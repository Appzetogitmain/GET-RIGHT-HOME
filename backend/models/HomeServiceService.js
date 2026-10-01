import mongoose from 'mongoose';

const homeServiceServiceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subheading: { type: String, default: "" },
  slug: { type: String, required: true, unique: true },
  subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeServiceSubCategory' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeServiceCategory', required: true },
  cityIds: [{ type: String, default: ['default'] }],
  // Zones this service is offered in. Empty = every zone.
  zoneIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Zone' }],
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
  projectImages: [{ type: String }],
  // Powers the "Instant Booking" section on the Home Services landing page —
  // a service flagged here shows up as an express card there instead of the
  // section being hardcoded/unmanaged.
  isInstant: { type: Boolean, default: false },
  bookingModes: [{ type: String, enum: ['instant', 'slot'] }],
  instantEtaMinutes: { type: Number, default: 30 },

  // ---- Listing details (how the service is shown to customers) ----
  // Services with the same group heading are shown together, e.g. the
  // "Furnished Apartment" heading over its Essential / Premium / Elite plans.
  groupTitle: { type: String, default: '' },
  badge: { type: String, default: '' },             // small mark after the title, e.g. ★ 💎 👑
  duration: { type: String, default: '' },          // "3 hrs 45 mins"
  rating: { type: Number, default: 0 },             // 4.75
  reviewCount: { type: String, default: '' },       // "9.6K+"
  features: [{ type: String }],                     // bullet points
  // Variants of this service (e.g. 1 BHK ... 5 BHK), each with its own price.
  // When present the customer picks one; the price comes from the option.
  options: [{
    label: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, default: 0, min: 0 },
    duration: { type: String, default: '' }
  }]
}, { timestamps: true });

export default mongoose.model('HomeServiceService', homeServiceServiceSchema);
