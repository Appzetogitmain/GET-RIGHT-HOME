import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    maxProperties: {
        type: Number,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    durationDays: {
        type: Number,
        required: true,
    },
    commissionPercentage: {
        type: Number,
        default: 10, // Default commission if not specified
        min: 0,
        max: 100
    },
    description: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    tier: {
        type: String,
        required: true
    },
    leadCap: {
        type: Number,
        default: 0 // 0 for unlimited
    },
    hasVerifiedTag: {
        type: Boolean,
        default: false
    },
    bannerType: {
        type: String,
        enum: ['none', 'locality', 'city'],
        default: 'none'
    },
    rankingWeight: {
        type: Number,
        default: 1 // Diamond=5, Platinum=4, Gold=3, GoldBasic=2, Silver=1
    },
    pauseDaysAllowed: {
        type: Number,
        default: 0
    },
    targetRole: {
        type: String,
        enum: ['owner', 'broker', 'builder'],
        required: true,
        default: 'owner'
    },
    // Which kind of listing this plan is for — lets admin sell a "Rent Owner"
    // plan separately from a "Buy Owner" plan for the same role. 'all' keeps
    // a plan usable across every listing type (and is the default so every
    // plan created before this field existed keeps working unchanged).
    listingType: {
        type: String,
        enum: ['all', 'rent', 'buy', 'pg', 'commercial'],
        default: 'all'
    }
}, { timestamps: true });


const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
export default SubscriptionPlan;
