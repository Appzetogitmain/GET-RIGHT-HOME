import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, ChevronUp, MapPin, Minus, Plus, Search, ShoppingCart, Star, Zap } from 'lucide-react';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = String(url).replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const unitPrice = (base, offer) => {
  const b = Number(base) || 0;
  const o = Number(offer) || 0;
  return o > 0 && o < b ? o : b;
};
const subIdOf = (service) => String(service.subCategoryId?._id || service.subCategoryId?.id || service.subCategoryId || service.subCategory?._id || '');

const COLLAPSED = 7; // 7 tiles + the "Show More" tile = two rows of four

/**
 * Category landing: a hero banner, a search box and the category's sub-categories
 * as a grid. Tapping one opens its services page (where all sub-categories
 * sit on top as tabs).
 */
const CategoryLanding = ({ category, subCategories, services = [], cartItems = [], totalPrice = 0, loading, cityName, cartCount, instantEta, onBack, onOpenCart, onPick, onAdd, onChangeQty }) => {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? subCategories.filter((s) => String(s.title || '').toLowerCase().includes(q)) : subCategories;
  }, [subCategories, query]);

  const servicesBySub = useMemo(() => {
    const map = {};
    services.forEach((svc) => { (map[subIdOf(svc)] = map[subIdOf(svc)] || []).push(svc); });
    return map;
  }, [services]);

  const lineOf = (service, option) => cartItems.find((i) =>
    String(i.serviceId) === String(service._id || service.id) && (i.optionLabel || '') === (option?.label || ''));

  const scrollToSub = (sub) => {
    const el = document.getElementById(`sub-${sub.id || sub._id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const needsToggle = !query && filtered.length > COLLAPSED + 1;
  const shown = needsToggle && !expanded ? filtered.slice(0, COLLAPSED) : filtered;
  const hero = toAssetUrl(category?.bannerUrl || category?.imageUrl || category?.image || category?.homeIconUrl);
  const rating = Number(category?.rating) || 0;

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
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
          <span className="absolute bottom-10 left-4 inline-flex items-center gap-1.5 rounded-full bg-[#347989] px-3 py-1.5 text-xs font-bold text-white shadow-lg">
            <Zap className="h-3.5 w-3.5 fill-white text-white" /> In {instantEta} Mins
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
          <h1 className="text-xl font-bold leading-snug text-slate-900">
            {category?.title || 'Services'}{cityName ? ` in ${cityName}` : ''} - Book Online
          </h1>
          {rating > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{rating.toFixed(2)}</span>
              {category?.reviewCount && <span>({category.reviewCount} ratings)</span>}
            </p>
          )}
        </div>

        {/* Sub-category grid */}
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
          {loading && subCategories.length === 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">{query ? 'Nothing matches your search.' : 'No options available right now.'}</p>
          ) : (
            <div className="grid grid-cols-4 gap-x-2 gap-y-5">
              {shown.map((sub) => {
                const img = toAssetUrl(sub.iconUrl || sub.imageUrl || sub.icon);
                const badge = sub.isMostOrdered || sub.mostOrdered || sub.isPopular;
                return (
                  <button key={sub.id || sub._id} type="button" onClick={() => scrollToSub(sub)} className="relative flex flex-col items-center text-center transition active:scale-95">
                    {badge && (
                      <span className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-[#347989]/10 px-1.5 py-0.5 text-[8px] font-bold text-[#347989]">
                        Most Ordered
                      </span>
                    )}
                    <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
                      {img ? <img src={img} alt="" className="h-full w-full object-contain p-1" /> : <span className="text-2xl font-bold text-slate-300">{String(sub.title || '?').charAt(0)}</span>}
                    </span>
                    <span className="mt-2 line-clamp-2 text-xs font-medium leading-tight text-slate-700">{sub.title}</span>
                  </button>
                );
              })}
              {needsToggle && (
                <button type="button" onClick={() => setExpanded((e) => !e)} className="flex flex-col items-center text-center">
                  <span className="flex aspect-square w-full items-center justify-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </span>
                  </span>
                  <span className="mt-2 text-xs font-medium text-slate-700">{expanded ? 'Show Less' : 'Show More'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Services, one section per sub-category (in grid order) */}
        <div className="mt-5 space-y-4">
          {filtered.map((sub) => {
            const sid = String(sub.id || sub._id);
            const list = servicesBySub[sid] || [];
            const img = toAssetUrl(sub.iconUrl || sub.imageUrl || sub.icon);
            const rows = list.flatMap((svc) => (svc.options?.length
              ? svc.options.map((o) => ({ key: `${svc._id || svc.id}-${o.label}`, svc, option: o, title: o.label ? `${svc.title} · ${o.label}` : svc.title, price: unitPrice(o.price, o.discountPrice), mrp: Number(o.price) || 0, duration: o.duration || svc.duration }))
              : [{ key: String(svc._id || svc.id), svc, option: null, title: svc.title, price: unitPrice(svc.basePrice ?? svc.price, svc.discountPrice), mrp: Number(svc.basePrice ?? svc.price) || 0, duration: svc.duration }]));
            if (rows.length === 0 && !loading) return null;
            return (
              <section key={sid} id={`sub-${sid}`} className="scroll-mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                    {img ? <img src={img} alt="" className="h-full w-full object-contain p-0.5" /> : <span className="font-bold text-slate-300">{String(sub.title || '?').charAt(0)}</span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold text-slate-900">{sub.title}</h2>
                    <p className="text-[11px] text-slate-500">{rows.length} {rows.length === 1 ? 'service' : 'services'}</p>
                  </div>
                </div>

                {rows.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">{loading ? 'Loading services…' : 'No services available yet.'}</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {rows.map((row) => {
                      const line = lineOf(row.svc, row.option);
                      const blurb = String(row.svc.subheading || row.svc.description || '').split(/\r?\n|->/)[0].trim();
                      return (
                        <li key={row.key} className="flex items-center gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold leading-snug text-slate-900">{row.title}</h3>
                            {blurb && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{blurb}</p>}
                            <p className="mt-1 flex items-center gap-1.5 text-sm">
                              <span className="font-bold text-slate-900">{inr(row.price)}</span>
                              {row.mrp > row.price && <span className="text-xs text-slate-400 line-through">{inr(row.mrp)}</span>}
                              {row.duration && <span className="text-xs text-slate-400">· {row.duration}</span>}
                            </p>
                          </div>
                          {line ? (
                            <div className="flex shrink-0 items-center overflow-hidden rounded-lg bg-[#347989] text-white">
                              <button type="button" onClick={() => onChangeQty(line, -1)} className="px-2.5 py-2"><Minus className="h-3.5 w-3.5" /></button>
                              <span className="min-w-[20px] text-center text-sm font-semibold">{line.serviceCount || 1}</span>
                              <button type="button" onClick={() => onChangeQty(line, 1)} className="px-2.5 py-2"><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => onAdd(row.svc, row.option, sub)} className="shrink-0 rounded-lg border border-[#347989] px-4 py-1.5 text-sm font-bold text-[#347989] active:scale-95">
                              Add
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-3xl px-4 pb-4">
          <button type="button" onClick={onOpenCart} className="flex w-full items-center justify-between rounded-2xl bg-[#347989] px-5 py-3.5 text-white shadow-xl">
            <span className="text-sm font-semibold">{cartCount} {cartCount > 1 ? 'items' : 'item'} · {inr(totalPrice)}</span>
            <span className="flex items-center text-sm font-bold">View Cart <ChevronRight className="h-4 w-4" /></span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryLanding;
