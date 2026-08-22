// models/Feature.js
//
// §5 — the central Feature Catalogue.
//
// A feature is defined once and attached to any number of plans, each with its
// own value. That is what lets the business add or change a benefit without a
// code change (acceptance criteria 1 and 2).
//
// Features come in three shapes: boolean (Showcase on/off), numeric (Property
// Limit = 25) and text (Support Level = "Priority").
//
// A subset of features additionally drive behaviour in code — the ranking
// weight, the property allowance, the lead allowance and so on. Those carry a
// `key` from SYSTEM_FEATURE_KEYS and are marked `isSystem`, which stops admin
// deleting or renaming the thing the engine reads. Everything else is
// descriptive and simply renders on the plan card.

import mongoose from 'mongoose';
import { FEATURE_TYPE, FEATURE_MODE, PROFILE_TYPE } from '../utils/subscriptionConstants.js';

const featureSchema = new mongoose.Schema({
  // Stable machine name. System features use a fixed key the engine looks up;
  // admin-created ones get a slug derived from the label.
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },

  label: {
    type: String,
    required: true,
    trim: true,
  },

  description: { type: String, default: '', trim: true },

  valueType: {
    type: String,
    enum: Object.values(FEATURE_TYPE),
    required: true,
    default: FEATURE_TYPE.BOOLEAN,
  },

  // Sale, Rental, or usable in both.
  mode: {
    type: String,
    enum: Object.values(FEATURE_MODE),
    default: FEATURE_MODE.BOTH,
    index: true,
  },

  // Which profiles may have this feature. Empty means "any".
  applicableRoles: [{
    type: String,
    enum: Object.values(PROFILE_TYPE),
  }],

  // Shown on the plan card when the value is truthy. Purely presentational.
  unit: { type: String, default: '' },

  // Read by the platform itself — admin may edit the label but not the key,
  // and may not delete it.
  isSystem: { type: Boolean, default: false },

  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

featureSchema.index({ mode: 1, isActive: 1, displayOrder: 1 });

/** Turns a human label into a stable key. */
export const slugifyFeatureKey = (label) =>
  String(label || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);

/**
 * Coerces a raw admin-entered value into the feature's declared shape.
 * Keeps the entitlement snapshot free of "true"/"25" strings.
 */
featureSchema.methods.coerce = function coerce(raw) {
  switch (this.valueType) {
    case FEATURE_TYPE.BOOLEAN:
      return raw === true || raw === 'true' || raw === 1 || raw === '1';
    case FEATURE_TYPE.NUMERIC: {
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }
    default:
      return raw == null ? '' : String(raw);
  }
};

export default mongoose.model('Feature', featureSchema);
