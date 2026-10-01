import React from 'react';
import { themeColors } from '../../../../../theme';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/**
 * Last chance before payment: "You are missing out on a discount". The
 * customer can skip it and pay normally, or add VIP and pay with it.
 */
const VipPromptSheet = ({ isOpen, vip, onSkip, onAdd }) => {
  if (!isOpen || !vip) return null;

  return (
    <div className="fixed inset-0 z-[75]">
      <div className="absolute inset-0 bg-black/55" onClick={onSkip} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-6 pb-6 pt-12 text-center shadow-2xl">
        <div className="absolute left-1/2 top-0 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#171717] to-[#3b3b3b] text-2xl font-black text-amber-300">V</span>
        </div>

        <h2 className="text-lg font-bold text-slate-900">You are missing out on discount of {inr(vip.discount)}</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Members save up to {vip.maxPercent || vip.percent}% on every booking for {vip.durationDays} days
        </p>

        <button type="button" onClick={onSkip} className="mt-6 text-sm font-bold" style={{ color: themeColors.button }}>
          Skip
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-lg active:scale-[0.99]"
          style={{ backgroundColor: themeColors.button }}
        >
          Add VIP Membership
        </button>
      </div>
    </div>
  );
};

export default VipPromptSheet;
