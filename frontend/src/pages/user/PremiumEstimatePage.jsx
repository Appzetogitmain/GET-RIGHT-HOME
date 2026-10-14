import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Check, MapPin, Star } from 'lucide-react';
import { publicCatalogService } from '../../homster/services/catalogService';
import { useCity } from '../../homster/context/CityContext';

const BRAND = '#ea580c';
const CREAM = '#FFF7ED';
const SERIF = "'Lora', Georgia, 'Times New Roman', serif";

const toUrl = (url) => {
  if (!url) return '';
  const clean = String(url).replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const hideScroll = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

const Heading = ({ title, text }) => (
  (title || text) ? (
    <div className="px-5">
      {title && <h2 className="text-[26px] leading-tight text-slate-800" style={{ fontFamily: SERIF }}>{title}</h2>}
      {text && <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{text}</p>}
    </div>
  ) : null
);

const Tag = ({ children }) => (
  <span className="absolute left-3 top-3 rounded-lg bg-black/55 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur">{children}</span>
);

/** Horizontal snap carousel with pagination dots. */
const Carousel = ({ items, cardClass, renderItem, dots = true }) => {
  const ref = useRef(null);
  const [active, setActive] = useState(0);
  const onScroll = () => {
    const el = ref.current;
    if (!el || !el.children.length) return;
    const first = el.children[0];
    const step = first.offsetWidth + 12;
    setActive(Math.min(items.length - 1, Math.max(0, Math.round(el.scrollLeft / step))));
  };
  return (
    <>
      <div ref={ref} onScroll={onScroll} className={`mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 ${hideScroll}`}>
        {items.map((it, i) => (
          <div key={i} className={`shrink-0 snap-center ${cardClass}`}>{renderItem(it, i)}</div>
        ))}
      </div>
      {dots && items.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {items.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-[#ea580c]' : 'w-1.5 bg-[#ea580c]/30'}`} />)}
        </div>
      )}
    </>
  );
};

const BeforeAfter = ({ before, after }) => {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[4/3] w-full select-none overflow-hidden rounded-t-3xl bg-slate-200">
      <img src={after} alt="After" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <img src={before} alt="Before" className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} draggable={false} />
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white" style={{ left: `${pos}%` }} />
      <div className="pointer-events-none absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow" style={{ left: `${pos}%` }}>
        <ChevronLeft className="h-3 w-3" /> Drag <ChevronRight className="h-3 w-3" />
      </div>
      <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Before and after" className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
    </div>
  );
};

