import mongoose from 'mongoose';

const referralProgramSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    // Voucher configuration for Referrer
    rewardType: {
        type: String,
        enum: ['flat', 'percentage'],
        default: 'flat'
    },
    rewardValue: {
        type: Number,
        required: true,
        default: 200
    },
    // Backward compatibility alias for rewardValue
    rewardAmount: {
        type: Number,
        default: 200
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },
    maxDiscount: {
        type: Number,
        default: 500
    },
    validityDays: {
        type: Number,
        default: 30
    },

    // Optional Welcome Voucher configuration for Referee (Referred User)
    refereeRewardType: {
        type: String,
        enum: ['flat', 'percentage'],
        default: 'flat'
    },
    refereeRewardValue: {
        type: Number,
        default: 100
    },

    triggerType: {
        type: String,
        enum: ['first_home_service_booking', 'first_booking', 'signup'],
        default: 'first_home_service_booking'
    },
    eligibleRoles: [{
        type: String,
        enum: ['user', 'partner'],
        default: 'user'
    }],
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    maxReferralsPerUser: {
        type: Number,
        default: 100
    },
    description: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const ReferralProgram = mongoose.model('ReferralProgram', referralProgramSchema);
export default ReferralProgram;
