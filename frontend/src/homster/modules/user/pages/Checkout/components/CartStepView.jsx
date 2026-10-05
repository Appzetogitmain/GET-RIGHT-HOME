import React from 'react';
import { FiArrowLeft, FiMinus, FiPlus, FiShoppingBag } from 'react-icons/fi';
import { themeColors } from '../../../../../theme';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/**
 * Step 1 — "My Cart": what was added, recommended add-ons, the VIP offer, and
 * a bottom bar with the total and the button that moves on to address + slot.
 */
const CartStepView = ({
  items,
  toAssetUrl,
  priceOf,
  originalPriceOf,
  onRemove,
  onQty,
  addons = [],
  onAddAddon,
  vipCard,
  summary,
  vipStrip,
  total,
  nextLabel = 'Select Address',
  onNext,
  onBack
}) => (
  <div className="min-h-screen bg-[#EEF1F6] pb-28">
    {/* Header */}
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
        <button type="button" onClick={onBack} aria-label="Back" className="rounded-full p-1.5 hover:bg-gray-100">
          <FiArrowLeft className="h-5 w-5 text-slate-900" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">My Cart</h1>
      </div>
    </header>

    <main className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      {/* Cart items */}
      <div className="space-y-3">
        {items.map((item) => {
          const id = item._id || item.id || item.serviceId;
          const price = priceOf(item);
          const original = originalPriceOf(item);
          const image = toAssetUrl(item.icon || item.card?.imageUrl || item.sectionIcon || '');
          const tag = item.brand || item.sectionTitle || item.categoryTitle || item.category;
          return (
            <div key={id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {image ? (
                  <img src={image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300"><FiShoppingBag className="h-7 w-7" /></div>
                )}
                {tag && (
                  <span className="absolute left-0 top-0 max-w-full truncate rounded-br-lg bg-white/95 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                    {tag}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{item.title}</h3>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  {original > price && <span className="text-xs text-slate-400 line-through">{inr(original)}</span>}
                  <span className="text-base font-extrabold text-slate-900">{price === 0 ? 'Free' : inr(price)}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="line-clamp-1 text-[11px] text-slate-500">{item.duration || item.description || item.subCategory || ''}</p>
                  {!item.isPlan && (
                    <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                      <button type="button" onClick={() => onQty(id, -1)} className="p-1.5"><FiMinus className="h-3.5 w-3.5 text-slate-600" /></button>
                      <span className="w-6 text-center text-xs font-bold text-slate-900">{item.serviceCount || 1}</span>
                      <button type="button" onClick={() => onQty(id, 1)} className="p-1.5"><FiPlus className="h-3.5 w-3.5 text-slate-900" /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommended add-ons */}
      {addons.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-slate-800">Recommended Add-ons</h2>
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {addons.map((svc) => (
                <div key={svc.id} className="w-28 shrink-0">
                  <div className="relative h-24 w-28 overflow-hidden rounded-xl bg-slate-100">
                    {svc.image ? (
                      <img src={svc.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300"><FiShoppingBag className="h-6 w-6" /></div>
                    )}
                    <button
                      type="button"
                      onClick={() => onAddAddon(svc)}
                      className="absolute bottom-1.5 right-1.5 rounded-md border bg-white px-2.5 py-0.5 text-[10px] font-extrabold shadow"
                      style={{ color: themeColors.button, borderColor: `${themeColors.brand.teal}66` }}
                    >
                      ADD
                    </button>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-tight text-slate-700">{svc.title}</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">{inr(svc.price)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Payment summary */}
      {summary && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-slate-800">Payment Summary</h2>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="space-y-2.5 px-4 py-4 text-sm">
              {summary.rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className={r.tone === 'good' ? 'font-medium text-emerald-600' : r.strong ? 'font-bold text-slate-800' : 'text-slate-600'}>{r.label}</span>
                  <span className={r.tone === 'good' ? 'font-semibold text-emerald-600' : r.strong ? 'font-bold text-slate-900' : 'font-medium text-slate-900'}>{r.value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                <span className="text-base font-bold text-slate-900">Total Amount</span>
                <span className="text-lg font-extrabold text-slate-900">{summary.total}</span>
              </div>
            </div>
            {summary.payNow && (
              <div className="space-y-1.5 border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Pay now</span>
                  <span className="font-bold text-slate-900">{summary.payNow}</span>
                </div>
                {summary.payLater && (
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Pay after service</span>
                    <span className="font-semibold">{summary.payLater}</span>
                  </div>
                )}
              </div>
            )}
            {vipStrip}
          </div>
        </section>
      )}

      {/* VIP membership offer (used when there is no summary to attach it to) */}
      {!summary && vipCard}
    </main>

    {/* Bottom bar */}
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white">
     <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</p>
        <p className="text-xl font-extrabold text-slate-900">{inr(total)}</p>
      </div>
      <button
        type="button"
        onClick={onNext}
        className="flex-1 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg active:scale-[0.99]"
        style={{ backgroundColor: themeColors.button }}
      >
        {nextLabel}
      </button>
     </div>
    </div>
  </div>
);

export default CartStepView;
