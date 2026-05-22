import Razorpay from 'razorpay';
import crypto from 'crypto';
import PaymentConfig from '../config/payment.config.js';
import HomeContent from '../models/HomeContent.js';
import User from '../models/User.js';

// Initialize Razorpay
let razorpay;
try {
    if (PaymentConfig.razorpayKeyId && PaymentConfig.razorpayKeySecret) {
        razorpay = new Razorpay({
            key_id: PaymentConfig.razorpayKeyId,
            key_secret: PaymentConfig.razorpayKeySecret
        });
    } else {
        console.warn('⚠️ Razorpay Keys missing. VIP features will fail.');
        razorpay = { orders: { create: () => Promise.reject(new Error('Razorpay Not Initialized')) } };
    }
} catch (err) {
    console.error('Razorpay Init Failed:', err.message);
    razorpay = { orders: { create: () => Promise.reject(new Error('Razorpay Init Failed')) } };
}

/**
 * @desc    Create Razorpay order for VIP Membership purchase
 * @route   POST /api/users/vip/purchase
 * @access  Private (User)
 */
export const createVipOrder = async (req, res) => {
    try {
        const { cityId } = req.body;

        // Get VIP price from homeContent
        const homeContent = await HomeContent.findOne(cityId ? { cityId } : {});
        if (!homeContent || !homeContent.isVipEnabled) {
            return res.status(404).json({ success: false, message: 'VIP Membership is not available' });
        }

        const vipPrice = homeContent.vipPrice || 199;
        const vipDurationDays = homeContent.vipDurationDays || 56;

        const amountInPaise = Math.round(vipPrice * 100);

        const options = {
            amount: amountInPaise,
            currency: PaymentConfig.currency || 'INR',
            receipt: `vip_${Date.now()}`,
            notes: {
                userId: req.user._id.toString(),
                type: 'vip_membership',
                vipPrice: vipPrice.toString(),
                vipDurationDays: vipDurationDays.toString()
            }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                vipPrice,
                vipDurationDays
            },
            key: PaymentConfig.razorpayKeyId
        });

    } catch (error) {
        console.error('Create VIP Order Error:', error);
        res.status(500).json({
            success: false,
            message: error.description || error.message || 'Failed to create VIP order'
        });
    }
};

/**
 * @desc    Verify Razorpay Payment & Activate VIP Membership
 * @route   POST /api/users/vip/verify
 * @access  Private (User)
 */
export const verifyVipPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, vipDurationDays } = req.body;

        // 1. Verify Signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', PaymentConfig.razorpayKeySecret)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        // 2. Activate VIP on User
        const durationDays = parseInt(vipDurationDays) || 56;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + durationDays);

        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                isVip: true,
                vipExpiry: expiryDate
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: 'VIP Membership activated successfully!',
            vip: {
                isVip: true,
                vipExpiry: expiryDate,
                durationDays
            }
        });

    } catch (error) {
        console.error('Verify VIP Payment Error:', error);
        res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
};
