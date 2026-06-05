import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Partner from '../models/Partner.js';
import User from '../models/User.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import PaymentConfig from '../config/payment.config.js';

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
            bannerType, rankingWeight, pauseDaysAllowed
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
            pauseDaysAllowed: pauseDaysAllowed || 0
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
        // We strictly soft delete to preserve history for partners using this plan
        const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!plan) return res.status(404).json({ message: 'Plan not found' });
        res.json({ success: true, message: 'Plan deactivated' });
    } catch (error) {
        console.error('Delete Plan Error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete plan' });
    }
};

// --- PARTNER CONTROLLERS ---

/**
 * @desc    Get active subscription plans for partners
 * @route   GET /api/subscriptions/plans
 * @access  Private (Partner)
 */
export const getActivePlans = async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
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
 * @desc    Create Razorpay Order for Subscription
 * @route   POST /api/subscriptions/checkout
 * @access  Private (Partner)
 */
export const createSubscriptionOrder = async (req, res) => {
    try {
        const { planId } = req.body;
        const partnerId = req.user._id || req.user.id;

        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        const amountInPaise = Math.round(plan.price * 100);

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
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;
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

        // 2. Activate Subscription
        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) return res.status(404).json({ message: 'Plan not found during activation' });

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

        const Model = req.user.role === 'partner' ? Partner : User;
        const partner = await Model.findById(partnerId);
        if (!partner) return res.status(404).json({ message: 'User not found' });

        // Recount active properties to ensure data integrity
        const Property = (await import('../models/Property.js')).default;
        const query = req.user.role === 'partner' ? { partnerId } : { userId: partnerId };
        query.status = { $ne: 'deleted' };
        const actualPropsCount = await Property.countDocuments(query);

        partner.subscription = {
            planId: plan._id,
            status: 'active',
            startDate: new Date(),
            expiryDate: expiryDate,
            propertiesAdded: actualPropsCount,
            transactionId: razorpay_payment_id,
            leadsUsedThisMonth: 0, // Reset/Initialize leads
            isPaused: false
        };

        await partner.save();

        res.json({
            success: true,
            message: 'Subscription activated successfully',
            subscription: partner.subscription
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
        if (plan.tier !== 'gold' || plan.pauseDaysAllowed <= 0) {
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
