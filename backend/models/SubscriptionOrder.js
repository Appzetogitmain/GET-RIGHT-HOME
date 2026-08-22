// models/SubscriptionOrder.js
//
// §13 — a checkout attempt, recorded before the user is sent to Razorpay.
//
// This record is what makes webhook activation possible. The webhook arrives
// with only a Razorpay order id and no session, so it needs somewhere to look up
// what was being bought, for whom, and against which properties. It is also what
// stops the browser changing the plan after payment: the plan is fixed here at
// order time and read back from here at settlement, never from the callback.

import mongoose from 'mongoose';
import {
    ORDER_STATUS,
    SUBSCRIPTION_MODE,
    PROFILE_TYPE,
} from '../utils/subscriptionConstants.js';

const subscriptionOrderSchema = new mongoose.Schema({
    orderNumber: { type: String, required: true, unique: true, index: true },

    userId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'userModel', index: true },
    userModel: { type: String, enum: ['User', 'Partner'], default: 'User' },
    userRole: { type: String, enum: Object.values(PROFILE_TYPE), required: true },

    // Fixed at order time. Settlement reads the plan from here, so a tampered
    // callback cannot swap a ₹999 payment onto a ₹4,999 plan.
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    planName: { type: String, default: '' },
    mode: { type: String, enum: Object.values(SUBSCRIPTION_MODE), required: true },

    propertyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],

    durationDays: { type: Number, default: 30 },
    amount: { type: Number, default: 0 },

    // The entitlements as they stood when the order was raised. Frozen here too,
    // because the plan could be edited between checkout and payment.
    entitlementSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },

    razorpayOrderId: { type: String, default: null, index: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },

    status: {
        type: String,
        enum: Object.values(ORDER_STATUS),
        default: ORDER_STATUS.CREATED,
        index: true,
    },

    // Which path settled it. Useful when reconciling a payment the browser never
    // reported but the webhook did.
    settledVia: { type: String, enum: ['webhook', 'client', 'admin', 'free', null], default: null },
    settledAt: { type: Date, default: null },
    failureReason: { type: String, default: '' },

    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
}, { timestamps: true });

subscriptionOrderSchema.index({ userId: 1, status: 1, createdAt: -1 });

export const generateOrderNumber = () =>
    'ORD' + Date.now().toString().slice(-8) + Math.random().toString(36).slice(2, 6).toUpperCase();

export default mongoose.model('SubscriptionOrder', subscriptionOrderSchema);
