import mongoose from 'mongoose';

// Per estimate-based category (e.g. Home Painting): how much of the estimate the
// customer pays up front once they accept it, and the platform's cut.
const estimateSettingsSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'HomeServiceCategory', required: true, unique: true },
  advanceType: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  advanceValue: { type: Number, default: 30, min: 0 },
  // null => the platform-wide commission is used
  commissionPercent: { type: Number, default: null, min: 0, max: 100 }
}, { timestamps: true });

export const DEFAULT_ESTIMATE_RULE = { advanceType: 'percent', advanceValue: 30, commissionPercent: null };

/** The saved rule for a category, or the default one (not saved until the admin edits it). */
estimateSettingsSchema.statics.getFor = async function getFor(categoryId) {
  const doc = await this.findOne({ categoryId }).lean();
  return doc || { categoryId, ...DEFAULT_ESTIMATE_RULE };
};

export default mongoose.model('EstimateSettings', estimateSettingsSchema);
