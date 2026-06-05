import mongoose from 'mongoose';

const subscriptionTierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    key: {
        type: String,
        required: true,
        trim: true,
        unique: true
    }
}, { timestamps: true });

const SubscriptionTier = mongoose.model('SubscriptionTier', subscriptionTierSchema);
export default SubscriptionTier;
