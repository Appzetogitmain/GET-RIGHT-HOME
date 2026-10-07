import React, { useState } from 'react';
import { Calendar, Check, ChevronDown, MapPin } from 'lucide-react';
import { Card, inr, teal } from './Parts';

const Lift = ({ place, onChange }) => (
  <label className="mt-1.5 ml-6 flex cursor-pointer items-center gap-2 text-xs text-slate-600">
    <input type="checkbox" checked={place?.lift !== false} onChange={(e) => onChange({ ...place, lift: e.target.checked })} className="h-4 w-4 rounded" style={{ accentColor: teal }} />
    Is service lift available<span className="text-[#BB5F36]">*</span>
  </label>
);

const AddOnRow = ({ addOn, selected, onToggle }) => (
  <div className={`rounded-xl border p-3 transition ${selected ? '' : 'border-slate-200'}`} style={selected ? { borderColor: teal, backgroundColor: `${teal}08` } : undefined}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
          {addOn.name}
          {addOn.isRecommended && <span className="rounded-full bg-[#D68F35]/20 px-2 py-0.5 text-[10px] font-bold text-[#8a5a1f]">Recommended</span>}
        </p>
        {addOn.description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{addOn.description}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-slate-900">{inr(addOn.price)}</p>
        <button
          type="button"
          onClick={onToggle}
          className={`mt-1.5 inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-bold ${selected ? 'text-white' : ''}`}
          style={selected ? { backgroundColor: teal, borderColor: teal } : { borderColor: teal, color: teal }}
        >
          {selected ? <><Check size={12} /> Added</> : 'Add'}
        </button>
      </div>
    </div>
  </div>
);

/** Step 4: order summary + payment summary (token now, rest at unloading). */
const SummaryStep = ({ config, from, to, setFrom, setTo, lines, date, slot, onEditSlot, addOnKeys, setAddOnKeys, quote, quoting, onConfirm, confirming, onBack }) => {
  const [showInv, setShowInv] = useState(false);
  const extras = config.addOns.filter((a) => a.group !== 'care');
  const care = config.addOns.filter((a) => a.group === 'care');
  const dateLabel = date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  const toggleExtra = (key) => setAddOnKeys((k) => (k.includes(key) ? k.filter((x) => x !== key) : [...k, key]));
  const pickCare = (key) => setAddOnKeys((k) => {
    const careKeys = care.map((c) => c.key);
    const without = k.filter((x) => !careKeys.includes(x));
    return k.includes(key) ? without : [...without, key];
  });

  return (
    <div className="mx-auto grid max-w-5xl gap-4 px-4 pb-36 pt-4 md:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {quote?.route && (
          <div className="rounded-2xl border border-[#347989]/20 bg-[#347989]/10 px-4 py-3 text-sm text-[#2b6270]">
            <p className="font-bold">{quote.route.fromCity} → {quote.route.toCity} · Between Cities</p>
            <p className="mt-0.5 text-xs text-[#2b6270]/80">
              {quote.route.transitDays ? `Your goods are delivered in about ${quote.route.transitDays} day${quote.route.transitDays > 1 ? 's' : ''} after pickup. ` : ''}
              {quote.distanceKm ? `Road distance ~${Math.round(quote.distanceKm)} km.` : ''}
            </p>
          </div>
        )}

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Movement Details</h2>
            <button type="button" onClick={onBack} className="text-sm font-semibold" style={{ color: teal }}>Edit</button>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-800"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#BB5F36]" /> {from?.address}</div>
          <Lift place={from} onChange={setFrom} />
          <div className="my-2 ml-[7px] h-4 border-l border-dashed border-slate-300" />
          <div className="flex items-start gap-2 text-sm text-slate-800"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#347989]" /> {to?.address}</div>
          <Lift place={to} onChange={setTo} />
          <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Calendar className="h-4 w-4 text-slate-500" /> {dateLabel} | {slot?.label}</span>
            <button type="button" onClick={onEditSlot} className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ backgroundColor: teal }}>Explore Slots</button>
          </div>
        </Card>

        <Card className="!p-0">
          <button type="button" onClick={() => setShowInv((v) => !v)} className="flex w-full items-center justify-between px-4 py-3.5 text-left">
            <span className="text-sm font-bold text-slate-900">Your Added Inventory ({lines.reduce((s, l) => s + l.qty, 0)})</span>
            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showInv ? 'rotate-180' : ''}`} />
          </button>
          {showInv && (
            <ul className="divide-y divide-slate-100 border-t border-slate-100 px-4">
              {lines.map((l) => (
                <li key={l.id} className="flex justify-between py-2 text-sm text-slate-700"><span>{l.name}</span><span className="font-semibold">× {l.qty}</span></li>
              ))}
            </ul>
          )}
        </Card>

        {extras.length > 0 && (
          <Card>
            <h3 className="mb-3 text-sm font-bold text-slate-900">Add Ons</h3>
            <div className="space-y-2">
              {extras.map((a) => <AddOnRow key={a.key} addOn={a} selected={addOnKeys.includes(a.key)} onToggle={() => toggleExtra(a.key)} />)}
            </div>
          </Card>
        )}
        {care.length > 0 && (
          <Card>
            <h3 className="mb-3 text-sm font-bold text-slate-900">Recommended add-ons</h3>
            <div className="space-y-2">
              {care.map((a) => <AddOnRow key={a.key} addOn={a} selected={addOnKeys.includes(a.key)} onToggle={() => pickCare(a.key)} />)}
            </div>
          </Card>
        )}
      </div>

      {/* Payment summary (same layout as My Cart) */}
      <div className="md:sticky md:top-20 md:self-start">
        <h2 className="mb-2 text-sm font-bold text-slate-800">Payment Summary</h2>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {!quote ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">Calculating your price…</p>
          ) : (
            <>
              <div className={`space-y-2.5 px-4 py-4 text-sm transition ${quoting ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between"><span className="text-slate-600">Packers & Movers service</span><span className="font-medium text-slate-900">{inr(quote.serviceCharge)}</span></div>
                {quote.distance && (
                  <div className="flex items-center justify-between text-xs text-slate-500"><span>Distance ~{Math.round(quote.distance.km)} km by road</span><span>included</span></div>
                )}
                {quote.breakdown.noLiftCharge > 0 && (
                  <div className="flex items-center justify-between text-xs text-slate-500"><span>No service lift charge</span><span>{inr(quote.breakdown.noLiftCharge)}</span></div>
                )}
                {quote.addOns.map((a) => (
                  <div key={a.key} className="flex items-center justify-between"><span className="text-slate-600">{a.name}</span><span className="font-medium text-slate-900">{inr(a.price)}</span></div>
                ))}
                {quote.gst.applied && (
                  <div className="flex items-center justify-between"><span className="text-slate-600">GST @ {quote.gst.ratePct}%</span><span className="font-medium text-slate-900">{inr(quote.gst.amount)}</span></div>
                )}
                <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                  <span className="text-base font-bold text-slate-900">Total Amount</span>
                  <span className="text-lg font-extrabold text-slate-900">{inr(quote.total)}</span>
                </div>
              </div>
              <div className="space-y-1.5 border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Pay now (booking amount)</span>
                  <span className="font-bold" style={{ color: teal }}>{inr(quote.token)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Pay at time of unloading</span>
                  <span className="font-semibold">{inr(quote.dueAtUnloading)}</span>
                </div>
              </div>
            </>
          )}
        </div>
        {quote && !quote.distanceKnown && <p className="mt-2 text-[11px] text-[#BB5F36]">Distance is estimated. The final price may change if the route differs.</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Token Amount</p>
            <p className="text-xl font-extrabold text-slate-900">{quote ? inr(quote.token) : '—'}</p>
          </div>
          <button
            type="button"
            disabled={!quote || quoting || confirming}
            onClick={onConfirm}
            className="flex-1 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg disabled:opacity-50 md:max-w-xs"
            style={{ backgroundColor: teal }}
          >
            {confirming ? 'Please wait…' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryStep;
