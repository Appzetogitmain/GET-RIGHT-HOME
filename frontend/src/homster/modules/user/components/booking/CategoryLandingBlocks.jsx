import React, { useRef } from 'react';
import { ChevronRight, Star } from 'lucide-react';
import { themeColors } from '../../../../theme';

const teal = themeColors.button;
const hideScroll = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = String(url).replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}/${clean.replace(/^\/+/, '')}`;
};

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** "Ideas for your Home": swipeable image (or colour) cards with a caption. */
export const IdeasSection = ({ page }) => {
  const items = (page?.ideas || []).filter((it) => it.title);
  if (!items.length) return null;
  return (
    <section className="mt-8">
      <h2 className="mx-4 mb-3 flex items-center justify-between text-lg font-bold text-slate-800">
        {page.ideasTitle || 'Ideas for your Home'} <ChevronRight className="h-5 w-5 text-slate-400" />
      </h2>
      <div className={`flex snap-x scroll-pl-4 gap-3 overflow-x-auto px-4 pb-1 ${hideScroll}`}>
        {items.map((it, i) => (
          <div
            key={it._k || i}
            className="relative h-[160px] w-[78%] max-w-[300px] shrink-0 snap-start overflow-hidden rounded-xl bg-slate-200"
            style={!it.image && it.color ? { backgroundColor: it.color } : undefined}
          >
            {it.image && <img src={toAssetUrl(it.image)} alt={it.title} loading="lazy" className="h-full w-full object-cover" />}
            <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <span className="absolute bottom-3 left-3 text-[15px] font-bold text-white">{it.title}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

/** "How painting works": vertical steps with a round icon and a dashed connector. */
export const HowItWorksSection = ({ page }) => {
  const steps = (page?.howSteps || []).filter((s) => s.title);
  if (!steps.length) return null;
  return (
    <section className="mx-4 mt-8">
      <h2 className="text-lg font-bold text-slate-800">{page.howTitle || 'How it works'}</h2>
      <div className="relative mt-4 space-y-6">
        <span className="absolute bottom-8 left-[27px] top-8 border-l-2 border-dashed border-slate-200" />
        {steps.map((s, i) => (
          <div key={s._k || i} className="relative flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-4 ring-[#F1F3F6]">
              {s.image
                ? <img src={toAssetUrl(s.image)} alt="" className="h-full w-full object-cover" loading="lazy" />
                : <span className="text-lg font-bold" style={{ color: teal }}>{i + 1}</span>}
            </span>
            <div>
              <p className="text-[15px] font-semibold text-slate-800">{s.title}</p>
              {s.text && <p className="text-[13px] leading-snug text-slate-500">{s.text}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/** "Tour our Recent Projects": swipeable photo cards with the painter, service and rating. */
export const RecentProjectsSection = ({ page }) => {
  const items = (page?.projects || []).filter((p) => p.image || p.name);
  const ref = useRef(null);
  if (!items.length) return null;
  return (
    <section className="mt-8">
      <h2 className="mx-4 mb-3 flex items-center gap-2 text-lg font-bold text-slate-800">
        {page.projectsTitle || 'Tour our Recent Projects'}
        {page.projectsTag && <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: teal }}>{page.projectsTag}</span>}
      </h2>
      <div ref={ref} className={`flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto px-4 pb-1 ${hideScroll}`}>
        {items.map((p, i) => (
          <div key={p._k || i} className="relative aspect-[4/3] w-[88%] max-w-[420px] shrink-0 snap-start overflow-hidden rounded-2xl bg-slate-800">
            {p.image && <img src={toAssetUrl(p.image)} alt={p.service || ''} loading="lazy" className="h-full w-full object-cover" />}
            <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
            <div className="absolute inset-x-3 bottom-3">
              <div className="flex items-center justify-between gap-2 text-white">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold">{initials(p.name)}</span>
                  <span className="truncate"><b>{p.name}</b>{p.service && <span className="text-white/70"> | {p.service}</span>}</span>
                </span>
                {Number(p.rating) > 0 && <span className="flex shrink-0 items-center gap-1 text-xs font-bold"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {p.rating}</span>}
              </div>
              <div className="mt-2 flex gap-1">
                {items.map((_, k) => <span key={k} className={`h-1 flex-1 rounded-full ${k === i ? 'bg-white' : 'bg-white/40'}`} />)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
