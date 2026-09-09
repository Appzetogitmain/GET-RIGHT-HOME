import referralService from '../services/referralService.js';
import ReferralProgram from '../models/ReferralProgram.js';
import ReferralCode from '../models/ReferralCode.js';
import ReferralTracking from '../models/ReferralTracking.js';
import HomeServiceVoucher from '../models/HomeServiceVoucher.js';

/**
 * Get logged-in user's referral stats and history
 * GET /api/referrals/my-stats
 */
export const getMyReferral = async (req, res) => {
    try {
        const data = await referralService.getReferralStats(req.user._id);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Get My Referral Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch referral data' });
    }
};

/**
 * Get logged-in user's Home Service vouchers
 * GET /api/referrals/my-vouchers
 */
export const getMyVouchers = async (req, res) => {
    try {
        const vouchers = await referralService.getUserVouchers(req.user._id);
        res.json({
            success: true,
            vouchers
        });
    } catch (error) {
        console.error('Get My Vouchers Error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch vouchers' });
    }
};

/**
 * Validate a voucher code for checkout (Public/Auth)
 * POST /api/referrals/voucher/validate
 */
export const validateVoucher = async (req, res) => {
    try {
        const { code, orderAmount } = req.body;
        const userId = req.user ? req.user._id : null;
        const result = await referralService.validateVoucher(code, userId, orderAmount);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.status(200).json(result);
    } catch (error) {
        console.error('Validate Voucher Controller Error:', error);
        res.status(500).json({ success: false, message: 'Server error validating voucher' });
    }
};

/**
 * Get active referral program config
 * GET /api/referrals/program/active
 */
export const getActiveProgram = async (req, res) => {
    try {
        const program = await ReferralProgram.findOne({ isActive: true }).sort({ updatedAt: -1 });
        res.json({ success: true, program });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Admin Management ──────────────────────────────────────────────

/**
 * Get all referral programs (Admin)
 * GET /api/referrals/program/all
 */
export const getAllReferralPrograms = async (req, res) => {
    try {
        const programs = await ReferralProgram.find().sort({ createdAt: -1 });
        res.json({ success: true, programs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Create new referral program (Admin)
 * POST /api/referrals/program
 */
export const createReferralProgram = async (req, res) => {
    try {
        if (req.body.isActive) {
            await ReferralProgram.updateMany({}, { $set: { isActive: false } });
        }
        const program = await ReferralProgram.create(req.body);
        res.status(201).json({ success: true, program });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update referral program (Admin)
 * PUT /api/referrals/program/:id
 */
export const updateReferralProgram = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.body.isActive) {
            await ReferralProgram.updateMany({ _id: { $ne: id } }, { $set: { isActive: false } });
        }

        const program = await ReferralProgram.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!program) {
            return res.status(404).json({ success: false, message: 'Referral program not found' });
        }
        res.json({ success: true, program });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete referral program (Admin)
 * DELETE /api/referrals/program/:id
 */
export const deleteReferralProgram = async (req, res) => {
    try {
        const program = await ReferralProgram.findByIdAndDelete(req.params.id);
        if (!program) {
            return res.status(404).json({ success: false, message: 'Referral program not found' });
        }
        res.json({ success: true, message: 'Referral program deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin Stats & Lifecycle Tracking
 * GET /api/referrals/admin/stats
 */
export const getReferralAdminStats = async (req, res) => {
    try {
        const [totalReferrals, completedReferrals, pendingReferrals, totalVouchersIssued, totalVouchersRedeemed, recent] = await Promise.all([
            ReferralTracking.countDocuments(),
            ReferralTracking.countDocuments({ status: 'completed' }),
            ReferralTracking.countDocuments({ status: 'pending' }),
            HomeServiceVoucher.countDocuments(),
            HomeServiceVoucher.countDocuments({ isRedeemed: true }),
            ReferralTracking.find()
                .populate('referrerId', 'name email phone')
                .populate('referredUserId', 'name email phone')
                .populate('referrerVoucherId', 'code discountType discountValue isRedeemed redeemedAt expiresAt')
                .populate('triggerHomeServiceBookingId', 'bookingNumber finalAmount status createdAt')
                .sort({ createdAt: -1 })
                .limit(100)
        ]);

        const formattedRecent = recent.map(r => {
            const v = r.referrerVoucherId;
            let voucherStatus = 'Pending Completion';
            if (v) {
                if (v.isRedeemed) {
                    voucherStatus = 'Redeemed';
                } else if (v.expiresAt && new Date(v.expiresAt) < new Date()) {
                    voucherStatus = 'Expired';
                } else {
                    voucherStatus = 'Active';
                }
            }

            return {
                id: r._id,
                referrer: r.referrerId ? {
                    id: r.referrerId._id,
                    name: r.referrerId.name,
                    email: r.referrerId.email,
                    phone: r.referrerId.phone
                } : null,
                referrerModel: r.referrerModel,
                referredUser: r.referredUserId ? {
                    id: r.referredUserId._id,
                    name: r.referredUserId.name,
                    email: r.referredUserId.email,
                    phone: r.referredUserId.phone
                } : null,
                status: r.status,
                rewardType: r.rewardType || 'flat',
                rewardValue: r.rewardValue ?? r.rewardAmount ?? 200,
                voucherCode: v ? v.code : r.voucherCode || null,
                voucherStatus,
                isVoucherRedeemed: v ? v.isRedeemed : false,
                redeemedAt: v ? v.redeemedAt : null,
                expiresAt: v ? v.expiresAt : null,
                triggerBooking: r.triggerHomeServiceBookingId ? {
                    id: r.triggerHomeServiceBookingId._id,
                    bookingNumber: r.triggerHomeServiceBookingId.bookingNumber,
                    status: r.triggerHomeServiceBookingId.status,
                    finalAmount: r.triggerHomeServiceBookingId.finalAmount
                } : null,
                createdAt: r.createdAt,
                completedAt: r.completedAt
            };
        });

        res.json({
            success: true,
            stats: {
                totalReferrals,
                completedReferrals,
                pendingReferrals,
                totalVouchersIssued,
                totalVouchersRedeemed
            },
            recent: formattedRecent
        });
    } catch (error) {
        console.error('Get Referral Admin Stats Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Generate custom referral code (Admin)
 * POST /api/referrals/custom-code
 */
export const generateCustomCode = async (req, res) => {
    try {
        const { code, userId, role } = req.body;
        const newCode = await ReferralCode.create({
            code: code.toUpperCase(),
            ownerId: userId,
            ownerType: role === 'partner' ? 'Partner' : 'User',
            isActive: true,
            isCustom: true
        });
        res.json({ success: true, code: newCode });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
