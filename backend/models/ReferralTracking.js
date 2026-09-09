import mongoose from 'mongoose';

const referralTrackingSchema = new mongoose.Schema({
    referrerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'referrerModel'
    },
    referrerModel: {
        type: String,
        required: true,
        enum: ['User', 'Partner', 'Admin']
    },
    referredUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        unique: true // One user can only be referred once
    },
    referralCodeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'ReferralCode'
    },
    referralProgramId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'ReferralProgram'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled', 'rejected'],
        default: 'pending'
    },
    rewardType: {
        type: String,
        enum: ['flat', 'percentage'],
        default: 'flat'
    },
    rewardValue: {
        type: Number,
        default: 200
    },
    rewardAmount: {
        type: Number,
        default: 200
    },
    // Triggered Home Service Booking
    triggerHomeServiceBookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HomeServiceBooking',
        default: null
    },
    // Legacy property/hotel booking reference (for backward compatibility)
    triggerBookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    },
    // Vouchers issued on completion
    referrerVoucherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HomeServiceVoucher',
        default: null
    },
    refereeVoucherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HomeServiceVoucher',
        default: null
    },
    voucherCode: {
        type: String,
        default: ''
    },
    completedAt: {
        type: Date,
        default: null
    },
    ipAddress: {
        type: String,
        default: ''
    },
    deviceInfo: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Indexes for quick stats and lookup
referralTrackingSchema.index({ referrerId: 1, status: 1 });
referralTrackingSchema.index({ referredUserId: 1 });

const ReferralTracking = mongoose.model('ReferralTracking', referralTrackingSchema);
export default ReferralTracking;
