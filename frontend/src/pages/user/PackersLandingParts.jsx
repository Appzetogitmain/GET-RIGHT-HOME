import React, { useMemo, useState } from 'react';
<<<<<<< HEAD
import { ChevronDown, ChevronRight, Star } from 'lucide-react';
=======
import { BadgePercent, ChevronDown, ChevronRight, Star } from 'lucide-react';
import { Icon3D, pick3D } from './PackersIcons3D';
>>>>>>> c36021dbba81c43e251924bc1ad43e65e392621d

const TEAL = '#347989';
const TEAL_DARK = '#2B6270';
const AMBER = '#D68F35';
const ORANGE = '#BB5F36';

const toUrl = (url) => {
  if (!url) return '';
  const clean = String(url).replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const hideScroll = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

const Card = ({ title, children, className = '' }) => (
  <section className={`mt-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 ${className}`}>
<<<<<<< HEAD
    {title && <h2 className="text-lg font-bold leading-snug text-slate-800">{title}</h2>}
=======
    {title && <h2 className="text-xl font-extrabold leading-tight tracking-tight text-gray-900">{title}</h2>}
>>>>>>> c36021dbba81c43e251924bc1ad43e65e392621d
    {children}
  </section>
);

<<<<<<< HEAD
const IconBox = ({ src, className = 'h-12 w-12' }) => (
  <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 ${className}`}>
    {src && <img src={toUrl(src)} alt="" className="h-full w-full object-cover" loading="lazy" />}
  </span>
);
=======
const IconBox = ({ src, title, className = 'h-12 w-12' }) => {
  const icon = pick3D(title);
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl ${icon ? 'bg-gradient-to-br from-[#EAF6F8] to-[#CFE8EC] p-1.5' : 'bg-slate-100'} ${className}`}>
      {icon
        ? <Icon3D name={icon} />
        : src && <img src={toUrl(src)} alt="" className="h-full w-full object-cover" loading="lazy" />}
    </span>
  );
};
>>>>>>> c36021dbba81c43e251924bc1ad43e65e392621d

const RatingPill = ({ value }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
    <Star className="h-3 w-3 fill-current" /> {value}
  </span>
);

/** Gradient hero (title, rating, text, coupon, certification strip) shown above the booking card. */
export const LandingHero = ({ p, fallbackTitle }) => (
<<<<<<< HEAD
  <div className="relative overflow-hidden rounded-b-[40px] px-5 pb-24 pt-6 text-white" style={{ background: `linear-gradient(160deg, ${TEAL} 0%, ${TEAL_DARK} 70%)` }}>
=======
  <div className="relative overflow-hidden rounded-b-[40px] px-5 pb-14 pt-6 text-white" style={{ background: `linear-gradient(160deg, ${TEAL} 0%, ${TEAL_DARK} 70%)` }}>
>>>>>>> c36021dbba81c43e251924bc1ad43e65e392621d
    <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
    <div className="relative mx-auto max-w-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          {p.heroTitle && <h1 className="text-2xl font-extrabold leading-tight">{p.heroTitle}</h1>}
          <h1 className="text-2xl font-extrabold leading-tight" style={{ color: '#F6C777' }}>{p.heroHighlight || fallbackTitle}</h1>
        </div>
        {p.heroRating && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-bold backdrop-blur">
            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> {p.heroRating}
          </span>
        )}
      </div>
      {p.heroText && <p className="mt-3 text-sm leading-relaxed text-white/85">{p.heroText}</p>}
<<<<<<< HEAD
      {(p.couponTitle || p.couponImage) && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-slate-800">
          <div>
            {p.couponLabel && <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: TEAL }}>{p.couponLabel}</p>}
            {p.couponTitle && <p className="text-base font-bold leading-tight" style={{ color: TEAL_DARK }}>{p.couponTitle}</p>}
            {p.couponText && <p className="text-xs text-slate-500">{p.couponText}</p>}
          </div>
          {p.couponImage && <img src={toUrl(p.couponImage)} alt="" className="h-14 w-20 shrink-0 object-contain" />}
