// models/Subscription.js
//
// §14 — a purchased subscription, as an independent record.
//
// This is the structural change the whole architecture depends on. Previously a
// subscription was a single block on the user document, which meant buying a
// second one overwrote the first, nothing could attach to a property, and there
// was nowhere to freeze purchased entitlements. Acceptance criteria 7, 8 and 16
// are all unreachable without this collection.

import mongoose from 'mongoose';
import {
    PROFILE_TYPE,
    SUBSCRIPTION_MODE,
    PLAN_TIER,
    SUBSCRIPTION_SCOPE,
    SUBSCRIPTION_STATUS,
    PAYMENT_TYPE,
    MS_PER_DAY,
} from '../utils/subscriptionConstants.js';

const subscriptionSchema = new mongoose.Schema({
    subscriptionId: { type: String, required: true, unique: true, index: true },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'userModel',
        index: true,
    },
    userModel: { type: String, enum: ['User', 'Partner'], default: 'User' },

    // The role at the moment of purchase. A user who later changes role keeps
    // what they legitimately bought as the profile they were.
    userRole: {
        type: String,
        enum: Object.values(PROFILE_TYPE),
        required: true,
        index: true,
    },

    mode: {
        type: String,
        enum: Object.values(SUBSCRIPTION_MODE),
        required: true,
        index: true,
    },

    scope: {
        type: String,
        enum: Object.values(SUBSCRIPTION_SCOPE),
        default: SUBSCRIPTION_SCOPE.PROPERTY,
    },

    // §8 — property-level entitlement scope. One subscription may cover several
    // listings when the plan allows it; empty for account-scoped buyer membership.
    propertyIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        index: true,
    }],

    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    planName: { type: String, default: '' },
    planTier: { type: String, enum: Object.values(PLAN_TIER), default: PLAN_TIER.BASIC },

    startDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null, index: true },

    status: {
        type: String,
        enum: Object.values(SUBSCRIPTION_STATUS),
        default: SUBSCRIPTION_STATUS.PENDING,
        index: true,
    },

    // ── Payment (§13) ────────────────────────────────────────────────────────
    paymentType: {
        type: String,
        enum: Object.values(PAYMENT_TYPE),
        default: PAYMENT_TYPE.ONLINE,
        index: true,
    },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionOrder', default: null },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    amount: { type: Number, default: 0 },

    // Offline activation details, recorded so an admin-assigned subscription is
    // as traceable as a paid one.
    offlinePayment: {
        referenceNumber: { type: String, default: '' },
        notes: { type: String, default: '' },
        collectedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    },

    // §15 — features and limits exactly as purchased. Read this, never the live
    // plan, when deciding what a subscriber may do.
    entitlementSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Consumption, metered against the snapshot.
    usage: {
        leadsUsed: { type: Number, default: 0 },
        lastResetAt: { type: Date, default: Date.now },
    },

    // Who created it: the subscriber, or an admin acting for them.
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdByAdmin: { type: Boolean, default: false },

    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' },
    expiredAt: { type: Date, default: null },

    // Which renewal reminders have been sent, so the scheduler never repeats one.
    remindersSent: [{ type: Number }],
}, { timestamps: true });

// "What does this user hold?" — the my-subscriptions screen and eligibility checks.
subscriptionSchema.index({ userId: 1, status: 1, mode: 1 });
// "Is this listing subscribed, and to what?" — the hot path in search and on cards.
subscriptionSchema.index({ propertyIds: 1, status: 1, expiryDate: 1 });
// The expiry sweep.
subscriptionSchema.index({ status: 1, expiryDate: 1 });
// Admin filtering.
subscriptionSchema.index({ mode: 1, status: 1, paymentType: 1, createdAt: -1 });

/** Active means paid-for and inside its window. */
subscriptionSchema.methods.isCurrentlyActive = function isCurrentlyActive() {
    return (
        this.status === SUBSCRIPTION_STATUS.ACTIVE &&
        this.expiryDate instanceof Date &&
        this.expiryDate > new Date()
    );
};

subscriptionSchema.virtual('daysRemaining').get(function daysRemaining() {
    if (!this.expiryDate) return 0;
    return Math.max(0, Math.ceil((this.expiryDate - new Date()) / MS_PER_DAY));
});

subscriptionSchema.set('toJSON', { virtuals: true });
subscriptionSchema.set('toObject', { virtuals: true });

export const generateSubscriptionId = () =>
    'SUB' + Date.now().toString().slice(-8) + Math.random().toString(36).slice(2, 6).toUpperCase();

export default mongoose.model('Subscription', subscriptionSchema);
