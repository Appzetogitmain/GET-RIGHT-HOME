import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * FAQ accordion. `data` is the admin-managed `page.faq` of a sub-category: { title, items: [{ q, a }] }.
 */
const FaqSection = ({ data }) => {
  const [open, setOpen] = useState(null);
  const items = (data?.items || []).filter((f) => f.q);
  if (!items.length) return null;

  return (
    <section className="mx-4 mb-4 mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">{data.title || 'Frequently Asked Questions'}</h2>
      <div className="mt-2 divide-y divide-slate-100">
        {items.map((f, i) => (
          <div key={i}>
            <button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 py-3.5 text-left text-[15px] font-medium text-slate-800">
              {f.q}
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && f.a && <p className="pb-3.5 text-sm leading-relaxed text-slate-600">{f.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
};

export default FaqSection;
