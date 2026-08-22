// controllers/adminSubscriptionController.js
//
// §11 and §12 — the admin management surface.
//
// Today's admin panel can only edit the plan catalogue; it cannot see, assign,
// extend or cancel a purchased subscription. This adds all of that, plus the
// dynamic Feature Catalogue that makes plans configurable without code changes.
//
// Every state-changing action writes an audit row. Extending an expiry date
// moves money-equivalent value, so it must never be a silent edit.

import mongoose from 'mongoose';
import Feature, { slugifyFeatureKey } from '../models/Feature.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Subscription from '../models/Subscription.js';
import SubscriptionAudit, { recordAudit } from '../models/SubscriptionAudit.js';
import User from '../models/User.js';
import Partner from '../models/Partner.js';
import Property from '../models/Property.js';
import {
    activateSubscription,
    clearPromotionFromProperties,
    applyPromotionToProperties,
    expireSubscription,
} from '../services/subscriptionActivationService.js';
import {
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_MODE,
    PAYMENT_TYPE,
    PLAN_TIER,
    TIER_DEFAULT_VALIDITY_DAYS,
    VALIDITY_OPTIONS,
    FEATURE_TYPE,
    FEATURE_MODE,
    PROFILE_TYPE,
    SYSTEM_FEATURE_KEYS,
    resolveMode,
    MS_PER_DAY,
} from '../utils/subscriptionConstants.js';

