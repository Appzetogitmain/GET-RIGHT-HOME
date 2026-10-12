import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, Clock, Info, Minus, Plus, Search, ShoppingCart, Star, X } from 'lucide-react';
import { themeColors } from '../../../../theme';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = String(url).replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const teal = themeColors.button;

const priceOf = (service) => {
  const base = Number(service.basePrice ?? service.price) || 0;
  const offer = Number(service.discountPrice) || 0;
  return offer > 0 && offer < base ? offer : base;
};
const optionPrice = (o) => (Number(o.discountPrice) > 0 && Number(o.discountPrice) < Number(o.price) ? Number(o.discountPrice) : Number(o.price) || 0);

const defaultHighlightsFor = (title = '') => {
  const t = String(title || '').toLowerCase();
  if (t.includes('essential')) {
    return [
      'Bathroom & kitchen deep cleaning',
      'Machine cleaning of floors, doors & windows',
      'Cobweb removal, ceiling & fan dusting'
    ];
  }
  if (t.includes('premium')) {
    return [
      'Includes everything in Essential Plan',
      'Cupboard cleaning (interior + exterior, if empty)',
      'Cabinets interior with utensil removal'
    ];
  }
  if (t.includes('post interior') || t.includes('interior')) {
    return [
      'Includes everything in Premium Plan',
      'Includes sticker, gum and garbage removal',
      'Paint and stain removal with best possible efficiency'
    ];
  }
  return [];
};

// The admin's "points": one per line, or separated by "->", with fallback to NoBroker defaults
const bulletsOf = (service) => {
  if (!service) return [];
  const baseDefaults = defaultHighlightsFor(service.title || service.label || '');
  if (Array.isArray(service.features) && service.features.filter(Boolean).length) {
    return service.features.filter(Boolean);
  }
  const points = [];
  if (service.subheading?.trim()) {
    points.push(...service.subheading.split(/\r?\n|->/).map((s) => s.trim()).filter(Boolean));
  }
  if (service.description?.trim()) {
    points.push(...service.description.split(/\r?\n|->/).map((s) => s.trim()).filter(Boolean));
  }
  if (points.length >= 2) return points;
  if (points.length === 1 && baseDefaults.length) {
    return [points[0], ...baseDefaults.slice(1)];
  }
  return baseDefaults.length ? baseDefaults : points;
};

const badgeOf = (item) => {
  if (item?.badge) return item.badge;
  const title = String(item?.title || item?.label || '').toLowerCase();
  if (title.includes('essential')) return '★';
  if (title.includes('premium')) return '💎';
  if (title.includes('elite') || title.includes('vip')) return '👑';
  return '';
};

const ratingInfoOf = (item, fallbackRating, fallbackReviews) => {
  const r = Number(item?.rating);
  if (r > 0) {
    return {
      rating: r.toFixed(2),
      reviewCount: item.reviewCount || '1.2K+'
    };
  }
  if (Number(fallbackRating) > 0) {
    return {
      rating: Number(fallbackRating).toFixed(2),
      reviewCount: fallbackReviews || '1.2K+'
    };
  }
  const title = String(item?.title || item?.label || '').toLowerCase();
  if (title.includes('essential')) return { rating: '4.71', reviewCount: '21.6K+' };
  if (title.includes('premium')) return { rating: '4.63', reviewCount: '26.6K+' };
  if (title.includes('interior')) return { rating: '4.65', reviewCount: '63' };
  return { rating: '4.72', reviewCount: '15.4K+' };
};

const durationOf = (item) => {
  if (item?.duration) return item.duration;
  const title = String(item?.title || item?.label || '').toLowerCase();
  if (title.includes('essential')) return '3 hrs';
  if (title.includes('premium')) return '3 hrs 40 mins';
  if (title.includes('interior')) return '6 hrs';
  return '';
};

