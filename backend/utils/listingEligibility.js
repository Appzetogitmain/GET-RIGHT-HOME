// utils/listingEligibility.js
//
// Single source of truth for "is this lister allowed to put a property live?".
//
// Used by createProperty / updateProperty to gate submissions, and exposed to
// the frontend via GET /api/properties/listing-eligibility so the wizard can
// decide what to show on Submit (subscription upsell with a Skip during the
// free trial, hard paywall once it has expired) *before* it asks the user to
// do anything.
//
// Drafts are deliberately NOT gated anywhere: a lister must always be able to
// save their work, even with an expired trial. Only going live costs a slot.

import Property from '../models/Property.js';
import User from '../models/User.js';
import Partner from '../models/Partner.js';
import PlatformSettings from '../models/PlatformSettings.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Roles whose listings consume a plan slot / free-trial allowance.
export const SUBSCRIBED_ROLES = ['partner', 'owner', 'broker', 'builder'];

// Statuses that occupy a listing slot. Rejected and draft listings don't —
// a rejection shouldn't permanently cost a slot the user can't reclaim.
export const SLOT_CONSUMING_STATUS = { $nin: ['rejected', 'draft'] };


export const FREE_ACCESS_MODES = ['none', 'time', 'listings', 'time_and_listings', 'lifetime'];

// First argument that is a finite number >= 0 (so an explicit 0 is honoured and
// only an unset/invalid value falls through to the next default).
const pickNum = (...vals) => {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0) return Number(v);
  }
  return 0;
};

const rolesOrDefault = (roles) => (Array.isArray(roles) ? Array.from(roles) : SUBSCRIBED_ROLES);

/**
 * Admin-configured free-access rule that applies to a lister.
 *
 * `startedAt` (account creation) is only used to grandfather older accounts
 * when the admin turned "apply to existing users" off for the latest change.
 * Returns { enabled, mode, durationDays, listingLimit, roles, applies } where
 * `mode` is already collapsed to 'none' if the rule doesn't apply to this role.
 */
export const resolveFreeAccessRule = (settings, startedAt, role) => {
  let rule = {
    enabled: settings.freeAccessEnabled !== false,
    mode: FREE_ACCESS_MODES.includes(settings.freeAccessMode) ? settings.freeAccessMode : 'time_and_listings',
    // Falls back to the legacy trial fields, then to the historic defaults.
    durationDays: settings.freeAccessDurationDays ?? settings.freeTrialDurationDays ?? 30,
    listingLimit: settings.freeAccessListingLimit ?? settings.freeTrialListingLimit ?? 10,
    roles: rolesOrDefault(settings.freeAccessRoles)
  };

  const prev = settings.freeAccessPrevious;
  if (
    settings.freeAccessApplyToExisting === false &&
    settings.freeAccessChangedAt &&
    prev?.mode &&
    new Date(startedAt) < new Date(settings.freeAccessChangedAt)
  ) {
    rule = {
      enabled: prev.enabled !== false,
      mode: FREE_ACCESS_MODES.includes(prev.mode) ? prev.mode : 'time_and_listings',
      durationDays: prev.durationDays ?? 30,
      listingLimit: prev.listingLimit ?? 10,
      roles: rolesOrDefault(prev.roles)
    };
  }

  rule.durationDays = pickNum(rule.durationDays, 30);
  rule.listingLimit = pickNum(rule.listingLimit, 10);
  rule.applies = rule.enabled && rule.roles.includes(role);
  if (!rule.applies) rule.mode = 'none';
  return rule;
};

const hasTimeLimit = (mode) => mode === 'time' || mode === 'time_and_listings';
const hasListingLimit = (mode) => mode === 'listings' || mode === 'time_and_listings';

/**
 * True while a lister without a paid plan is still inside their free window
 * (used to decide whether a seller's contact details may be shown).
 */
export const isFreeAccessActive = (settings, subject, role) => {
  const startedAt = subject?.createdAt || subject?.partnerSince || new Date();
  const rule = resolveFreeAccessRule(settings, startedAt, role || subject?.role);
  if (rule.mode === 'none') return false;
  if (!hasTimeLimit(rule.mode)) return true; // lifetime / listings-only: no clock
  const end = new Date(startedAt);
  end.setDate(end.getDate() + rule.durationDays);
  return new Date() <= end;
};

/**
 * Resolves whether `user` may submit another property for approval.
 *
 * Never throws for a missing subject; returns { found: false } so callers can
 * decide the status code.
 */
