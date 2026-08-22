// utils/subscriptionSeeder.js
//
// Seeds the Feature Catalogue and the recommended commercial setup from §4,
// §7 and §17.
//
// Idempotent: features are matched on key and plans on (role, mode, tier), so
// running it twice changes nothing and it is safe on every boot. Admin edits are
// never overwritten — an existing row is left exactly as it is.

import Feature from '../models/Feature.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import {
    FEATURE_TYPE,
    FEATURE_MODE,
    PROFILE_TYPE,
    SUBSCRIPTION_MODE,
    PLAN_TIER,
    SYSTEM_FEATURE_KEYS as K,
    TIER_DEFAULT_VALIDITY_DAYS,
} from './subscriptionConstants.js';

const N = FEATURE_TYPE.NUMERIC;
const B = FEATURE_TYPE.BOOLEAN;
const T = FEATURE_TYPE.TEXT;

/**
 * The features the platform reads directly. Admin may relabel or reorder these
 * but not delete them or change their value type.
 */
const SYSTEM_FEATURES = [
    { key: K.PROPERTY_LIMIT, label: 'Property posting allowance', valueType: N, unit: 'listings', displayOrder: 10, description: 'How many listings this plan covers.' },
    { key: K.LEAD_LIMIT, label: 'Lead / contact access', valueType: N, unit: 'leads', displayOrder: 20, description: 'Contacts that can be opened per cycle. 0 means unlimited.' },
    { key: K.RANKING_WEIGHT, label: 'Search ranking boost', valueType: N, displayOrder: 30, description: 'Higher values rank the listing above lower ones among matching results.' },
    { key: K.SHOWCASE, label: 'Property showcase', valueType: B, displayOrder: 40, description: 'Featured placement on showcase surfaces.' },
    { key: K.VERIFIED_BADGE, label: 'Verified badge', valueType: B, displayOrder: 50 },
    { key: K.PRIORITY_PLACEMENT, label: 'Priority search placement', valueType: B, displayOrder: 60 },
    { key: K.ANALYTICS, label: 'Property analytics', valueType: T, displayOrder: 70, description: 'None, Basic or Advanced.' },
    { key: K.LEAD_CONTACT_ACCESS, label: 'Lead management', valueType: T, displayOrder: 80, description: 'Basic or Advanced.' },
    { key: K.DEDICATED_RM, label: 'Dedicated Relationship Manager', valueType: B, displayOrder: 90 },
    { key: K.PRIORITY_SUPPORT, label: 'Priority support', valueType: B, displayOrder: 100 },
    { key: K.SITE_VISIT_COORDINATION, label: 'Site-visit coordination', valueType: B, displayOrder: 110 },
    { key: K.PROJECT_PROMOTION, label: 'Project promotion', valueType: B, displayOrder: 120, applicableRoles: [PROFILE_TYPE.BUILDER] },
];

/** Descriptive extras from the §4 table. Admin can freely edit or remove these. */
const OPTIONAL_FEATURES = [
    { key: 'whatsapp_call_lead_access', label: 'WhatsApp / call lead access', valueType: T, displayOrder: 130 },
    { key: 'customer_followup_assistance', label: 'Customer follow-up assistance', valueType: B, displayOrder: 140 },
    { key: 'campaign_promotion_support', label: 'Campaign / promotion support', valueType: B, displayOrder: 150 },
    { key: 'meeting_consultation_support', label: 'Meeting / consultation support', valueType: B, displayOrder: 160 },
    { key: 'rm_response_target', label: 'RM response target', valueType: T, displayOrder: 170 },
];

/** Feature values per tier, following the §4 recommendation. */
const TIER_FEATURES = {
    [PLAN_TIER.BASIC]: {
        [K.PROPERTY_LIMIT]: 1,
        [K.LEAD_LIMIT]: 25,
        [K.RANKING_WEIGHT]: 10,
        [K.SHOWCASE]: false,
        [K.VERIFIED_BADGE]: false,
        [K.PRIORITY_PLACEMENT]: false,
        [K.ANALYTICS]: 'None',
        [K.LEAD_CONTACT_ACCESS]: 'Basic',
        [K.DEDICATED_RM]: false,
        [K.PRIORITY_SUPPORT]: false,
        [K.SITE_VISIT_COORDINATION]: false,
    },
    [PLAN_TIER.PREMIUM]: {
        [K.PROPERTY_LIMIT]: 5,
        [K.LEAD_LIMIT]: 100,
        [K.RANKING_WEIGHT]: 50,
        [K.SHOWCASE]: true,
        [K.VERIFIED_BADGE]: true,
        [K.PRIORITY_PLACEMENT]: true,
        [K.ANALYTICS]: 'Basic',
        [K.LEAD_CONTACT_ACCESS]: 'Advanced',
        [K.DEDICATED_RM]: false,
        [K.PRIORITY_SUPPORT]: false,
        [K.SITE_VISIT_COORDINATION]: false,
    },
    [PLAN_TIER.RELATIONSHIP_MANAGER]: {
        [K.PROPERTY_LIMIT]: 15,
        [K.LEAD_LIMIT]: 0,               // unlimited
        [K.RANKING_WEIGHT]: 100,
        [K.SHOWCASE]: true,
        [K.VERIFIED_BADGE]: true,
        [K.PRIORITY_PLACEMENT]: true,
        [K.ANALYTICS]: 'Advanced',
        [K.LEAD_CONTACT_ACCESS]: 'Advanced',
        [K.DEDICATED_RM]: true,
        [K.PRIORITY_SUPPORT]: true,
        [K.SITE_VISIT_COORDINATION]: true,
    },
};

