import referralService from '../services/referralService.js';
import ReferralProgram from '../models/ReferralProgram.js';
import ReferralCode from '../models/ReferralCode.js';
import ReferralTracking from '../models/ReferralTracking.js';

export const getMyReferral = async (req, res) => {
    try {
        const data = await referralService.getReferralStats(req.user._id);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Get My Referral Error:', error);
        res.status(500).json({ message: 'Failed to fetch referral data' });
    }
};

export const createReferralProgram = async (req, res) => {
    try {
        // Only one program should be "active" at a time — the user-facing page and
        // the reward-crediting logic both rely on a single unambiguous active program.
        if (req.body.isActive) {
            await ReferralProgram.updateMany({}, { $set: { isActive: false } });
        }
        const program = await ReferralProgram.create(req.body);
        res.status(201).json({ success: true, program });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getActiveProgram = async (req, res) => {
    try {
        const program = await ReferralProgram.findOne({ isActive: true }).sort({ updatedAt: -1 });
        res.json({ success: true, program });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ── Admin Management ──────────────────────────────────────────────

export const getAllReferralPrograms = async (req, res) => {
    try {
        const programs = await ReferralProgram.find().sort({ createdAt: -1 });
        res.json({ success: true, programs });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateReferralProgram = async (req, res) => {
    try {
        const { id } = req.params;

        // Enforce single-active-program invariant when activating this one.
        if (req.body.isActive) {
            await ReferralProgram.updateMany({ _id: { $ne: id } }, { $set: { isActive: false } });
        }

        const program = await ReferralProgram.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!program) {
            return res.status(404).json({ success: false, message: 'Referral program not found' });
        }
        res.json({ success: true, program });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteReferralProgram = async (req, res) => {
    try {
        const program = await ReferralProgram.findByIdAndDelete(req.params.id);
        if (!program) {
            return res.status(404).json({ success: false, message: 'Referral program not found' });
        }
        res.json({ success: true, message: 'Referral program deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getReferralAdminStats = async (req, res) => {
    try {
        const [totalReferrals, completedReferrals, pendingReferrals, payoutAgg, recent] = await Promise.all([
            ReferralTracking.countDocuments(),
            ReferralTracking.countDocuments({ status: 'completed' }),
            ReferralTracking.countDocuments({ status: 'pending' }),
            ReferralTracking.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$rewardAmount' } } }
            ]),
            ReferralTracking.find()
                .populate('referredUserId', 'name email')
                .sort({ createdAt: -1 })
                .limit(50)
        ]);

        res.json({
            success: true,
            stats: {
                totalReferrals,
                completedReferrals,
                pendingReferrals,
                totalPayout: payoutAgg[0]?.total || 0
            },
            recent: recent.map(r => ({
                id: r._id,
                referrerId: r.referrerId,
                referrerModel: r.referrerModel,
                referredUser: r.referredUserId ? { name: r.referredUserId.name, email: r.referredUserId.email } : null,
                status: r.status,
                rewardAmount: r.rewardAmount,
                createdAt: r.createdAt,
                completedAt: r.completedAt
            }))
        });
    } catch (error) {
        console.error('Get Referral Admin Stats Error:', error);
        res.status(500).json({ message: error.message });
    }
};

export const generateCustomCode = async (req, res) => {
    try {
        const { code, userId, role } = req.body;
        // Admin only function
        const newCode = await ReferralCode.create({
            code: code.toUpperCase(),
            ownerId: userId, // ID of user receiving the code
            ownerType: role === 'partner' ? 'Partner' : 'User',
            isActive: true,
            isCustom: true
        });
        res.json({ success: true, code: newCode });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
