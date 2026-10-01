import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, MapPin, Search, ShoppingCart, Star, Zap } from 'lucide-react';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = String(url).replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const COLLAPSED = 9; // 9 tiles + the "Show More" tile = two rows of five

/**
 * Category landing: a hero banner, a search box and the category's sub-categories
 * as a grid. Tapping one opens its services page (where all sub-categories
 * sit on top as tabs).
 */
const CategoryLanding = ({ category, subCategories, loading, cityName, cartCount, instantEta, onBack, onOpenCart, onPick }) => {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? subCategories.filter((s) => String(s.title || '').toLowerCase().includes(q)) : subCategories;
  }, [subCategories, query]);

  const needsToggle = !query && filtered.length > COLLAPSED + 1;
  const shown = needsToggle && !expanded ? filtered.slice(0, COLLAPSED) : filtered;
  const hero = toAssetUrl(category?.bannerUrl || category?.imageUrl || category?.image || category?.homeIconUrl);
  const rating = Number(category?.rating) || 0;

  return (
    <div className="min-h-screen bg-white pb-10">
      {/* Hero */}
      <div className="relative h-56 w-full overflow-hidden bg-slate-800">
        {hero && <img src={hero} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/20" />
        <div className="absolute inset-x-0 top-0 mx-auto flex max-w-3xl items-center gap-2 px-4 pt-4">
          <button type="button" onClick={onBack} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur">
            <ArrowLeft className="h-5 w-5" />
          </button>
          {cityName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
              <MapPin className="h-3.5 w-3.5" /> {cityName}
            </span>
          )}
          <button type="button" onClick={onOpenCart} aria-label="Cart" className="relative ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold">{cartCount}</span>
            )}
          </button>
        </div>
        {instantEta > 0 && (
          <span className="absolute bottom-10 left-4 inline-flex items-center gap-1.5 rounded-full bg-violet-800 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
            <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> In {instantEta} Mins
          </span>
        )}
      </div>

      <div className="relative mx-auto -mt-6 max-w-3xl px-4">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-100">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search in ${category?.title || 'services'}`}
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="mt-5">
          <h1 className="text-2xl font-bold text-slate-900">{category?.title || 'Services'}</h1>
          {rating > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{rating.toFixed(2)}</span>
              {category?.reviewCount && <span>({category.reviewCount} ratings)</span>}
            </p>
          )}
        </div>

        {/* Sub-category grid */}
        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-md">
          {loading && subCategories.length === 0 ? (
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">{query ? 'Nothing matches your search.' : 'No options available right now.'}</p>
          ) : (
            <div className="grid grid-cols-5 gap-x-2 gap-y-4">
              {shown.map((sub) => {
                const img = toAssetUrl(sub.iconUrl || sub.imageUrl || sub.icon);
                return (
                  <button key={sub.id || sub._id} type="button" onClick={() => onPick(sub)} className="flex flex-col items-center text-center transition active:scale-95">
                    <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50 p-1">
                      {img ? <img src={img} alt="" className="h-full w-full object-contain" /> : <span className="text-xl font-bold text-slate-300">{String(sub.title || '?').charAt(0)}</span>}
                    </span>
                    <span className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-tight text-slate-700">{sub.title}</span>
                  </button>
                );
              })}
              {needsToggle && (
                <button type="button" onClick={() => setExpanded((e) => !e)} className="flex flex-col items-center justify-start text-center">
                  <span className="flex aspect-square w-full items-center justify-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </span>
                  </span>
                  <span className="mt-1.5 text-[11px] font-medium text-slate-700">{expanded ? 'Show Less' : 'Show More'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryLanding;
