import React from 'react';
import { ArrowRight, Star } from 'lucide-react';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = String(url).replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}/${clean.replace(/^\/+/, '')}`;
};

/**
 * "Explore Other Services": a swipeable row of image cards linking to other categories.
 * `data` is the admin-managed `page.explore` of a sub-category: { title, items: [{ categoryId, title, image, rating }] }.
 */
const ExploreOtherServices = ({ data, onOpen }) => {
  const items = (data?.items || []).filter((it) => it.title);
  if (!items.length) return null;

  return (
    <section className="mb-4 mt-2">
      <h2 className="mx-5 mb-3 text-lg font-bold text-slate-800">{data.title || 'Explore Other Services'}</h2>
      <div className="flex snap-x scroll-pl-5 gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it, i) => (
          <button
            key={it._k || i}
            type="button"
            onClick={() => onOpen?.(it)}
            className="group relative h-[200px] w-[150px] shrink-0 snap-start overflow-hidden rounded-xl bg-slate-200 text-left shadow-sm"
          >
            {it.image && <img src={toAssetUrl(it.image)} alt={it.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
            <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/25 to-transparent p-3">
              {Number(it.rating) > 0 && (
                <span className="mb-1 flex items-center gap-1 text-xs font-bold text-amber-400">
                  <Star className="h-3 w-3 fill-amber-400" /> {Number(it.rating).toFixed(1)}
                </span>
              )}
              <span className="flex items-end justify-between gap-2">
                <span className="text-[15px] font-bold leading-tight text-white">{it.title}</span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white">
                  <ArrowRight className="h-3.5 w-3.5 text-slate-900" />
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default ExploreOtherServices;
