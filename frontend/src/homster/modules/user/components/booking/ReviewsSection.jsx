import React, { useState } from 'react';
import { Check, Star } from 'lucide-react';
import { themeColors } from '../../../../theme';

const teal = themeColors.button;
const STEP = 6;

/**
 * "Ratings & Reviews" block: average rating, per-star bars and review cards.
 * `data` is the admin-managed `page.reviews` of a sub-category:
 * { rating, counts: { 1..5 }, items: [{ name, rating, date, service, text, liked: [] }] }.
 */
const ReviewsSection = ({ data }) => {
  const [shown, setShown] = useState(STEP);
  const items = (data?.items || []).filter((r) => r.name && r.text);
  const counts = [5, 4, 3, 2, 1].map((n) => Number(data?.counts?.[n]) || 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(...counts, 1);
  const avg = Number(data?.rating) || (total ? counts.reduce((sum, c, i) => sum + c * (5 - i), 0) / total : 0);
  if (!items.length && !total) return null;

  return (
    <section className="mx-4 mb-4 mt-2">
      <h2 className="text-xl font-bold text-slate-900">Ratings &amp; Reviews</h2>

      {(total > 0 || avg > 0) && (
        <div className="mt-4 flex items-center gap-5 rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="text-center">
            <p className="text-5xl font-bold leading-none text-slate-900">{avg.toFixed(2)}</p>
            <p className="mt-2 text-xs text-slate-400">avg rating</p>
          </div>
          {total > 0 && (
            <div className="min-w-0 flex-1 space-y-1.5">
              {counts.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="flex w-6 items-center gap-0.5"><Star className="h-3 w-3" />{5 - i}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full bg-slate-800" style={{ width: `${Math.max(c ? 4 : 0, (c / max) * 100)}%` }} />
                  </span>
                  <span className="w-12 text-right tabular-nums">{c}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {items.length > 0 && (
        <>
          <p className="mt-5 text-sm font-bold text-slate-800">{(total || items.length).toLocaleString('en-IN')} reviews</p>
          <div className="mt-3 space-y-3">
            {items.slice(0, shown).map((r, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-slate-900">{r.name}</p>
                  <span className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
                    <Star className="h-3.5 w-3.5 fill-current" /> {r.rating || 5}
                  </span>
                </div>
                {(r.date || r.service) && <p className="mt-1 text-sm text-slate-500">{[r.date, r.service].filter(Boolean).join(' • ')}</p>}
                <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{r.text}</p>
                {(r.liked || []).length > 0 && (
                  <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="text-slate-500">Liked:</span>
                    {r.liked.map((l) => (
                      <span key={l} className="flex items-center gap-1 font-medium" style={{ color: teal }}><Check className="h-3.5 w-3.5" /> {l}</span>
                    ))}
                  </p>
                )}
              </div>
            ))}
          </div>
          {items.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + STEP)} className="mt-4 w-full rounded-xl border bg-white py-3 text-sm font-bold" style={{ borderColor: `${teal}99`, color: teal }}>
              Show more reviews
            </button>
          )}
        </>
      )}
    </section>
  );
};

export default ReviewsSection;
