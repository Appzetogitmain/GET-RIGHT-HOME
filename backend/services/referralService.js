import ReferralCode from '../models/ReferralCode.js';
import ReferralProgram from '../models/ReferralProgram.js';
import ReferralTracking from '../models/ReferralTracking.js';
import HomeServiceVoucher from '../models/HomeServiceVoucher.js';
import notificationService from './notificationService.js';
import mongoose from 'mongoose';
import crypto from 'crypto';

class ReferralService {

    /**
     * Generates a unique referral code for a user/partner
     * format: NAME + Random Numbers (e.g., SAGAR4021)
     */
    async generateCodeForUser(user) {
        try {
            const existing = await ReferralCode.findOne({
                ownerId: user._id,
                ownerType: user.role === 'partner' ? 'Partner' : 'User'
            });
            if (existing) return existing;

            const program = await ReferralProgram.findOne({ isActive: true, eligibleRoles: user.role });
            const prefix = (user.name || 'USER').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'GRH';
            let uniqueCode;
            let isUnique = false;

            for (let i = 0; i < 5; i++) {
                const randomNum = Math.floor(1000 + Math.random() * 9000);
                const candidate = `${prefix}${randomNum}`;
                const check = await ReferralCode.findOne({ code: candidate });
                if (!check) {
                    uniqueCode = candidate;
                    isUnique = true;
                    break;
                }
            }

            if (!isUnique) {
                uniqueCode = `${prefix}${Date.now().toString().slice(-6)}`;
            }

            const newCode = await ReferralCode.create({
                code: uniqueCode,
                ownerId: user._id,
                ownerType: user.role === 'partner' ? 'Partner' : 'User',
                referralProgramId: program?._id
            });

            return newCode;
        } catch (error) {
            console.error("Generate Referral Code Error:", error);
            throw error;
        }
    }

    /**
     * Helper to generate a unique, cryptographically random voucher code
     * Format: HSREF-ABC123
     */
    generateVoucherCode(prefix = 'HSREF') {
        const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
        return `${prefix}-${rand}`;
    }

    /**
     * Called during Signup.
     * Tracks the referral as PENDING.
     */
    async processReferralSignup(newUser, referralCodeString) {
        try {
            if (!referralCodeString) return null;

            const code = await ReferralCode.findOne({ code: referralCodeString.toUpperCase(), isActive: true });
            if (!code) {
                console.warn(`Invalid referral code used: ${referralCodeString}`);
                return null;
            }

            // Self-referral prevention
            if (code.ownerId.toString() === newUser._id.toString()) {
                console.warn(`Self-referral attempted by ${newUser._id}`);
                return null;
            }

            // Check if user has already been referred
            const existing = await ReferralTracking.findOne({ referredUserId: newUser._id });
            if (existing) return null;

            let program = await ReferralProgram.findById(code.referralProgramId);
            if (!program || !program.isActive) {
                program = await ReferralProgram.findOne({ isActive: true }).sort({ updatedAt: -1 });
            }

            if (!program) {
                console.warn("No active referral program found.");
                return null;
            }

            // Record pending referral tracking
            const tracking = await ReferralTracking.create({
                referrerId: code.ownerId,
                referrerModel: code.ownerType,
                referredUserId: newUser._id,
                referralCodeId: code._id,
                referralProgramId: program._id,
                status: 'pending',
                rewardType: program.rewardType || 'flat',
                rewardValue: program.rewardValue ?? program.rewardAmount ?? 200,
                rewardAmount: program.rewardValue ?? program.rewardAmount ?? 200
            });

            code.usageCount += 1;
            await code.save();

            // Notify Referrer about friend signup
            await notificationService.sendToUser(code.ownerId, {
                title: 'New Referral Signup! 🎉',
                body: `${newUser.name || 'Your friend'} joined GetRightHome using your referral code. You'll receive a Home Services Voucher once they complete their first service booking!`
            }, { type: 'referral_signup' }, code.ownerType === 'Partner' ? 'partner' : 'user');

            return tracking;
        } catch (error) {
            console.error("Process Referral Signup Error:", error);
            return null;
        }
    }

