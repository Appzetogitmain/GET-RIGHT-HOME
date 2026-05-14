import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Partner from '../models/Partner.js';
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
        const partner = await Partner.findById(partnerId).populate('subscription.planId');

        if (!partner) return res.status(404).json({ message: 'Partner not found' });

        res.json({
            success: true,
            subscription: partner.subscription
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

        const partner = await Partner.findById(partnerId);

        // Logic: Reset properties count or carry over? 
        // Usually, upgrading/renewing gives fresh capacity for that tier, 
        // OR we just set the new max limit. 
        // The requirement says "jab plan ke according number of property hotel patner add kar chuka ho to vo fir se property add nahi kar sakta he".
        // This implies `propertiesAdded` is a counter for the *current* plan cycle. 
        // If I renew, my counter technically should reset for *new* additions if it was a usage-based limit, 
        // BUT usually "Max 5 properties" means "Total Active Properties". 
        // If I have 5, and I renew a 5-property plan, I still have 5. I can't add more. 
        // If I upgrade to 10, I can add 5 more. 
        // So, we don't necessarily reset `propertiesAdded`. We just check `propertiesAdded < maxProperties` in the Guard logic.
        // However, the `propertiesAdded` field in Partner schema needs to stay accurate to *actual* properties in DB.
        // We should probably sync it with `Property.countDocuments({ partnerId })` to be safe, but for now let's leave it as is 
        // and assume the Add Property flow increments it. 

        partner.subscription = {
            planId: plan._id,
            status: 'active',
            startDate: new Date(),
            expiryDate: expiryDate,
            propertiesAdded: partner.subscription?.propertiesAdded || 0,
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
        const partner = await Partner.findById(partnerId).populate('subscription.planId');

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