export const getListingEligibility = async (user) => {
  const role = user?.role;

  if (!SUBSCRIBED_ROLES.includes(role)) {
    // Admins and plain users aren't metered.
    return { found: true, requiresSubscription: false, canSubmit: true, reason: null };
  }

  const subject = role === 'partner'
    ? await Partner.findById(user._id).populate('subscription.planId')
    : await User.findById(user._id).populate('subscription.planId');

  if (!subject) return { found: false };

  const subscription = subject.subscription;
  const isSubscriptionActive = Boolean(
    subscription?.status === 'active' &&
    subscription?.expiryDate &&
    new Date(subscription.expiryDate) > new Date()
  );

  const settings = await PlatformSettings.getSettings();
  const startedAt = subject.createdAt || subject.partnerSince || new Date();
  const rule = resolveFreeAccessRule(settings, startedAt, role);
  const { mode } = rule;

  const timeLimited = hasTimeLimit(mode);
  const listingLimited = hasListingLimit(mode);
  const isLifetimeFree = mode === 'lifetime';
  const trialDays = rule.durationDays;

  let trialEndDate = null;
  let trialHasElapsed = false;
  let trialDaysRemaining = null;
  const now = new Date();
  if (timeLimited) {
    trialEndDate = new Date(startedAt);
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);
    trialHasElapsed = now > trialEndDate;
    trialDaysRemaining = Math.max(0, Math.ceil((trialEndDate - now) / MS_PER_DAY));
  }

  // A paid subscription supersedes free access entirely.
  const isFreeTrialMode = !isSubscriptionActive;

  // maxAllowed === null means "no cap".
  let maxAllowed;
  if (isSubscriptionActive) maxAllowed = subscription.planId?.maxProperties || 1;
  else if (listingLimited) maxAllowed = rule.listingLimit;
  else maxAllowed = null;

  const currentCount = await Property.countDocuments({
    userId: user._id,
    status: SLOT_CONSUMING_STATUS
  });
  const limitReached = maxAllowed !== null && currentCount >= maxAllowed;

  const trialExpired = isFreeTrialMode && timeLimited && trialHasElapsed;
  const isTrialActive = isFreeTrialMode && mode !== 'none' && !trialExpired;
  const subscriptionRequired = isFreeTrialMode && mode === 'none';

  let reason = null;
  let title = null;
  let message = null;
  if (subscriptionRequired) {
    reason = 'subscription_required';
    title = 'Subscription required';
    message = 'A subscription plan is required to list properties. Please subscribe to continue.';
  } else if (trialExpired) {
    reason = 'trial_expired';
    title = 'Your free trial has ended';
    message = `Your free trial period of ${trialDays} days has expired. Please subscribe to a plan to continue listing properties.`;
  } else if (limitReached) {
    reason = 'limit_reached';
    if (isFreeTrialMode) {
      title = 'Free listing limit reached';
      message = `Free trial limit reached. You can add up to ${maxAllowed} properties during your trial. Please subscribe to add more.`;
    } else {
      title = 'Property limit reached';
      message = `Property limit reached. Your plan allows ${maxAllowed} properties. Please upgrade your subscription.`;
    }
  }

  // Admin-edited paywall copy replaces the default text for free-access blocks
  // (a paid plan hitting its own cap keeps its plan-specific message).
  if (reason && isFreeTrialMode) {
    const customTitle = (settings.freeAccessPaywallTitle || '').trim();
    const customMessage = (settings.freeAccessPaywallMessage || '').trim();
    if (customTitle) title = customTitle;
    if (customMessage) message = customMessage;
  }

  return {
    found: true,
    requiresSubscription: !(isFreeTrialMode && isLifetimeFree),
    isSubscriptionActive,
    isFreeTrialMode,
    isTrialActive,
    trialExpired,
    mode,
    isLifetimeFree: isFreeTrialMode && isLifetimeFree,
    hasTimeLimit: isFreeTrialMode && timeLimited,
    hasListingLimit: isFreeTrialMode && listingLimited,
    trialDays: timeLimited ? trialDays : null,
    trialDaysRemaining: isFreeTrialMode ? trialDaysRemaining : null,
    trialEndsAt: isFreeTrialMode ? trialEndDate : null,
    maxAllowed,
    currentCount,
    freeListingsUsed: currentCount,
    freeListingsRemaining: maxAllowed === null ? null : Math.max(0, maxAllowed - currentCount),
    limitReached,
    canSubmit: reason === null,
    reason,
    title,
    message,
    paywall: reason ? { title, message } : null
  };
};
