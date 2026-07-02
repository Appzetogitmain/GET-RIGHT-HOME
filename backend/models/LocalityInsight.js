import mongoose from 'mongoose';

const LocalityInsightSchema = new mongoose.Schema({
    locality: {
        type: String,
        required: true,
        trim: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    coverImage: {
        type: String,
        required: true
    },
    transactionType: {
        type: String,
        enum: ['buy', 'rent', 'all'],
        default: 'all'
    },
    // Curated Editorial Data (Admin only)
    pros: [{ type: String }],
    cons: [{ type: String }],
    upcomingDevelopments: [{
        title: { type: String, required: true },
        badge: { type: String } // e.g., "Major Development"
    }],
    landmarks: [{
        name: { type: String, required: true },
        distance: { type: String }, // e.g., "2 km"
        type: { type: String } // e.g., "Metro", "Mall"
    }],
    residentialZones: [{ type: String }], // e.g., neighboring sub-zones
    midSegmentLocality: { type: Boolean, default: false }, // For purple badge
    
    // Auto-aggregated or Cached Metrics (Can be updated via cron or aggregate pipeline)
    averagePricePerSqft: { type: Number },
    averageRent: { type: Number },
    yoyGrowth: { type: Number },
    description: { type: String },
    views: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('LocalityInsight', LocalityInsightSchema);
