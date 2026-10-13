import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, BadgeCheck, Brush, Search, CalendarDays, Check, ChevronDown, ClipboardCheck, Home, MapPin,
  Phone, Ruler, ShieldCheck, Sparkles, Star, Sun, Sunset, Moon
} from 'lucide-react';
import estimateService from '../../homster/services/estimateService';
import { bookingService } from '../../homster/services/bookingService';
import PlacesInput from './packersMovers/PlacesInput';
import { BottomSheet, teal, BRAND } from './packersMovers/Parts';
import { getPreferredCity } from '../../utils/locationPreference';

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
    num: d.toLocaleDateString('en-IN', { day: '2-digit' }),
    month: d.toLocaleDateString('en-IN', { month: 'short' })
  };
};

// Morning / Afternoon / Evening buckets for the time grid.
const PERIODS = [
  { key: 'morning', label: 'Morning', Icon: Sun, test: (h) => h < 12 },
  { key: 'afternoon', label: 'Afternoon', Icon: Sunset, test: (h) => h >= 12 && h < 17 },
  { key: 'evening', label: 'Evening', Icon: Moon, test: (h) => h >= 17 }
];
const slotHour = (s) => {
  const m = String(s.value || '').match(/(\d{1,2})[:.]/);
  return m ? Number(m[1]) : 9;
};

const PROMISES = [
  'Genuine branded paints', 'Professionally trained painters', 'Furniture and switchboard masking',
  'Post-painting cleanup', 'On-time completion', 'Material + labour cost included'
];

const STEPS = [
  { Icon: ClipboardCheck, title: 'Book Home Inspection', text: 'Tell us your preferred time to visit' },
  { Icon: Ruler, title: 'Measure & Estimate', text: 'Get an accurate, room-wise quote' },
  { Icon: Brush, title: 'Project Initiation', text: 'Work starts on the agreed date' },
  { Icon: Sparkles, title: 'Cleaning & Quality Check', text: 'Post-paint cleanup and final check' }
];

const bulletsOf = (text) => String(text || '')
  .split(/\r?\n|•|(?<=[.!])\s+/)
  .map((t) => t.replace(/^[\s\-–*]+/, '').trim())
  .filter(Boolean);

/**
 * Estimate-based services (Home Painting ...), laid out like NoBroker's:
 *   1. Landing: service cards with "Get estimate".
 *   2. "Schedule your Service": date, time and address, then book the visit.
 * Nothing is paid now: the professional inspects, sends a room-wise estimate, and the
 * customer pays the advance only after accepting it.
 */
const BookVisitPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [stage, setStage] = useState('list');        // 'list' | 'schedule'
  const [subId, setSubId] = useState('');
  const [expanded, setExpanded] = useState({});
  const [q, setQ] = useState('');
  const [address, setAddress] = useState(null);
  const [details, setDetails] = useState('');
  const [addrOpen, setAddrOpen] = useState(false);
  const [avail, setAvail] = useState(null);          // { serviceable, dates }
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

  useEffect(() => { window.scrollTo(0, 0); }, [stage]);

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

  const startEstimate = (id) => {
    setSubId(id);
    setStage('schedule');
    if (!address) setAddrOpen(true);
  };

  const back = () => (stage === 'schedule' && config?.subCategories.length > 1 ? setStage('list') : navigate(-1));

  const submit = async () => {
    if (!address?.lat) { setAddrOpen(true); return; }
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
  const subs = config.subCategories;
  const hero = config.hero || {};
  const city = getPreferredCity() || 'Your city';
  const visibleSubs = q.trim() ? subs.filter((x) => x.title.toLowerCase().includes(q.trim().toLowerCase())) : subs;
  const chosen = subs.find((s) => s.id === subId);

  /* ───────────────── Stage 2: Schedule your Service ───────────────── */
  if (stage === 'schedule') {
    const availableDates = (avail?.dates || []).filter((d) => d.available);
    return (
      <div className="min-h-screen bg-[#F3F5F7] pb-44">
        <div className="mx-auto max-w-xl px-4 pt-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-2">
                <button type="button" onClick={back} aria-label="Back" className="-ml-1 rounded-full p-1.5 hover:bg-gray-100">
                  <ArrowLeft className="h-5 w-5 text-slate-900" />
                </button>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-extrabold text-slate-800">Schedule your Service</h1>
                  {chosen && <p className="truncate text-xs text-slate-500">{chosen.title}</p>}
                </div>
              </div>
              <a href="tel:" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: teal, color: teal }}>
                <Phone className="h-3.5 w-3.5" /> Get a call
              </a>
            </div>

            <div className="space-y-5 px-4 py-4">
              {!address?.lat ? (
                <button type="button" onClick={() => setAddrOpen(true)} className="flex w-full items-center gap-3 rounded-xl border border-dashed p-4 text-left" style={{ borderColor: teal, backgroundColor: `${teal}0A` }}>
                  <MapPin className="h-5 w-5 shrink-0" style={{ color: teal }} />
                  <span className="text-sm font-semibold text-slate-800">Add your address to see available dates and time</span>
                </button>
              ) : loadingSlots ? (
                <p className="py-6 text-center text-sm text-slate-500">Checking available slots…</p>
              ) : avail && avail.serviceable === false ? (
                <p className="rounded-lg bg-[#BB5F36]/10 px-3 py-2 text-sm font-medium text-[#8f4426]">Sorry, we don't serve this address yet.</p>
              ) : availableDates.length === 0 ? (
                <p className="rounded-lg bg-[#D68F35]/10 px-3 py-2 text-sm font-medium text-[#8a5a1f]">No professional is free for this address in the coming days. Please try another address.</p>
              ) : (
                <>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-500">Select date</p>
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {availableDates.map((d) => {
                        const l = dayLabel(d.date);
                        const on = d.date === date;
                        return (
                          <button
                            key={d.date}
                            type="button"
                            onClick={() => { setDate(d.date); setSlot(null); }}
                            className="w-[84px] shrink-0 rounded-xl border px-2 py-2.5 text-center transition"
                            style={on ? { borderColor: teal, backgroundColor: `${teal}14` } : { borderColor: '#E2E8F0' }}
                          >
                            <p className="text-base font-bold text-slate-800">{l.num}</p>
                            <p className={`text-xs ${on ? 'font-bold' : 'text-slate-500'}`} style={on ? { color: teal } : undefined}>{l.top}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-500">Select Start Time</p>
                    {PERIODS.map((p) => {
                      const list = (day?.slots || []).filter((s) => p.test(slotHour(s)));
                      if (!list.length) return null;
                      return (
                        <div key={p.key} className="mb-3">
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><p.Icon className="h-3.5 w-3.5" /> {p.label}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {list.map((s) => {
                              const on = slot?.value === s.value;
                              return (
                                <button
                                  key={s.value}
                                  type="button"
                                  disabled={!s.available}
                                  onClick={() => setSlot(s)}
                                  className={`rounded-lg border py-2.5 text-[13px] transition ${!s.available ? 'cursor-not-allowed border-slate-100 text-slate-300' : on ? 'font-bold' : 'border-slate-200 text-slate-700'}`}
                                  style={on ? { borderColor: teal, color: teal, backgroundColor: `${teal}14` } : undefined}
                                >
                                  {s.range || s.display}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-slate-500">Anything we should know? <span className="font-normal text-slate-400">(optional)</span></p>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. 2 bedrooms and a hall, walls have dampness"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Address bar + CTA */}
        <div className="fixed inset-x-0 bottom-0 z-40">
          <div className="mx-auto max-w-xl overflow-hidden rounded-t-2xl border border-b-0 border-slate-200 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <Home className="h-5 w-5 shrink-0 text-slate-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-800">Service at <b>Home</b></p>
                <p className="truncate text-xs text-slate-500">{address?.address || 'No address added yet'}</p>
              </div>
              <button type="button" onClick={() => setAddrOpen(true)} className="shrink-0 text-sm font-bold" style={{ color: teal }}>{address?.lat ? 'Change' : 'Add'}</button>
            </div>
            <div className="px-4 py-3">
              <button
                type="button"
                disabled={saving || (address?.lat && !ready)}
                onClick={submit}
                className="w-full rounded-xl py-3.5 text-[15px] font-bold text-white shadow-md disabled:opacity-50"
                style={{ backgroundColor: teal }}
              >
                {saving ? 'Booking…' : 'Schedule Visit'}
              </button>
              <p className="mt-1.5 text-center text-[11px] text-slate-400">Nothing to pay now. Pay {advText} only after you accept the estimate.</p>
            </div>
          </div>
        </div>

        {addrOpen && (
          <BottomSheet onClose={() => setAddrOpen(false)}>
            {(close) => (
              <div className="p-5">
                <h3 className="mb-3 text-base font-bold text-slate-900">Where should we come?</h3>
                <PlacesInput value={address} onChange={setAddress} placeholder="Search your address" dotColor={BRAND.orange} allowCurrent />
                <input
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="House / flat no., floor, landmark (optional)"
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-400"
                />
                <button
                  type="button"
                  disabled={!address?.lat}
                  onClick={close}
                  className="mt-4 w-full rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: teal }}
                >
                  Confirm address
                </button>
              </div>
            )}
          </BottomSheet>
        )}
      </div>
    );
  }

  /* ───────────────── Stage 1: landing ───────────────── */
  return (
    <div className="min-h-screen bg-white pb-16">
      {/* Hero: admin-set background video / banner, offer tag, floating search */}
      <div className="relative">
        <div className="relative h-60 overflow-hidden bg-gradient-to-br from-[#347989] via-[#2B6270] to-[#BB5F36] sm:h-72">
          {hero.imageUrl && !hero.videoUrl && <img src={toUrl(hero.imageUrl)} alt="" className="h-full w-full object-cover" />}
          {hero.videoUrl && (
            <video
              src={toUrl(hero.videoUrl)}
              poster={hero.imageUrl ? toUrl(hero.imageUrl) : undefined}
              className="h-full w-full object-cover"
              autoPlay muted loop playsInline preload="metadata"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/20" />

          <div className="absolute inset-x-0 top-0 mx-auto flex max-w-xl items-center justify-between px-4 pt-4">
            <div className="flex items-center gap-2.5">
              <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-slate-800 shadow">
                <MapPin className="h-3.5 w-3.5" style={{ color: teal }} /> {city}
              </span>
            </div>
            {hero.offer && (
              <span className="relative -mr-1 rotate-[8deg] rounded-md px-3 py-1.5 text-center text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #BB5F36 0%, #D68F35 130%)' }}>
                {/^\d/.test(hero.offer) && <span className="block text-[9px] font-bold uppercase leading-none tracking-wider">Flat</span>}
                <span className="block text-lg font-black leading-tight">{hero.offer}</span>
              </span>
            )}
          </div>
        </div>

        {/* Search floats over the bottom edge of the banner */}
        <div className="absolute inset-x-0 -bottom-6 mx-auto max-w-xl px-5">
          <div className="flex items-center gap-2.5 rounded-xl bg-white px-4 py-3.5 shadow-lg ring-1 ring-black/5">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${subs[0]?.title || config.category.title}`}
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pb-4 pt-10">
        <h1 className="text-2xl font-extrabold leading-snug text-slate-900">{hero.title || config.category.title}</h1>
        <p className="mt-1.5 text-sm text-slate-600">Free inspection first. Pay only after you accept the estimate.</p>

        {subs.length > 0 && (
          <div className="mt-5 flex gap-5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {subs.map((s) => (
              <button key={s.id} type="button" onClick={() => startEstimate(s.id)} className="flex w-[76px] shrink-0 flex-col items-center gap-2 text-center">
                <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                  {s.iconUrl ? <img src={toUrl(s.iconUrl)} alt="" className="h-10 w-10 object-contain" /> : <Brush className="h-6 w-6" style={{ color: teal }} />}
                </span>
                <span className="text-[11px] font-medium leading-tight text-slate-700">{s.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <main className="mx-auto max-w-xl space-y-8 px-4">
        {/* Service cards */}
        <section>
          <h2 className="mb-3 text-lg font-extrabold text-slate-900">{config.category.title} choices for your home</h2>
          <div className="space-y-4">
            {visibleSubs.map((s) => {
              const bullets = bulletsOf(s.description);
              const shown = expanded[s.id] ? bullets : bullets.slice(0, 3);
              const img = toUrl(s.imageUrl || s.iconUrl);
              return (
                <div key={s.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative h-40 bg-slate-100">
                    {img && <img src={img} alt={s.title} loading="lazy" className="h-full w-full object-cover" />}
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/75 to-transparent px-4 pb-3 pt-10 text-white">
                      <h3 className="text-lg font-extrabold">{s.title}</h3>
                      {s.rating > 0 && (
                        <span className="flex items-center gap-1 text-xs font-bold">
                          <Star className="h-3.5 w-3.5 fill-[#D68F35] text-[#D68F35]" /> {Number(s.rating).toFixed(1)}
                          {s.reviewCount && <span className="font-normal text-white/80">({s.reviewCount})</span>}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="px-4 pb-4 pt-3">
                    {shown.length > 0 && (
                      <ul className="space-y-1.5">
                        {shown.map((b, i) => (
                          <li key={i} className="flex gap-2 text-[13px] text-slate-600"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /> {b}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      {bullets.length > 3 ? (
                        <button type="button" onClick={() => setExpanded((e) => ({ ...e, [s.id]: !e[s.id] }))} className="flex items-center gap-1 text-[13px] font-semibold text-slate-600">
                          {expanded[s.id] ? 'Show less' : 'Show more'} <ChevronDown className={`h-4 w-4 transition ${expanded[s.id] ? 'rotate-180' : ''}`} />
                        </button>
                      ) : <span />}
                      <button
                        type="button"
                        onClick={() => startEstimate(s.id)}
                        className="rounded-lg border px-5 py-2 text-[13px] font-bold tracking-wide"
                        style={{ borderColor: teal, color: teal, backgroundColor: `${teal}0D` }}
                      >
                        GET ESTIMATE
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Promise */}
        <section>
          <h2 className="mb-3 text-lg font-extrabold text-slate-900">Our <span style={{ color: teal }}>Promise</span></h2>
          <div className="grid grid-cols-2 gap-2.5">
            {PROMISES.map((t) => (
              <div key={t} className="flex items-start gap-2 rounded-xl bg-[#F3F7F8] p-3 text-[13px] font-medium text-slate-700">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: teal }} /> {t}
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section>
          <h2 className="mb-3 text-lg font-extrabold text-slate-900">How {config.category.title.toLowerCase()} works</h2>
          <ol className="space-y-3">
            {STEPS.map(({ Icon, title, text }, i) => (
              <li key={title} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: i % 2 ? BRAND.orange : teal }}><Icon className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 flex items-start gap-2 rounded-xl p-3 text-xs text-slate-600" style={{ backgroundColor: `${teal}0D` }}>
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: teal }} />
            Nothing to pay for the visit. Accept the estimate and pay only {advText} to start; the rest is paid after the work.
          </p>
        </section>

        <div className="flex items-center gap-2 text-xs text-slate-400"><CalendarDays className="h-4 w-4" /> Pick a service above to choose your date and time.</div>
      </main>
    </div>
  );
};

export default BookVisitPage;