/** Bottom sheet: slides up from the bottom, fades the page behind it, slides down on close. */
const Sheet = ({ onClose, children }) => {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(t);
  }, []);
  const close = () => {
    setShown(false);
    setTimeout(onClose, 260);
  };
  return (
    <div className="fixed inset-0 z-[70]" onClick={close}>
      <div className={`absolute inset-0 bg-black/55 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} />
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[85vh] max-w-xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl transition-transform duration-300 ease-out ${shown ? 'translate-y-0' : 'translate-y-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {typeof children === 'function' ? children(close) : children}
      </div>
    </div>
  );
};

const Stepper = ({ count, onMinus, onPlus }) => (
  <div className="flex items-center overflow-hidden rounded-lg text-white" style={{ backgroundColor: teal }}>
    <button type="button" onClick={onMinus} className="px-2.5 py-2 hover:bg-black/10"><Minus size={14} /></button>
    <span className="min-w-[20px] text-center text-sm font-semibold">{count}</span>
    <button type="button" onClick={onPlus} className="px-2.5 py-2 hover:bg-black/10"><Plus size={14} /></button>
  </div>
);

/**
 * The customer's services page for a sub-category: services grouped under a
 * heading (e.g. "Furnished Apartment"), each with rating, duration, price,
 * highlights and Add. A service with options opens a sheet to pick one.
 */
const ServiceListing = ({
  title,
  subTitle,
  subRating,
  mergePlain = true,
  ctaLabel = 'Select Address',
  etaMinutes,
  subReviewCount,
  bannerUrl,
  description,
  services,
  loading,
  cartItems,
  cartCount,
  totalPrice,
  onAdd,
  onChangeQty,
  onBack,
  onOpenCart,
  subCategories = [],
  activeSubId,
  onSelectSub,
  childSubCategories = [],
  activeChildId,
  onSelectChild,
  embedded = false
}) => {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [optionsFor, setOptionsFor] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [viewingDetailItem, setViewingDetailItem] = useState(null);

  // An option that stands for a whole service (see `rows`) is found by that service's id.
  const lines = (service, option) => (cartItems || []).filter((item) =>
    String(item.serviceId) === String(option?._service ? (option._service._id || option._service.id) : (service._id || service.id))
    && (item.optionLabel || '') === (option?._service ? '' : (option?.label || '')));
  const linesForService = (service) => (cartItems || []).filter((item) => (service.options || []).some((o) => o._service)
    ? service.options.some((o) => String(o._service._id || o._service.id) === String(item.serviceId))
    : String(item.serviceId) === String(service._id || service.id));

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (services || []).filter((s) => !q || `${s.title} ${s.groupTitle || ''}`.toLowerCase().includes(q));
  }, [services, search]);

  // Everything sits in one card headed by the sub-category's name.
  // Plain services (no options of their own) are folded into ONE row, "2 options",
  // so the customer picks 2BHK / 3BHK ... from a sheet instead of seeing a long list.
  const rows = useMemo(() => {
    const plain = visible.filter((s) => !(s.options || []).length);
    if (!mergePlain || plain.length < 2) return visible;
    const merged = {
      _id: '__merged__',
      title: subTitle || title,
      options: plain.map((s) => ({
        label: s.title,
        price: Number(s.basePrice ?? s.price) || 0,
        discountPrice: Number(s.discountPrice) || 0,
        duration: s.duration || '',
        _service: s
      }))
    };
    const rest = visible.filter((s) => (s.options || []).length);
    return [merged, ...rest];
  }, [visible, subTitle, title, mergePlain]);
  const groups = useMemo(() => (rows.length ? [[subTitle || '', rows]] : []), [rows, subTitle]);

  const optionsService = optionsFor && rows.find((s) => String(s._id || s.id) === String(optionsFor));

  return (
    <div className={embedded ? '' : 'min-h-screen bg-[#F1F3F6] pb-28'}>
      {/* Header */}
      {!embedded && <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3.5">
          <button type="button" onClick={onBack} aria-label="Back" className="rounded-full p-1.5 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5 text-slate-900" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900">{title}</h1>
          <button type="button" onClick={() => setSearchOpen((o) => !o)} aria-label="Search" className="rounded-full p-2 hover:bg-slate-100">
            <Search className="h-5 w-5 text-slate-700" />
          </button>
          <button type="button" onClick={onOpenCart} aria-label="Cart" className="relative rounded-full p-2 hover:bg-slate-100">
            <ShoppingCart className="h-5 w-5 text-slate-700" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
        {subCategories.length > 1 && (
          <div className="mx-auto max-w-3xl overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-3">
              {subCategories.map((sub) => {
                const id = sub.id || sub._id;
                const active = String(id) === String(activeSubId);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectSub?.(sub)}
                    className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 text-center"
                  >
                    <span
                      className="flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-xl border-2 bg-slate-50 p-1.5 transition"
                      style={{ borderColor: active ? teal : '#E2E8F0', backgroundColor: active ? `${themeColors.brand.teal}12` : '#F8FAFC' }}
                    >
                      {(sub.iconUrl || sub.imageUrl || sub.icon)
                        ? <img src={toAssetUrl(sub.iconUrl || sub.imageUrl || sub.icon)} alt="" className="h-full w-full object-contain" />
                        : <span className="text-lg font-bold text-slate-400">{String(sub.title || '?').charAt(0)}</span>}
                    </span>
                    <span className={`line-clamp-2 text-[11px] leading-tight ${active ? 'font-bold text-slate-900' : 'font-medium text-slate-500'}`}>{sub.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {childSubCategories.length > 0 && (
          <div className="mx-auto max-w-3xl overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2">
              {[{ id: null, title: 'All' }, ...childSubCategories].map((child) => {
                const id = child.id === null ? null : (child.id || child._id);
                const active = String(id ?? '') === String(activeChildId ?? '');
                return (
                  <button
                    key={id ?? 'all'}
                    type="button"
                    onClick={() => onSelectChild?.(id === null ? null : child)}
                    className="shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition"
                    style={{ borderColor: active ? teal : '#E2E8F0', backgroundColor: active ? teal : '#fff', color: active ? '#fff' : '#475569' }}
                  >
                    {child.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {searchOpen && (
          <div className="mx-auto max-w-3xl px-4 pb-3">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            />
          </div>
        )}
      </header>}

      <main className="mx-auto max-w-3xl">
        <div className="px-4 pb-6 pt-4">
          {loading && visible.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : visible.length === 0 ? (
            embedded ? null : <p className="py-16 text-center text-sm text-slate-500">No services found.</p>
          ) : groups.map(([group, items]) => (
            <section key={group || 'all'} className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {bannerUrl && (
                <div className="aspect-[16/7] w-full overflow-hidden bg-slate-200">
                  <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              {group && <h2 className="px-4 pt-4 text-xl font-bold text-slate-900">{group}</h2>}
              {etaMinutes > 0 && (
                <p className="mx-4 mt-1.5 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-bold text-violet-700">
                  <Clock className="h-3 w-3" /> Professional arrives in ~{etaMinutes} mins
                </p>
              )}
              {Number(subRating) > 0 && (
                <p className="flex items-center gap-1.5 px-4 pt-1 text-sm text-slate-600">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-slate-800">{Number(subRating).toFixed(2)}</span>
                  {subReviewCount && <span>({subReviewCount})</span>}
                </p>
              )}
              {description && (
                <p className="whitespace-pre-line px-4 pt-2 text-sm leading-relaxed text-slate-600">{description}</p>
              )}
              <div className="mt-2 divide-y divide-slate-100">
                {items.map((service) => {
                  const id = service._id || service.id;
                  const itemKey = String(id);
                  const options = service.options || [];
                  const hasOptions = options.length > 0;
                  const inCart = linesForService(service);
                  const added = inCart.length > 0;
                  const single = !hasOptions ? lines(service, null)[0] : null;
                  const from = hasOptions ? Math.min(...options.map(optionPrice)) : priceOf(service);
                  const bullets = bulletsOf(service);
                  const thumb = toAssetUrl(service.imageUrl || service.icon || '');
                  const badge = badgeOf(service);
                  const ratingInfo = ratingInfoOf(service, subRating, subReviewCount);
                  const duration = durationOf(service);
                  const isExpanded = expandedIds.has(itemKey);

                  return (
                    <div key={id} className="px-4 py-4.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="flex items-center gap-1.5 text-base sm:text-[17px] font-bold text-slate-900 leading-snug">
                            <span>{service.title}</span>
                            {badge && <span className="text-base">{badge}</span>}
                          </h3>

                          {(ratingInfo.rating || duration) && (
                            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs sm:text-sm text-slate-600">
                              {ratingInfo.rating && (
                                <span className="flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                  <span className="font-semibold text-slate-800">{ratingInfo.rating}</span>
                                  {ratingInfo.reviewCount && (
                                    <span className="border-b border-dotted border-slate-400 text-slate-600">
                                      ({ratingInfo.reviewCount})
                                    </span>
                                  )}
                                </span>
                              )}
                              {ratingInfo.rating && duration && <span className="text-slate-300">·</span>}
                              {duration && (
                                <span className="inline-flex items-center gap-1 text-slate-600">
                                  <Clock className="h-3.5 w-3.5 text-slate-500" /> {duration}
                                </span>
                              )}
                            </p>
                          )}

                          <p className="mt-2 text-lg font-bold text-slate-900">
                            {hasOptions && <span className="mr-1.5 text-xs font-normal text-slate-500">Starts at</span>}
                            {inr(from)}
                            {!hasOptions && Number(service.discountPrice) > 0 && Number(service.discountPrice) < Number(service.basePrice) && (
                              <span className="ml-2 text-sm font-normal text-slate-400 line-through">{inr(service.basePrice)}</span>
                            )}
                          </p>
                        </div>

                        <div className="shrink-0 text-center">
                          {thumb ? (
                            <div className="relative mb-2 flex flex-col items-center">
                              <img
                                src={thumb}
                                alt=""
                                className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl border border-slate-100 object-cover shadow-sm"
                              />
                              <div className="mt-[-14px] z-10">
                                {!hasOptions && single ? (
                                  <Stepper
                                    count={single.serviceCount || 1}
                                    onMinus={() => onChangeQty(single, -1)}
                                    onPlus={() => onChangeQty(single, 1)}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => (hasOptions ? setOptionsFor(id) : onAdd(service, null))}
                                    className="min-w-[78px] rounded-lg border bg-white px-5 py-1.5 text-sm font-bold shadow-sm transition active:scale-95"
                                    style={added
                                      ? { backgroundColor: teal, borderColor: teal, color: '#fff' }
                                      : { borderColor: `${teal}99`, color: teal }}
                                  >
                                    {added ? 'Added' : 'Add'}
                                  </button>
                                )}
                              </div>
                              {hasOptions && (
                                <p className="mt-1 text-[11px] text-slate-500 font-medium">{options.length} option{options.length > 1 ? 's' : ''}</p>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              {!hasOptions && single ? (
                                <Stepper
                                  count={single.serviceCount || 1}
                                  onMinus={() => onChangeQty(single, -1)}
                                  onPlus={() => onChangeQty(single, 1)}
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => (hasOptions ? setOptionsFor(id) : onAdd(service, null))}
                                  className="min-w-[80px] rounded-lg border bg-white px-5 py-1.5 text-sm font-bold shadow-sm transition active:scale-95"
                                  style={added
                                    ? { backgroundColor: teal, borderColor: teal, color: '#fff' }
                                    : { borderColor: `${teal}99`, color: teal }}
                                >
                                  {added ? 'Added' : 'Add'}
                                </button>
                              )}
                              {hasOptions && (
                                <p className="mt-1 text-[11px] text-slate-500 font-medium">{options.length} option{options.length > 1 ? 's' : ''}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {bullets.length > 0 && (
                        <div className="mt-3">
                          <ul className="space-y-1.5">
                            {(isExpanded ? bullets : bullets.slice(0, 3)).map((b, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-600 leading-snug">
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-700" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>

                          <button
                            type="button"
                            onClick={() => setViewingDetailItem(service)}
                            className="mt-2.5 inline-flex items-center gap-0.5 text-xs sm:text-sm font-semibold transition hover:underline"
                            style={{ color: teal }}
                          >
                            <span>View details</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {!embedded && (
            <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Final price may vary after inspection or specific requirements.
            </p>
          )}
        </div>
      </main>

      {/* Bottom bar */}
      {!embedded && cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
            <p className="text-lg font-semibold text-slate-900">{inr(totalPrice)}</p>
            <button
              type="button"
              onClick={onOpenCart}
              className="rounded-lg px-8 py-3 text-sm font-semibold text-white shadow-sm active:scale-[0.99]"
              style={{ backgroundColor: teal }}
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      )}

      {/* Options (e.g. 1 BHK ... 5 BHK) */}
      {optionsService && (
        <Sheet onClose={() => setOptionsFor(null)}>
          {(close) => (
            <>
              <div className="flex items-start justify-between border-b border-slate-100 px-5 pb-3 pt-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{optionsService.groupTitle || optionsService.title}</h2>
                  {optionsService.groupTitle && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                      {optionsService.title}
                      {optionsService.badge && <span className="text-base">{optionsService.badge}</span>}
                    </p>
                  )}
                </div>
                <button type="button" onClick={close} aria-label="Close" className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 divide-y divide-slate-100 overflow-y-auto px-5 py-2">
                {optionsService.options.map((option, idx) => {
                  const svc = option._service || option;
                  const line = lines(optionsService, option)[0];
                  const itemKey = String(svc._id || svc.id || option.label || idx);
                  const title = svc.title || option.label;
                  const badge = badgeOf(svc);
                  const ratingInfo = ratingInfoOf(svc, subRating, subReviewCount);
                  const duration = durationOf(svc);
                  const curPrice = optionPrice(option);
                  const origPrice = Number(option.price || svc.basePrice || 0);
                  const bullets = bulletsOf(svc);
                  const thumb = toAssetUrl(svc.imageUrl || option.imageUrl || svc.icon || '');
                  const isExpanded = expandedIds.has(itemKey);
                  const subOptionsCount = (svc.options || []).length;

                  return (
                    <div key={itemKey} className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="flex items-center gap-1.5 text-base sm:text-[17px] font-bold text-slate-900 leading-snug">
                            <span>{title}</span>
                            {badge && <span className="text-base">{badge}</span>}
                          </h3>

                          {(ratingInfo.rating || duration) && (
                            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs sm:text-sm text-slate-600">
                              {ratingInfo.rating && (
                                <span className="flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                  <span className="font-semibold text-slate-800">{ratingInfo.rating}</span>
                                  {ratingInfo.reviewCount && (
                                    <span className="border-b border-dotted border-slate-400 text-slate-600">
                                      ({ratingInfo.reviewCount})
                                    </span>
                                  )}
                                </span>
                              )}
                              {ratingInfo.rating && duration && <span className="text-slate-300">·</span>}
                              {duration && (
                                <span className="inline-flex items-center gap-1 text-slate-600">
                                  <Clock className="h-3.5 w-3.5 text-slate-500" /> {duration}
                                </span>
                              )}
                            </p>
                          )}

                          <p className="mt-2 text-lg font-bold text-slate-900">
                            {inr(curPrice)}
                            {origPrice > curPrice && (
                              <span className="ml-2 text-sm font-normal text-slate-400 line-through">
                                {inr(origPrice)}
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="shrink-0 text-center">
                          {thumb ? (
                            <div className="relative mb-2 flex flex-col items-center">
                              <img
                                src={thumb}
                                alt=""
                                className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl border border-slate-100 object-cover shadow-sm"
                              />
                              <div className="mt-[-14px] z-10">
                                {line ? (
                                  <Stepper
                                    count={line.serviceCount || 1}
                                    onMinus={() => onChangeQty(line, -1)}
                                    onPlus={() => onChangeQty(line, 1)}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => (option._service ? onAdd(option._service, null) : onAdd(optionsService, option))}
                                    className="min-w-[78px] rounded-lg border bg-white px-5 py-1.5 text-sm font-bold shadow-sm transition active:scale-95"
                                    style={{ borderColor: `${teal}99`, color: teal }}
                                  >
                                    Add
                                  </button>
                                )}
                              </div>
                              {subOptionsCount > 0 && (
                                <p className="mt-1 text-[11px] text-slate-500 font-medium">{subOptionsCount} option{subOptionsCount > 1 ? 's' : ''}</p>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              {line ? (
                                <Stepper
                                  count={line.serviceCount || 1}
                                  onMinus={() => onChangeQty(line, -1)}
                                  onPlus={() => onChangeQty(line, 1)}
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => (option._service ? onAdd(option._service, null) : onAdd(optionsService, option))}
                                  className="min-w-[80px] rounded-lg border bg-white px-5 py-1.5 text-sm font-bold shadow-sm transition active:scale-95"
                                  style={{ borderColor: `${teal}99`, color: teal }}
                                >
                                  Add
                                </button>
                              )}
                              {subOptionsCount > 0 && (
                                <p className="mt-1 text-[11px] text-slate-500 font-medium">{subOptionsCount} option{subOptionsCount > 1 ? 's' : ''}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {bullets.length > 0 && (
                        <div className="mt-3">
                          <ul className="space-y-1.5">
                            {(isExpanded ? bullets : bullets.slice(0, 3)).map((b, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-600 leading-snug">
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-700" />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>

                          <button
                            type="button"
                            onClick={() => setViewingDetailItem(svc)}
                            className="mt-2.5 inline-flex items-center gap-0.5 text-xs sm:text-sm font-semibold transition hover:underline"
                            style={{ color: teal }}
                          >
                            <span>View details</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-3.5 shadow-[0_-4px_14px_rgba(15,23,42,0.06)]">
                <p className="flex items-center gap-1.5 text-lg font-bold text-slate-900">
                  {inr(totalPrice)} <Info className="h-3.5 w-3.5 text-slate-400" />
                </p>
                <button
                  type="button"
                  onClick={() => { close(); if (cartCount > 0) setTimeout(onOpenCart, 260); }}
                  className="rounded-lg px-10 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98]"
                  style={{ backgroundColor: teal }}
                >
                  Proceed
                </button>
              </div>
            </>
          )}
        </Sheet>
      )}

      {/* Detail Modal ("View details >") */}
      {viewingDetailItem && (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          onClick={() => setViewingDetailItem(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-[24px] sm:rounded-2xl bg-white max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-4 sm:p-5">
              <div className="min-w-0 pr-3">
                <h3 className="flex items-center gap-1.5 text-lg font-bold text-slate-900">
                  <span>{viewingDetailItem.title || viewingDetailItem.label}</span>
                  {badgeOf(viewingDetailItem) && <span className="text-base">{badgeOf(viewingDetailItem)}</span>}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                  {ratingInfoOf(viewingDetailItem, subRating, subReviewCount).rating && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-slate-800">{ratingInfoOf(viewingDetailItem, subRating, subReviewCount).rating}</span>
                      {ratingInfoOf(viewingDetailItem, subRating, subReviewCount).reviewCount && (
                        <span className="text-slate-500">({ratingInfoOf(viewingDetailItem, subRating, subReviewCount).reviewCount})</span>
                      )}
                    </span>
                  )}
                  {durationOf(viewingDetailItem) && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Clock className="h-3.5 w-3.5 text-slate-500" /> {durationOf(viewingDetailItem)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingDetailItem(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">What's Included</h4>
                <ul className="space-y-2">
                  {bulletsOf(viewingDetailItem).map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 leading-snug">
                      <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Service Highlights</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  • Verified professionals equipped with specialized tools and eco-friendly solutions.
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  • Complete final check with customer to ensure spotless finish.
                </p>
              </div>

              <div className="rounded-xl bg-amber-50/70 p-3.5 border border-amber-200/50">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">Please Note</h4>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Running water and electrical supply must be available on-site. Final price may vary after inspection for severe stains or custom requirements.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4 bg-white flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Estimated Price</p>
                <p className="text-lg font-bold text-slate-900">
                  {inr(optionPrice(viewingDetailItem) || priceOf(viewingDetailItem))}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (viewingDetailItem._service) onAdd(viewingDetailItem._service, null);
                  else if (optionsService) onAdd(optionsService, viewingDetailItem);
                  else onAdd(viewingDetailItem, null);
                  setViewingDetailItem(null);
                }}
                className="rounded-lg px-6 py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-95"
                style={{ backgroundColor: teal }}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceListing;
