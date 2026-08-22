// controllers/propertySubscriptionController.js
//
// The subscriber-facing half of the architecture: browse eligible plans, pick
// properties, pay, and see what you hold.
//
// The admin half lives in adminSubscriptionController.js.

import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from 'mongoose';
import PaymentConfig from '../config/payment.config.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Subscription from '../models/Subscription.js';
import SubscriptionOrder, { generateOrderNumber } from '../models/SubscriptionOrder.js';
import Feature from '../models/Feature.js';
import {
    getEligiblePlans,
    assertPurchasable,
    getSubscribableProperties,
    getPropertySubscription,
} from '../services/subscriptionCatalogService.js';
import { settleOrder, activateSubscription, failOrder } from '../services/subscriptionActivationService.js';
import {
    SUBSCRIPTION_MODE,
    SUBSCRIPTION_STATUS,
    PAYMENT_TYPE,
    ORDER_STATUS,
    resolveProfileType,
    allowedModesFor,
    resolveMode,
} from '../utils/subscriptionConstants.js';

let razorpay;
try {
    if (PaymentConfig.razorpayKeyId && PaymentConfig.razorpayKeySecret) {
        razorpay = new Razorpay({
            key_id: PaymentConfig.razorpayKeyId,
            key_secret: PaymentConfig.razorpayKeySecret,
        });
    } else {
        console.warn('⚠️ Razorpay keys missing — subscription checkout will fail.');
        razorpay = { orders: { create: () => Promise.reject(new Error('Razorpay not configured')) } };
    }
} catch (err) {
    console.error('Razorpay init failed:', err.message);
    razorpay = { orders: { create: () => Promise.reject(new Error('Razorpay init failed')) } };
}

const userModelFor = (req) => (req.user.role === 'partner' ? 'Partner' : 'User');

/**
 * @desc    Plans this user may buy, for their real role and the chosen mode
 * @route   GET /api/property-subscriptions/catalog
 * @access  Private
 *
 * §8 steps 3–4. Role comes from the session; mode comes from the property when
 * one is named. Nothing here trusts a query parameter to widen eligibility.
 */
export const getCatalog = async (req, res) => {
    try {
        const { mode, propertyId } = req.query;

        const { userRole, modes, plans, property } = await getEligiblePlans(req.user, { mode, propertyId });

        res.json({
            success: true,
            userRole,
            availableModes: allowedModesFor(req.user),
            modes,
            property: property
                ? {
                    _id: property._id,
                    propertyName: property.propertyName,
                    mode: resolveMode(property.transactionType),
                    status: property.status,
                }
                : null,
            plans,
        });
    } catch (error) {
        console.error('Get catalog error:', error);
        res.status(500).json({ success: false, message: 'Failed to load subscription plans' });
    }
};

/**
 * @desc    Approved listings the user can still subscribe for, in one mode
 * @route   GET /api/property-subscriptions/properties?mode=sale|rental
 * @access  Private
 */
export const getEligibleProperties = async (req, res) => {
    try {
        const mode = String(req.query.mode || '').toLowerCase();

        if (!allowedModesFor(req.user).includes(mode)) {
            return res.status(400).json({ success: false, message: 'Choose Sale or Rental first' });
        }

        const properties = await getSubscribableProperties(req.user, mode);
        res.json({ success: true, mode, properties });
    } catch (error) {
        console.error('Get eligible properties error:', error);
        res.status(500).json({ success: false, message: 'Failed to load your properties' });
    }
};

/**
 * @desc    Start checkout for a plan against one or more properties
 * @route   POST /api/property-subscriptions/checkout
 * @access  Private
 *
 * Creates the order BEFORE payment, recording the plan, properties, price and
 * entitlement snapshot. Settlement later reads all of that from the order, so
 * the browser cannot change what was bought after paying (§13).
 */
export const createCheckout = async (req, res) => {
    try {
        const { planId, propertyIds = [] } = req.body;

        if (!mongoose.isValidObjectId(planId)) {
            return res.status(400).json({ success: false, message: 'Choose a plan to continue' });
        }

        const plan = await SubscriptionPlan.findById(planId);
        const ids = (Array.isArray(propertyIds) ? propertyIds : [propertyIds]).filter(Boolean);

        const check = await assertPurchasable(req.user, plan, ids);
        if (!check.ok) {
            return res.status(403).json({ success: false, message: check.reason });
        }

        const userId = req.user._id || req.user.id;
        const snapshot = plan.entitlementSnapshot();

        const order = await SubscriptionOrder.create({
            orderNumber: generateOrderNumber(),
            userId,
            userModel: userModelFor(req),
            userRole: resolveProfileType(req.user),
            planId: plan._id,
            planName: plan.name,
            mode: plan.mode,
            propertyIds: ids,
            durationDays: plan.durationDays,
            amount: plan.price,
            entitlementSnapshot: snapshot,
        });

        // A free plan has nothing to charge for, and Razorpay rejects orders
        // below ₹1. Activate directly and tell the client to skip the sheet.
        if (Number(plan.price) <= 0) {
            const subscription = await activateSubscription({
                plan,
                subject: { _id: userId, role: order.userRole, model: order.userModel },
                propertyIds: ids,
                paymentType: PAYMENT_TYPE.ONLINE,
                amount: 0,
                order,
                createdBy: userId,
            });

            order.status = ORDER_STATUS.PAID;
            order.settledVia = 'free';
            order.settledAt = new Date();
            order.subscriptionId = subscription._id;
            await order.save();

            return res.json({ success: true, free: true, subscription, orderNumber: order.orderNumber });
        }

        const rzpOrder = await razorpay.orders.create({
            amount: Math.round(plan.price * 100),
            currency: PaymentConfig.currency || 'INR',
            receipt: order.orderNumber,
            notes: {
                orderNumber: order.orderNumber,
                planId: String(plan._id),
                userId: String(userId),
                type: 'property_subscription',
            },
        });

        order.razorpayOrderId = rzpOrder.id;
        await order.save();

        res.json({
            success: true,
            free: false,
            orderNumber: order.orderNumber,
            order: {
                id: rzpOrder.id,
                amount: rzpOrder.amount,
                currency: rzpOrder.currency,
            },
            key: PaymentConfig.razorpayKeyId,
            plan: { name: plan.name, price: plan.price, durationDays: plan.durationDays },
        });
    } catch (error) {
        console.error('Create checkout error:', error);
        res.status(500).json({
            success: false,
            message: error.description || error.message || 'Could not start checkout',
        });
    }
};

