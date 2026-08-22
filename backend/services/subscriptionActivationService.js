// services/subscriptionActivationService.js
//
// Turns an order — or an admin's offline assignment — into a live subscription.
//
// Two rules govern everything here:
//
//   ONE ACTIVATION PATH. Online and offline must produce the same entitlement
//   result (§12); only the payment record differs. Both therefore go through
//   `activateSubscription`, so the two can never drift apart.
//
//   IDEMPOTENCE. The Razorpay webhook and the browser callback both settle the
//   same order, and either may arrive first, twice, or not at all. Settlement is
//   an atomic status transition on the order, so a second call is a no-op that
//   still reports success.

import mongoose from 'mongoose';
import Subscription, { generateSubscriptionId } from '../models/Subscription.js';
import SubscriptionOrder from '../models/SubscriptionOrder.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Property from '../models/Property.js';
import { recordAudit } from '../models/SubscriptionAudit.js';
import { createNotification } from '../controllers/notificationControllers/notificationController.js';
import {
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_MODE,
    SUBSCRIPTION_SCOPE,
    ORDER_STATUS,
    PAYMENT_TYPE,
    MS_PER_DAY,
} from '../utils/subscriptionConstants.js';

/**
 * Stamps the purchased entitlements onto every covered listing.
 *
 * The Subscription remains the source of truth; this is a read cache for search
 * ranking and property cards, which cannot afford a lookup per result.
 */
export const applyPromotionToProperties = async (subscription) => {
    if (!subscription.propertyIds?.length) return;

    const snap = subscription.entitlementSnapshot || {};

    await Property.updateMany(
        { _id: { $in: subscription.propertyIds } },
        {
            $set: {
                'promotion.isActive': true,
                'promotion.subscriptionId': subscription._id,
                'promotion.mode': subscription.mode,
                'promotion.planName': subscription.planName,
                'promotion.planTier': subscription.planTier,
                'promotion.weight': Number(snap.rankingWeight || 0),
                'promotion.showcase': !!snap.showcase,
                'promotion.priorityPlacement': !!snap.priorityPlacement,
                'promotion.verifiedBadge': !!snap.verifiedBadge,
                'promotion.startDate': subscription.startDate,
                'promotion.expiryDate': subscription.expiryDate,
                // Showcase plans light up the existing featured surfaces too,
                // so a paid subscription behaves like admin featuring without
                // either system having to know about the other.
                ...(snap.showcase ? { isFeatured: true } : {}),
            },
        }
    );
};

/**
 * Removes paid entitlements from a subscription's listings (§16).
 *
 * Only the promotion comes off. The listing itself stays published, and all
 * history is retained — §9 and §16 are explicit that expiry must never remove
 * inventory, leads or records.
 */
export const clearPromotionFromProperties = async (subscription) => {
    if (!subscription.propertyIds?.length) return;

    await Property.updateMany(
        { _id: { $in: subscription.propertyIds }, 'promotion.subscriptionId': subscription._id },
        {
            $set: {
                'promotion.isActive': false,
                'promotion.weight': 0,
                'promotion.showcase': false,
                'promotion.priorityPlacement': false,
                'promotion.verifiedBadge': false,
                isFeatured: false,
            },
        }
    );
};

/**
 * Creates and activates a subscription.
 *
 * The single activation path — online settlement, offline assignment and free
 * plans all land here.
 *
 * @param {object} args
 * @param {object} args.plan          the SubscriptionPlan document
 * @param {object} args.subject       { _id, role, model } of the subscriber
 * @param {Array}  args.propertyIds   listings to cover
 * @param {string} args.paymentType   online | offline
 * @param {Date}   [args.startDate]   defaults to now — the server-confirmed date (§7)
 * @param {Date}   [args.expiryDate]  overrides the plan duration (admin offline)
 */
