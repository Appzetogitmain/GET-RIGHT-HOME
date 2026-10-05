import mongoose from 'mongoose';

const rateSchema = new mongoose.Schema({
  baseCharge: { type: Number, default: 0, min: 0 },     // fixed part of every move
  perUnitRate: { type: Number, default: 0, min: 0 },    // rupees per inventory unit
  perKmRate: { type: Number, default: 0, min: 0 },      // rupees per km beyond freeKm
  freeKm: { type: Number, default: 0, min: 0 },
  minCharge: { type: Number, default: 0, min: 0 },      // floor for the service charge
  noLiftCharge: { type: Number, default: 0, min: 0 },   // per end without a service lift
  defaultKm: { type: Number, default: 0, min: 0 }       // used when distance is unknown
}, { _id: false });

// A Between Cities route the admin serves, e.g. Indore <-> Bhopal. The optional
// numbers override the Between Cities rate card for just this route.
const routeSchema = new mongoose.Schema({
  fromCity: { type: String, required: true, trim: true },
  toCity: { type: String, required: true, trim: true },
  bothWays: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  baseCharge: { type: Number, default: null, min: 0 },
  perUnitRate: { type: Number, default: null, min: 0 },
  distanceKm: { type: Number, default: null, min: 0 },
  transitDays: { type: Number, default: null, min: 0 }   // typical delivery time shown to the customer
});

const addOnSchema = new mongoose.Schema({
  key: { type: String, required: true },
  group: { type: String, enum: ['care', 'extra'], default: 'extra' }, // care = pick one
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  isRecommended: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { _id: false });

const slotSchema = new mongoose.Schema({
  start: { type: String, required: true },   // "09:00"
  end: { type: String, required: true },     // "10:00"
  label: { type: String, required: true },   // "9AM-10AM"
  period: { type: String, enum: ['morning', 'afternoon'], default: 'morning' },
  isActive: { type: Boolean, default: true }
}, { _id: false });

// Everything the admin tunes for Packers & Movers: the rate card, the token the
// customer pays to confirm, add-ons, time slots and the platform's cut.
const moverSettingsSchema = new mongoose.Schema({
  type: { type: String, default: 'global', unique: true },
  isEnabled: { type: Boolean, default: true },
  rates: {
    INTRA_CITY: { type: rateSchema, default: () => ({}) },
    INTER_CITY: { type: rateSchema, default: () => ({}) }
  },
  // Within City is served inside the admin's Zone Setup zones: every active
  // zone ('all'), or only the ticked ones ('selected').
  withinCityMode: { type: String, enum: ['all', 'selected'], default: 'all' },
  withinCityZoneIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Zone' }],
  // Pickup and drop further apart than this are not a Within City move.
  maxWithinCityKm: { type: Number, default: 60, min: 1 },
  // Between Cities is served only on these routes.
  routes: { type: [routeSchema], default: [] },
  // Token (booking amount) collected online to confirm; the rest is due at unloading.
  tokenType: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
  tokenValue: { type: Number, default: 499, min: 0 },
  // null => the platform-wide commission is used
  commissionPercent: { type: Number, default: null, min: 0, max: 100 },
  addOns: { type: [addOnSchema], default: [] },
  slots: { type: [slotSchema], default: [] },
  advanceBookingDays: { type: Number, default: 30, min: 1 },
  sameDayLeadHours: { type: Number, default: 2, min: 0 }
}, { timestamps: true });

export const DEFAULT_MOVER_SETTINGS = {
  rates: {
    INTRA_CITY: { baseCharge: 1200, perUnitRate: 85, perKmRate: 25, freeKm: 5, minCharge: 2000, noLiftCharge: 300, defaultKm: 8 },
    INTER_CITY: { baseCharge: 4000, perUnitRate: 140, perKmRate: 12, freeKm: 0, minCharge: 6000, noLiftCharge: 500, defaultKm: 400 }
  },
  tokenType: 'fixed',
  tokenValue: 499,
  addOns: [
    { key: 'early_carton', group: 'extra', name: 'Early Carton Delivery', description: 'Cartons delivered a day before so you can pack at leisure', price: 500, order: 1 },
    { key: 'basic_care', group: 'care', name: 'Basic Care', description: 'Basic single-layer wrapping for scratch & dust protection. Best for sturdy items like furniture, mattresses, & large appliances', price: 449, order: 2 },
    { key: 'extra_care', group: 'care', name: 'Extra Care', description: 'Single-layer wrapping for everything, plus extra multi-layer cushioning for your fragile & electronic items - TVs, crockery, mirrors, & valuables. The balanced choice most customers pick', price: 899, isRecommended: true, order: 3 },
    { key: 'complete_care', group: 'care', name: 'Complete Care', description: 'Full multi-layer protection on every item, fragile or not. Maximum safety for high-value or long-distance moves', price: 1799, order: 4 },
    { key: 'unpacking', group: 'extra', name: 'Unpacking All The Packed Items', description: 'Professional unpacking of all packed items', price: 449, order: 5 }
  ],
  slots: [
    ['07:00', '08:00', '7AM-8AM', 'morning'], ['08:00', '09:00', '8AM-9AM', 'morning'], ['09:00', '10:00', '9AM-10AM', 'morning'],
    ['10:00', '11:00', '10AM-11AM', 'morning'], ['11:00', '12:00', '11AM-12PM', 'morning'],
    ['12:00', '13:00', '12PM-1PM', 'afternoon'], ['13:00', '14:00', '1PM-2PM', 'afternoon'], ['14:00', '15:00', '2PM-3PM', 'afternoon'],
    ['15:00', '16:00', '3PM-4PM', 'afternoon'], ['16:00', '17:00', '4PM-5PM', 'afternoon']
  ].map(([start, end, label, period]) => ({ start, end, label, period }))
};

moverSettingsSchema.statics.getSettings = async function getSettings() {
  let doc = await this.findOne({ type: 'global' });
  if (!doc) doc = await this.create({ type: 'global', ...DEFAULT_MOVER_SETTINGS });
  return doc;
};

export default mongoose.model('MoverSettings', moverSettingsSchema);
