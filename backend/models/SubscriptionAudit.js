// models/SubscriptionAudit.js
//
// §11 / §13 — an append-only record of every administrative change to a
// subscription: manual assignment, extension, cancellation, plan edits.
//
// Extending an expiry date moves money-equivalent value, so it must never be a
// silent edit. Each row keeps the before and after so a dispute can be settled
// from the record rather than from memory.

import mongoose from 'mongoose';

const subscriptionAuditSchema = new mongoose.Schema({
    subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
        default: null,
        index: true,
    },

    // Also used for plan-catalogue changes, which have no subscription.
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },

    action: {
        type: String,
        enum: [
            'assigned_offline',
            'extended',
            'cancelled',
            'expired',
            'reactivated',
            'plan_created',
            'plan_updated',
            'plan_deactivated',
            'feature_created',
            'feature_updated',
            'feature_deactivated',
        ],
        required: true,
        index: true,
    },

    performedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    performedByName: { type: String, default: '' },
    performedByRole: { type: String, default: '' },

    // Only the fields that moved, not whole documents.
    before: { type: mongoose.Schema.Types.Mixed, default: {} },
    after: { type: mongoose.Schema.Types.Mixed, default: {} },

    reason: { type: String, default: '' },
}, { timestamps: true });

subscriptionAuditSchema.index({ createdAt: -1 });

/**
 * Writes an audit row without ever failing the caller.
 *
 * An audit write must not be able to roll back the action it describes — a
 * failed log is a monitoring problem, not a reason to refuse an admin's
 * extension.
 */
export const recordAudit = async (entry) => {
    try {
        return await mongoose.model('SubscriptionAudit').create(entry);
    } catch (err) {
        console.error('[SubscriptionAudit] failed to record:', err.message);
        return null;
    }
};

export default mongoose.model('SubscriptionAudit', subscriptionAuditSchema);