export const activateSubscription = async ({
    plan,
    subject,
    propertyIds = [],
    paymentType = PAYMENT_TYPE.ONLINE,
    startDate,
    expiryDate,
    amount,
    order = null,
    offlinePayment = null,
    createdBy = null,
    createdByAdmin = false,
}) => {
    // §7 — validity runs from the server-confirmed activation date, never from
    // a date the client supplied.
    const start = startDate ? new Date(startDate) : new Date();
    const end = expiryDate
        ? new Date(expiryDate)
        : new Date(start.getTime() + Number(plan.durationDays || 30) * MS_PER_DAY);

    const snapshot = typeof plan.entitlementSnapshot === 'function'
        ? plan.entitlementSnapshot()
        : (order?.entitlementSnapshot || {});

    const subscription = await Subscription.create({
        subscriptionId: generateSubscriptionId(),
        userId: subject._id,
        userModel: subject.model || 'User',
        userRole: subject.role,
        mode: plan.mode,
        scope: plan.mode === SUBSCRIPTION_MODE.BUYER
            ? SUBSCRIPTION_SCOPE.ACCOUNT
            : SUBSCRIPTION_SCOPE.PROPERTY,
        propertyIds,
        planId: plan._id,
        planName: plan.name,
        planTier: plan.planTier,
        startDate: start,
        expiryDate: end,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        paymentType,
        orderId: order?._id || null,
        razorpayOrderId: order?.razorpayOrderId || null,
        razorpayPaymentId: order?.razorpayPaymentId || null,
        amount: amount != null ? amount : (order?.amount ?? plan.price),
        offlinePayment: offlinePayment || undefined,
        entitlementSnapshot: snapshot,
        createdBy,
        createdByAdmin,
    });

    await applyPromotionToProperties(subscription);

    await createNotification({
        userId: subscription.userId,
        type: 'subscription_activated',
        title: 'Subscription Active',
        message: `Your ${plan.name} subscription is active until ${end.toLocaleDateString('en-IN')}.`,
        relatedId: subscription._id,
        relatedType: 'subscription',
        priority: 'high',
        pushData: { type: 'subscription_activated', link: '/my-subscriptions' },
    }).catch((e) => console.error('[Subscription] notification failed:', e.message));

    return subscription;
};

/**
 * Settles a paid order into a subscription.
 *
 * Safe to call repeatedly. The atomic CREATED → PAID transition means whichever
 * of the webhook and the browser callback arrives first does the work, and the
 * other gets `alreadySettled`.
 *
 * The plan is read from the ORDER, never from the caller — that is what stops a
 * tampered callback swapping a cheap payment onto an expensive plan.
 */
export const settleOrder = async (orderRef, { paymentId, signature, settledVia = 'client' } = {}) => {
    const match = mongoose.isValidObjectId(orderRef)
        ? { _id: orderRef }
        : { $or: [{ orderNumber: orderRef }, { razorpayOrderId: orderRef }] };

    const order = await SubscriptionOrder.findOneAndUpdate(
        { ...match, status: ORDER_STATUS.CREATED },
        {
            $set: {
                status: ORDER_STATUS.PAID,
                razorpayPaymentId: paymentId || null,
                razorpaySignature: signature || null,
                settledVia,
                settledAt: new Date(),
            },
        },
        { new: true }
    );

    if (!order) {
        const existing = await SubscriptionOrder.findOne(match).populate('subscriptionId');
        if (existing?.status === ORDER_STATUS.PAID) {
            return { ok: true, alreadySettled: true, order: existing, subscription: existing.subscriptionId };
        }
        return { ok: false, reason: 'Order not found or already closed' };
    }

    const plan = await SubscriptionPlan.findById(order.planId);
    if (!plan) {
        order.status = ORDER_STATUS.FAILED;
        order.failureReason = 'Plan no longer exists';
        await order.save();
        return { ok: false, reason: 'Plan no longer exists' };
    }

    const subscription = await activateSubscription({
        plan,
        subject: { _id: order.userId, role: order.userRole, model: order.userModel },
        propertyIds: order.propertyIds,
        paymentType: PAYMENT_TYPE.ONLINE,
        amount: order.amount,
        order,
        createdBy: order.userId,
    });

    order.subscriptionId = subscription._id;
    await order.save();

    return { ok: true, alreadySettled: false, order, subscription };
};

/** Marks an order failed. Never activates anything. */
export const failOrder = async (orderRef, reason = '') => {
    const match = mongoose.isValidObjectId(orderRef)
        ? { _id: orderRef }
        : { $or: [{ orderNumber: orderRef }, { razorpayOrderId: orderRef }] };

    return SubscriptionOrder.findOneAndUpdate(
        { ...match, status: ORDER_STATUS.CREATED },
        { $set: { status: ORDER_STATUS.FAILED, failureReason: reason } },
        { new: true }
    );
};

/**
 * Expires one subscription and strips its paid entitlements.
 * History is left intact.
 */
export const expireSubscription = async (subscription, { reason = 'Validity ended' } = {}) => {
    subscription.status = SUBSCRIPTION_STATUS.EXPIRED;
    subscription.expiredAt = new Date();
    await subscription.save();

    await clearPromotionFromProperties(subscription);

    await recordAudit({
        subscriptionId: subscription._id,
        action: 'expired',
        before: { status: SUBSCRIPTION_STATUS.ACTIVE },
        after: { status: SUBSCRIPTION_STATUS.EXPIRED },
        reason,
    });

    await createNotification({
        userId: subscription.userId,
        type: 'subscription_expired',
        title: 'Subscription Expired',
        message: `Your ${subscription.planName} subscription has ended. Your listing stays published, but paid visibility has stopped.`,
        relatedId: subscription._id,
        relatedType: 'subscription',
        priority: 'high',
        pushData: { type: 'subscription_expired', link: '/my-subscriptions' },
    }).catch(() => {});

    return subscription;
};
