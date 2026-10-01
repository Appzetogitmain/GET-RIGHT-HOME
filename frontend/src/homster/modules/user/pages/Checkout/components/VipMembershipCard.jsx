import React, { useState } from 'react';
import { FiCheck, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

const durationLabel = (days) => {
  if (days % 365 === 0) return `${days / 365} year${days / 365 > 1 ? 's' : ''}`;
  if (days % 30 === 0) return `${days / 30} month${days / 30 > 1 ? 's' : ''}`;
  return `${days} days`;
};

/**
 * VIP offer on the order summary: a dark membership card with an ADD button and
 * a row of benefit cards. Adding it takes the discount off this booking; the
 * membership fee is paid with the advance. Skipping is just not tapping ADD.
 */
const VipMembershipCard = ({ vip, added, onToggle, onChangePlan, selectedPlan, savingNow }) => {
  const [open, setOpen] = useState(false);
  if (!vip?.eligible) return null;

  const tiers = vip.tiers || [];
  // The chosen plan once added; otherwise the first plan on offer.
  const shown = selectedPlan || vip.plans?.[0] || vip;
  const planCount = vip.plans?.length || 1;

  return (
    <div className="mb-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#171717] via-[#262626] to-[#171717] px-4 pb-4 pt-10 shadow-lg">
        {/* tag */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap rounded-b-lg bg-gradient-to-r from-amber-200 to-yellow-300 px-3 py-1 text-[10px] font-extrabold text-amber-900 shadow">
          Upto {vip.maxPercent || vip.percent}% off on top of existing deals
        </div>

        {/* header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/40 bg-black/40 text-2xl font-black text-amber-300">
              V
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/90">{shown.name || vip.planName}</p>
              <p className="flex items-baseline gap-2">
                {!added && planCount > 1 && <span className="text-[11px] font-medium text-slate-300">from</span>}
                <span className="text-2xl font-black text-white">{inr(shown.price)}</span>
                {shown.originalPrice > 0 && (
                  <span className="text-xs text-slate-400 line-through">{inr(shown.originalPrice)}</span>
                )}
                <span className="text-[11px] font-medium text-slate-300">for {durationLabel(shown.durationDays)}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className={`flex shrink-0 items-center gap-1 rounded-lg border px-4 py-2 text-xs font-extrabold tracking-wide transition active:scale-95 ${
              added
                ? 'border-amber-300 bg-amber-300 text-amber-950'
                : 'border-white/70 bg-transparent text-white hover:bg-white/10'
            }`}
          >
            {added ? (<><FiCheck className="h-3.5 w-3.5" /> ADDED</>) : 'ADD'}
          </button>
        </div>

        {/* benefit cards */}
        <div className="-mx-1 mt-4 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="w-44 shrink-0 rounded-xl bg-white p-3 ring-1 ring-amber-300">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-amber-700">Extra</p>
            <p className="text-2xl font-black leading-none text-amber-600">{vip.percent}<span className="text-sm">%</span> <span className="text-[10px] font-bold text-slate-500">DISCOUNT</span></p>
            <p className="mt-1.5 text-[11px] font-semibold leading-snug text-slate-700">
              on this booking — you save {inr(vip.discount)}
            </p>
          </div>

          {tiers.length > 1 && (
            <div className="w-44 shrink-0 rounded-xl bg-white p-3 ring-1 ring-amber-300">
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-amber-700">Bigger orders</p>
              <p className="text-2xl font-black leading-none text-amber-600">{vip.maxPercent}<span className="text-sm">%</span> <span className="text-[10px] font-bold text-slate-500">OFF</span></p>
              <p className="mt-1.5 text-[11px] font-semibold leading-snug text-slate-700">
                on orders of {inr(tiers[tiers.length - 1].minAmount)}+
              </p>
            </div>
          )}

          <div className="w-44 shrink-0 rounded-xl bg-white p-3 ring-1 ring-amber-300">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-amber-700">Every booking</p>
            <p className="text-base font-black leading-tight text-slate-900">Valid {durationLabel(vip.durationDays)}</p>
            <p className="mt-1.5 text-[11px] font-semibold leading-snug text-slate-700">
              Discount applies automatically on your next bookings
            </p>
          </div>
        </div>

        {added && (
          <p className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-amber-300/15 px-3 py-2 text-[11px] font-semibold text-amber-100">
            <span>
              {shown.name || 'VIP'} added — {inr(vip.discount)} off this booking, {inr(shown.price)} membership paid with your booking.
            </span>
            {onChangePlan && planCount > 1 && (
              <button type="button" onClick={onChangePlan} className="shrink-0 underline">Change plan</button>
            )}
          </p>
        )}
        {!added && planCount > 1 && (
          <p className="mt-3 text-[11px] font-medium text-slate-300">{planCount} plans available — tap ADD to choose.</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mx-auto mt-2 flex items-center gap-1 text-xs font-bold text-slate-500"
      >
        Know more {open ? <FiChevronUp className="h-3.5 w-3.5" /> : <FiChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
          <p className="mb-2 font-bold text-slate-800">How the discount works</p>
          <ul className="space-y-1.5">
            {tiers.map((t) => (
              <li key={t.minAmount} className="flex justify-between">
                <span>Order of {inr(t.minAmount)} or more</span>
                <span className="font-bold text-amber-700">{t.percent}% off</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 leading-relaxed text-slate-500">
            The membership fee is a one-time payment for the plan you choose.
            You can skip it and book at the normal price.
          </p>
        </div>
      )}
    </div>
  );
};

export default VipMembershipCard;
