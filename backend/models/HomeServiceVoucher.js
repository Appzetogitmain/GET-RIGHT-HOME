import mongoose from 'mongoose';

const homeServiceVoucherSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    source: {
        type: String,
        enum: ['referral', 'welcome', 'admin', 'promotional'],
        default: 'referral'
    },
    referralTrackingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReferralTracking',
        default: null
    },
    title: {
        type: String,
        default: 'Home Services Discount Voucher'
    },
    description: {
        type: String,
        default: 'Redeemable on all Home Services bookings'
    },
    discountType: {
        type: String,
        enum: ['flat', 'percentage'],
        default: 'flat'
    },
    discountValue: {
        type: Number,
        required: true,
        min: 1
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },
    maxDiscount: {
        type: Number,
        default: 500 // Cap for percentage discounts
    },
    expiresAt: {
        type: Date,
        required: true
    },
    isRedeemed: {
        type: Boolean,
        default: false,
        index: true
    },
    redeemedAt: {
        type: Date,
        default: null
    },
    redeemedBookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HomeServiceBooking',
        default: null
    }
}, { timestamps: true });

// Compound indexes for rapid lookup
homeServiceVoucherSchema.index({ userId: 1, isRedeemed: 1, expiresAt: 1 });
homeServiceVoucherSchema.index({ code: 1, isRedeemed: 1 });

const HomeServiceVoucher = mongoose.model('HomeServiceVoucher', homeServiceVoucherSchema);
export default HomeServiceVoucher;
