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
} from '../utils/subscriptionConstants.js';

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

    if (modes.length === 0) return { userRole, modes: [], plans: [], property };

    const plans = await SubscriptionPlan.find({
        isActive: true,
        targetRole: userRole,
        mode: { $in: modes },
    })
        .sort({ displayOrder: 1, price: 1 })
        .lean();

    return { userRole, modes, plans, property };
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
                reason: `"${property.propertyName || 'This listing'}" is not approved yet — only approved listings can be subscribed`,
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

        // One live subscription per listing. Upgrading is an explicit action,
        // not an accidental second purchase.
        const existing = await Subscription.findOne({
            propertyIds: property._id,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            expiryDate: { $gt: new Date() },
        });
        if (existing) {
            return {
                ok: false,
                reason: `"${property.propertyName || 'This listing'}" already has an active subscription until ${existing.expiryDate.toLocaleDateString('en-IN')}`,
                existing,
            };
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

    const subscribed = new Set();
    for (const sub of active) {
        for (const id of sub.propertyIds) subscribed.add(String(id));
    }

    return inMode.map((p) => ({
        ...p,
        mode,
        hasActiveSubscription: subscribed.has(String(p._id)),
    }));
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