=======
      {!p.couponHidden && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-slate-800 shadow-[0_6px_16px_rgba(0,0,0,0.12)]">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
              <BadgePercent className="h-3 w-3" /> {p.couponLabel || 'Offer'}
            </p>
            <p className="mt-1 text-base font-extrabold leading-tight tracking-tight" style={{ color: TEAL_DARK }}>{p.couponTitle || 'Book your move with Get Right Home'}</p>
            <p className="text-xs font-medium text-slate-500">{p.couponText || 'Transparent pricing. No hidden charges.'}</p>
          </div>
          {p.couponImage
            ? <img src={toUrl(p.couponImage)} alt="" className="h-14 w-20 shrink-0 object-contain" />
            : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EAF6F8] to-[#CFE8EC] p-1.5"><Icon3D name="quote" /></span>}
>>>>>>> c36021dbba81c43e251924bc1ad43e65e392621d
        </div>
      )}
    </div>
  </div>
);

/** Certification strip that sits on top of the booking card. */
export const CertStrip = ({ text }) => (text ? (
  <p className="rounded-t-3xl px-4 py-2 text-center text-xs font-semibold text-white" style={{ background: `linear-gradient(90deg, ${AMBER}, ${ORANGE})` }}>{text}</p>
) : null);

/**
 * Everything below the booking card: highlights, services, how it works, trips, why choose us,
 * reviews and FAQs. All of it comes from the admin "Landing page" content and hides when empty.
 * `onStart(type)` is called when a service card is tapped.
 */
