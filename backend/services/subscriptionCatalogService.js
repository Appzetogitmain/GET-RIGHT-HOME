// services/subscriptionCatalogService.js
//
// §8 steps 3–4, and acceptance criteria 4, 5, 6.
//
// Which plans a given user may see and buy. The profile comes from the
// authenticated session and the mode comes from the property — neither is ever
// taken from a request parameter. The same guard runs on the catalogue read and
// on order creation, so the list a user sees and the list they may buy from can
// never drift apart.

import mongoose from 'mongoose';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Subscription from '../models/Subscription.js';
import Property from '../models/Property.js';
import {
    SUBSCRIPTION_MODE,
    SUBSCRIPTION_STATUS,
    SUBSCRIBABLE_PROPERTY_STATUS,
    resolveProfileType,
    allowedModesFor,
    resolveMode,
    tierRank,
    FREE_TIER_RANK,
} from '../utils/subscriptionConstants.js';

/**
 * Rank of each live subscription, keyed by subscription id.
 *
 * Read from the plan's price rather than the amount paid, so an admin's ₹0
 * offline assignment of a Premium plan still counts as Premium.
 */
const rankSubscriptions = async (subs) => {
    const planIds = [...new Set(subs.map((s) => String(s.planId)))];
    const plans = await SubscriptionPlan.find({ _id: { $in: planIds } }).select('price').lean();
    const priceOf = Object.fromEntries(plans.map((p) => [String(p._id), p.price]));

    return Object.fromEntries(
        subs.map((s) => [String(s._id), tierRank(s.planTier, priceOf[String(s.planId)])])
    );
};

/**
 * The tier the user is currently on, for the plan cards.
 *
 * Scoped to one listing when the page was opened from that listing's Boost
 * button; otherwise the highest live plan across the user's listings in this
 * mode. No live plan means Free.
 */
const resolveCurrentPlan = async (user, modes, property) => {
    const match = {
        status: SUBSCRIPTION_STATUS.ACTIVE,
        expiryDate: { $gt: new Date() },
        mode: { $in: modes },
    };
    if (property) match.propertyIds = property._id;
    else match.userId = user._id || user.id;

    const subs = await Subscription.find(match).select('planId planTier planName').lean();
    if (!subs.length) return { rank: FREE_TIER_RANK, planId: null, planName: 'Free' };

    const ranks = await rankSubscriptions(subs);
    const top = subs.reduce((best, s) =>
        (ranks[String(s._id)] > ranks[String(best._id)] ? s : best));

    return { rank: ranks[String(top._id)], planId: String(top.planId), planName: top.planName };
};

/**
 * current — the plan the user is on (a ₹0 plan is "current" for a Free user)
 * upgrade — a higher tier: Upgrade Now
 * included — a lower tier the user has already outgrown
 */
const planStateFor = (plan, current) => {
    const rank = tierRank(plan.planTier, plan.price);
    if (current.planId === String(plan._id) || rank === current.rank) return 'current';
    return rank > current.rank ? 'upgrade' : 'included';
};

/**
 * Plans this user may purchase.
 *
 * @param {object} user            authenticated user
 * @param {object} [opts]
 * @param {string} [opts.mode]     narrow to sale / rental — ignored if not permitted
 * @param {string} [opts.propertyId] take the mode from this listing instead
 */