/**
 * @desc    Confirm a payment from the browser
 * @route   POST /api/property-subscriptions/verify
 * @access  Private
 *
 * The signature proves the payment. WHAT was bought is read from the stored
 * order, not from this request — so no plan id is accepted here at all.
 */
export const verifyCheckout = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Incomplete payment details' });
        }

        const expected = crypto
            .createHmac('sha256', PaymentConfig.razorpayKeySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expected !== razorpay_signature) {
            await failOrder(razorpay_order_id, 'Signature mismatch');
            return res.status(400).json({ success: false, message: 'Payment could not be verified' });
        }

        // Confirm the order belongs to the caller before settling it.
        const order = await SubscriptionOrder.findOne({ razorpayOrderId: razorpay_order_id });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (String(order.userId) !== String(req.user._id || req.user.id)) {
            return res.status(403).json({ success: false, message: 'This order belongs to another account' });
        }

        const result = await settleOrder(order._id, {
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
            settledVia: 'client',
        });

        if (!result.ok) {
            return res.status(400).json({ success: false, message: result.reason });
        }

        res.json({
            success: true,
            alreadyActive: result.alreadySettled,
            message: result.alreadySettled
                ? 'This subscription is already active'
                : 'Subscription activated',
            subscription: result.subscription,
        });
    } catch (error) {
        console.error('Verify checkout error:', error);
        res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
};

/**
 * @desc    Everything this user holds
 * @route   GET /api/property-subscriptions/mine
 * @access  Private
 */
export const getMySubscriptions = async (req, res) => {
    try {
        const { mode, status } = req.query;
        const query = { userId: req.user._id || req.user.id };
        if (mode) query.mode = mode;
        if (status) query.status = status;

        const subscriptions = await Subscription.find(query)
            .populate('propertyIds', 'propertyName coverImage address transactionType status')
            .sort({ createdAt: -1 })
            .lean();

        // Split so the UI does not have to re-derive "is this still running?".
        const now = new Date();
        const active = subscriptions.filter(
            (s) => s.status === SUBSCRIPTION_STATUS.ACTIVE && new Date(s.expiryDate) > now
        );

        res.json({
            success: true,
            subscriptions,
            summary: {
                total: subscriptions.length,
                active: active.length,
                sale: active.filter((s) => s.mode === SUBSCRIPTION_MODE.SALE).length,
                rental: active.filter((s) => s.mode === SUBSCRIPTION_MODE.RENTAL).length,
                buyer: active.filter((s) => s.mode === SUBSCRIPTION_MODE.BUYER).length,
            },
        });
    } catch (error) {
        console.error('Get my subscriptions error:', error);
        res.status(500).json({ success: false, message: 'Failed to load your subscriptions' });
    }
};

/**
 * @desc    One subscription in detail
 * @route   GET /api/property-subscriptions/:id
 * @access  Private
 */
export const getSubscriptionDetail = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id)
            .populate('propertyIds', 'propertyName coverImage address transactionType status')
            .populate('planId', 'name planTier features description');

        if (!subscription) {
            return res.status(404).json({ success: false, message: 'Subscription not found' });
        }

        const isOwner = String(subscription.userId) === String(req.user._id || req.user.id);
        const isAdmin = ['admin', 'superadmin', 'manager'].includes(req.user.role);
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not your subscription' });
        }

        res.json({ success: true, subscription });
    } catch (error) {
        console.error('Get subscription detail error:', error);
        res.status(500).json({ success: false, message: 'Failed to load subscription' });
    }
};

/**
 * @desc    Subscription state for one listing — drives the Boost / Manage button
 * @route   GET /api/property-subscriptions/property/:propertyId/status
 * @access  Private
 */
export const getPropertyStatus = async (req, res) => {
    try {
        const subscription = await getPropertySubscription(req.params.propertyId);

        res.json({
            success: true,
            hasActiveSubscription: !!subscription,
            subscription: subscription || null,
        });
    } catch (error) {
        console.error('Get property subscription status error:', error);
        res.status(500).json({ success: false, message: 'Failed to load subscription status' });
    }
};

/**
 * @desc    Active feature catalogue, for rendering plan comparison tables
 * @route   GET /api/property-subscriptions/features
 * @access  Private
 */
export const getFeatureCatalog = async (req, res) => {
    try {
        const { mode } = req.query;
        const query = { isActive: true };
        if (mode) query.mode = { $in: [mode, 'both'] };

        const features = await Feature.find(query).sort({ displayOrder: 1, label: 1 }).lean();
        res.json({ success: true, features });
    } catch (error) {
        console.error('Get feature catalog error:', error);
        res.status(500).json({ success: false, message: 'Failed to load features' });
    }
};