    /**
     * Called when a Home Service booking is COMPLETED.
     * Verifies if this was the referee's first completed Home Service and issues single-use vouchers.
     */
    async processHomeServiceBookingCompletion(userId, bookingId) {
        try {
            if (!userId) return;

            // Find pending referral tracking for this referee
            const referral = await ReferralTracking.findOne({
                referredUserId: userId,
                status: 'pending'
            });

            if (!referral) return;

            // Load active program settings
            let program = await ReferralProgram.findById(referral.referralProgramId);
            if (!program) {
                program = await ReferralProgram.findOne({ isActive: true }).sort({ updatedAt: -1 });
            }
            if (!program) return;

            const validityDays = program.validityDays || 30;
            const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

            const rewardType = program.rewardType || 'flat';
            const rewardValue = program.rewardValue ?? program.rewardAmount ?? 200;
            const minOrderAmount = program.minOrderAmount || 0;
            const maxDiscount = program.maxDiscount || 500;

            // 1. Generate unique single-use voucher for the REFERRER
            const referrerVoucherCode = this.generateVoucherCode('HSREF');
            const referrerVoucher = await HomeServiceVoucher.create({
                code: referrerVoucherCode,
                userId: referral.referrerId,
                source: 'referral',
                referralTrackingId: referral._id,
                title: rewardType === 'percentage' ? `${rewardValue}% OFF Home Services Voucher` : `₹${rewardValue} OFF Home Services Voucher`,
                description: `Earned from referral of your friend. Single-use only on Home Services bookings.`,
                discountType: rewardType,
                discountValue: rewardValue,
                minOrderAmount,
                maxDiscount,
                expiresAt,
                isRedeemed: false
            });

            // 2. Generate welcome voucher for the REFEREE (if configured)
            let refereeVoucher = null;
            const refereeValue = program.refereeRewardValue || 0;
            if (refereeValue > 0) {
                const refereeVoucherCode = this.generateVoucherCode('HSWEL');
                refereeVoucher = await HomeServiceVoucher.create({
                    code: refereeVoucherCode,
                    userId: referral.referredUserId,
                    source: 'welcome',
                    referralTrackingId: referral._id,
                    title: program.refereeRewardType === 'percentage' ? `${refereeValue}% OFF Welcome Voucher` : `₹${refereeValue} OFF Welcome Voucher`,
                    description: `Welcome bonus for your next Home Service booking. Single-use only.`,
                    discountType: program.refereeRewardType || 'flat',
                    discountValue: refereeValue,
                    minOrderAmount,
                    maxDiscount,
                    expiresAt,
                    isRedeemed: false
                });
            }

            // 3. Mark referral as COMPLETED and link vouchers
            referral.status = 'completed';
            referral.completedAt = new Date();
            referral.triggerHomeServiceBookingId = bookingId;
            referral.referrerVoucherId = referrerVoucher._id;
            if (refereeVoucher) {
                referral.refereeVoucherId = refereeVoucher._id;
            }
            referral.voucherCode = referrerVoucherCode;
            await referral.save();

            // 4. Send Notifications
            const rewardDisplay = rewardType === 'percentage' ? `${rewardValue}% OFF` : `₹${rewardValue} OFF`;
            await notificationService.sendToUser(referral.referrerId, {
                title: 'Referral Voucher Unlocked! 🎟️',
                body: `Your friend completed their first service! You've received a ${rewardDisplay} voucher (${referrerVoucherCode}) for your next Home Service booking.`
            }, { type: 'referral_voucher_unlocked' }, referral.referrerModel === 'Partner' ? 'partner' : 'user');

            if (refereeVoucher) {
                const refereeRewardDisplay = (program.refereeRewardType === 'percentage') ? `${refereeValue}% OFF` : `₹${refereeValue} OFF`;
                await notificationService.sendToUser(referral.referredUserId, {
                    title: 'Welcome Reward Unlocked! 🎁',
                    body: `You've received a ${refereeRewardDisplay} voucher (${refereeVoucher.code}) for your next Home Service booking.`
                }, { type: 'welcome_voucher_unlocked' }, 'user');
            }

            return { success: true, referrerVoucher, refereeVoucher };
        } catch (error) {
            console.error("Process Home Service Booking Completion Error:", error);
            return null;
        }
    }

