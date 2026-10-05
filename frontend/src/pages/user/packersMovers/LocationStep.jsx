import React from 'react';
import { ShieldCheck, BadgeIndianRupee } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PlacesInput from './PlacesInput';
import moverService from '../../../homster/services/moverService';
import { Card, teal } from './Parts';

/** Step 1: Within City / Between Cities, pickup and drop. */
const LocationStep = ({ relocationType, setRelocationType, from, to, setFrom, setTo, onNext, coverage }) => {
  const [checking, setChecking] = React.useState(false);
  const [blocked, setBlocked] = React.useState('');
  const [preview, setPreview] = React.useState(null);   // live result for Between Cities
  React.useEffect(() => setBlocked(''), [relocationType, from, to]);

  // As soon as both ends are picked, say whether we serve that route.
  React.useEffect(() => {
    setPreview(null);
    if (relocationType !== 'INTER_CITY' || !from?.city || !to?.city) return undefined;
    let live = true;
    const t = setTimeout(() => {
      moverService.checkArea({ relocationType, from, to })
        .then((res) => { if (live) setPreview(res.data); })
        .catch(() => {});
    }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [relocationType, from, to]);

  const check = async () => {
    if (!from?.address || !to?.address) return toast.error('Please enter both pickup and drop locations');
    const a = (from.city || '').toLowerCase();
    const b = (to.city || '').toLowerCase();
    if (a && b) {
      if (relocationType === 'INTER_CITY' && a === b) return toast.error('Pickup and drop are in the same city. Choose "Within City".');
    }
    setChecking(true);
    try {
      const res = await moverService.checkArea({ relocationType, from, to });
      if (!res.data.ok) { setBlocked(res.data.message); return; }
      onNext();
    } catch (e) {
      toast.error(e.message || 'Could not check the service area');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 pb-10 pt-5">
      <Card className="!p-5">
        <h2 className="text-lg font-bold text-slate-900">Where are you going to relocate?</h2>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1">
          {[['INTRA_CITY', 'Within City'], ['INTER_CITY', 'Between Cities']].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setRelocationType(key)}
              className={`rounded-full py-2.5 text-sm font-semibold transition ${relocationType === key ? 'text-white shadow' : 'text-slate-600'}`}
              style={relocationType === key ? { backgroundColor: teal } : undefined}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {relocationType === 'INTRA_CITY'
            ? (coverage?.withinCity?.length ? <>Available in: <b className="capitalize">{coverage.withinCity.join(', ')}</b></> : 'Within City moves are not available yet.')
            : (coverage?.routes?.length ? <>Available on: <b>{coverage.routes.map((r) => `${r.from} ${r.bothWays ? '⇄' : '→'} ${r.to}`).join(', ')}</b></> : 'Between Cities moves are not available yet.')}
        </p>

        <p className="mb-2 mt-4 text-sm font-semibold text-slate-700">Select pickup and drop location</p>
        <div className="relative space-y-3">
          <span className="absolute bottom-[26px] left-[4px] top-[26px] w-px bg-slate-300" />
          <PlacesInput value={from} onChange={setFrom} placeholder="Shifting From" dotColor="#EF4444" />
          <PlacesInput value={to} onChange={setTo} placeholder="Shifting To" dotColor="#16A34A" />
        </div>

        <div className="mt-4 flex items-center justify-center gap-5 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Professional Handling</span>
          <span className="inline-flex items-center gap-1"><BadgeIndianRupee className="h-3.5 w-3.5 text-emerald-600" /> Transparent Pricing</span>
        </div>

        {relocationType === 'INTER_CITY' && from?.city && to?.city && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
            <span className="font-semibold text-slate-800">{from.city} → {to.city}</span>
            {preview === null ? <span className="text-xs text-slate-400">Checking route…</span>
              : preview.ok ? <span className="text-xs font-semibold text-emerald-700">Route available{preview.route?.transitDays ? ` · ~${preview.route.transitDays} day${preview.route.transitDays > 1 ? 's' : ''} delivery` : ''}</span>
                : <span className="text-xs font-semibold text-red-600">Not available</span>}
          </div>
        )}

        {blocked && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-bold">We can't serve this move yet</p>
            <p className="mt-0.5 text-xs leading-relaxed">{blocked}</p>
          </div>
        )}

        <button type="button" disabled={checking} onClick={check} className="mt-4 w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-md active:scale-[0.99] disabled:opacity-60" style={{ backgroundColor: teal }}>
          {checking ? 'Checking area…' : 'Check Prices'}
        </button>
      </Card>

      <div className="mt-5 grid grid-cols-2 gap-3 text-center text-[11px] text-slate-600">
        {['100% Damage & Delay Protection', 'Free instant quote in under 2 minutes', 'Verified movers & trained packers', 'Pay a small token, rest at unloading'].map((t) => (
          <div key={t} className="rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-100">{t}</div>
        ))}
      </div>
    </div>
  );
};

export default LocationStep;
