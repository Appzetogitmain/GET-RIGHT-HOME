import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Search, Crosshair, Plus, Loader2, MapPin, Clock, ChevronDown, Check } from 'lucide-react';
import { api } from '../../services/apiService';
import { addRecentSearch, getRecentSearches } from '../../utils/recentActivity';

/**
 * Full-screen property search for mobile, laid out like a property portal:
 *   tabs (Buy / Rent / PG / Commercial / Plots) -> place chips + "Add more" ->
 *   filter pills (Property Types, Budget, Bedroom, Construction Status, Posted By)
 *   with the chosen filter opening right below -> Search / Cancel.
 * Everything ends up as URL params on /search, the same ones the results page reads.
 */

const BRAND = '#005B9F';
const ACCENT = '#F97316';

const TABS = [
  { key: 'buy', label: 'Buy', params: { transactionType: 'sell' } },
  { key: 'rent', label: 'Rent', params: { transactionType: 'rent' } },
  { key: 'pg', label: 'PG', params: { transactionType: 'pg' } },
  { key: 'commercial', label: 'Commercial', params: { propertyCategory: 'Commercial' } },
  { key: 'plots', label: 'Plots/Land', params: { transactionType: 'sell' } }
];

const TYPES = {
  buy: ['Apartment', 'Independent House / Villa', 'Builder Floor', '1 RK / Studio Apartment', 'Serviced Apartment', 'Farmhouse', 'Other'],
  rent: ['Apartment', 'Independent House / Villa', 'Builder Floor', '1 RK / Studio Apartment', 'Serviced Apartment', 'Farmhouse', 'Other'],
  pg: ['Apartment', 'Independent House / Villa', 'Builder Floor', '1 RK / Studio Apartment', 'Serviced Apartment', 'Hostel'],
  commercial: ['Office', 'Retail', 'Industry', 'Storage', 'Hospitality', 'Plot / Land', 'Other'],
  plots: ['Residential Plot', 'Commercial Land', 'Agricultural / Farm Land', 'Industrial Plot']
};

const BHKS = [['1 RK/1 BHK', '1BHK'], ['2 BHK', '2BHK'], ['3 BHK', '3BHK'], ['4 BHK', '4BHK'], ['4+ BHK', '4+BHK']];
const STATUS = [['Ready to move', 'Ready to move'], ['Under construction', 'Under construction'], ['New launch', 'Pre Launch']];
const POSTED_BY = ['Owner', 'Broker', 'Builder'];

// Budget steps in rupees (null = no upper limit).
const BUY_STEPS = [0, 500000, 1000000, 2000000, 3000000, 4000000, 5000000, 6000000, 7500000, 10000000, 15000000, 20000000, 30000000, 50000000, 100000000, null];
const RENT_STEPS = [0, 5000, 10000, 15000, 20000, 30000, 40000, 50000, 75000, 100000, 200000, null];

const money = (v) => {
  if (v === null) return 'Any';
  if (v >= 10000000) return `${+(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `${+(v / 100000).toFixed(2)} Lac`;
  if (v >= 1000) return `${+(v / 1000).toFixed(1)}K`;
  return `${v}`;
};

const tabFromParams = (p) => {
  const t = (p.get('transactionType') || '').toLowerCase();
  if (p.get('propertyCategory') === 'Commercial') return 'commercial';
  if (t === 'rent') return 'rent';
  if (t === 'pg') return 'pg';
  if ((p.get('subType') || '').toLowerCase().includes('plot')) return 'plots';
  return 'buy';
};

const Pill = ({ label, count, open, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex shrink-0 items-center gap-1 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${open || count ? 'text-white' : 'border-gray-300 bg-white text-gray-700'}`}
    style={open || count ? { backgroundColor: BRAND, borderColor: BRAND } : undefined}
  >
    {label}{count ? ` (${count})` : ''}
    <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
  </button>
);

