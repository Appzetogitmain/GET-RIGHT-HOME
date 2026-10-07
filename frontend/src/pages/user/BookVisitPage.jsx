import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { CalendarDays, ClipboardCheck, IndianRupee, ShieldCheck } from 'lucide-react';
import estimateService from '../../homster/services/estimateService';
import { bookingService } from '../../homster/services/bookingService';
import PlacesInput from './packersMovers/PlacesInput';
import { Card, SimpleHeader, teal, BRAND } from './packersMovers/Parts';

const toUrl = (url) => {
  if (!url) return '';
  const clean = String(url).replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const dayLabel = (ymd) => {
  const d = new Date(`${ymd}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  return {
    top: diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
    bottom: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  };
};

/**
 * Book a professional's visit for an estimate-based service (Home Painting ...).
 * Nothing is paid now: the professional inspects, sends a room-wise estimate, and
 * the customer pays the advance only after accepting it.
 */
const BookVisitPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [subId, setSubId] = useState('');
  const [address, setAddress] = useState(null);
  const [details, setDetails] = useState('');
  const [avail, setAvail] = useState(null);       // { serviceable, dates }
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    estimateService.getVisitConfig(categoryId)
      .then((res) => {
        setConfig(res.data);
        if (res.data.subCategories.length === 1) setSubId(res.data.subCategories[0].id);
      })
      .catch((e) => setError(e.message || 'Could not load this service'));
  }, [categoryId]);

  // Slots depend on the address (which professionals serve it).
  useEffect(() => {
    setAvail(null); setDate(''); setSlot(null);
    if (!config?.serviceId || !address?.lat || !address?.lng) return undefined;
    let live = true;
    setLoadingSlots(true);
    bookingService.getSlotAvailability({ serviceId: config.serviceId, lat: address.lat, lng: address.lng })
      .then((res) => {
        if (!live) return;
        setAvail(res);
        const first = (res.dates || []).find((d) => d.available);
        if (first) setDate(first.date);
      })
      .catch(() => { if (live) toast.error('Could not load time slots'); })
      .finally(() => live && setLoadingSlots(false));
    return () => { live = false; };
  }, [config?.serviceId, address?.lat, address?.lng]);

  const day = useMemo(() => (avail?.dates || []).find((d) => d.date === date), [avail, date]);
  const ready = subId && address?.lat && date && slot;

  const submit = async () => {
    if (!ready || saving) return;
    setSaving(true);
    try {
      const res = await estimateService.bookVisit({
        categoryId,
        subCategoryId: subId,
        address: { ...address, details },
        date,
        slot: { start: slot.value, end: slot.end, label: slot.range || slot.display },
        notes
      });
      toast.success('Visit booked!');
      navigate(`/user/booking-confirmation/${res.data._id}`, { replace: true });
    } catch (e) {
      toast.error(e.message || 'Could not book the visit');
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-slate-600">{error}</div>;
  if (!config) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;

  const adv = config.advance;
  const advText = adv.type === 'fixed' ? `₹${Math.round(adv.value).toLocaleString('en-IN')}` : `${adv.value}% of the estimate`;

  return (
    <div className="min-h-screen bg-[#EEF1F6] pb-28">
      <SimpleHeader onBack={() => navigate(-1)} title={`Book ${config.category.title} visit`} />

      <main className="mx-auto max-w-xl space-y-4 px-4 py-4">
        {/* How it works */}
        <div className="rounded-2xl border p-4" style={{ borderColor: `${BRAND.teal}33`, backgroundColor: `${BRAND.teal}0D` }}>
          <p className="text-sm font-bold text-slate-900">How it works</p>
          <ol className="mt-2 space-y-1.5 text-xs text-slate-600">
            <li className="flex gap-2"><ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: teal }} /> A professional visits and checks the rooms. <b>Nothing to pay now.</b></li>
            <li className="flex gap-2"><IndianRupee className="mt-0.5 h-4 w-4 shrink-0" style={{ color: teal }} /> You get a room-wise estimate with the exact price.</li>
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: teal }} /> Accept it and pay only {advText} to start. The rest is paid after the work.</li>
          </ol>
        </div>

        {/* 1. Service */}
        {config.subCategories.length > 0 && (
          <Card>
            <h2 className="mb-3 text-sm font-bold text-slate-800">What do you need?</h2>
            <div className="grid grid-cols-2 gap-2">
              {config.subCategories.map((s) => {
                const on = subId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSubId(s.id)}
                    className={`flex items-center gap-2.5 rounded-xl border-2 p-2.5 text-left transition ${on ? '' : 'border-slate-200'}`}
                    style={on ? { borderColor: teal, backgroundColor: `${teal}10` } : undefined}
                  >
                    {s.iconUrl && <img src={toUrl(s.iconUrl)} alt="" className="h-9 w-9 shrink-0 rounded-lg object-contain" />}
                    <span className={`text-sm ${on ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{s.title}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* 2. Address */}
        <Card>
          <h2 className="mb-3 text-sm font-bold text-slate-800">Where should we come?</h2>
          <PlacesInput value={address} onChange={setAddress} placeholder="Search your address" dotColor={BRAND.orange} allowCurrent />
          <input
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="House / flat no., floor, landmark (optional)"
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400"
          />
        </Card>

        {/* 3. Date and slot */}
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800"><CalendarDays className="h-4 w-4" style={{ color: teal }} /> Pick a date and time</h2>
          {!address?.lat ? (
            <p className="text-xs text-slate-500">Choose your address first to see the available slots.</p>
          ) : loadingSlots ? (
            <p className="text-xs text-slate-500">Checking available slots…</p>
          ) : avail && avail.serviceable === false ? (
            <p className="rounded-lg bg-[#BB5F36]/10 px-3 py-2 text-xs font-medium text-[#8f4426]">Sorry, we don't serve this address yet.</p>
          ) : !(avail?.dates || []).some((d) => d.available) ? (
            <p className="rounded-lg bg-[#D68F35]/10 px-3 py-2 text-xs font-medium text-[#8a5a1f]">No professional is free for this address in the coming days. Please try another address.</p>
          ) : (
            <>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {avail.dates.filter((d) => d.available).map((d) => {
                  const l = dayLabel(d.date);
                  const on = d.date === date;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => { setDate(d.date); setSlot(null); }}
                      className="w-[76px] shrink-0 rounded-xl border-2 px-2 py-2.5 text-center transition"
                      style={on ? { borderColor: teal, backgroundColor: `${teal}10` } : { borderColor: '#E2E8F0' }}
                    >
                      <p className={`text-xs ${on ? 'font-bold' : 'text-slate-500'}`} style={on ? { color: teal } : undefined}>{l.top}</p>
                      <p className="text-sm font-bold text-slate-900">{l.bottom}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(day?.slots || []).map((s) => {
                  const on = slot?.value === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      disabled={!s.available}
                      onClick={() => setSlot(s)}
                      className={`rounded-lg border py-2.5 text-xs font-medium transition ${!s.available ? 'cursor-not-allowed border-slate-100 text-slate-300' : on ? 'font-bold' : 'border-slate-200 text-slate-700'}`}
                      style={on ? { borderColor: teal, color: teal, backgroundColor: `${teal}10` } : undefined}
                    >
                      {s.range || s.display}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* 4. Notes */}
        <Card>
          <h2 className="mb-2 text-sm font-bold text-slate-800">Anything we should know? <span className="font-normal text-slate-400">(optional)</span></h2>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 2 bedrooms and a hall, walls have dampness"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400"
          />
        </Card>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pay now</p>
            <p className="text-xl font-extrabold text-slate-900">₹0</p>
          </div>
          <button
            type="button"
            disabled={!ready || saving}
            onClick={submit}
            className="flex-1 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg disabled:opacity-50"
            style={{ backgroundColor: teal }}
          >
            {saving ? 'Booking…' : 'Book Visit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookVisitPage;
