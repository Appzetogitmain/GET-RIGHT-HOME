// models/Location.js
import mongoose from 'mongoose';

/**
 * Hierarchical location model:
 *  Country → State → District → City/Area
 *
 * Each document stores its type and a reference to its parent.
 * This allows unlimited depth and full admin CRUD control.
 */
const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['country', 'state', 'district', 'city'],
    required: true,
    index: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    default: null,
    index: true
  },
  // Denormalized breadcrumb for quick reads (e.g. "India > Karnataka > Bengaluru Urban")
  breadcrumb: {
    country: { type: String, default: '' },
    state: { type: String, default: '' },
    district: { type: String, default: '' }
  },
  isActive: { type: Boolean, default: true, index: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

// Compound index for fast parent lookups
locationSchema.index({ type: 1, parentId: 1, isActive: 1 });
locationSchema.index({ type: 1, isActive: 1 });

export default mongoose.model('Location', locationSchema);
