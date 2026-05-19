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
  isBannersVisible: { type: Boolean, default: true },
  isPromosVisible: { type: Boolean, default: true },
  isCuratedVisible: { type: Boolean, default: true },
  isNoteworthyVisible: { type: Boolean, default: true },
  isBookedVisible: { type: Boolean, default: true },
  isCategorySectionsVisible: { type: Boolean, default: true },
  isCategoriesVisible: { type: Boolean, default: true },
  isReviewsVisible: { type: Boolean, default: true },
  isFaqsVisible: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('HomeContent', homeContentSchema);
