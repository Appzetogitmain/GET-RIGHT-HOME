import mongoose from 'mongoose';
import {
    PROFILE_TYPE,
    SUBSCRIPTION_MODE,
    PLAN_TIER,
    SUBSCRIPTION_SCOPE,
    TIER_DEFAULT_VALIDITY_DAYS,
    SYSTEM_FEATURE_KEYS,
    resolveMode,
} from '../utils/subscriptionConstants.js';

/**
 * One feature attached to this plan, with the value chosen for it.
 *
 * `featureId` points at the catalogue entry; `key`, `label` and `valueType` are
 * denormalised so a plan still renders (and an entitlement snapshot still reads)
 * if the catalogue entry is later renamed or deactivated.
 */
const planFeatureSchema = new mongoose.Schema({
    featureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Feature', required: true },
    key: { type: String, required: true },
    label: { type: String, default: '' },
    valueType: { type: String, default: 'boolean' },
    value: { type: mongoose.Schema.Types.Mixed, default: false },
    displayOrder: { type: Number, default: 0 },
}, { _id: false });

const subscriptionPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },

    // ── Who / what / how much ────────────────────────────────────────────────
    // §6: profile, mode and tier are the three selections admin makes when
    // creating a plan.
    targetRole: {
        type: String,
        enum: Object.values(PROFILE_TYPE),
        required: true,
        default: PROFILE_TYPE.OWNER,
        index: true,
    },

    // Sale and Rental are independent. A plan belongs to exactly one.
    mode: {
        type: String,
        enum: Object.values(SUBSCRIPTION_MODE),
        required: true,
        default: SUBSCRIPTION_MODE.SALE,
        index: true,
    },

    planTier: {
        type: String,
        enum: Object.values(PLAN_TIER),
        default: PLAN_TIER.BASIC,
        index: true,
    },

    // Property plans attach to listings; buyer membership attaches to the account.
    scope: {
        type: String,
        enum: Object.values(SUBSCRIPTION_SCOPE),
        default: SUBSCRIPTION_SCOPE.PROPERTY,
    },

    price: { type: Number, required: true, min: 0 },

    // §7 — validity in days, admin-configurable, defaulted from the tier.
    durationDays: { type: Number, required: true, min: 1 },

    // How many listings one purchase of this plan may cover. 1 is the norm;
    // a builder pack might cover several.
    propertiesPerPurchase: { type: Number, default: 1, min: 1 },

    // ── Dynamic features (§5) ────────────────────────────────────────────────
    features: { type: [planFeatureSchema], default: [] },

    description: { type: String, trim: true, default: '' },
    tagline: { type: String, trim: true, default: '' },

    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },

    // ── Legacy fields ────────────────────────────────────────────────────────
    // The previous generation of plans. Kept so the existing account-level
    // subscriptions, the listing-eligibility gate and the old admin screen keep
    // working while both systems run side by side.
    maxProperties: { type: Number, default: 1 },
    tier: { type: String, default: 'silver' },
    leadCap: { type: Number, default: 0 },
    hasVerifiedTag: { type: Boolean, default: false },
    commissionPercentage: { type: Number, default: 10, min: 0, max: 100 },
    bannerType: { type: String, enum: ['none', 'locality', 'city'], default: 'none' },
    rankingWeight: { type: Number, default: 1 },
    pauseDaysAllowed: { type: Number, default: 0 },
    listingType: {
        type: String,
        enum: ['all', 'rent', 'buy', 'pg', 'commercial'],
        default: 'all',
    },
}, { timestamps: true });

subscriptionPlanSchema.index({ targetRole: 1, mode: 1, isActive: 1, displayOrder: 1 });

/** Reads a feature value off the plan, or a fallback when it isn't attached. */
subscriptionPlanSchema.methods.feature = function feature(key, fallback = null) {
    const f = this.features?.find((x) => x.key === key);
    return f ? f.value : fallback;
};

subscriptionPlanSchema.pre('save', function syncDerivedFields() {
    // A plan that states a tier but no duration gets the tier's default, so
    // admin never has to remember that Premium means 90 days.
    if (!this.durationDays) {
        this.durationDays = TIER_DEFAULT_VALIDITY_DAYS[this.planTier] || 30;
    }

    // Mirror the feature values the engine reads onto the legacy flat fields.
    // Ranking, listing limits and lead gating all still read these, so keeping
    // them in step means the old code paths keep working untouched.
    const limit = this.feature(SYSTEM_FEATURE_KEYS.PROPERTY_LIMIT, null);
    if (limit != null) this.maxProperties = Number(limit) || 1;

    const leads = this.feature(SYSTEM_FEATURE_KEYS.LEAD_LIMIT, null);
    if (leads != null) this.leadCap = Number(leads) || 0;

    const weight = this.feature(SYSTEM_FEATURE_KEYS.RANKING_WEIGHT, null);
    if (weight != null) this.rankingWeight = Number(weight) || 0;

    const verified = this.feature(SYSTEM_FEATURE_KEYS.VERIFIED_BADGE, null);
    if (verified != null) this.hasVerifiedTag = !!verified;

    // Keep the old listing-type discriminator aligned with the new mode, so a
    // plan created today is still found by anything reading the old field.
    if (this.mode === SUBSCRIPTION_MODE.RENTAL) this.listingType = 'rent';
    else if (this.mode === SUBSCRIPTION_MODE.SALE) this.listingType = 'buy';
});

/**
 * The entitlements to freeze onto a subscription at purchase (§15).
 *
 * Everything the plan grants, flattened to a plain object. Read this on the
 * subscription rather than the live plan, so editing the catalogue later cannot
 * change what somebody already bought.
 */
subscriptionPlanSchema.methods.entitlementSnapshot = function entitlementSnapshot() {
    const values = {};
    for (const f of this.features || []) values[f.key] = f.value;

    return {
        planId: String(this._id),
        planName: this.name,
        planTier: this.planTier,
        mode: this.mode,
        targetRole: this.targetRole,
        scope: this.scope,
        durationDays: this.durationDays,
        price: this.price,
        features: values,
        // Denormalised for the hot paths that must not re-read the catalogue.
        propertyLimit: Number(values[SYSTEM_FEATURE_KEYS.PROPERTY_LIMIT] ?? this.maxProperties ?? 1),
        leadLimit: Number(values[SYSTEM_FEATURE_KEYS.LEAD_LIMIT] ?? this.leadCap ?? 0),
        rankingWeight: Number(values[SYSTEM_FEATURE_KEYS.RANKING_WEIGHT] ?? this.rankingWeight ?? 0),
        showcase: !!values[SYSTEM_FEATURE_KEYS.SHOWCASE],
        verifiedBadge: !!values[SYSTEM_FEATURE_KEYS.VERIFIED_BADGE],
        priorityPlacement: !!values[SYSTEM_FEATURE_KEYS.PRIORITY_PLACEMENT],
        leadContactAccess: values[SYSTEM_FEATURE_KEYS.LEAD_CONTACT_ACCESS] ?? true,
        capturedAt: new Date(),
    };
};

/** Whether this plan may be sold against a property of the given transaction type. */
subscriptionPlanSchema.methods.matchesProperty = function matchesProperty(transactionType) {
    return this.mode === resolveMode(transactionType);
};

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
export default SubscriptionPlan;
