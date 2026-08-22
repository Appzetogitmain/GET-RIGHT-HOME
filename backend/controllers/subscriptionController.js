import SubscriptionPlan from '../models/SubscriptionPlan.js';
import SubscriptionTier from '../models/SubscriptionTier.js';
import Partner from '../models/Partner.js';
import User from '../models/User.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import PaymentConfig from '../config/payment.config.js';
import { SLOT_CONSUMING_STATUS } from '../utils/listingEligibility.js';

// Initialize Razorpay
let razorpay;
try {
    if (PaymentConfig.razorpayKeyId && PaymentConfig.razorpayKeySecret) {
        razorpay = new Razorpay({
            key_id: PaymentConfig.razorpayKeyId,
            key_secret: PaymentConfig.razorpayKeySecret
        });
    } else {
        console.warn("⚠️ Razorpay Keys missing. Subscription features will fail.");
        // Fallback or Dummy for safety
        razorpay = {
            orders: {
                create: () => Promise.reject(new Error("Razorpay Not Initialized - Keys Missing"))
            }
        };
    }
} catch (err) {
    console.error("Razorpay Init Failed:", err.message);
    razorpay = {
        orders: {
            create: () => Promise.reject(new Error("Razorpay Init Failed"))
        }
    };
}

// --- ADMIN CONTROLLERS ---

/**
 * @desc    Create a new subscription plan
 * @route   POST /api/subscriptions/admin/create
 * @access  Admin
 */
export const createPlan = async (req, res) => {
    try {
        const {
            name, maxProperties, price, durationDays, description,
            commissionPercentage, tier, leadCap, hasVerifiedTag,
            bannerType, rankingWeight, pauseDaysAllowed, targetRole, listingType
        } = req.body;

        const plan = await SubscriptionPlan.create({
            name,
            maxProperties,
            price,
            durationDays,
            description,
            commissionPercentage: commissionPercentage || 10,
            tier,
            leadCap: leadCap || 0,
            hasVerifiedTag: hasVerifiedTag || false,
            bannerType: bannerType || 'none',
            rankingWeight: rankingWeight || 1,
            pauseDaysAllowed: pauseDaysAllowed || 0,
            targetRole: targetRole || 'owner',
            listingType: listingType || 'all'
        });

        res.status(201).json({ success: true, plan });
    } catch (error) {
        console.error('Create Plan Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create plan' });
    }
};

/**
 * @desc    Get all subscription plans (Admin view - includes inactive)
 * @route   GET /api/subscriptions/admin/all
 * @access  Admin
 */
export const getAllPlans = async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find().sort({ createdAt: -1 });
        res.json({ success: true, plans });
    } catch (error) {
        console.error('Get All Plans Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch plans' });
    }
};

/**
 * @desc    Update a subscription plan
 * @route   PUT /api/subscriptions/admin/:id
 * @access  Admin
 */
export const updatePlan = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!plan) return res.status(404).json({ message: 'Plan not found' });
        res.json({ success: true, plan });
    } catch (error) {
        console.error('Update Plan Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update plan' });
    }
};

/**
 * @desc    Delete (Soft Delete) a subscription plan
 * @route   DELETE /api/subscriptions/admin/:id
 * @access  Admin
 */
export const deletePlan = async (req, res) => {
    try {
        const { hard } = req.query;
        if (hard === 'true') {
            const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
            if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
            return res.json({ success: true, message: 'Plan deleted permanently' });
        } else {
            const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
            if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
            return res.json({ success: true, message: 'Plan deactivated' });
        }
    } catch (error) {
        console.error('Delete Plan Error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete plan' });
    }
};

// --- PARTNER CONTROLLERS ---

/** Maps an account's real role to the value SubscriptionPlan.targetRole uses. */
const resolveLegacyTargetRole = (req) => {
    let role = String(req.user?.role || '').toLowerCase();
    if (role === 'partner') role = 'builder'; // legacy partner accounts are builders
    return ['owner', 'broker', 'builder'].includes(role) ? role : null;
};

