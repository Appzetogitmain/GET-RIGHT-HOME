import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { themeColors } from '../../../../theme';

const teal = themeColors.button;
const PREVIEW = 3;

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = String(url).replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}/${clean.replace(/^\/+/, '')}`;
};

/**
 * One "Services we offer" card of an estimate-based category (e.g. Interior Painting):
 * banner with title + rating, the description as bullet points ("Show more"), and a GET ESTIMATE button.
 */
const EstimateServiceCard = ({ sub, onOpen, onEstimate }) => {
  const [expanded, setExpanded] = useState(false);
  const banner = toAssetUrl(sub.bannerUrl || sub.imageUrl);
  const points = String(sub.description || '').split('\n').map((l) => l.replace(/^[•\-\s]+/, '').trim()).filter(Boolean);
  const shown = expanded ? points : points.slice(0, PREVIEW);
  const rating = Number(sub.rating) || 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={onOpen} className="relative block aspect-[16/10] w-full bg-slate-200 text-left">
        {banner && <img src={banner} alt="" className="h-full w-full object-cover" loading="lazy" />}
        <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <span className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3 text-white">
          <span className="text-xl font-bold leading-tight">{sub.title}</span>
          {rating > 0 && (
            <span className="shrink-0 text-xs">
              <span className="text-amber-400">★</span> <b className="text-sm">{rating.toFixed(1)}</b>{sub.reviewCount ? ` (${sub.reviewCount})` : ''}
            </span>
          )}
        </span>
      </button>

      <div className="p-4">
        {shown.length > 0 && (
          <ul className="space-y-2">
            {shown.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] leading-snug text-slate-600">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /> <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
        <div className={`flex items-center justify-between gap-3 ${shown.length ? 'mt-4' : ''}`}>
          {points.length > PREVIEW ? (
            <button type="button" onClick={() => setExpanded((e) => !e)} className="flex items-center gap-1 text-sm font-semibold text-slate-700">
              {expanded ? 'Show less' : 'Show more'} <ChevronDown className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`} />
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={onEstimate}
            className="rounded-lg border px-5 py-2.5 text-xs font-bold uppercase tracking-wide active:scale-95"
            style={{ borderColor: teal, color: teal, backgroundColor: `${teal}0D` }}
          >
            Get Estimate
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstimateServiceCard;
