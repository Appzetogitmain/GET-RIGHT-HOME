import React from 'react';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/**
 * The room-wise estimate on a booking: each line (qty x unit price), GST, total,
 * and the advance. `viewer` = 'user' | 'worker' | 'admin' controls the extra money lines.
 */
const EstimateLines = ({ estimate, viewer = 'user' }) => {
  if (!estimate || !(estimate.amount > 0)) return null;
  const items = estimate.items || [];
  const grouped = items.reduce((acc, l) => {
    (acc[l.group || 'Work'] = acc[l.group || 'Work'] || []).push(l);
    return acc;
  }, {});
  const advanceLabel = estimate.advanceType === 'fixed' ? 'Advance to start' : `Advance (${estimate.advanceValue ?? 30}%)`;

  return (
    <div className="space-y-3 text-sm">
      {items.length > 0 ? (
        Object.entries(grouped).map(([group, lines]) => (
          <div key={group}>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{group}</p>
            <ul className="space-y-1.5">
              {lines.map((l) => (
                <li key={`${l.name}`} className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-gray-700">
                    {l.name}
                    <span className="block text-xs text-gray-400">{l.qty} {l.unitLabel} × {inr(l.unitPrice)}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-gray-900">{inr(l.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))
      ) : estimate.description ? (
        <p className="leading-relaxed text-gray-700">{estimate.description}</p>
      ) : null}

      {estimate.gst?.applied && (
        <div className="flex justify-between text-gray-600"><span>GST @ {estimate.gst.ratePct}%</span><span>{inr(estimate.gst.amount)}</span></div>
      )}
      <div className="flex items-center justify-between border-t border-dashed border-gray-300 pt-2.5">
        <span className="font-bold text-gray-900">Total estimate</span>
        <span className="text-lg font-extrabold text-gray-900">{inr(estimate.amount)}</span>
      </div>
      {viewer !== 'worker' && (
        <>
          <div className="flex justify-between text-gray-700"><span>{advanceLabel}</span><span className="font-semibold">{inr(estimate.tokenAmount)}</span></div>
          <div className="flex justify-between text-gray-500"><span>Balance after the work</span><span>{inr(Math.max(0, estimate.amount - estimate.tokenAmount))}</span></div>
        </>
      )}
      {viewer === 'admin' && (
        <div className="space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <div className="flex justify-between"><span>Platform commission ({estimate.commissionPercent ?? '-'}%)</span><span>{inr(estimate.adminCommission)}</span></div>
          <div className="flex justify-between"><span>Worker's share of the advance</span><span>{inr(estimate.workerAdvance)}</span></div>
        </div>
      )}
    </div>
  );
};

export default EstimateLines;
