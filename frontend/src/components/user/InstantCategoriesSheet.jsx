import React, { useEffect, useState } from 'react';
import { X, Zap } from 'lucide-react';
import { publicCatalogService } from '../../homster/services/catalogService';
import { useCity } from '../../homster/context/CityContext';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

/**
 * "Experts at your doorstep": slides up from the bottom with every category
 * that offers instant booking. Tapping one opens its instant services page.
 */
const InstantCategoriesSheet = ({ isOpen, onClose, etaMinutes = 15, onPick }) => {
  const { currentCity } = useCity();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!isOpen) { setShown(false); return undefined; }
    const raf = requestAnimationFrame(() => setShown(true));
    document.body.style.overflow = 'hidden';
    return () => { cancelAnimationFrame(raf); document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    setLoading(true);
    publicCatalogService.getCategories(currentCity?._id || currentCity?.id, 'instant')
      .then((res) => { if (live && res?.success) setCategories(res.categories || []); })
      .catch(() => {})
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [isOpen, currentCity]);

  const close = () => { setShown(false); setTimeout(onClose, 260); };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300]" onClick={close}>
      <div className={`absolute inset-0 bg-black/55 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[85vh] w-full max-w-xl flex-col rounded-t-[28px] bg-white shadow-2xl transition-transform duration-300 ease-out ${shown ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="flex items-start justify-between px-5 pb-3 pt-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Experts at your doorstep</h2>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#347989] px-3 py-1 text-xs font-bold text-white">
              <Zap size={12} className="fill-white text-white" /> in {etaMinutes} mins
            </span>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="rounded-full border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-8 pt-2">
          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="aspect-square animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : categories.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No instant services are available in your area right now.</p>
          ) : (
            <div className="grid grid-cols-3 gap-x-4 gap-y-5">
              {categories.map((cat) => {
                const img = toAssetUrl(cat.homeIconUrl || cat.icon || cat.imageUrl || cat.image);
                return (
                  <button
                    key={cat.id || cat._id}
                    type="button"
                    onClick={() => { setShown(false); setTimeout(() => { onClose(); onPick(cat); }, 200); }}
                    className="flex flex-col items-center text-center transition active:scale-95"
                  >
                    <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2.5 shadow-sm">
                      {img ? <img src={img} alt="" className="h-full w-full object-contain" /> : <Zap className="text-[#347989]" />}
                    </div>
                    <span className="mt-2 line-clamp-2 text-xs font-medium leading-tight text-slate-700">{cat.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstantCategoriesSheet;
