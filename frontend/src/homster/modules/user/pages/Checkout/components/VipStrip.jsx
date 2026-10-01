import React from 'react';
import { FiCheck, FiInfo } from 'react-icons/fi';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/**
 * Slim dark membership bar at the foot of the payment summary: shows what the
 * member would save on this order, with ADD (or ADDED + change plan).
 */
const VipStrip = ({ vip, added, selectedPlan, onToggle, onChangePlan }) => {
  if (!vip) return null;
  const locked = !vip.eligible;
  const plan = selectedPlan || vip.plans?.[0] || vip;
  const firstTier = (vip.tiers || [])[0];
  return (
    <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#141414] via-[#262626] to-[#141414] px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/40 bg-black/40 text-lg font-black text-amber-300">V</span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-sm font-bold text-white">
            VIP Membership <FiInfo className="h-3 w-3 text-slate-400" />
          </p>
          <p className="truncate text-[11px] text-amber-200/90">
            {locked
              ? (firstTier ? `Get ${firstTier.percent}% off on orders of ${inr(firstTier.minAmount)}+` : 'Members save on every booking')
              : added
                ? `${plan.name || 'VIP'} · ${inr(plan.price)} added — saving ${inr(vip.discount)} now`
                : `Save ${inr(vip.discount)} on this order with membership`}
          </p>
          {added && onChangePlan && (vip.plans?.length || 0) > 1 && (
            <button type="button" onClick={onChangePlan} className="text-[11px] font-semibold text-slate-300 underline">Change plan</button>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex shrink-0 items-center gap-1 rounded-lg px-5 py-2 text-xs font-extrabold tracking-wide transition active:scale-95 ${
          added ? 'bg-amber-300 text-amber-950' : 'bg-white text-slate-900'
        }`}
      >
        {added ? (<><FiCheck className="h-3.5 w-3.5" /> ADDED</>) : 'ADD'}
      </button>
    </div>
  );
};

export default VipStrip;
