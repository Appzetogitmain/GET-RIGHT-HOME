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
  const trialDays = settings.freeTrialDurationDays || 30;

  const startedAt = subject.createdAt || subject.partnerSince || new Date();
  const trialEndDate = new Date(startedAt);
  trialEndDate.setDate(trialEndDate.getDate() + trialDays);

  const now = new Date();
  const trialHasElapsed = now > trialEndDate;
  const trialDaysRemaining = Math.max(0, Math.ceil((trialEndDate - now) / MS_PER_DAY));

  // A paid subscription supersedes the trial entirely.
  const isFreeTrialMode = !isSubscriptionActive;
  const maxAllowed = isSubscriptionActive
    ? (subscription.planId?.maxProperties || 1)
    : (settings.freeTrialListingLimit || 10);

  const currentCount = await Property.countDocuments({
    userId: user._id,
    status: SLOT_CONSUMING_STATUS
  });
  const limitReached = currentCount >= maxAllowed;

  const trialExpired = isFreeTrialMode && trialHasElapsed;
  const isTrialActive = isFreeTrialMode && !trialHasElapsed;

  let reason = null;
  let message = null;
  if (trialExpired) {
    reason = 'trial_expired';
    message = `Your free trial period of ${trialDays} days has expired. Please subscribe to a plan to continue listing properties.`;
  } else if (limitReached) {
    reason = 'limit_reached';
    message = isFreeTrialMode
      ? `Free trial limit reached. You can add up to ${maxAllowed} properties during your trial. Please subscribe to add more.`
      : `Property limit reached. Your plan allows ${maxAllowed} properties. Please upgrade your subscription.`;
  }

  return {
    found: true,
    requiresSubscription: true,
    isSubscriptionActive,
    isFreeTrialMode,
    isTrialActive,
    trialExpired,
    trialDays,
    trialDaysRemaining,
    trialEndsAt: trialEndDate,
    maxAllowed,
    currentCount,
    limitReached,
    canSubmit: reason === null,
    reason,
    message
  };
};
