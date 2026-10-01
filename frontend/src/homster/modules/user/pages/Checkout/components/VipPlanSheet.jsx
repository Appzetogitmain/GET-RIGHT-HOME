import React from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import { themeColors } from '../../../../../theme';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export const durationLabel = (days) => {
  if (days % 365 === 0) return `${days / 365} year${days / 365 > 1 ? 's' : ''}`;
  if (days % 30 === 0) return `${days / 30} month${days / 30 > 1 ? 's' : ''}`;
  return `${days} days`;
};

/**
 * "Choose your VIP plan": every plan the admin offers, what it saves on this
 * booking, and exactly what is paid now. Confirming adds it to the booking.
 */
const VipPlanSheet = ({ isOpen, vip, selectedKey, onSelect, onConfirm, onClose, payNow = false }) => {
  if (!isOpen || !vip?.plans?.length) return null;

  const plans = vip.plans;
  const selected = plans.find((p) => p.key === selectedKey) || plans[0];
  const option = selected.option;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white px-5 pb-5 pt-5 shadow-2xl">
        <div className="mb-1 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Choose your VIP plan</h2>
            <p className="text-xs text-slate-500">{vip.percent}% off this booking, and up to {vip.maxPercent || vip.percent}% on bigger orders</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {plans.map((plan) => {
            const active = plan.key === selected.key;
            return (
              <button
                key={plan.key}
                type="button"
                onClick={() => onSelect(plan.key)}
                className="flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition"
                style={active
                  ? { borderColor: themeColors.button, backgroundColor: `${themeColors.brand.teal}0F` }
                  : { borderColor: '#E5E7EB' }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                  style={{ borderColor: active ? themeColors.button : '#CBD5E1', backgroundColor: active ? themeColors.button : 'transparent' }}
                >
                  {active && <FiCheck className="h-3 w-3 text-white" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900">{plan.name}</span>
                  <span className="block text-xs text-slate-500">Valid for {durationLabel(plan.durationDays)}</span>
                  {plan.netSaving > 0 && (
                    <span className="mt-1 inline-block rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      You save {inr(plan.netSaving)} on this order
                    </span>
                  )}
                </span>
                <span className="text-right">
                  <span className="block text-lg font-black text-slate-900">{inr(plan.price)}</span>
                  {plan.originalPrice > 0 && <span className="block text-xs text-slate-400 line-through">{inr(plan.originalPrice)}</span>}
                </span>
              </button>
            );
          })}
        </div>

        {/* What gets paid */}
        {option && (
          <div className="mt-4 space-y-1.5 rounded-2xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Booking amount</span>
              <span className="font-semibold">{inr(option.serviceTotal + vip.discount)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>VIP discount ({vip.percent}%)</span>
              <span className="font-semibold">−{inr(vip.discount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{selected.name}</span>
              <span className="font-semibold">+{inr(option.vipFee)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold text-slate-900">
              <span>Pay now</span>
              <span>{inr(option.payNow)}</span>
            </div>
            {option.payLater > 0 && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>Pay after the service</span>
                <span>{inr(option.payLater)}</span>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => onConfirm(selected.key)}
          className="mt-4 w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-lg active:scale-[0.99]"
          style={{ backgroundColor: themeColors.button }}
        >
          {payNow ? `Add & Pay ${inr(option?.payNow)}` : `Add ${selected.name}`}
        </button>
      </div>
    </div>
  );
};

export default VipPlanSheet;