    /**
     * Validates a voucher code for Home Services checkout
     * Enforces single-use, owner matching, expiration date, and minimum order amount.
     */
    async validateVoucher(codeString, userId, orderAmount = 0) {
        try {
            if (!codeString || typeof codeString !== 'string') {
                return { success: false, message: 'Please provide a valid coupon code.' };
            }

            const cleanCode = codeString.trim().toUpperCase();
            const voucher = await HomeServiceVoucher.findOne({ code: cleanCode });

            if (!voucher) {
                return { success: false, message: 'Invalid or unrecognized coupon code.' };
            }

            // Check single-use status
            if (voucher.isRedeemed) {
                return {
                    success: false,
                    message: `This coupon (${cleanCode}) has already been redeemed and can only be used once.`
                };
            }

            // Check expiration
            if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
                return {
                    success: false,
                    message: 'This coupon code has expired.'
                };
            }

            // Check owner (vouchers tied to a specific user)
            if (voucher.userId && userId && voucher.userId.toString() !== userId.toString()) {
                return {
                    success: false,
                    message: 'This voucher belongs to another account.'
                };
            }

            // Check minimum order amount
            const numericOrderAmount = Number(orderAmount) || 0;
            if (voucher.minOrderAmount > 0 && numericOrderAmount < voucher.minOrderAmount) {
                return {
                    success: false,
                    message: `Minimum service order amount of ₹${voucher.minOrderAmount} required to use this voucher.`
                };
            }

            // Calculate exact discount amount
            let discountAmount = 0;
            if (voucher.discountType === 'percentage') {
                const calculated = Math.round((numericOrderAmount * voucher.discountValue) / 100);
                const cap = voucher.maxDiscount || numericOrderAmount;
                discountAmount = Math.min(calculated, cap, numericOrderAmount);
            } else {
                // Flat ₹ discount
                discountAmount = Math.min(voucher.discountValue, numericOrderAmount > 0 ? numericOrderAmount : voucher.discountValue);
            }

            return {
                success: true,
                message: `Coupon ${cleanCode} applied successfully!`,
                voucher: {
                    id: voucher._id,
                    code: voucher.code,
                    title: voucher.title,
                    discountType: voucher.discountType,
                    discountValue: voucher.discountValue,
                    discountAmount,
                    minOrderAmount: voucher.minOrderAmount,
                    maxDiscount: voucher.maxDiscount,
                    expiresAt: voucher.expiresAt
                }
            };
        } catch (error) {
            console.error('Validate Voucher Error:', error);
            return { success: false, message: 'Failed to validate coupon code.' };
        }
    }

    /**
     * Marks a voucher as redeemed when a Home Service booking is confirmed
     */
    async redeemVoucher(codeString, userId, bookingId) {
        try {
            if (!codeString) return null;
            const cleanCode = codeString.trim().toUpperCase();
            const voucher = await HomeServiceVoucher.findOne({ code: cleanCode, isRedeemed: false });
            if (!voucher) return null;

            voucher.isRedeemed = true;
            voucher.redeemedAt = new Date();
            voucher.redeemedBookingId = bookingId;
            await voucher.save();
            return voucher;
        } catch (error) {
            console.error('Redeem Voucher Error:', error);
            return null;
        }
    }

    /**
     * Get all Home Service Vouchers for a user
     */
    async getUserVouchers(userId) {
        try {
            const vouchers = await HomeServiceVoucher.find({ userId })
                .populate('redeemedBookingId', 'bookingNumber finalAmount createdAt')
                .sort({ createdAt: -1 });

            const now = new Date();
            const mapped = vouchers.map(v => {
                let status = 'active';
                if (v.isRedeemed) {
                    status = 'redeemed';
                } else if (v.expiresAt && new Date(v.expiresAt) < now) {
                    status = 'expired';
                }

                return {
                    id: v._id,
                    code: v.code,
                    title: v.title,
                    description: v.description,
                    discountType: v.discountType,
                    discountValue: v.discountValue,
                    minOrderAmount: v.minOrderAmount,
                    maxDiscount: v.maxDiscount,
                    expiresAt: v.expiresAt,
                    status,
                    isRedeemed: v.isRedeemed,
                    redeemedAt: v.redeemedAt,
                    redeemedBooking: v.redeemedBookingId ? {
                        bookingNumber: v.redeemedBookingId.bookingNumber,
                        finalAmount: v.redeemedBookingId.finalAmount
                    } : null,
                    createdAt: v.createdAt
                };
            });

            return mapped;
        } catch (error) {
            console.error('Get User Vouchers Error:', error);
            return [];
        }
    }

    /**
     * Get User Referral Stats for UI
     */
    async getReferralStats(userId) {
        let myCode = await ReferralCode.findOne({ ownerId: userId });

        if (!myCode) {
            const user = await mongoose.model('User').findById(userId);
            if (user) {
                myCode = await this.generateCodeForUser(user);
            }
        }

        const activeProgram = await ReferralProgram.findOne({ isActive: true }).sort({ updatedAt: -1 });
        const invited = myCode ? myCode.usageCount : 0;
        const joined = await ReferralTracking.countDocuments({ referrerId: userId });
        const bookings = await ReferralTracking.countDocuments({ referrerId: userId, status: 'completed' });

        const history = await ReferralTracking.find({ referrerId: userId })
            .populate('referredUserId', 'name email avatar')
            .populate('referrerVoucherId', 'code isRedeemed discountType discountValue')
            .sort({ createdAt: -1 })
            .limit(25);

        const formattedHistory = history.map(h => ({
            id: h._id,
            name: h.referredUserId ? h.referredUserId.name : 'Referred Friend',
            email: h.referredUserId ? h.referredUserId.email : '',
            status: h.status,
            rewardType: h.rewardType || 'flat',
            rewardValue: h.rewardValue || h.rewardAmount || 200,
            voucherCode: h.voucherCode || h.referrerVoucherId?.code || null,
            isVoucherRedeemed: h.referrerVoucherId?.isRedeemed || false,
            date: h.createdAt,
            completedAt: h.completedAt,
            avatar: h.referredUserId && h.referredUserId.name ? h.referredUserId.name.substring(0, 2).toUpperCase() : '??'
        }));

        const userVouchers = await this.getUserVouchers(userId);
        const activeVouchersCount = userVouchers.filter(v => v.status === 'active').length;

        return {
            code: myCode ? myCode.code : '',
            link: myCode ? `https://getrighthome.com/register?ref=${myCode.code}` : '',
            stats: {
                invited,
                joined,
                bookings,
                activeVouchersCount
            },
            program: activeProgram ? {
                rewardType: activeProgram.rewardType || 'flat',
                rewardValue: activeProgram.rewardValue ?? activeProgram.rewardAmount ?? 200,
                validityDays: activeProgram.validityDays || 30,
                minOrderAmount: activeProgram.minOrderAmount || 0
            } : null,
            history: formattedHistory,
            vouchers: userVouchers
        };
    }

}

export default new ReferralService();
