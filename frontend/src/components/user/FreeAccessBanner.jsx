import React from 'react';
import { Sparkles, Clock, AlertCircle, Lock } from 'lucide-react';

/**
 * Shows a lister where they stand on the admin-configured free access:
 * "Free: 2 of 3 listings used", "Free trial: 12 days left", "Lifetime free",
 * or the reason they must subscribe. Driven entirely by the server's
 * listing-eligibility response — no limits are computed here.
 */
const FreeAccessBanner = ({ eligibility, onSubscribe, className = '' }) => {
  if (!eligibility || eligibility.found === false) return null;
  // Admins / plain users aren't metered, and paying subscribers have their own plan UI.
  if (eligibility.requiresSubscription === false && !eligibility.isLifetimeFree) return null;
  if (eligibility.isSubscriptionActive) return null;

  const {
    isLifetimeFree, canSubmit, reason, title, message,
    hasListingLimit, hasTimeLimit, freeListingsUsed, maxAllowed, trialDaysRemaining
  } = eligibility;

  let tone = 'emerald';
  let Icon = Sparkles;
  let heading = '';
  let detail = '';

  if (isLifetimeFree) {
    heading = 'Free forever';
    detail = 'You can list unlimited properties at no cost.';
  } else if (!canSubmit) {
    tone = 'red';
    Icon = reason === 'subscription_required' ? Lock : AlertCircle;
    heading = title || 'Subscription required';
    detail = message || 'Subscribe to a plan to list more properties.';
  } else {
    tone = 'blue';
    const parts = [];
    if (hasListingLimit && maxAllowed !== null && maxAllowed !== undefined) {
      parts.push(`${freeListingsUsed ?? 0} of ${maxAllowed} free listings used`);
    }
    if (hasTimeLimit && trialDaysRemaining !== null && trialDaysRemaining !== undefined) {
      parts.push(`${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} of free access left`);
    }
    if (parts.length === 0) return null;
    heading = 'Free access';
    detail = parts.join(' • ');
    if (hasTimeLimit && !hasListingLimit) Icon = Clock;
  }

  const tones = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    red: 'bg-red-50 border-red-200 text-red-800'
  };
  const buttonTones = {
    emerald: 'bg-emerald-600',
    blue: 'bg-blue-600',
    red: 'bg-red-600'
  };

  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-2xl border ${tones[tone]} ${className}`}>
      <Icon size={18} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-extrabold leading-tight">{heading}</p>
        <p className="text-[11px] font-medium mt-0.5 leading-snug">{detail}</p>
      </div>
      {!isLifetimeFree && onSubscribe && (!canSubmit || tone === 'blue') && (
        <button
          type="button"
          onClick={onSubscribe}
          className={`shrink-0 px-3 py-2 ${buttonTones[tone]} text-white text-[10px] font-black uppercase rounded-xl active:scale-95 transition-all`}
        >
          {canSubmit ? 'View plans' : 'Subscribe'}
        </button>
      )}
    </div>
  );
};

export default FreeAccessBanner;