const actor = (req) => ({
    performedBy: req.user?._id || req.user?.id || null,
    performedByName: req.user?.name || '',
    performedByRole: req.user?.role || '',
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE CATALOGUE (§5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    All features, including inactive ones
 * @route   GET /api/admin/subscriptions/features
 */
export const listFeatures = async (req, res) => {
    try {
        const features = await Feature.find().sort({ displayOrder: 1, label: 1 }).lean();
        res.json({
            success: true,
            features,
            meta: {
                valueTypes: Object.values(FEATURE_TYPE),
                modes: Object.values(FEATURE_MODE),
                roles: Object.values(PROFILE_TYPE),
                systemKeys: Object.values(SYSTEM_FEATURE_KEYS),
            },
        });
    } catch (error) {
        console.error('List features error:', error);
        res.status(500).json({ success: false, message: 'Failed to load features' });
    }
};

/**
 * @desc    Create a feature — acceptance criterion 1
 * @route   POST /api/admin/subscriptions/features
 */
export const createFeature = async (req, res) => {
    try {
        const { label, description, valueType, mode, applicableRoles, unit, displayOrder } = req.body;

        if (!label?.trim()) {
            return res.status(400).json({ success: false, message: 'Give the feature a name' });
        }

        const key = slugifyFeatureKey(label);
        if (!key) {
            return res.status(400).json({ success: false, message: 'That name cannot be used — try letters and numbers' });
        }

        if (await Feature.findOne({ key })) {
            return res.status(409).json({ success: false, message: 'A feature with this name already exists' });
        }

        const feature = await Feature.create({
            key,
            label: label.trim(),
            description: description || '',
            valueType: valueType || FEATURE_TYPE.BOOLEAN,
            mode: mode || FEATURE_MODE.BOTH,
            applicableRoles: Array.isArray(applicableRoles) ? applicableRoles : [],
            unit: unit || '',
            displayOrder: Number(displayOrder) || 0,
            isSystem: false,
        });

        await recordAudit({ action: 'feature_created', after: feature.toObject(), ...actor(req) });

        res.status(201).json({ success: true, feature });
    } catch (error) {
        console.error('Create feature error:', error);
        res.status(500).json({ success: false, message: 'Failed to create feature' });
    }
};

/**
 * @desc    Update a feature
 * @route   PUT /api/admin/subscriptions/features/:id
 *
 * The key is never editable. Plans and frozen entitlement snapshots reference
 * features by key, so renaming one would orphan every plan using it.
 */
export const updateFeature = async (req, res) => {
    try {
        const feature = await Feature.findById(req.params.id);
        if (!feature) return res.status(404).json({ success: false, message: 'Feature not found' });

        const before = feature.toObject();
        const { label, description, valueType, mode, applicableRoles, unit, displayOrder, isActive } = req.body;

        if (label != null) feature.label = String(label).trim();
        if (description != null) feature.description = description;
        if (mode != null) feature.mode = mode;
        if (applicableRoles != null) feature.applicableRoles = applicableRoles;
        if (unit != null) feature.unit = unit;
        if (displayOrder != null) feature.displayOrder = Number(displayOrder) || 0;
        if (isActive != null) feature.isActive = !!isActive;

        // Changing the value type of a system feature would break the code that
        // reads it; changing it on any feature invalidates the values already
        // stored on plans, so it is only allowed while nothing uses it.
        if (valueType != null && valueType !== feature.valueType) {
            if (feature.isSystem) {
                return res.status(400).json({ success: false, message: 'The value type of a built-in feature cannot be changed' });
            }
            const inUse = await SubscriptionPlan.countDocuments({ 'features.key': feature.key });
            if (inUse > 0) {
                return res.status(400).json({
                    success: false,
                    message: `This feature is used by ${inUse} plan(s). Remove it from them before changing its value type.`,
                });
            }
            feature.valueType = valueType;
        }

        await feature.save();
        await recordAudit({ action: 'feature_updated', before, after: feature.toObject(), ...actor(req) });

        res.json({ success: true, feature });
    } catch (error) {
        console.error('Update feature error:', error);
        res.status(500).json({ success: false, message: 'Failed to update feature' });
    }
};

/**
 * @desc    Deactivate a feature and detach it from every plan
 * @route   DELETE /api/admin/subscriptions/features/:id
 *
 * Built-in features are never removable — the platform reads them directly.
 * Already-purchased subscriptions keep their frozen copy either way (§15).
 */
export const deleteFeature = async (req, res) => {
    try {
        const feature = await Feature.findById(req.params.id);
        if (!feature) return res.status(404).json({ success: false, message: 'Feature not found' });

        if (feature.isSystem) {
            return res.status(400).json({
                success: false,
                message: 'This is a built-in feature and cannot be removed. You can deactivate it instead.',
            });
        }

        const before = feature.toObject();
        feature.isActive = false;
        await feature.save();

        const detached = await SubscriptionPlan.updateMany(
            { 'features.key': feature.key },
            { $pull: { features: { key: feature.key } } }
        );

        await recordAudit({
            action: 'feature_deactivated',
            before,
            after: { isActive: false, detachedFromPlans: detached.modifiedCount },
            ...actor(req),
        });

        res.json({
            success: true,
            message: `Feature removed from ${detached.modifiedCount} plan(s)`,
        });
    } catch (error) {
        console.error('Delete feature error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove feature' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PLANS (§6)
// ─────────────────────────────────────────────────────────────────────────────

/** Resolves incoming {key|featureId, value} pairs against the catalogue. */
const buildPlanFeatures = async (input = []) => {
    if (!Array.isArray(input) || input.length === 0) return [];

    const keys = input.map((f) => f.key).filter(Boolean);
    const ids = input.map((f) => f.featureId).filter((id) => mongoose.isValidObjectId(id));

    const catalogue = await Feature.find({
        $or: [{ key: { $in: keys } }, { _id: { $in: ids } }],
    });

    const byKey = new Map(catalogue.map((f) => [f.key, f]));
    const byId = new Map(catalogue.map((f) => [String(f._id), f]));

    const resolved = [];
    for (const item of input) {
        const feature = byKey.get(item.key) || byId.get(String(item.featureId));
        if (!feature) continue;   // silently drop unknown features rather than 500

        resolved.push({
            featureId: feature._id,
            key: feature.key,
            label: feature.label,
            valueType: feature.valueType,
            value: feature.coerce(item.value),
            displayOrder: feature.displayOrder,
        });
    }
    return resolved;
};

/**
 * @desc    Every plan, with filters
 * @route   GET /api/admin/subscriptions/plans
 */
export const listPlans = async (req, res) => {
    try {
        const { mode, role, tier, isActive } = req.query;
        const query = {};
        if (mode) query.mode = mode;
        if (role) query.targetRole = role;
        if (tier) query.planTier = tier;
        if (isActive != null && isActive !== '') query.isActive = isActive === 'true';

        const plans = await SubscriptionPlan.find(query)
            .sort({ mode: 1, targetRole: 1, displayOrder: 1, price: 1 })
            .lean();

        // Show admin how many people are on each plan before they edit it.
        const counts = await Subscription.aggregate([
            { $match: { status: SUBSCRIPTION_STATUS.ACTIVE, expiryDate: { $gt: new Date() } } },
            { $group: { _id: '$planId', n: { $sum: 1 } } },
        ]);
        const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));

        res.json({
            success: true,
            plans: plans.map((p) => ({ ...p, activeSubscribers: countMap[String(p._id)] || 0 })),
            meta: {
                modes: Object.values(SUBSCRIPTION_MODE),
                roles: Object.values(PROFILE_TYPE),
                tiers: Object.values(PLAN_TIER),
                validityOptions: VALIDITY_OPTIONS,
                tierDefaults: TIER_DEFAULT_VALIDITY_DAYS,
            },
        });
    } catch (error) {
        console.error('List plans error:', error);
        res.status(500).json({ success: false, message: 'Failed to load plans' });
    }
};

/**
 * @desc    Create a plan — acceptance criteria 2 and 3
 * @route   POST /api/admin/subscriptions/plans
 */
export const createPlan = async (req, res) => {
    try {
        const {
            name, targetRole, mode, planTier, price, durationDays,
            propertiesPerPurchase, features, description, tagline, displayOrder, isActive,
        } = req.body;

        if (!name?.trim()) return res.status(400).json({ success: false, message: 'Give the plan a name' });
        if (!Object.values(PROFILE_TYPE).includes(targetRole)) {
            return res.status(400).json({ success: false, message: 'Choose who this plan is for' });
        }
        if (!Object.values(SUBSCRIPTION_MODE).includes(mode)) {
            return res.status(400).json({ success: false, message: 'Choose Sale, Rental or Buyer' });
        }
        if (price == null || Number(price) < 0) {
            return res.status(400).json({ success: false, message: 'Set a price (0 is allowed for a free plan)' });
        }

        const tier = planTier || PLAN_TIER.BASIC;

        const plan = await SubscriptionPlan.create({
            name: name.trim(),
            targetRole,
            mode,
            planTier: tier,
            price: Number(price),
            durationDays: Number(durationDays) || TIER_DEFAULT_VALIDITY_DAYS[tier] || 30,
            propertiesPerPurchase: Math.max(1, Number(propertiesPerPurchase) || 1),
            features: await buildPlanFeatures(features),
            description: description || '',
            tagline: tagline || '',
            displayOrder: Number(displayOrder) || 0,
            isActive: isActive !== false,
        });

        await recordAudit({ planId: plan._id, action: 'plan_created', after: plan.toObject(), ...actor(req) });

        res.status(201).json({ success: true, plan });
    } catch (error) {
        console.error('Create plan error:', error);
        res.status(500).json({ success: false, message: 'Failed to create plan' });
    }
};

/**
 * @desc    Update a plan
 * @route   PUT /api/admin/subscriptions/plans/:id
 *
 * Editing a plan changes only what is sold from now on. Everyone who already
 * bought it keeps the entitlements frozen onto their subscription (§15,
 * acceptance criterion 16) — nothing here touches those.
 */
export const updatePlan = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

        const before = plan.toObject();
        const fields = ['name', 'targetRole', 'mode', 'planTier', 'price', 'durationDays',
            'propertiesPerPurchase', 'description', 'tagline', 'displayOrder', 'isActive'];

        for (const f of fields) {
            if (req.body[f] !== undefined) plan[f] = req.body[f];
        }
        if (req.body.features !== undefined) {
            plan.features = await buildPlanFeatures(req.body.features);
        }

        await plan.save();
        await recordAudit({ planId: plan._id, action: 'plan_updated', before, after: plan.toObject(), ...actor(req) });

        const activeSubscribers = await Subscription.countDocuments({
            planId: plan._id,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            expiryDate: { $gt: new Date() },
        });

        res.json({
            success: true,
            plan,
            note: activeSubscribers > 0
                ? `${activeSubscribers} active subscriber(s) keep the benefits they purchased. This change applies to new purchases only.`
                : undefined,
        });
    } catch (error) {
        console.error('Update plan error:', error);
        res.status(500).json({ success: false, message: 'Failed to update plan' });
    }
};

/**
 * @desc    Deactivate a plan (never hard-deleted — subscriptions reference it)
 * @route   DELETE /api/admin/subscriptions/plans/:id
 */
export const deactivatePlan = async (req, res) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

        plan.isActive = false;
        await plan.save();

        await recordAudit({ planId: plan._id, action: 'plan_deactivated', before: { isActive: true }, after: { isActive: false }, ...actor(req) });

        const active = await Subscription.countDocuments({
            planId: plan._id,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            expiryDate: { $gt: new Date() },
        });

        res.json({
            success: true,
            message: active > 0
                ? `Plan hidden from the catalogue. ${active} existing subscription(s) continue until they expire.`
                : 'Plan hidden from the catalogue.',
        });
    } catch (error) {
        console.error('Deactivate plan error:', error);
        res.status(500).json({ success: false, message: 'Failed to deactivate plan' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS (§11)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Purchased subscriptions, filterable — acceptance criterion 15
 * @route   GET /api/admin/subscriptions
 *
 * Filters: role, mode, plan, status, payment type, city, property, expiry range.
 */
export const listSubscriptions = async (req, res) => {
    try {
        const {
            role, mode, planId, status, paymentType, city, propertyId,
            expiringBefore, expiringAfter, search,
            page = 1, limit = 25,
        } = req.query;

        const query = {};
        if (role) query.userRole = role;
        if (mode) query.mode = mode;
        if (status) query.status = status;
        if (paymentType) query.paymentType = paymentType;
        if (mongoose.isValidObjectId(planId)) query.planId = planId;
        if (mongoose.isValidObjectId(propertyId)) query.propertyIds = propertyId;

        if (expiringBefore || expiringAfter) {
            query.expiryDate = {};
            if (expiringAfter) query.expiryDate.$gte = new Date(expiringAfter);
            if (expiringBefore) query.expiryDate.$lte = new Date(expiringBefore);
        }

        // Location is on the property, so filter by resolving matching listings
        // first rather than joining on every subscription.
        if (city) {
            const inCity = await Property.find({ 'address.city': new RegExp(`^${city}$`, 'i') }).select('_id').lean();
            query.propertyIds = { $in: inCity.map((p) => p._id) };
        }

        if (search) {
            const rx = new RegExp(search.trim(), 'i');
            query.$or = [{ subscriptionId: rx }, { planName: rx }];
        }

        const perPage = Math.min(100, Math.max(1, Number(limit)));
        const skip = (Math.max(1, Number(page)) - 1) * perPage;

        const [subscriptions, total] = await Promise.all([
            Subscription.find(query)
                .populate('userId', 'name email phone role')
                .populate('propertyIds', 'propertyName address transactionType status')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(perPage)
                .lean(),
            Subscription.countDocuments(query),
        ]);

        res.json({
            success: true,
            subscriptions,
            pagination: { page: Number(page), limit: perPage, total, pages: Math.ceil(total / perPage) },
        });
    } catch (error) {
        console.error('List subscriptions error:', error);
        res.status(500).json({ success: false, message: 'Failed to load subscriptions' });
    }
};

/**
 * @desc    Counts for the Sale / Rental / Buyer tabs
 * @route   GET /api/admin/subscriptions/summary
 */
export const getSummary = async (req, res) => {
    try {
        const now = new Date();
        const soon = new Date(now.getTime() + 7 * MS_PER_DAY);

        const [byMode, byStatus, expiringSoon, revenue] = await Promise.all([
            Subscription.aggregate([
                { $match: { status: SUBSCRIPTION_STATUS.ACTIVE, expiryDate: { $gt: now } } },
                { $group: { _id: '$mode', count: { $sum: 1 }, revenue: { $sum: '$amount' } } },
            ]),
            Subscription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Subscription.countDocuments({
                status: SUBSCRIPTION_STATUS.ACTIVE,
                expiryDate: { $gt: now, $lte: soon },
            }),
            Subscription.aggregate([
                { $match: { status: { $ne: SUBSCRIPTION_STATUS.CANCELLED } } },
                {
                    $group: {
                        _id: '$paymentType',
                        total: { $sum: '$amount' },
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        res.json({
            success: true,
            byMode: Object.fromEntries(byMode.map((m) => [m._id, { count: m.count, revenue: m.revenue }])),
            byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
            expiringSoon,
            revenue: Object.fromEntries(revenue.map((r) => [r._id, { total: r.total, count: r.count }])),
        });
    } catch (error) {
        console.error('Subscription summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to load summary' });
    }
};

/**
 * @desc    Manually assign an offline subscription — §12
 * @route   POST /api/admin/subscriptions/assign
 *
 * Produces exactly the same entitlements as an online purchase; only the
 * payment record differs.
 */
export const assignOfflineSubscription = async (req, res) => {
    try {
        const {
            userId, planId, propertyIds = [],
            startDate, expiryDate, amount, referenceNumber, notes,
        } = req.body;

        if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(planId)) {
            return res.status(400).json({ success: false, message: 'Choose a user and a plan' });
        }

        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

        let subject = await User.findById(userId).select('name role email');
        let model = 'User';
        if (!subject) {
            subject = await Partner.findById(userId).select('name role email');
            model = 'Partner';
        }
        if (!subject) return res.status(404).json({ success: false, message: 'User not found' });

        // The same role and mode rules the self-serve path enforces — an admin
        // assigning a plan must not be able to bypass criteria 4, 5 and 6.
        const pseudoUser = { _id: subject._id, id: subject._id, role: subject.role };
        const ids = (Array.isArray(propertyIds) ? propertyIds : [propertyIds]).filter(Boolean);

        if (plan.targetRole !== (model === 'Partner' ? 'builder' : String(subject.role).toLowerCase())) {
            // Allow it, but say so plainly — admin may legitimately be fixing
            // an account whose role changed after purchase.
            console.warn(`[Admin] assigning ${plan.targetRole} plan to ${subject.role} account ${subject._id}`);
        }

        if (plan.mode !== SUBSCRIPTION_MODE.BUYER) {
            if (!ids.length) {
                return res.status(400).json({ success: false, message: 'Select at least one property' });
            }
            const properties = await Property.find({ _id: { $in: ids } }).select('transactionType propertyName');
            for (const property of properties) {
                if (resolveMode(property.transactionType) !== plan.mode) {
                    return res.status(400).json({
                        success: false,
                        message: `"${property.propertyName}" does not match this plan's ${plan.mode} type`,
                    });
                }
            }
        }

        const subscription = await activateSubscription({
            plan,
            subject: { _id: subject._id, role: pseudoUser.role, model },
            propertyIds: ids,
            paymentType: PAYMENT_TYPE.OFFLINE,
            startDate,
            expiryDate,
            amount: amount != null ? Number(amount) : plan.price,
            offlinePayment: {
                referenceNumber: referenceNumber || '',
                notes: notes || '',
                collectedBy: req.user?._id || req.user?.id || null,
            },
            createdBy: req.user?._id || req.user?.id || null,
            createdByAdmin: true,
        });

        await recordAudit({
            subscriptionId: subscription._id,
            action: 'assigned_offline',
            after: {
                plan: plan.name,
                user: subject.name,
                amount: subscription.amount,
                expiryDate: subscription.expiryDate,
                referenceNumber,
            },
            reason: notes || '',
            ...actor(req),
        });

        res.status(201).json({ success: true, subscription });
    } catch (error) {
        console.error('Assign offline subscription error:', error);
        res.status(500).json({ success: false, message: 'Failed to assign subscription' });
    }
};

/**
 * @desc    Extend or change an expiry date — §11
 * @route   PATCH /api/admin/subscriptions/:id/extend
 *
 * Accepts either a number of days to add or an explicit new date.
 */
export const extendSubscription = async (req, res) => {
    try {
        const { days, newExpiryDate, reason } = req.body;

        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });

        const previous = subscription.expiryDate;

        if (newExpiryDate) {
            subscription.expiryDate = new Date(newExpiryDate);
        } else if (days != null) {
            const n = Number(days);
            if (!Number.isFinite(n) || n === 0) {
                return res.status(400).json({ success: false, message: 'Enter how many days to add' });
            }
            // Extend from today when it has already lapsed, otherwise from the
            // existing end date — adding 30 days to a date in the past would
            // otherwise still leave it expired.
            const base = subscription.expiryDate > new Date() ? subscription.expiryDate : new Date();
            subscription.expiryDate = new Date(base.getTime() + n * MS_PER_DAY);
        } else {
            return res.status(400).json({ success: false, message: 'Enter days to add, or a new expiry date' });
        }

        // Reviving a lapsed subscription restores its entitlements too.
        const revived = subscription.status !== SUBSCRIPTION_STATUS.ACTIVE &&
            subscription.expiryDate > new Date();
        if (revived) {
            subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
            subscription.expiredAt = null;
        }
        await subscription.save();

        if (revived) await applyPromotionToProperties(subscription);
        else await Property.updateMany(
            { _id: { $in: subscription.propertyIds }, 'promotion.subscriptionId': subscription._id },
            { $set: { 'promotion.expiryDate': subscription.expiryDate } }
        );

        await recordAudit({
            subscriptionId: subscription._id,
            action: revived ? 'reactivated' : 'extended',
            before: { expiryDate: previous, status: revived ? SUBSCRIPTION_STATUS.EXPIRED : subscription.status },
            after: { expiryDate: subscription.expiryDate, status: subscription.status },
            reason: reason || '',
            ...actor(req),
        });

        res.json({ success: true, subscription });
    } catch (error) {
        console.error('Extend subscription error:', error);
        res.status(500).json({ success: false, message: 'Failed to extend subscription' });
    }
};

/**
 * @desc    Cancel a subscription and stop its paid entitlements
 * @route   PATCH /api/admin/subscriptions/:id/cancel
 */
export const cancelSubscription = async (req, res) => {
    try {
        const { reason } = req.body;

        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });

        if (subscription.status === SUBSCRIPTION_STATUS.CANCELLED) {
            return res.json({ success: true, message: 'Already cancelled', subscription });
        }

        const before = subscription.status;
        subscription.status = SUBSCRIPTION_STATUS.CANCELLED;
        subscription.cancelledAt = new Date();
        subscription.cancelReason = reason || '';
        await subscription.save();

        // Paid benefits stop; the listing and its history stay (§9, §16).
        await clearPromotionFromProperties(subscription);

        await recordAudit({
            subscriptionId: subscription._id,
            action: 'cancelled',
            before: { status: before },
            after: { status: SUBSCRIPTION_STATUS.CANCELLED },
            reason: reason || '',
            ...actor(req),
        });

        res.json({ success: true, subscription });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel subscription' });
    }
};

/**
 * @desc    Audit history for one subscription
 * @route   GET /api/admin/subscriptions/:id/audit
 */
export const getSubscriptionAudit = async (req, res) => {
    try {
        const entries = await SubscriptionAudit.find({ subscriptionId: req.params.id })
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, entries });
    } catch (error) {
        console.error('Get audit error:', error);
        res.status(500).json({ success: false, message: 'Failed to load history' });
    }
};

/**
 * @desc    Users an admin can assign a subscription to, for the picker in §12
 * @route   GET /api/admin/subscriptions/users?search=&role=
 */
export const searchAssignableUsers = async (req, res) => {
    try {
        const { search = '', role } = req.query;
        const query = { role: { $in: ['owner', 'broker', 'builder', 'partner'] } };
        if (role) query.role = role;

        if (search.trim()) {
            const rx = new RegExp(search.trim(), 'i');
            query.$or = [{ name: rx }, { email: rx }, { phone: rx }];
        }

        const users = await User.find(query).select('name email phone role').limit(25).lean();
        res.json({ success: true, users });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ success: false, message: 'Failed to search users' });
    }
};

/**
 * @desc    A user's approved listings, for the property picker in §12
 * @route   GET /api/admin/subscriptions/users/:userId/properties?mode=
 */
export const getUserProperties = async (req, res) => {
    try {
        const { mode } = req.query;

        const properties = await Property.find({
            $or: [{ userId: req.params.userId }, { partnerId: req.params.userId }],
            status: 'approved',
        })
            .select('propertyName transactionType status address promotion')
            .sort({ createdAt: -1 })
            .lean();

        const withMode = properties.map((p) => ({ ...p, mode: resolveMode(p.transactionType) }));

        res.json({
            success: true,
            properties: mode ? withMode.filter((p) => p.mode === mode) : withMode,
        });
    } catch (error) {
        console.error('Get user properties error:', error);
        res.status(500).json({ success: false, message: 'Failed to load properties' });
    }
};