/**
 * @desc    Get active subscription plans for partners
 * @route   GET /api/subscriptions/plans
 * @access  Private (Partner)
 *
 * F-1: role used to come from `req.query.role`, so any logged-in account
 * could ask for `?role=builder` and be shown (then sell itself) plans that
 * were never meant for it. The route is already `protect`-guarded, so the
 * real role is sitting on `req.user` — read it from there instead. The
 * `listingType` query param still narrows within that role's plans.
 */
export const getActivePlans = async (req, res) => {
    try {
        const { listingType } = req.query;
        const targetRole = resolveLegacyTargetRole(req);

        if (!targetRole) {
            // A buyer / plain user account has no plans in this seller-only
            // catalogue — say so rather than silently showing everything.
            return res.json({ success: true, plans: [] });
        }

        const filter = { isActive: true, targetRole };

        // If a listing type is given, show plans built for that type plus any
        // 'all'-type plan, OR a legacy plan that predates this field entirely
        // (F-5 — all 7 original plans have no listingType stored at all, so a
        // strict $in match against them returns nothing).
        if (listingType) {
            const parsedType = listingType.toLowerCase();
            if (['rent', 'buy', 'pg', 'commercial'].includes(parsedType)) {
                filter.$or = [
                    { listingType: { $in: [parsedType, 'all'] } },
                    { listingType: { $exists: false } },
                ];
            }
        }

        const plans = await SubscriptionPlan.find(filter).sort({ price: 1 });
        res.json({ success: true, plans });
    } catch (error) {
        console.error('Get Active Plans Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch plans' });
    }
};

/**
 * @desc    Get current subscription status of partner
 * @route   GET /api/subscriptions/current
 * @access  Private (Partner)
 */
export const getCurrentSubscription = async (req, res) => {
    try {
        const partnerId = req.user._id || req.user.id;
        const Model = req.user.role === 'partner' ? Partner : User;
        const partner = await Model.findById(partnerId).populate('subscription.planId');

        if (!partner) return res.status(404).json({ message: 'User not found' });

        res.json({
            success: true,
            subscription: partner.subscription,
            createdAt: partner.createdAt,
            partnerSince: partner.partnerSince || partner.createdAt
        });
    } catch (error) {
        console.error('Get Subscription Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch subscription' });
    }
};

/**
 * Writes an active subscription onto the user/partner record.
 *
 * Shared by paid activation (after signature verification) and free-plan
 * activation, so the two can't drift apart.
 *
 * @returns the saved subscription, or null when the account is missing.
 */
const activatePlanForUser = async ({ userId, role, plan, transactionId }) => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

    const Model = role === 'partner' ? Partner : User;
    const subject = await Model.findById(userId);
    if (!subject) return null;

    // Recount properties that actually occupy a plan slot. Must use the same
    // rule as the listing-eligibility gate (drafts and rejected listings are
    // free), otherwise the plan usage shown to the user disagrees with what
    // the server actually enforces — e.g. "2/1" right after subscribing.
    const Property = (await import('../models/Property.js')).default;
    const query = role === 'partner' ? { partnerId: userId } : { userId };
    query.status = SLOT_CONSUMING_STATUS;
    const actualPropsCount = await Property.countDocuments(query);

    subject.subscription = {
        planId: plan._id,
        status: 'active',
        startDate: new Date(),
        expiryDate,
        propertiesAdded: actualPropsCount,
        transactionId,
        leadsUsedThisMonth: 0, // Reset/Initialize leads
        isPaused: false
    };

    await subject.save();
    return subject.subscription;
};

/**
 * F-3 — activates a legacy (System 1) subscription from the Razorpay webhook.
 *
 * There is no local orders collection for this system (the whole point of
 * F-3/F-8), so the only durable record of what was being bought is the order
 * itself, held by Razorpay. `partnerId`/`planId` were written into its
 * `notes` at order-creation time in `createSubscriptionOrder` and are read
 * back here — never trusted from anywhere client-controlled.
 *
 * Idempotent: if this payment id is already the one recorded on the account
 * (the browser's own POST /verify got there first), this is a no-op. Called
 * from paymentController.handleWebhook only for orders whose notes mark them
 * as `subscription_purchase` — every other order type is left alone.
 */
