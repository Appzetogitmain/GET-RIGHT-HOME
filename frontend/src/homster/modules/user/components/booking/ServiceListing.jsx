import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clock, Info, Minus, Plus, Search, ShoppingCart, Star, X } from 'lucide-react';
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

// The admin's "points": one per line, or separated by "->".
const bulletsOf = (service) => (service.features?.length
  ? service.features
  : String(service.description || '').split(/\r?\n|->/).map((l) => l.trim()).filter(Boolean));

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
  onSelectSub
}) => {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [optionsFor, setOptionsFor] = useState(null);

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
    <div className="min-h-screen bg-[#F1F3F6] pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
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
      </header>

      <main className="mx-auto max-w-3xl">
        <div className="px-4 pb-6 pt-4">
          {loading && visible.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500">No services found.</p>
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
                  const options = service.options || [];
                  const hasOptions = options.length > 0;
                  const inCart = linesForService(service);
                  const added = inCart.length > 0;
                  const single = !hasOptions ? lines(service, null)[0] : null;
                  const from = hasOptions ? Math.min(...options.map(optionPrice)) : priceOf(service);
                  const bullets = bulletsOf(service);
                  const thumb = toAssetUrl(service.imageUrl || service.icon || '');
                  return (
                    <div key={id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-900">
                            {service.title}
                            {service.badge && <span className="text-sm">{service.badge}</span>}
                          </h3>
                          {(service.rating > 0 || service.duration) && (
                            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-slate-600">
                              {service.rating > 0 && (
                                <>
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                  <span className="border-b border-dotted border-slate-400">
                                    {Number(service.rating).toFixed(2)}{service.reviewCount ? ` (${service.reviewCount})` : ''}
                                  </span>
                                </>
                              )}
                              {service.rating > 0 && service.duration && <span className="text-slate-300">·</span>}
                              {service.duration && (
                                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {service.duration}</span>
                              )}
                            </p>
                          )}
                          <p className="mt-2 text-lg font-semibold text-slate-900">
                            {hasOptions && <span className="mr-1.5 text-xs font-normal text-slate-500">Starts at</span>}
                            {inr(from)}
                            {!hasOptions && Number(service.discountPrice) > 0 && Number(service.discountPrice) < Number(service.basePrice) && (
                              <span className="ml-2 text-sm font-normal text-slate-400 line-through">{inr(service.basePrice)}</span>
                            )}
                          </p>
                        </div>

                        <div className="shrink-0 text-center">
                          {thumb && (
                            <img src={thumb} alt="" className="mb-[-14px] h-24 w-24 rounded-xl border border-slate-100 object-cover" />
                          )}
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
                              className="min-w-[78px] rounded-lg border px-5 py-2 text-sm font-semibold transition active:scale-95"
                              style={added
                                ? { backgroundColor: teal, borderColor: teal, color: '#fff' }
                                : { borderColor: `${themeColors.brand.teal}66`, color: teal, backgroundColor: `${themeColors.brand.teal}0D` }}
                            >
                              {added ? 'Added' : 'Add'}
                            </button>
                          )}
                          {hasOptions && (
                            <p className="mt-1 text-[11px] text-slate-500">{options.length} option{options.length > 1 ? 's' : ''}</p>
                          )}
                        </div>
                      </div>

                      {bullets.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                          {bullets.map((b, i) => (
                            <li key={i} className="flex gap-2 text-sm text-slate-600">
                              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Final price may vary after inspection or specific requirements.
          </p>
        </div>
      </main>

      {/* Bottom bar */}
      {cartCount > 0 && (
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
              <div className="flex items-start justify-between px-5 pb-3 pt-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{optionsService.groupTitle || optionsService.title}</h2>
                  {optionsService.groupTitle && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                      {optionsService.title}
                      {optionsService.badge && <span className="text-base">{optionsService.badge}</span>}
                    </p>
                  )}
                </div>
                <button type="button" onClick={close} aria-label="Close" className="rounded-full p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 divide-y divide-slate-100 overflow-y-auto px-5">
                {optionsService.options.map((option) => {
                  const line = lines(optionsService, option)[0];
                  return (
                    <div key={option.label} className="flex items-center justify-between gap-3 py-4">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate-800">
                          <span className="font-semibold">{option.label}</span>
                          {option.duration && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3 w-3" /> {option.duration}</span>
                          )}
                        </p>
                        <p className="mt-1.5 text-base font-bold text-slate-900">
                          {inr(optionPrice(option))}
                          {Number(option.discountPrice) > 0 && Number(option.discountPrice) < Number(option.price) && (
                            <span className="ml-2 text-xs font-normal text-slate-400 line-through">{inr(option.price)}</span>
                          )}
                        </p>
                      </div>
                      {line ? (
                        <Stepper count={line.serviceCount || 1} onMinus={() => onChangeQty(line, -1)} onPlus={() => onChangeQty(line, 1)} />
                      ) : (
                        <button
                          type="button"
                          onClick={() => (option._service ? onAdd(option._service, null) : onAdd(optionsService, option))}
                          className="min-w-[84px] rounded-lg border bg-white px-6 py-2 text-sm font-semibold shadow-sm transition active:scale-95"
                          style={{ borderColor: `${themeColors.brand.teal}80`, color: teal }}
                        >
                          Add
                        </button>
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
    </div>
  );
};

export default ServiceListing;