/**
 * §17 positioning copy. Prices are left at 0 on purpose — the spec is explicit
 * that admin controls pricing, so seeding a number would be inventing one.
 */
const TIER_POSITIONING = {
    [PLAN_TIER.BASIC]: { sale: 'Basic posting with limited leads', rental: 'Basic rental visibility' },
    [PLAN_TIER.PREMIUM]: { sale: 'Higher visibility plus showcase', rental: 'Higher rental visibility plus showcase' },
    [PLAN_TIER.RELATIONSHIP_MANAGER]: { sale: 'Dedicated support and lead assistance', rental: 'Rental lead and service support' },
};

const TIER_LABEL = {
    [PLAN_TIER.BASIC]: 'Basic',
    [PLAN_TIER.PREMIUM]: 'Premium',
    [PLAN_TIER.RELATIONSHIP_MANAGER]: 'Relationship Manager',
};

const MODE_LABEL = {
    [SUBSCRIPTION_MODE.SALE]: 'Sale',
    [SUBSCRIPTION_MODE.RENTAL]: 'Rental',
};

/** Creates any missing features. Existing ones are left untouched. */
const seedFeatures = async () => {
    const all = [
        ...SYSTEM_FEATURES.map((f) => ({ ...f, isSystem: true })),
        ...OPTIONAL_FEATURES.map((f) => ({ ...f, isSystem: false })),
    ];

    let created = 0;
    for (const spec of all) {
        const existing = await Feature.findOne({ key: spec.key });
        if (existing) continue;
        await Feature.create({ mode: FEATURE_MODE.BOTH, applicableRoles: [], ...spec });
        created += 1;
    }
    return created;
};

/** Builds the plan's feature array from the catalogue. */
const featuresForTier = async (tier) => {
    const values = TIER_FEATURES[tier] || {};
    const catalogue = await Feature.find({ key: { $in: Object.keys(values) } });

    return catalogue.map((f) => ({
        featureId: f._id,
        key: f.key,
        label: f.label,
        valueType: f.valueType,
        value: f.coerce(values[f.key]),
        displayOrder: f.displayOrder,
    }));
};

/**
 * Creates the 18 plans of the §17 matrix: three roles × two modes × three tiers.
 * Skips any that already exist.
 */
const seedPlans = async () => {
    const roles = [PROFILE_TYPE.OWNER, PROFILE_TYPE.BROKER, PROFILE_TYPE.BUILDER];
    const modes = [SUBSCRIPTION_MODE.SALE, SUBSCRIPTION_MODE.RENTAL];
    const tiers = [PLAN_TIER.BASIC, PLAN_TIER.PREMIUM, PLAN_TIER.RELATIONSHIP_MANAGER];

    let created = 0;
    let order = 0;

    for (const targetRole of roles) {
        for (const mode of modes) {
            for (const planTier of tiers) {
                order += 1;

                const exists = await SubscriptionPlan.findOne({ targetRole, mode, planTier });
                if (exists) continue;

                const features = await featuresForTier(planTier);

                await SubscriptionPlan.create({
                    name: `${MODE_LABEL[mode]} ${TIER_LABEL[planTier]}`,
                    targetRole,
                    mode,
                    planTier,
                    // Admin sets real pricing; a seeded guess would be worse
                    // than an obvious zero.
                    price: 0,
                    durationDays: TIER_DEFAULT_VALIDITY_DAYS[planTier],
                    propertiesPerPurchase: planTier === PLAN_TIER.BASIC ? 1 : 1,
                    features,
                    tagline: TIER_POSITIONING[planTier]?.[mode] || '',
                    description: `${TIER_LABEL[planTier]} ${MODE_LABEL[mode].toLowerCase()} plan for ${targetRole}s.`,
                    displayOrder: order,
                    isActive: false,   // admin reviews and prices before going live
                });
                created += 1;
            }
        }
    }
    return created;
};

/**
 * Runs both seeds. Called on boot; safe to call repeatedly.
 */
export const seedSubscriptionCatalogue = async ({ withPlans = true } = {}) => {
    try {
        const features = await seedFeatures();
        const plans = withPlans ? await seedPlans() : 0;

        if (features || plans) {
            console.log(`[SubscriptionSeeder] created ${features} feature(s), ${plans} plan(s)`);
        }
        return { features, plans };
    } catch (err) {
        // A seeding failure must never stop the server booting.
        console.error('[SubscriptionSeeder] failed:', err.message);
        return { features: 0, plans: 0, error: err.message };
    }
};

export default seedSubscriptionCatalogue;