const Choice = ({ on, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition ${on ? 'font-semibold' : 'border-gray-300 text-gray-700'}`}
    style={on ? { borderColor: BRAND, color: BRAND, backgroundColor: `${BRAND}12` } : undefined}
  >
    {on ? <Check size={13} /> : <Plus size={13} className="text-gray-400" />} {children}
  </button>
);

const MobileSearchOverlay = ({ open, onClose, initialParams = '' }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [tab, setTab] = useState('buy');
  const [places, setPlaces] = useState([]);              // chips
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [types, setTypes] = useState([]);
  const [bhks, setBhks] = useState([]);
  const [status, setStatus] = useState([]);
  const [postedBy, setPostedBy] = useState([]);
  const [range, setRange] = useState([0, null]);         // [minIndex, maxIndex] into steps
  const [panel, setPanel] = useState('');                // which filter is open
  const [cities, setCities] = useState([]);
  const [locating, setLocating] = useState(false);

  const steps = tab === 'rent' || tab === 'pg' ? RENT_STEPS : BUY_STEPS;
  const lastIdx = steps.length - 1;
  const [lo, hi] = [range[0], range[1] === null ? lastIdx : Math.min(range[1], lastIdx)];
  const budgetOn = lo > 0 || hi < lastIdx;
  const recent = useMemo(() => (open ? getRecentSearches().slice(0, 3) : []), [open]);

  // Fill the sheet from the page we came from, so "edit search" starts where the user is.
  useEffect(() => {
    if (!open) return;
    const p = new URLSearchParams(initialParams);
    setTab(tabFromParams(p));
    setPlaces((p.get('areas') || p.get('search') || '').split(',').map((s) => s.trim()).filter(Boolean));
    setTypes((p.get('subType') || '').split(',').map((s) => s.trim()).filter(Boolean));
    setBhks((p.get('bhkType') || '').split(',').map((s) => s.trim()).filter(Boolean));
    setStatus((p.get('availability') || '').split(',').map((s) => s.trim()).filter(Boolean));
    setPostedBy((p.get('postedBy') || '').split(',').map((s) => s.trim()).filter(Boolean));
    const t = tabFromParams(p);
    const st = t === 'rent' || t === 'pg' ? RENT_STEPS : BUY_STEPS;
    const minP = Number(p.get('minPrice')) || 0;
    const maxP = Number(p.get('maxPrice')) || 0;
    const mi = Math.max(0, st.findIndex((v) => v !== null && v >= minP));
    const ma = maxP ? st.findIndex((v) => v !== null && v >= maxP) : -1;
    setRange([minP ? mi : 0, ma >= 0 ? ma : null]);
    setText(''); setSuggestions([]); setPanel('');
  }, [open, initialParams]);

  // Popular cities (from real inventory) as one-tap chips.
  useEffect(() => {
    if (!open || cities.length > 0) return;
    api.get('/properties/popular-cities', { params: { limit: 8 } })
      .then((res) => setCities(res.data?.cities || []))
      .catch(() => setCities([]));
  }, [open, cities.length]);

  // Place suggestions while typing.
  useEffect(() => {
    const q = text.trim();
    if (!open || q.length < 1) { setSuggestions([]); setSugLoading(false); return undefined; }
    setSugLoading(true);
    let live = true;
    const t = setTimeout(() => {
      api.get('/properties/locations', { params: { q, limit: 8 } })
        .then((res) => { if (live) setSuggestions(res.data?.suggestions || []); })
        .catch(() => { if (live) setSuggestions([]); })
        .finally(() => live && setSugLoading(false));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [text, open]);

  // Lock the page behind the sheet.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (window.lenis) window.lenis.stop();
    return () => { document.body.style.overflow = prev; if (window.lenis) window.lenis.start(); };
  }, [open]);

  // Hardware back closes the sheet instead of leaving the page.
  const poppedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return undefined;
    poppedRef.current = false;
    window.history.pushState({ grhSearchOverlay: true }, '');
    const onPop = () => { poppedRef.current = true; onCloseRef.current?.(); };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (!poppedRef.current) window.history.back();
    };
  }, [open]);

  if (!open) return null;

  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const addPlace = (name) => {
    const n = String(name || '').trim();
    if (!n) return;
    setPlaces((p) => (p.some((x) => x.toLowerCase() === n.toLowerCase()) ? p : [...p, n]));
    setText(''); setSuggestions([]);
    inputRef.current?.focus();
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state_district || '';
          if (city) addPlace(city);
        } finally { setLocating(false); }
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  const typeList = TYPES[tab];
  const showBhk = ['buy', 'rent', 'pg'].includes(tab);
  const showStatus = ['buy', 'commercial', 'plots'].includes(tab) && tab !== 'plots';
  const countFor = { types: types.length, bhk: bhks.length, status: status.length, posted: postedBy.length };
  const filterCount = types.length + bhks.length + status.length + postedBy.length + (budgetOn ? 1 : 0);

  const buildUrl = () => {
    const base = { ...TABS.find((t) => t.key === tab).params };
    const params = new URLSearchParams(base);
    const typed = text.trim();
    const allPlaces = typed && !places.some((p) => p.toLowerCase() === typed.toLowerCase()) ? [...places, typed] : places;
    if (allPlaces.length) params.set('areas', allPlaces.join(','));
    const chosenTypes = tab === 'plots' && types.length === 0 ? ['Plot / Land'] : types;
    if (chosenTypes.length) params.set('subType', chosenTypes.join(','));
    if (showBhk && bhks.length) params.set('bhkType', bhks.join(','));
    if (showStatus && status.length) params.set('availability', status.join(','));
    if (postedBy.length) params.set('postedBy', postedBy.join(','));
    const min = steps[lo]; const max = steps[hi];
    if (min) params.set('minPrice', String(min));
    if (max) params.set('maxPrice', String(max));
    const label = `${TABS.find((t) => t.key === tab).label}${allPlaces.length ? ` in ${allPlaces.join(', ')}` : ''}${bhks.length ? ` · ${bhks.join(', ')}` : ''}`;
    return { url: `/search?${params.toString()}`, label };
  };

  const search = () => {
    const { url, label } = buildUrl();
    addRecentSearch({ label, url });
    poppedRef.current = true;
    onClose?.();
    navigate(url, { replace: true });
  };

  const openRecent = (r) => {
    poppedRef.current = true;
    onClose?.();
    navigate(r.url, { replace: true });
  };

  const clearFilters = () => { setTypes([]); setBhks([]); setStatus([]); setPostedBy([]); setRange([0, null]); };

  return createPortal(
    <div className="fixed inset-0 z-[400] flex flex-col bg-gray-50 lg:hidden">
      <style>{`
        .dual-range{-webkit-appearance:none;appearance:none;background:transparent;pointer-events:none;position:absolute;left:0;right:0;width:100%;height:28px;margin:0}
        .dual-range::-webkit-slider-thumb{-webkit-appearance:none;pointer-events:auto;height:22px;width:22px;border-radius:50%;background:#fff;border:2px solid ${BRAND};box-shadow:0 1px 4px rgba(0,0,0,.25);cursor:pointer}
        .dual-range::-moz-range-thumb{pointer-events:auto;height:18px;width:18px;border-radius:50%;background:#fff;border:2px solid ${BRAND};cursor:pointer}
      `}</style>

      {/* Header: tabs + close */}
      <div className="shrink-0 px-4 pt-3" style={{ backgroundColor: BRAND }}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[15px] font-bold text-white">Search properties</p>
          <button type="button" onClick={onClose} aria-label="Close search" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white active:scale-95">
            <X size={17} />
          </button>
        </div>
        <div className="-mx-4 mt-2 flex overflow-x-auto px-4 no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setTab(t.key); setTypes([]); setBhks([]); setStatus([]); setRange([0, null]); }}
              className={`relative shrink-0 px-4 py-3 text-[14px] font-semibold ${tab === t.key ? 'text-white' : 'text-white/70'}`}
            >
              {t.label}
              {tab === t.key && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-white" />}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto pb-28">
        {/* Search card: chips + input */}
        <div className="relative z-20 -mt-0 bg-white px-4 pb-3 pt-3 shadow-sm">
          <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) addPlace(text); }}>
            <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 focus-within:border-[#005B9F]">
              <Search size={16} className="shrink-0 text-gray-400" />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {places.map((p) => (
                  <span key={p} className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold" style={{ borderColor: `${BRAND}55`, color: BRAND, backgroundColor: `${BRAND}0F` }}>
                    {p}
                    <button type="button" onClick={() => setPlaces(places.filter((x) => x !== p))} aria-label={`Remove ${p}`}><X size={12} /></button>
                  </span>
                ))}
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={places.length ? 'Add more' : 'Enter Locality / Project / City'}
                  className="min-w-[110px] flex-1 bg-transparent py-1 text-[14px] text-gray-800 outline-none placeholder:text-gray-400"
                />
              </div>
              <button type="button" onClick={useMyLocation} aria-label="Use my location" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ color: BRAND, backgroundColor: `${BRAND}12` }}>
                {locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
              </button>
            </div>
          </form>

          {/* Suggestions */}
          {text.trim() && (
            <ul className="absolute inset-x-4 top-full z-30 mt-1 max-h-[55vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
              {sugLoading && suggestions.length === 0 && (
                <li className="flex items-center gap-2 px-4 py-3 text-[13px] text-gray-400"><Loader2 size={14} className="animate-spin" /> Searching…</li>
              )}
              {!sugLoading && suggestions.length === 0 && (
                <li>
                  <button type="button" onClick={() => addPlace(text)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] text-gray-700">
                    <Plus size={14} /> Add "{text.trim()}"
                  </button>
                </li>
              )}
              {suggestions.map((s) => (
                <li key={`${s.type}-${s.label}`} className="border-b border-gray-50 last:border-0">
                  <button type="button" onClick={() => addPlace(s.type === 'Locality' ? s.name : s.name)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-gray-50">
                    <MapPin size={15} className="shrink-0 text-gray-400" />
                    <span className="min-w-0 flex-1 truncate text-[14px] text-gray-800">{s.label}</span>
                    <span className="shrink-0 text-[11px] font-medium text-gray-400">{s.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {recent.length > 0 && !text.trim() && (
            <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 no-scrollbar">
              {recent.map((r, i) => (
                <button key={`${r.label}-${i}`} type="button" onClick={() => openRecent(r)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600">
                  <Clock size={12} className="text-gray-400" /> <span className="max-w-[180px] truncate">{r.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mt-3 bg-white px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">Filters</p>
            {filterCount > 0 && <button type="button" onClick={clearFilters} className="text-[12px] font-semibold" style={{ color: BRAND }}>Clear all filters</button>}
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
            <Pill label="Property Types" count={countFor.types} open={panel === 'types'} onClick={() => setPanel(panel === 'types' ? '' : 'types')} />
            <Pill label="Budget" count={budgetOn ? 1 : 0} open={panel === 'budget'} onClick={() => setPanel(panel === 'budget' ? '' : 'budget')} />
            {showBhk && <Pill label="Bedroom" count={countFor.bhk} open={panel === 'bhk'} onClick={() => setPanel(panel === 'bhk' ? '' : 'bhk')} />}
            {showStatus && <Pill label="Construction Status" count={countFor.status} open={panel === 'status'} onClick={() => setPanel(panel === 'status' ? '' : 'status')} />}
            <Pill label="Posted By" count={countFor.posted} open={panel === 'posted'} onClick={() => setPanel(panel === 'posted' ? '' : 'posted')} />
          </div>

          {panel === 'types' && (
            <div className="mt-3">
              <p className="mb-2 text-[13px] font-semibold text-gray-700">Property type</p>
              <div className="flex flex-wrap gap-2">{typeList.map((t) => <Choice key={t} on={types.includes(t)} onClick={() => toggle(types, setTypes, t)}>{t}</Choice>)}</div>
            </div>
          )}

          {panel === 'budget' && (
            <div className="mt-3">
              <p className="text-[13px] font-semibold text-gray-700">Select price range{tab === 'rent' || tab === 'pg' ? ' (per month)' : ''}</p>
              <p className="mb-3 mt-0.5 text-[12px] text-gray-500">₹{money(steps[lo])} - {steps[hi] === null ? `${money(steps[hi - 1])}+` : `₹${money(steps[hi])}`}</p>
              <div className="relative mx-2 h-7">
                <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gray-200" />
                <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ left: `${(lo / lastIdx) * 100}%`, right: `${100 - (hi / lastIdx) * 100}%`, backgroundColor: BRAND }} />
                <input type="range" className="dual-range" min={0} max={lastIdx} step={1} value={lo} onChange={(e) => setRange([Math.min(Number(e.target.value), hi - 1), range[1]])} />
                <input type="range" className="dual-range" min={0} max={lastIdx} step={1} value={hi} onChange={(e) => { const v = Math.max(Number(e.target.value), lo + 1); setRange([range[0], v >= lastIdx ? null : v]); }} />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-gray-400"><span>₹0</span><span>{money(steps[lastIdx - 1])}+</span></div>
            </div>
          )}

          {panel === 'bhk' && showBhk && (
            <div className="mt-3">
              <p className="mb-2 text-[13px] font-semibold text-gray-700">Number of bedrooms</p>
              <div className="flex flex-wrap gap-2">{BHKS.map(([label, val]) => <Choice key={val} on={bhks.includes(val)} onClick={() => toggle(bhks, setBhks, val)}>{label}</Choice>)}</div>
            </div>
          )}

          {panel === 'status' && showStatus && (
            <div className="mt-3">
              <p className="mb-2 text-[13px] font-semibold text-gray-700">Construction status</p>
              <div className="flex flex-wrap gap-2">{STATUS.map(([label, val]) => <Choice key={val} on={status.includes(val)} onClick={() => toggle(status, setStatus, val)}>{label}</Choice>)}</div>
            </div>
          )}

          {panel === 'posted' && (
            <div className="mt-3">
              <p className="mb-2 text-[13px] font-semibold text-gray-700">Posted by</p>
              <div className="flex flex-wrap gap-2">{POSTED_BY.map((p) => <Choice key={p} on={postedBy.includes(p)} onClick={() => toggle(postedBy, setPostedBy, p)}>{p}</Choice>)}</div>
            </div>
          )}
        </div>

        {/* Popular cities */}
        {cities.length > 0 && (
          <div className="mt-3 bg-white px-4 py-4">
            <p className="mb-3 text-[13px] text-gray-500">Popular cities in <span className="font-bold text-gray-800">India</span></p>
            <div className="flex flex-wrap gap-2">
              {cities.map(({ city, count }) => (
                <button key={city} type="button" onClick={() => addPlace(city)} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-gray-700 active:scale-95">
                  <Plus size={12} className="text-gray-400" /> {city} <span className="text-[10px] font-bold text-gray-300">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search / Cancel */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-gray-200 bg-white px-4 py-3">
        <button type="button" onClick={onClose} className="px-3 py-3 text-[14px] font-semibold" style={{ color: BRAND }}>Cancel</button>
        <button type="button" onClick={search} className="flex-1 rounded-xl py-3.5 text-[15px] font-bold text-white shadow-lg active:scale-[0.99]" style={{ backgroundColor: ACCENT }}>
          Search{filterCount > 0 ? ` (${filterCount} filter${filterCount > 1 ? 's' : ''})` : ''}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default MobileSearchOverlay;
