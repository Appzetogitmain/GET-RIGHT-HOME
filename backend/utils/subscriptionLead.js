// utils/subscriptionLead.js
//
// "Subscription leads": when a lister is blocked by the paywall (free access
// ended, free listing limit reached, or no free access at all) admin gets an
// Enquiry with actionType 'subscription_required' so sales can follow up.
//
// Rules:
//  - Server-side only; callers fire-and-forget (see safeRecordSubscriptionLead)
//    so a lead can never block or slow the user's submit/redirect.
//  - One OPEN lead per user. A repeat attempt refreshes it (reason, usage,
//    attempt count, last-attempt time) instead of adding a duplicate. Once
//    admin closes it, the next blocked attempt opens a fresh lead.
//  - Like boost leads: targetType 'general', no propertyId — so it never shows
//    in an owner's "received enquiries" and never touches lead counters.

import Enquiry from '../models/Enquiry.js';
import { SUBSCRIBED_ROLES } from './listingEligibility.js';

export const SUBSCRIPTION_LEAD_ACTION = 'subscription_required';

// Admin statuses that mean "handled" — a new block after one of these opens a new lead.
export const RESOLVED_LEAD_STATUSES = ['closed', 'sold', 'rented', 'dropped'];

// Serialises concurrent calls for the same user inside this process so two
// tabs hitting the paywall together can't both insert a lead.
const inflight = new Map();

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const describe = (user, eligibility) => {
  const who = `${user.name || 'Builder'} (${user.role})`;
  let why;
  if (eligibility.reason === 'trial_expired') {
    why = `free access ended${eligibility.trialEndsAt ? ` on ${fmtDate(eligibility.trialEndsAt)}` : ''}`;
  } else if (eligibility.reason === 'limit_reached') {
    why = eligibility.maxAllowed != null
      ? `free listing limit reached (${eligibility.currentCount}/${eligibility.maxAllowed} listings used)`
      : 'listing limit reached';
  } else {
    why = 'no free access — a subscription is required';
  }
  return `${who}: ${why}. Needs a subscription to keep listing properties.`;
};

const doRecord = async (user, eligibility, ctx) => {
  const now = new Date();
  const details = {
    reason: eligibility.reason,
    mode: eligibility.mode || '',
    role: user.role || '',
    currentCount: eligibility.currentCount || 0,
    maxAllowed: eligibility.maxAllowed ?? null,
    trialEndsAt: eligibility.trialEndsAt || null,
    lastAttemptAt: now
  };
  const message = describe(user, eligibility);
  const sourceUrl = ctx.propertyId ? `/property/${ctx.propertyId}` : (ctx.sourceUrl || '');

  const existing = await Enquiry.findOne({
    userId: user._id,
    actionType: SUBSCRIPTION_LEAD_ACTION,
    status: { $nin: RESOLVED_LEAD_STATUSES }
  }).sort({ createdAt: -1 });

  if (existing) {
    const set = { message, 'subscriptionLead.lastAttemptAt': now };
    for (const [k, v] of Object.entries(details)) {
      if (k !== 'lastAttemptAt') set[`subscriptionLead.${k}`] = v;
    }
    if (sourceUrl) set.sourceUrl = sourceUrl;
    const enquiry = await Enquiry.findByIdAndUpdate(
      existing._id,
      { $set: set, $inc: { 'subscriptionLead.attemptCount': 1 } },
      { new: true }
    );
    return { action: 'updated', enquiry };
  }

  const enquiry = await Enquiry.create({
    enquiryId: `ENQ-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    userId: user._id,
    targetType: 'general',
    name: user.name || 'Builder',
    phone: user.phone || 'N/A',
    email: user.email || '',
    actionType: SUBSCRIPTION_LEAD_ACTION,
    enquiryType: SUBSCRIPTION_LEAD_ACTION,
    sourceContext: 'subscription_paywall',
    sourceUrl,
    message,
    requirement: { text: `Subscription needed: ${eligibility.reason}` },
    subscriptionLead: { ...details, attemptCount: 1 },
    status: 'new'
  });
  return { action: 'created', enquiry };
};

/**
 * Records (or refreshes) the subscription lead for a blocked lister.
 * Resolves { action: 'created' | 'updated' | 'skipped' }; rejects only on DB errors.
 *
 * @param user         the authenticated account (req.user)
 * @param eligibility  result of getListingEligibility(user)
 * @param ctx          { propertyId?, sourceUrl? } optional context
 */
export const recordSubscriptionLead = (user, eligibility, ctx = {}) => {
  if (!user?._id || !SUBSCRIBED_ROLES.includes(user.role)) return Promise.resolve({ action: 'skipped' });
  if (!eligibility || eligibility.found === false) return Promise.resolve({ action: 'skipped' });
  // Only genuinely blocked, unsubscribed listers become leads.
  if (eligibility.canSubmit || eligibility.isSubscriptionActive || !eligibility.reason) {
    return Promise.resolve({ action: 'skipped' });
  }

  const key = String(user._id);
  const prev = inflight.get(key) || Promise.resolve();
  const run = prev.catch(() => {}).then(() => doRecord(user, eligibility, ctx));
  inflight.set(key, run);
  run.catch(() => {}).finally(() => { if (inflight.get(key) === run) inflight.delete(key); });
  return run;
};

/** Fire-and-forget wrapper: never throws, never delays the caller. */
export const safeRecordSubscriptionLead = (user, eligibility, ctx) => {
  recordSubscriptionLead(user, eligibility, ctx).catch((err) => {
    console.error('Subscription lead failed:', err.message);
  });
};

/**
 * The lister subscribed — close their open subscription lead(s) so admin sees
 * them as converted rather than still needing a call.
 */
export const closeSubscriptionLeads = async (userId, resolvedReason = 'subscribed') => {
  try {
    const res = await Enquiry.updateMany(
      { userId, actionType: SUBSCRIPTION_LEAD_ACTION, status: { $nin: RESOLVED_LEAD_STATUSES } },
      { $set: { status: 'closed', 'subscriptionLead.resolvedReason': resolvedReason } }
    );
    return res.modifiedCount || 0;
  } catch (err) {
    console.error('Closing subscription leads failed:', err.message);
    return 0;
  }
};
