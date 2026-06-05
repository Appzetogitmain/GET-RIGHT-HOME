import mongoose from 'mongoose';

const homeContentSchema = new mongoose.Schema({
  cityId: { type: String, required: true, unique: true },
  banners: { type: Array, default: [] },
  promos: { type: Array, default: [] },
  curated: { type: Array, default: [] },
  noteworthy: { type: Array, default: [] },
  booked: { type: Array, default: [] },
  categorySections: { type: Array, default: [] },
  reviews: { type: Array, default: [] },
  faqs: { type: Array, default: [] },
  vipCards: { type: Array, default: [] },
  isVipEnabled: { type: Boolean, default: true },
  vipPrice: { type: Number, default: 199 },
  vipOriginalPrice: { type: Number, default: 599 },
  vipDurationText: { type: String, default: "6 months" },
  vipDurationDays: { type: Number, default: 56 },
  isBannersVisible: { type: Boolean, default: true },
  isPromosVisible: { type: Boolean, default: true },
  isCuratedVisible: { type: Boolean, default: true },
  isNoteworthyVisible: { type: Boolean, default: true },
  isBookedVisible: { type: Boolean, default: true },
  isCategorySectionsVisible: { type: Boolean, default: true },
  isCategoriesVisible: { type: Boolean, default: true },
  isReviewsVisible: { type: Boolean, default: true },
  isFaqsVisible: { type: Boolean, default: true },
  isFirstBookingVisible: { type: Boolean, default: true },
  firstBookingTitle: { type: String, default: "HOME CLEANING OFFER" },
  firstBookingDiscount: { type: Number, default: 10 },
  firstBookingCaption: { type: String, default: "on first booking" },
  firstBookingCode: { type: String, default: "NEWCLEAN10" },
  firstBookingImage: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model('HomeContent', homeContentSchema);