export const getEligiblePlans = async (user, opts = {}) => {
    const userRole = resolveProfileType(user);
    const allowed = allowedModesFor(user);

    if (allowed.length === 0) return { userRole, modes: [], plans: [], property: null };

    let modes = allowed;
    let property = null;

    // A property-scoped request is answered by the listing itself. This is what
    // makes criteria 5 and 6 hold: a rental listing can only ever be offered
    // rental plans, so a sale subscription can never reach rental inventory.
    if (opts.propertyId && mongoose.isValidObjectId(opts.propertyId)) {
        property = await Property.findById(opts.propertyId)
            .select('transactionType userId partnerId status propertyName promotion');

        if (property) {
            const propertyMode = resolveMode(property.transactionType);
            modes = allowed.includes(propertyMode) ? [propertyMode] : [];
        } else {
            modes = [];
        }
    } else if (opts.mode) {
        // Intersect rather than replace, so asking for a mode you aren't
        // entitled to returns nothing instead of everything.
        modes = allowed.includes(opts.mode) ? [opts.mode] : [];
    }

    if (modes.length === 0) return { userRole, modes: [], plans: [], property, currentPlan: null };

    const rawPlans = await SubscriptionPlan.find({
        isActive: true,
        schemaVersion: 2,
        targetRole: userRole,
        mode: { $in: modes },
    })
        .sort({ displayOrder: 1, price: 1 })
        .lean();

    const current = await resolveCurrentPlan(user, modes, property);

    // Ladder order (Free → Basic → Premium → RM); displayOrder/price break ties.
    const plans = rawPlans
        .map((plan) => ({
            ...plan,
            tierRank: tierRank(plan.planTier, plan.price),
            planState: planStateFor(plan, current),
        }))
        .sort((a, b) => a.tierRank - b.tierRank);

    return { userRole, modes, plans, property, currentPlan: current };
};

/**
 * Whether `user` may buy `plan` for the given properties.
 *
 * Returns `{ ok: false, reason }` rather than throwing, so the caller can turn
 * it into a 403 with a message worth showing.
 */
export const assertPurchasable = async (user, plan, propertyIds = []) => {
    if (!plan) return { ok: false, reason: 'Plan not found' };
    if (!plan.isActive) return { ok: false, reason: 'This plan is no longer available' };

    // A version-1 plan has no feature set, so buying one would grant nothing.
    // It can only reach this point if a legacy row picked up the `mode` default.
    if (plan.schemaVersion !== 2) {
        return { ok: false, reason: 'This plan is not available for purchase' };
    }

    const userRole = resolveProfileType(user);

    if (plan.targetRole !== userRole) {
        return { ok: false, reason: 'This plan is not available for your account type' };
    }
    if (!allowedModesFor(user).includes(plan.mode)) {
        return { ok: false, reason: 'Your profile is not eligible for this subscription type' };
    }

    // Buyer membership is account-scoped and attaches to nothing.
    if (plan.mode === SUBSCRIPTION_MODE.BUYER) {
        const existing = await Subscription.findOne({
            userId: user._id || user.id,
            mode: SUBSCRIPTION_MODE.BUYER,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            expiryDate: { $gt: new Date() },
        });
        if (existing) {
            return { ok: false, reason: 'You already have an active membership', existing };
        }
        return { ok: true, properties: [] };
    }

    if (!propertyIds.length) {
        return { ok: false, reason: 'Select at least one property for this subscription' };
    }
    if (propertyIds.length > plan.propertiesPerPurchase) {
        return {
            ok: false,
            reason: `This plan covers up to ${plan.propertiesPerPurchase} ${plan.propertiesPerPurchase === 1 ? 'property' : 'properties'}`,
        };
    }

    const ownerId = String(user._id || user.id);
    const properties = await Property.find({ _id: { $in: propertyIds } })
        .select('userId partnerId transactionType status propertyName');

    if (properties.length !== propertyIds.length) {
        return { ok: false, reason: 'One or more selected properties could not be found' };
    }

    for (const property of properties) {
        if (String(property.userId || property.partnerId || '') !== ownerId) {
            return { ok: false, reason: 'You can only subscribe for your own listings' };
        }

        if (!SUBSCRIBABLE_PROPERTY_STATUS.includes(String(property.status || '').toLowerCase())) {
            return {
                ok: false,
                reason: `"${property.propertyName || 'This listing'}" cannot be subscribed in its current status (${property.status || 'unknown'})`,
            };
        }

        // The mode gate, per listing.
        const propertyMode = resolveMode(property.transactionType);
        if (propertyMode !== plan.mode) {
            return {
                ok: false,
                reason: propertyMode === SUBSCRIPTION_MODE.RENTAL
                    ? `"${property.propertyName || 'This listing'}" is a rental — choose a Rental plan`
                    : `"${property.propertyName || 'This listing'}" is for sale — choose a Sale plan`,
            };
        }

        // One live subscription per listing. Buying a HIGHER tier is an upgrade
        // (the old one is retired at activation); the same or a lower tier is
        // refused so nobody pays twice for what they already have.
        const existing = await Subscription.findOne({
            propertyIds: property._id,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            expiryDate: { $gt: new Date() },
        }).lean();
        if (existing) {
            const ranks = await rankSubscriptions([existing]);
            if (ranks[String(existing._id)] >= tierRank(plan.planTier, plan.price)) {
                return {
                    ok: false,
                    reason: `"${property.propertyName || 'This listing'}" is already on ${existing.planName} until ${new Date(existing.expiryDate).toLocaleDateString('en-IN')} — choose a higher plan to upgrade`,
                    existing,
                };
            }
        }
    }

    return { ok: true, properties };
};