export const activateLegacySubscriptionFromWebhook = async (rzpOrder, paymentId) => {
    const { partnerId, planId } = rzpOrder?.notes || {};
    if (!partnerId || !planId) return { ok: false, reason: 'Order notes missing partnerId/planId' };

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return { ok: false, reason: 'Plan no longer exists' };

    // Figure out which collection this account lives in without trusting a
    // role the webhook never received — try User first (the common case for
    // owner/broker), then Partner.
    let subject = await User.findById(partnerId);
    let role = 'user';
    if (!subject) {
        subject = await Partner.findById(partnerId);
        role = 'partner';
    }
    if (!subject) return { ok: false, reason: 'Account not found' };

    if (subject.subscription?.transactionId === paymentId) {
        return { ok: true, alreadySettled: true };
    }

    const subscription = await activatePlanForUser({ userId: partnerId, role, plan, transactionId: paymentId });
    return { ok: true, alreadySettled: false, subscription };
};

/**
 * @desc    Create Razorpay Order for Subscription
 * @route   POST /api/subscriptions/checkout
 * @access  Private (Partner)
 */
export const createSubscriptionOrder = async (req, res) => {
    try {
        const { planId } = req.body;
        const partnerId = req.user._id || req.user.id;

        const plan = await SubscriptionPlan.findById(planId);
        if (!plan || !plan.isActive) return res.status(404).json({ message: 'Plan not found' });

        // F-1 (second half): getActivePlans stopped showing plans outside the
        // caller's role, but checkout itself accepted ANY planId with no
        // check at all — a buyer who somehow learned a Builder plan's id
        // could still purchase it directly. Enforce the same rule here.
        const callerRole = resolveLegacyTargetRole(req);
        if (!callerRole || plan.targetRole !== callerRole) {
            return res.status(403).json({ success: false, message: 'This plan is not available for your account type' });
        }

        const amountInPaise = Math.round(plan.price * 100);

        // A ₹0 plan has nothing to charge for, and Razorpay rejects any order
        // below its minimum (₹1) with "Order amount less than minimum amount
        // allowed" — which surfaced to the user as a hard crash. Activate free
        // plans directly and tell the client to skip the payment sheet.
        if (amountInPaise <= 0) {
            const activated = await activatePlanForUser({
                userId: partnerId,
                role: req.user.role,
                plan,
                transactionId: `free_${Date.now()}`
            });

            if (!activated) return res.status(404).json({ message: 'User not found' });

            return res.json({
                success: true,
                free: true,
                message: 'Plan activated',
                subscription: activated
            });
        }

        const options = {
            amount: amountInPaise,
            currency: PaymentConfig.currency || "INR",
            receipt: `sub_${Date.now()}`, // Keep receipt short (max 40 chars)
            notes: {
                partnerId: partnerId.toString(),
                planId: planId.toString(),
                type: 'subscription_purchase'
            }
        };

        if (!razorpay || !razorpay.orders) {
            throw new Error("Razorpay provider not available");
        }

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                planId: plan._id
            },
            key: PaymentConfig.razorpayKeyId
        });

    } catch (error) {
        console.error('Create Subscription Order Error:', error);
        res.status(500).json({
            success: false,
            message: error.description || error.message || 'Failed to create order'
        });
    }
};

/**
 * @desc    Verify Razorpay Payment & Activate Subscription
 * @route   POST /api/subscriptions/verify
 * @access  Private (Partner)
 */
