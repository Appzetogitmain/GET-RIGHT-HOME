// utils/vipAndAdvance.js
//
// Two pricing rules that sit on top of a booking's service price:
//
//   1. VIP membership — offered at checkout. The order amount decides the % off
//      (highest tier reached). A customer who is already a member gets the same
//      % off without paying the fee again.
//   2. Advance payment — a booking below the admin's threshold is paid in full
//      online up front; at or above it only the admin's % is paid up front and
//      the rest is paid after the work.
//
// Everything here is pure: callers pass in the settings document and user.

const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const DEFAULT_ADVANCE_THRESHOLD = 2000;
export const DEFAULT_ADVANCE_PERCENT = 30;

/** Normalised VIP configuration from the Settings document. */
export const getVipConfig = (settings) => {
  const vip = settings?.vip || {};
  const tiers = (Array.isArray(vip.tiers) ? vip.tiers : [])
    .map((t) => ({ minAmount: num(t.minAmount), percent: Math.min(100, Math.max(0, num(t.percent))) }))
    .filter((t) => t.percent > 0)
    .sort((a, b) => a.minAmount - b.minAmount);
  const normalise = (p, i) => ({
    key: `plan-${i + 1}`,
    name: p.name || vip.name || 'VIP Membership',
    price: Math.max(0, num(p.price)),
    originalPrice: Math.max(0, num(p.originalPrice)),
    durationDays: Math.max(1, Math.round(num(p.durationDays, 30)))
  });
  const configured = (Array.isArray(vip.plans) ? vip.plans : []).filter((p) => num(p.durationDays) >= 1 && p.price !== undefined);
  // No plans configured: the single price / duration is the one plan.
  const plans = (configured.length ? configured : [{ name: vip.name, price: vip.price, originalPrice: vip.originalPrice, durationDays: vip.durationDays }])
    .map(normalise);
  const first = plans[0];
  return {
    enabled: vip.enabled === true && tiers.length > 0,
    name: vip.name || first.name,
    price: first.price,
    originalPrice: first.originalPrice,
    durationDays: first.durationDays,
    plans,
    tiers,
    maxDiscount: Math.max(0, num(vip.maxDiscount))
  };
};

export const isVipMember = (user, now = Date.now()) => {
  const vip = user?.hsVip;
  return !!(vip?.isActive && vip.expiry && new Date(vip.expiry).getTime() > now);
};

/** Percent off for an order of `amount`: the highest tier whose minimum it reaches. */
export const vipPercentFor = (config, amount) => {
  let percent = 0;
  for (const tier of config.tiers) {
    if (amount >= tier.minAmount) percent = tier.percent;
  }
  return percent;
};

/**
 * What VIP would do to an order whose discounted service price is `taxableBase`.
 * Returns the % and rupee discount, plus the fee a non-member would pay.
 */
export const computeVip = ({ settings, user, taxableBase, planKey }) => {
  const config = getVipConfig(settings);
  // The plan the customer picked (the first one if none / unknown).
  const plan = config.plans.find((p) => p.key === planKey) || config.plans[0];
  const member = isVipMember(user);
  const base = Math.max(0, num(taxableBase));
  const percent = config.enabled ? vipPercentFor(config, base) : 0;

  let discount = Math.round((base * percent) / 100);
  if (config.maxDiscount > 0) discount = Math.min(discount, config.maxDiscount);
  discount = Math.min(discount, base);

  return {
    enabled: config.enabled,
    isMember: member,
    planKey: plan.key,
    planName: plan.name,
    durationDays: plan.durationDays,
    price: plan.price,
    originalPrice: plan.originalPrice > plan.price ? plan.originalPrice : 0,
    plans: config.plans.map((p) => ({ ...p, originalPrice: p.originalPrice > p.price ? p.originalPrice : 0 })),
    tiers: config.tiers,
    maxPercent: config.tiers.reduce((max, t) => Math.max(max, t.percent), 0),
    percent,
    discount,
    // Members already hold the plan; others pay for it with this booking.
    fee: member ? 0 : plan.price,
    // Worth offering only if it actually saves something on this order.
    eligible: config.enabled && percent > 0 && discount > 0,
    netSaving: discount - (member ? 0 : plan.price)
  };
};

/** Admin-set advance rule, with defaults. */
export const getAdvanceRule = (settings) => ({
  threshold: Math.max(0, num(settings?.advancePaymentThreshold, DEFAULT_ADVANCE_THRESHOLD)),
  percent: Math.min(100, Math.max(1, num(settings?.advancePaymentPercent, DEFAULT_ADVANCE_PERCENT)))
});

/**
 * Splits a service total into what is paid now and what is paid after the work.
 * Below the threshold the whole amount is paid now.
 */
export const splitAdvance = ({ settings, serviceTotal }) => {
  const { threshold, percent } = getAdvanceRule(settings);
  const total = Math.max(0, Math.round(num(serviceTotal)));
  if (total <= 0) return { total, payNow: 0, payLater: 0, full: true, percent: 100, threshold };

  const full = total < threshold;
  // Razorpay won't take less than ₹1.
  const payNow = full ? total : Math.min(total, Math.max(1, Math.ceil((total * percent) / 100)));
  return { total, payNow, payLater: total - payNow, full, percent: full ? 100 : percent, threshold };
};
