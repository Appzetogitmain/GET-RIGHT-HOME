import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, Crosshair, Mic, Plus, Loader2 } from 'lucide-react';
import { api } from '../../services/apiService';
import { addRecentSearch } from '../../utils/recentActivity';
import { parseSearchQuery } from '../../utils/searchQueryParser';
import SearchSuggestions from './SearchSuggestions';

/**
 * Full-screen search for mobile.
 *
 * Tapping Search in the bottom nav used to jump straight to the results page
 * with an empty query, which showed the whole catalogue and made the user
 * filter their way back down. This puts the query first: pick an intent, type
 * (with live inventory suggestions) or tap a city we actually have listings in.
 *
 * Mobile only — the desktop search bar already covers this.
 */

const TABS = [
  { key: 'buy', label: 'Buy', params: { transactionType: 'Sell', propertyCategory: 'Residential' } },
  { key: 'rent', label: 'Rent/PG', params: { transactionType: 'Rent / Lease', propertyCategory: 'Residential' } },
  { key: 'commercial', label: 'Commercial', params: { propertyCategory: 'Commercial' } }
];

const MobileSearchOverlay = ({ open, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('buy');
  const [query, setQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  // Popular cities come from real inventory, so a chip can never lead to an
  // empty result page.
  useEffect(() => {
    if (!open || cities.length > 0) return;
    let cancelled = false;
    setCitiesLoading(true);

    api.get('/properties/popular-cities', { params: { limit: 8 } })
      .then((res) => {
        if (!cancelled) setCities(res.data?.cities || []);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, cities.length]);

  // Lock the page behind the sheet, and stop Lenis fighting the overlay's own
  // scrolling (the app drives smooth scroll globally).
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (window.lenis) window.lenis.stop();

    const focusTimer = setTimeout(() => inputRef.current?.focus(), 120);

    return () => {
      document.body.style.overflow = previous;
      if (window.lenis) window.lenis.start();
      clearTimeout(focusTimer);
    };
  }, [open]);

  // Esc closes the sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Android's hardware back must close the sheet, not navigate away from the
  // page underneath it — otherwise opening search and pressing back throws the
  // user off the page entirely, which reads as "back is broken".
  //
  // Done by pushing one throwaway history entry when the sheet opens, so back
  // pops that instead of a real route. `poppedRef` tracks whether the browser
  // already consumed it, so closing via X doesn't pop an entry that's gone.
  const poppedRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    poppedRef.current = false;
    window.history.pushState({ grhSearchOverlay: true }, '');

    const onPop = () => {
      poppedRef.current = true; // the browser consumed our entry
      onClose?.();
    };

    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // Closed by X / selecting a result rather than by back — remove the
      // entry we added so the user's next back press isn't swallowed.
      if (!poppedRef.current) window.history.back();
    };
  }, [open, onClose]);

  if (!open) return null;

  const tabParams = TABS.find((t) => t.key === activeTab)?.params || {};

  /**
   * Leaves the sheet for a results page.
   *
   * Uses `replace` so the throwaway history entry the sheet added BECOMES the
   * results page. Two things fall out of that: back from the results goes to
   * whatever the user was on before opening search (not back into the sheet),
   * and the cleanup's history.back() can't race the navigation and undo it —
   * hence marking the entry as already consumed first.
   */
  const goToUrl = (url, label = '') => {
    if (label) addRecentSearch({ label, url });
    poppedRef.current = true;
    onClose?.();
    navigate(url, { replace: true });
  };

  const go = (extra = {}, label = '') => {
    const params = new URLSearchParams({ ...tabParams, ...extra });
    goToUrl(`/search?${params.toString()}`, label);
  };

  const submitTyped = () => {
    const text = query.trim();
    if (!text) {
      go({}, `${TABS.find((t) => t.key === activeTab)?.label} properties`);
      return;
    }

    // Same understanding as the results page: "2bhk in indore" becomes real
    // filters rather than a literal text match.
    const parsed = parseSearchQuery(text);
    const extra = {};
    if (parsed.location) extra.areas = parsed.location;
    else extra.search = text;
    if (parsed.bhk) extra.bhkType = parsed.bhk;
    if (parsed.maxPrice) extra.maxPrice = String(parsed.maxPrice);
    if (parsed.subType) extra.subType = parsed.subType;

    go(extra, text);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`
          );
          const data = await res.json();
          const city =
            data.address?.city || data.address?.town ||
            data.address?.village || data.address?.state_district || '';
          if (city) go({ areas: city }, `Properties near ${city}`);
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  return (
    <div className="fixed inset-0 z-[400] bg-gray-50 flex flex-col md:hidden">
      {/* ── Header: intent tabs + close ─────────────────────────── */}
      <div className="bg-[#005B9F] px-4 pt-4 pb-5 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-[13px] font-bold whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-[#005B9F]'
                    : 'bg-white/10 text-white/90 hover:bg-white/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* ── Search field (pulled up over the header edge) ────────── */}
      <div className="px-4 -mt-3 shrink-0">
        <form
          className="relative"
          onSubmit={(e) => { e.preventDefault(); submitTyped(); }}
        >
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-100 px-3 h-12">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSuggestionsOpen(true); }}
              onFocus={() => setSuggestionsOpen(true)}
              placeholder="Try - Hyderabad"
              className="flex-1 min-w-0 text-[14px] text-gray-800 outline-none bg-transparent placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={useMyLocation}
              aria-label="Use my location"
              className="w-8 h-8 flex items-center justify-center text-[#005B9F] shrink-0 border-l border-gray-100"
            >
              {locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
            </button>
            {/* Voice search isn't wired up yet — shown disabled rather than
                pretending to work. */}
            <span className="w-7 h-7 flex items-center justify-center text-gray-300 shrink-0" title="Voice search coming soon">
              <Mic size={16} />
            </span>
          </div>

          <SearchSuggestions
            query={query}
            open={suggestionsOpen}
            onClose={() => setSuggestionsOpen(false)}
            onSelect={(item) => {
              setSuggestionsOpen(false);
              if (item.url) goToUrl(item.url, item.label);
              else { setQuery(item.label); submitTyped(); }
            }}
          />
        </form>
      </div>

      {/* ── Popular cities ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[12px] text-gray-500 mb-3">
            Popular cities in <span className="font-bold text-gray-800">India</span>
          </p>

          {citiesLoading ? (
            <div className="flex items-center gap-2 text-[12px] text-gray-400 py-2">
              <Loader2 size={13} className="animate-spin" /> Loading cities…
            </div>
          ) : cities.length === 0 ? (
            <p className="text-[12px] text-gray-400 py-2">
              No cities with listings yet — try typing a location above.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {cities.map(({ city, count }) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => go({ areas: city }, `Properties in ${city}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white
                             text-[13px] font-semibold text-gray-700 active:scale-95 transition-transform"
                >
                  <Plus size={12} className="text-gray-400 shrink-0" />
                  {city}
                  <span className="text-[10px] font-bold text-gray-300">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileSearchOverlay;
