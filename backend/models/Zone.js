import mongoose from 'mongoose';

const zoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  area: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true,
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]], // Array of arrays of numbers [longitude, latitude]
      required: true
    }
  }
}, { timestamps: true });

// 2dsphere index allows geospatial queries like $geoIntersects
zoneSchema.index({ area: '2dsphere' });

export default mongoose.model('Zone', zoneSchema);
