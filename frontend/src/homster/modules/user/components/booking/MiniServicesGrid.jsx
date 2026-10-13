import React, { useState } from 'react';
import { ChevronRight, Clock, Minus, Plus } from 'lucide-react';
import { themeColors } from '../../../../theme';

const teal = themeColors.button;

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = String(url).replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}/${clean.replace(/^\/+/, '')}`;
};

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export const isCardService = (service) => service?.displayStyle === 'card';

const priceOf = (service) => {
  const options = service.options || [];
  if (options.length) {
    return Math.min(...options.map((o) => (Number(o.discountPrice) > 0 && Number(o.discountPrice) < Number(o.price) ? Number(o.discountPrice) : Number(o.price) || 0)));
  }
  const base = Number(service.basePrice ?? service.price) || 0;
  const offer = Number(service.discountPrice) || 0;
  return offer > 0 && offer < base ? offer : base;
};

// "Mini Services": compact image cards in a 2-column grid, shown at the very end of a service page.
const MiniServicesGrid = ({ services = [], cartItems = [], onAdd, onChangeQty, title = 'Mini Services' }) => {
  const [openId, setOpenId] = useState(null);
  if (!services.length) return null;

  const lineFor = (service) => (cartItems || []).find((item) => String(item.serviceId) === String(service._id || service.id));

  return (
    <section className="mx-4 mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-xl font-bold text-slate-900">{title}</h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5">
        {services.map((service) => {
          const id = service._id || service.id;
          const line = lineFor(service);
          const thumb = toAssetUrl(service.imageUrl || service.icon || '');
          const hasOptions = (service.options || []).length > 0;
          const features = service.features || [];
          const open = openId === id;
          const base = Number(service.basePrice) || 0;
          const price = priceOf(service);

          return (
            <div key={id} className="min-w-0">
              <div className="relative">
                <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100">
                  {thumb && <img src={thumb} alt={service.title} className="h-full w-full object-cover" loading="lazy" />}
                </div>
                <div className="absolute bottom-0 right-2 translate-y-1/2">
                  {line ? (
                    <div className="flex items-center overflow-hidden rounded-lg border bg-white shadow-sm" style={{ borderColor: `${teal}99` }}>
                      <button type="button" aria-label="Decrease" onClick={() => onChangeQty(line, -1)} className="px-2 py-1.5" style={{ color: teal }}>
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[18px] text-center text-sm font-bold" style={{ color: teal }}>{line.serviceCount || 1}</span>
                      <button type="button" aria-label="Increase" onClick={() => onChangeQty(line, 1)} className="px-2 py-1.5" style={{ color: teal }}>
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAdd(service, hasOptions ? service.options[0] : null)}
                      className="rounded-lg border bg-white px-5 py-1.5 text-sm font-bold shadow-sm transition active:scale-95"
                      style={{ borderColor: `${teal}99`, color: teal }}
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>

              <h3 className="mt-5 text-[15px] font-bold leading-snug text-slate-900">{service.title}</h3>
              {service.duration && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" /> {service.duration}
                </p>
              )}
              <p className="mt-2 text-base font-bold text-slate-900">
                {hasOptions && <span className="mr-1 text-[11px] font-normal text-slate-500">Starts at</span>}
                {inr(price)}
                {!hasOptions && price < base && (
                  <span className="ml-1.5 text-xs font-normal text-slate-400 line-through">{inr(base)}</span>
                )}
              </p>
              {(features.length > 0 || service.description) && (
                <>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : id)}
                    className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-semibold"
                    style={{ color: teal }}
                  >
                    View details <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
                  </button>
                  {open && (
                    <ul className="mt-1.5 space-y-1">
                      {features.length > 0 ? features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs leading-snug text-slate-600">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-700" /><span>{f}</span>
                        </li>
                      )) : <li className="text-xs leading-snug text-slate-600">{service.description}</li>}
                    </ul>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default MiniServicesGrid;
