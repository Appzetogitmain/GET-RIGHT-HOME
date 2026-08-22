// utils/subscriptionConstants.js
//
// Vocabulary for the subscription architecture.
//
// Four things are kept as separate axes rather than folded into one "plan type",
// because the acceptance criteria depend on them not leaking into each other:
//
//   PROFILE  who is buying          owner / broker / builder / buyer
//   MODE     what it is for         sale / rental / buyer
//   TIER     how much it gives      basic / premium / relationship_manager / custom
//   SCOPE    what it attaches to    property / account
//
// A Sale subscription must never grant Rental entitlements and vice versa
// (acceptance criteria 5 and 6), which is only enforceable while MODE is its own
// field that both the catalogue and the entitlement resolver filter on.

export const PROFILE_TYPE = {
  OWNER: 'owner',
  BROKER: 'broker',
  BUILDER: 'builder',
  BUYER: 'buyer',
};

/** Sale and Rental are independent categories. Buyer is a separate world again. */
export const SUBSCRIPTION_MODE = {
  SALE: 'sale',
  RENTAL: 'rental',
  BUYER: 'buyer',
};

export const PLAN_TIER = {
  BASIC: 'basic',
  PREMIUM: 'premium',
  RELATIONSHIP_MANAGER: 'relationship_manager',
  CUSTOM: 'custom',
};

/** Default validity per tier. Admin overrides these freely. */
export const TIER_DEFAULT_VALIDITY_DAYS = {
  [PLAN_TIER.BASIC]: 30,
  [PLAN_TIER.PREMIUM]: 90,
  [PLAN_TIER.RELATIONSHIP_MANAGER]: 180,
  [PLAN_TIER.CUSTOM]: 30,
};

/** Durations offered in the admin plan form. */
export const VALIDITY_OPTIONS = [30, 90, 180, 365];

export const SUBSCRIPTION_SCOPE = {
  PROPERTY: 'property',
  ACCOUNT: 'account',
};

export const SUBSCRIPTION_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

export const PAYMENT_TYPE = {
  ONLINE: 'online',
  OFFLINE: 'offline',
};

export const ORDER_STATUS = {
  CREATED: 'created',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

/** Shapes a catalogue feature can take. */
export const FEATURE_TYPE = {
  BOOLEAN: 'boolean',   // Showcase on/off, Verified badge on/off
  NUMERIC: 'numeric',   // Property limit 25, Lead limit 100, Ranking weight 50
  TEXT: 'text',         // Support level "Priority", RM response target
};

/** Which mode a feature may be attached to. */
export const FEATURE_MODE = {
  SALE: 'sale',
  RENTAL: 'rental',
  BOTH: 'both',
};

/**
 * Feature keys the platform itself reads.
 *
 * Admin can create any feature they like; these particular keys additionally
 * drive behaviour in code, so they are seeded and should not be renamed. Every
 * other feature is descriptive and shows on the plan card.
 */
export const SYSTEM_FEATURE_KEYS = {
  PROPERTY_LIMIT: 'property_limit',
  LEAD_LIMIT: 'lead_limit',
  RANKING_WEIGHT: 'ranking_weight',
  SHOWCASE: 'showcase',
  VERIFIED_BADGE: 'verified_badge',
  PRIORITY_PLACEMENT: 'priority_placement',
  ANALYTICS: 'analytics',
  LEAD_CONTACT_ACCESS: 'lead_contact_access',
  DEDICATED_RM: 'dedicated_rm',
  PRIORITY_SUPPORT: 'priority_support',
  SITE_VISIT_COORDINATION: 'site_visit_coordination',
  PROJECT_PROMOTION: 'project_promotion',
};

/** Which modes each profile is allowed to buy. */
export const PROFILE_MODE_MATRIX = {
  [PROFILE_TYPE.OWNER]: [SUBSCRIPTION_MODE.SALE, SUBSCRIPTION_MODE.RENTAL],
  [PROFILE_TYPE.BROKER]: [SUBSCRIPTION_MODE.SALE, SUBSCRIPTION_MODE.RENTAL],
  [PROFILE_TYPE.BUILDER]: [SUBSCRIPTION_MODE.SALE, SUBSCRIPTION_MODE.RENTAL],
  [PROFILE_TYPE.BUYER]: [SUBSCRIPTION_MODE.BUYER],
};

/**
 * The profile a user actually is, taken from their session record.
 *
 * Never derive this from a request parameter — the whole point of acceptance
 * criterion 4 is that a user sees only the plans for their real role.
 * `partner` is the legacy label for builder accounts.
 */
export const resolveProfileType = (user) => {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'partner' || role === 'builder') return PROFILE_TYPE.BUILDER;
  if (role === 'owner') return PROFILE_TYPE.OWNER;
  if (role === 'broker') return PROFILE_TYPE.BROKER;
  return PROFILE_TYPE.BUYER;
};

export const allowedModesFor = (user) =>
  PROFILE_MODE_MATRIX[resolveProfileType(user)] || [];

/**
 * Sale or Rental, decided by the listing itself.
 *
 * Live data uses "Sell" and "Rent / Lease"; older and imported rows use other
 * spellings, so this matches on substrings rather than an exact list.
 */
export const resolveMode = (transactionType) => {
  const t = String(transactionType || '').toLowerCase();
  if (t.includes('rent') || t.includes('lease') || t === 'pg') return SUBSCRIPTION_MODE.RENTAL;
  return SUBSCRIPTION_MODE.SALE;
};

/** Property statuses that may be subscribed against. */
export const SUBSCRIBABLE_PROPERTY_STATUS = ['approved'];

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Days before expiry that renewal reminders go out. */
export const RENEWAL_REMINDER_DAYS = [7, 3, 1];