/**
 * The listings a user may still subscribe for, in a given mode.
 *
 * Drives the property picker in §8 step 5, and the Boost / Manage decision on
 * the My Properties card.
 */
export const getSubscribableProperties = async (user, mode) => {
    const ownerId = user._id || user.id;

    const properties = await Property.find({
        $or: [{ userId: ownerId }, { partnerId: ownerId }],
        status: { $in: SUBSCRIBABLE_PROPERTY_STATUS },
    })
        .select('propertyName transactionType status coverImage address promotion')
        .sort({ createdAt: -1 })
        .lean();

    const inMode = properties.filter((p) => resolveMode(p.transactionType) === mode);

    const active = await Subscription.find({
        propertyIds: { $in: inMode.map((p) => p._id) },
        status: SUBSCRIPTION_STATUS.ACTIVE,
        expiryDate: { $gt: new Date() },
    }).lean();

    const ranks = await rankSubscriptions(active);
    const subscribed = {};
    for (const sub of active) {
        for (const id of sub.propertyIds) {
            subscribed[String(id)] = { planName: sub.planName, rank: ranks[String(sub._id)] };
        }
    }

    // The picker uses currentTierRank to let a listing through only for a
    // plan above the one it already holds.
    return inMode.map((p) => {
        const sub = subscribed[String(p._id)];
        return {
            ...p,
            mode,
            hasActiveSubscription: !!sub,
            currentPlanName: sub?.planName || 'Free',
            currentTierRank: sub ? sub.rank : FREE_TIER_RANK,
        };
    });
};

/** Active subscription covering one listing, if any. */
export const getPropertySubscription = async (propertyId) =>
    Subscription.findOne({
        propertyIds: propertyId,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        expiryDate: { $gt: new Date() },
    }).lean();

/** Boost state for many listings at once, keyed by property id. */
export const getSubscriptionMap = async (propertyIds = []) => {
    if (!propertyIds.length) return {};

    const subs = await Subscription.find({
        propertyIds: { $in: propertyIds },
        status: SUBSCRIPTION_STATUS.ACTIVE,
        expiryDate: { $gt: new Date() },
    }).lean();

    const map = {};
    for (const sub of subs) {
        for (const id of sub.propertyIds) {
            map[String(id)] = {
                subscriptionId: sub._id,
                planName: sub.planName,
                planTier: sub.planTier,
                mode: sub.mode,
                expiryDate: sub.expiryDate,
                showcase: !!sub.entitlementSnapshot?.showcase,
                rankingWeight: Number(sub.entitlementSnapshot?.rankingWeight || 0),
            };
        }
    }
    return map;
};