const ColourVisualiser = ({ p }) => {
  const groups = (p.colourGroups || []).filter((g) => (g.colours || []).length > 0);
  const [gi, setGi] = useState(0);
  const [ci, setCi] = useState(0);
  if (groups.length === 0) return null;
  const group = groups[Math.min(gi, groups.length - 1)];
  const colour = group.colours[Math.min(ci, group.colours.length - 1)];
  return (
    <section className="mt-14">
      <Heading title={p.coloursTitle} text={p.coloursText} />
      {groups.length > 1 && (
        <div className={`mt-5 flex gap-2 overflow-x-auto px-5 ${hideScroll}`}>
          {groups.map((g, i) => (
            <button key={i} type="button" onClick={() => { setGi(i); setCi(0); }}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${i === gi ? 'bg-white text-slate-900 shadow' : 'bg-[#ea580c]/10 text-slate-600'}`}>
              {g.name}
            </button>
          ))}
        </div>
      )}
      <div className="mx-5 mt-5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-slate-200">
          {group.image && <img src={toUrl(group.image)} alt="" className="h-full w-full object-cover" />}
          {/* Selected colour is tinted onto the photo so the customer can preview it. */}
          <div className="absolute inset-0 mix-blend-multiply transition-colors" style={{ backgroundColor: colour.hex, opacity: 0.45 }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 flex items-center gap-3 text-white">
            <span className="h-11 w-11 rounded-full border-2 border-white/80" style={{ backgroundColor: colour.hex }} />
            <div>
              <p className="text-xs text-white/80">{group.name}</p>
              <p className="text-lg font-bold leading-tight">{colour.name}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex overflow-hidden rounded-full border border-stone-200 bg-white p-1.5 shadow-sm">
          {group.colours.map((c, i) => (
            <button key={i} type="button" onClick={() => setCi(i)} aria-label={c.name} className="relative h-12 flex-1 first:rounded-l-full last:rounded-r-full" style={{ backgroundColor: c.hex }}>
              {i === ci && <Check className="absolute inset-0 m-auto h-5 w-5 text-slate-700" />}
            </button>
          ))}
        </div>
        {p.coloursNote && <p className="mt-4 rounded-2xl bg-stone-100 px-4 py-3 text-xs leading-relaxed text-slate-500">{p.coloursNote}</p>}
      </div>
    </section>
  );
};

const Guarantees = ({ p }) => {
  const yes = p.guarantee || [];
  const no = p.outsideScope || [];
  const [tab, setTab] = useState(0);
  if (yes.length === 0 && no.length === 0) return null;
  const tabs = [
    { label: p.guaranteeTab || 'What We Guarantee', list: yes },
    { label: p.outsideTab || 'Outside Our Scope', list: no },
  ].filter((t) => t.list.length > 0);
  const current = tabs[Math.min(tab, tabs.length - 1)];
  return (
    <section className="mt-14">
      <Heading title={p.guaranteeTitle} text={p.guaranteeText} />
      <div className="mx-5 mt-5">
        {tabs.length > 1 && (
          <div className="flex rounded-full bg-[#ea580c]/10 p-1">
            {tabs.map((t, i) => (
              <button key={i} type="button" onClick={() => setTab(i)} className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition ${i === tab ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>{t.label}</button>
            ))}
          </div>
        )}
        <ul className="mt-4 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white px-4">
          {current.list.map((line, i) => (
            <li key={i} className="flex gap-3 py-4 text-[15px] leading-snug text-slate-700">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#ea580c]" /> <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const Faqs = ({ p }) => {
  const [open, setOpen] = useState(null);
  const faqs = (p.faqs || []).filter((f) => f.q);
  if (faqs.length === 0) return null;
  return (
    <div className="mt-10 px-5">
      <h2 className="text-[26px] text-slate-800" style={{ fontFamily: SERIF }}>{p.faqTitle || 'FAQ'}</h2>
      <div className="mt-3 divide-y divide-stone-200 border-y border-stone-200">
        {faqs.map((f, i) => (
          <div key={i}>
            <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 py-4 text-left text-[15px] text-slate-700">
              {f.q} <ChevronDown className={`h-4 w-4 shrink-0 transition ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && f.a && <p className="pb-4 text-sm leading-relaxed text-slate-500">{f.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Premium showcase page for an estimate-based sub-category (e.g. Premium Painting).
 * Every section is managed from the admin sub-category form and hidden when empty;
 * "Get Estimate" continues to the normal visit-booking page.
 */
const PremiumEstimatePage = () => {
  const { categoryId, subId } = useParams();
  const navigate = useNavigate();
  const { currentCity } = useCity();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (document.getElementById('lora-font')) return;
    const link = document.createElement('link');
    link.id = 'lora-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    publicCatalogService.getSubCategories({ categoryId })
      .then((res) => setSub((res.subCategories || []).find((s) => String(s.id || s._id) === String(subId)) || null))
      .catch(() => setSub(null))
      .finally(() => setLoading(false));
  }, [categoryId, subId]);

  // navigate(-1) does nothing when this page is the first history entry (opened directly / refreshed).
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(`/home-services/category/${categoryId}`, { replace: true });
  };

  const getEstimate = () => navigate(`/home-services/book-visit/${categoryId}?sub=${subId}`);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
  if (!sub) return <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-slate-600">This service is not available.</div>;

  const p = sub.premium || {};
  const hero = toUrl(sub.bannerUrl || sub.imageUrl);
  const city = p.location || currentCity?.name || currentCity?.title || '';
  const rating = Number(sub.rating) || 0;
  const gallery = (p.gallery || []).filter((g) => g.image);
  const steps = (p.steps || []).filter((s) => s.title);
  const team = (p.team || []).filter((m) => m.name);
  const brands = (p.brands || []).filter((b) => b.name);
  const projects = (p.projects || []).filter((x) => x.beforeImage && x.afterImage);
  const queries = (p.queries || []).filter((q) => q.quote);

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: CREAM }}>
      {/* Floating back + city */}
      <div className="fixed inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 pt-4">
          <button type="button" onClick={goBack} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c2410c]/85 text-white backdrop-blur">
            <ArrowLeft className="h-5 w-5" />
          </button>
          {city && <span className="ml-auto flex items-center gap-1 rounded-full bg-[#c2410c]/85 px-4 py-2 text-sm font-semibold text-white backdrop-blur">{city} <ChevronDown className="h-4 w-4" /></span>}
        </div>
      </div>

      {/* Hero */}
      <div className="relative h-[420px] w-full overflow-hidden bg-slate-800">
        {hero && <img src={hero} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-3xl px-5 pb-6 text-white">
          {rating > 0 && (
            <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-xs font-bold">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {rating.toFixed(1)}{sub.reviewCount ? ` (${sub.reviewCount})` : ''}
            </span>
          )}
          <h1 className="text-3xl font-medium leading-tight" style={{ fontFamily: SERIF }}>{sub.title}</h1>
          {(city || p.jobsCount) && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
              <MapPin className="h-4 w-4" /> {[city, p.jobsCount].filter(Boolean).join(' | ')}
            </p>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-3xl">
        {/* Headline + gallery */}
        {(p.headline || p.intro || sub.description || gallery.length > 0) && (
          <section className="pt-10">
            <Heading title={p.headline} text={p.intro || sub.description} />
            {gallery.length > 0 && (
              <Carousel items={gallery} cardClass="w-[72%] sm:w-[320px]"
                renderItem={(g) => (
                  <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-slate-200 shadow-md">
                    <img src={toUrl(g.image)} alt={g.tag || ''} className="h-full w-full object-cover" loading="lazy" />
                    {g.tag && <Tag>{g.tag}</Tag>}
                  </div>
                )} />
            )}
          </section>
        )}

        {/* Process */}
        {steps.length > 0 && (
          <section className="mt-14">
            <Heading title={p.processTitle} text={p.processText} />
            <Carousel items={steps} dots={false} cardClass="w-[80%] sm:w-[340px]"
              renderItem={(st, i) => (
                <div>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-stone-200">
                    {st.image
                      ? <img src={toUrl(st.image)} alt="" className="h-full w-full object-cover" loading="lazy" />
                      : <div className="flex h-full items-center justify-center text-5xl font-bold text-stone-300">{i + 1}</div>}
                    {st.tag && <Tag>{st.tag}</Tag>}
                  </div>
                  <p className="mt-3 text-base font-semibold text-slate-900">{st.title}</p>
                  {st.text && <p className="text-sm leading-snug text-slate-500">{st.text}</p>}
                </div>
              )} />
          </section>
        )}

        {/* Team */}
        {(p.teamTitle || team.length > 0) && (
          <section className="mt-14">
            <Heading title={p.teamTitle} text={p.teamText} />
            {p.teamRating && (
              <div className="mx-5 mt-5 flex items-center justify-between rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-light text-slate-900">{p.teamRating}</span>
                  <div>
                    <div className="flex text-amber-400">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
                    <p className="text-xs text-slate-500">Avg Team Rating</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#ea580c]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#ea580c]">Verified</span>
              </div>
            )}
            {team.length > 0 && (
              <div className={`mt-6 flex gap-6 overflow-x-auto px-5 pb-2 ${hideScroll}`}>
                {team.map((m, i) => (
                  <div key={i} className="w-[110px] shrink-0 text-center">
                    <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-white bg-[#c2410c] text-lg font-semibold text-white shadow">
                      {initials(m.name)}
                      {m.rating && <span className="absolute -bottom-2.5 rounded-full bg-white px-2 text-[10px] font-bold text-slate-700 shadow">{m.rating} ★</span>}
                    </div>
                    {m.role && <p className="mt-5 text-[10px] font-medium uppercase tracking-wider text-slate-400">{m.role}</p>}
                    <p className="text-sm font-semibold text-slate-800">{m.name}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Brands & grades */}
        {brands.length > 0 && (
          <section className="mt-14">
            <Heading title={p.brandsTitle} text={p.brandsText} />
            <Carousel items={brands} cardClass="w-[85%] sm:w-[360px]"
              renderItem={(b) => (
                <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                  {b.image && <img src={toUrl(b.image)} alt={b.name} className="mx-auto h-44 object-contain" loading="lazy" />}
                  {b.grade && <p className="mx-auto mt-4 w-max rounded-full bg-[#ea580c]/15 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-[#ea580c]">{b.grade}</p>}
                  <p className="mt-3 text-center text-lg font-semibold text-slate-800">{b.name}</p>
                  <dl className="mt-3 space-y-3 text-sm">
                    {(b.details || []).map((d, i) => (
                      <div key={i} className="grid grid-cols-[110px_1fr] gap-3">
                        <dt className="text-slate-500">{d.label}</dt>
                        <dd className="text-slate-800">{d.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )} />
          </section>
        )}

        <ColourVisualiser p={p} />

        {/* Homes we painted */}
        {projects.length > 0 && (
          <section className="mt-14">
            <Heading title={p.projectsTitle} text={p.projectsText} />
            <Carousel items={projects} dots={projects.length > 1} cardClass="w-[92%] sm:w-[420px]"
              renderItem={(x) => (
                <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
                  <BeforeAfter before={toUrl(x.beforeImage)} after={toUrl(x.afterImage)} />
                  <div className="p-5">
                    {x.title && <p className="text-sm font-bold text-slate-900">{x.title}</p>}
                    {x.subtitle && <p className="mt-1 text-sm text-slate-500">{x.subtitle}</p>}
                    {x.quote && <p className="mt-3 text-sm italic leading-relaxed text-slate-600">“{x.quote}”</p>}
                  </div>
                </div>
              )} />
          </section>
        )}

        <Guarantees p={p} />

        {/* Customer queries + FAQ */}
        {(queries.length > 0 || (p.faqs || []).length > 0) && (
          <section className="mt-14">
            {queries.length > 0 && (
              <>
                <Heading title={p.queriesTitle} text={p.queriesText} />
                <Carousel items={queries} dots={false} cardClass="w-[80%] sm:w-[340px]"
                  renderItem={(q) => (
                    <div className="flex h-full min-h-[210px] flex-col justify-between rounded-3xl bg-white p-5 shadow-sm">
                      <p className="text-[15px] leading-relaxed text-slate-700">{q.quote}</p>
                      <div className="mt-5 flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ea580c] text-xs font-bold text-white">{initials(q.name)}</span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{q.name}</p>
                          {q.meta && <p className="text-xs text-slate-500">{q.meta}</p>}
                        </div>
                      </div>
                    </div>
                  )} />
              </>
            )}
            <Faqs p={p} />
          </section>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-white via-white/95 to-transparent px-4 pb-4 pt-6">
        <button type="button" onClick={getEstimate} className="mx-auto block w-full max-w-3xl rounded-full py-4 text-base font-bold text-white shadow-lg active:scale-[0.99]" style={{ backgroundColor: BRAND }}>
          Get Estimate
        </button>
      </div>
    </div>
  );
};

export default PremiumEstimatePage;