export const verifySubscription = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const partnerId = req.user._id || req.user.id;

        // 1. Verify Signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", PaymentConfig.razorpayKeySecret)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }

        // F-2: which plan to activate used to come from req.body.planId — the
        // signature only proves a payment happened, not what it was for, so
        // paying ₹999 for Silver and posting Diamond's id activated Diamond.
        // Read it back from the order Razorpay itself holds instead; that was
        // written once, at order-creation time, and the client cannot edit it.
        const rzpOrder = await razorpay.orders.fetch(razorpay_order_id);
        if (String(rzpOrder?.notes?.partnerId) !== String(partnerId)) {
            return res.status(403).json({ success: false, message: 'This order belongs to another account' });
        }
        const planId = rzpOrder?.notes?.planId;

        // 2. Activate Subscription
        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) return res.status(404).json({ message: 'Plan not found during activation' });

        const subscription = await activatePlanForUser({
            userId: partnerId,
            role: req.user.role,
            plan,
            transactionId: razorpay_payment_id
        });

        if (!subscription) return res.status(404).json({ message: 'User not found' });

        res.json({
            success: true,
            message: 'Subscription activated successfully',
            subscription
        });

    } catch (error) {
        console.error('Verify Subscription Error:', error);
        res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
};
/**
 * @desc    Toggle Subscription Pause (For Gold Plan)
 * @route   POST /api/subscriptions/toggle-pause
 * @access  Private (Partner)
 */
export const toggleSubscriptionPause = async (req, res) => {
    try {
        const partnerId = req.user._id || req.user.id;
        const Model = req.user.role === 'partner' ? Partner : User;
        const partner = await Model.findById(partnerId).populate('subscription.planId');

        if (!partner || !partner.subscription.planId) {
            return res.status(404).json({ message: 'Active subscription not found' });
        }

        const plan = partner.subscription.planId;
        if (plan.pauseDaysAllowed <= 0) {
            return res.status(403).json({ message: 'Pause not allowed for this plan' });
        }

        const currentlyPaused = partner.subscription.isPaused;

        if (currentlyPaused) {
            // Resume: We should theoretically extend the expiry date by the duration it was paused
            const pauseStart = partner.subscription.pauseStartDate;
            const pauseDurationMs = new Date() - new Date(pauseStart);

            partner.subscription.expiryDate = new Date(new Date(partner.subscription.expiryDate).getTime() + pauseDurationMs);
            partner.subscription.isPaused = false;
            partner.subscription.pauseStartDate = null;
        } else {
            // Pause
            partner.subscription.isPaused = true;
            partner.subscription.pauseStartDate = new Date();
        }

        await partner.save();
        res.json({
            success: true,
            message: currentlyPaused ? 'Subscription resumed' : 'Subscription paused',
            subscription: partner.subscription
        });

    } catch (error) {
        console.error('Toggle Pause Error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle pause' });
    }
};

// --- ADMIN TIER CONTROLLERS ---

export const getAllTiers = async (req, res) => {
    try {
        const tiers = await SubscriptionTier.find().sort({ createdAt: 1 });
        res.json({ success: true, tiers });
    } catch (error) {
        console.error('Get All Tiers Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch tiers' });
    }
};

export const createTier = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Tier name is required' });
        }
        const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
        
        // Check if exists
        const existing = await SubscriptionTier.findOne({ $or: [{ name }, { key }] });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Tier name or key already exists' });
        }

        const tier = await SubscriptionTier.create({ name, key });
        res.status(201).json({ success: true, tier });
    } catch (error) {
        console.error('Create Tier Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create tier' });
    }
};

export const updateTier = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Tier name is required' });
        }
        const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

        const tier = await SubscriptionTier.findByIdAndUpdate(id, { name, key }, { new: true });
        if (!tier) {
            return res.status(404).json({ success: false, message: 'Tier not found' });
        }
        res.json({ success: true, tier });
    } catch (error) {
        console.error('Update Tier Error:', error);
        res.status(500).json({ success: false, message: 'Failed to update tier' });
    }
};

export const deleteTier = async (req, res) => {
    try {
        const { id } = req.params;
        const tier = await SubscriptionTier.findById(id);
        if (!tier) {
            return res.status(404).json({ success: false, message: 'Tier not found' });
        }

        // Check if any plan is using this tier
        const plansUsing = await SubscriptionPlan.findOne({ tier: tier.key });
        if (plansUsing) {
            return res.status(400).json({ success: false, message: 'Cannot delete tier. Active subscription plans are using it.' });
        }

        await SubscriptionTier.findByIdAndDelete(id);
        res.json({ success: true, message: 'Tier deleted successfully' });
    } catch (error) {
        console.error('Delete Tier Error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete tier' });
    }
};