export const LandingSections = ({ p, onStart }) => {
  const [faqOpen, setFaqOpen] = useState(null);
  const [faqCat, setFaqCat] = useState('All');
  const [reviewMore, setReviewMore] = useState({});
  const faqs = useMemo(() => (p.faqs || []).filter((f) => f.q), [p.faqs]);
  const faqCats = useMemo(() => ['All', ...Array.from(new Set(faqs.map((f) => f.category).filter(Boolean)))], [faqs]);

  const highlights = (p.highlights || []).filter((h) => h.title);
  const serviceCards = (p.serviceCards || []).filter((c) => c.title);
  const logos = (p.trustedLogos || []).filter((l) => l.image);
  const howSteps = (p.howSteps || []).filter((s) => s.title);
  const trips = (p.trips || []).filter((t) => t.name);
  const whyItems = (p.whyItems || []).filter((w) => w.title);
  const reviews = (p.reviews || []).filter((r) => r.text);
  const shownFaqs = faqs.filter((f) => faqCat === 'All' || f.category === faqCat);

  return (
    <>
      {/* What sets us apart */}
      {highlights.length > 0 && (
        <Card title={p.highlightsTitle}>
          <div className="mt-4 space-y-5">
            {highlights.map((h, i) => (
              <div key={i} className="flex gap-4">
                <IconBox src={h.image} />
                <div>
<<<<<<< HEAD
                  <p className="text-[15px] font-semibold leading-snug text-slate-800">{h.title}</p>
=======
                  <p className="text-[15px] font-semibold leading-snug text-gray-900">{h.title}</p>
>>>>>>> c36021dbba81c43e251924bc1ad43e65e392621d
                  {h.link && <p className="mt-1 text-sm font-semibold underline" style={{ color: TEAL }}>{h.link} <ChevronRight className="inline h-4 w-4" /></p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Services we offer */}
      {(serviceCards.length > 0 || logos.length > 0) && (
        <Card title={p.servicesTitle}>
          <div className="mt-4 space-y-4">
            {serviceCards.map((c, i) => (
              <button key={i} type="button" onClick={() => onStart?.(c.type || 'INTRA_CITY')} className="relative flex min-h-[150px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left">
                <div className="relative z-10 flex w-3/5 flex-col justify-between p-4">
                  <div>
<<<<<<< HEAD
                    <p className="text-lg font-bold leading-tight text-slate-800">{c.title}</p>
                    {c.text && <p className="mt-1 text-xs leading-snug text-slate-500">{c.text}</p>}
                  </div>
                  <span className="mt-3 text-sm font-bold underline" style={{ color: TEAL }}>{c.linkLabel || 'Explore'} <ChevronRight className="inline h-4 w-4" /></span>
                </div>
                {c.image && <img src={toUrl(c.image)} alt="" className="absolute inset-y-0 right-0 h-full w-2/5 object-cover" loading="lazy" />}
=======
                    <p className="text-lg font-extrabold leading-tight tracking-tight text-gray-900">{c.title}</p>
                    {c.text && <p className="mt-1 text-xs font-medium leading-snug text-slate-500">{c.text}</p>}
                  </div>
                  <span className="mt-3 text-sm font-bold underline" style={{ color: TEAL }}>{c.linkLabel || 'Explore'} <ChevronRight className="inline h-4 w-4" /></span>
                </div>
                {pick3D(c.title) ? (
                  <span className="absolute inset-y-0 right-0 flex w-2/5 items-center justify-center bg-gradient-to-br from-[#E3F2F5] to-[#BFDDE3]">
                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 p-3 shadow-[0_8px_18px_rgba(43,98,112,0.25)]">
                      <Icon3D name={pick3D(c.title)} />
                    </span>
                  </span>
                ) : c.image && <img src={toUrl(c.image)} alt="" className="absolute inset-y-0 right-0 h-full w-2/5 object-cover" loading="lazy" />}
>>>>>>> c36021dbba81c43e251924bc1ad43e65e392621d
              </button>
            ))}
          </div>
          {logos.length > 0 && (
            <div className="mt-5 flex items-center gap-4">
              {p.trustedTitle && <p className="shrink-0 text-base font-semibold text-slate-800">{p.trustedTitle}</p>}
              <div className={`flex items-center gap-3 overflow-x-auto ${hideScroll}`}>
                {logos.map((l, i) => <img key={i} src={toUrl(l.image)} alt={l.name || ''} className="h-10 shrink-0 rounded-lg object-contain" loading="lazy" />)}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* How it works */}
      {howSteps.length > 0 && (
        <Card title={p.howTitle} className="px-4">
          <div className="relative mt-5 space-y-6">
            <span className="absolute bottom-6 left-[27px] top-6 border-l-2 border-dashed border-slate-200" />
            {howSteps.map((s, i) => (
              <div key={i} className="relative flex gap-4">
<<<<<<< HEAD
                <IconBox src={s.image} className="h-14 w-14 ring-4 ring-white" />
                <div>
                  <p className="font-semibold text-slate-800">{s.title}</p>
                  {s.text && <p className="text-sm leading-snug text-slate-500">{s.text}</p>}
=======
                <IconBox src={s.image} title={s.title} className="h-14 w-14 ring-4 ring-white" />
                <div>
                  <p className="text-[15px] font-semibold text-gray-900">{s.title}</p>
                  {s.text && <p className="text-[13px] font-normal leading-snug text-slate-500">{s.text}</p>}
>>>>>>> c36021dbba81c43e251924bc1ad43e65e392621d
                </div>
              </div>
            ))}
          </div>
          {(p.promoText || p.promoImage) && (
            <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
              {p.promoImage && <img src={toUrl(p.promoImage)} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />}
              <div className="min-w-0 flex-1">
                {p.promoTag && <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white" style={{ backgroundColor: ORANGE }}>{p.promoTag}</span>}
                <p className="mt-1 text-sm font-bold leading-snug text-slate-800">{p.promoText}</p>
              </div>
              {p.promoButton && <button type="button" onClick={() => onStart?.()} className="shrink-0 rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: TEAL, color: TEAL }}>{p.promoButton} ›</button>}
            </div>
          )}
        </Card>
      )}

      {/* Completed trips */}
      {trips.length > 0 && (
        <section className="mt-6">
          {p.tripsTitle && (
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-300" />
              <h2 className="text-center text-base font-semibold text-slate-700">{p.tripsTitle}</h2>
              <span className="h-px flex-1 bg-slate-300" />
            </div>
          )}
          <div className={`mt-4 flex gap-3 overflow-x-auto px-4 pb-1 ${hideScroll}`}>
            {trips.map((t, i) => (
              <div key={i} className="w-[220px] shrink-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <div className="flex items-center gap-2">
                  {t.rating && <RatingPill value={t.rating} />}
                  {t.tag && <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{t.tag}</span>}
                </div>
                <p className="mt-3 font-bold text-slate-800">{t.name}</p>
                {t.date && <p className="text-xs text-slate-500">Completed On {t.date}</p>}
                {t.city && <p className="mt-2 text-sm font-medium uppercase text-slate-700">{t.city}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Why choose us */}
      {whyItems.length > 0 && (
        <Card title={p.whyTitle}>
          <div className="mt-4 space-y-5">
            {whyItems.map((w, i) => (
              <div key={i} className="flex gap-4">
<<<<<<< HEAD
                <IconBox src={w.image} className="h-14 w-14" />
                <div>
                  <p className="font-semibold text-slate-800">{w.title}</p>
                  {w.text && <p className="text-sm leading-snug text-slate-500">{w.text}</p>}
=======
                <IconBox src={w.image} title={w.title} className="h-14 w-14" />
                <div>
                  <p className="text-[15px] font-semibold text-gray-900">{w.title}</p>
                  {w.text && <p className="text-[13px] font-normal leading-snug text-slate-500">{w.text}</p>}
>>>>>>> c36021dbba81c43e251924bc1ad43e65e392621d
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Customer reviews */}
      {reviews.length > 0 && (
        <Card title="Customer Reviews">
          {(p.reviewsRating || p.reviewsText) && (
            <div className="mt-3 flex items-center gap-3">
              <Star className="h-9 w-9 fill-amber-400 text-amber-400" />
              {p.reviewsRating && <span className="text-3xl font-bold" style={{ color: AMBER }}>{p.reviewsRating}</span>}
            </div>
          )}
          {p.reviewsText && <p className="mt-1 text-sm font-semibold text-slate-600">{p.reviewsText}</p>}
          <div className={`mt-4 flex gap-3 overflow-x-auto pb-1 ${hideScroll}`}>
            {reviews.map((r, i) => (
              <div key={i} className="w-[260px] shrink-0 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  {r.image
                    ? <img src={toUrl(r.image)} alt="" className="h-12 w-12 rounded-full object-cover" />
                    : <span className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: TEAL }}>{initials(r.name)}</span>}
                  <div>
                    <p className="text-sm font-bold text-slate-800">{r.name}</p>
                    {r.rating && <RatingPill value={r.rating} />}
                  </div>
                </div>
                <p className={`mt-3 text-sm leading-relaxed text-slate-600 ${reviewMore[i] ? '' : 'line-clamp-3'}`}>{r.text}</p>
                {r.text.length > 110 && (
                  <button type="button" onClick={() => setReviewMore((m) => ({ ...m, [i]: !m[i] }))} className="mt-1 text-sm font-semibold" style={{ color: TEAL }}>
                    {reviewMore[i] ? 'see less' : 'see more'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* FAQs */}
      {faqs.length > 0 && (
        <Card title={p.faqTitle || 'FAQs'}>
          {faqCats.length > 2 && (
            <div className={`mt-4 flex gap-2 overflow-x-auto ${hideScroll}`}>
              {faqCats.map((c) => (
                <button key={c} type="button" onClick={() => { setFaqCat(c); setFaqOpen(null); }}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold ${faqCat === c ? 'text-white' : 'border-slate-300 text-slate-600'}`}
                  style={faqCat === c ? { backgroundColor: TEAL, borderColor: TEAL } : undefined}>
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 divide-y divide-slate-200">
            {shownFaqs.map((f, i) => (
              <div key={i}>
                <button type="button" onClick={() => setFaqOpen(faqOpen === i ? null : i)} className="flex w-full items-center justify-between gap-3 py-4 text-left text-[15px] text-slate-700">
                  {f.q} <ChevronDown className={`h-4 w-4 shrink-0 transition ${faqOpen === i ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen === i && f.a && <p className="pb-4 text-sm leading-relaxed text-slate-500">{f.a}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
};
