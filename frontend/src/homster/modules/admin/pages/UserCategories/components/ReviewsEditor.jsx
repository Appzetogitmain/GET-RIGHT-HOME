import React from "react";
import { Field, Repeater, Section, inputCls } from "./PremiumPageEditor";

/**
 * Admin editor for a sub-category's "Ratings & Reviews" block (shown at the end of its page,
 * after the services). `value` is saved as `page.reviews`.
 */
const ReviewsEditor = ({ value, onChange }) => {
  const r = value || {};
  const set = (patch) => onChange({ ...r, ...patch });
  const counts = r.counts || {};

  return (
    <Section title="Ratings & reviews" hint="Shown at the end of this sub-category's page">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Average rating">
          <input type="number" step="0.01" min="0" max="5" className={inputCls} placeholder="4.74" value={r.rating ?? ""} onChange={(e) => set({ rating: e.target.value })} />
        </Field>
      </div>
      <Field label="Number of ratings per star">
        <div className="grid grid-cols-5 gap-2">
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n}>
              <span className="mb-0.5 block text-center text-[10px] font-bold text-gray-500">{n} ★</span>
              <input type="number" min="0" className={inputCls} value={counts[n] ?? ""} onChange={(e) => set({ counts: { ...counts, [n]: e.target.value } })} />
            </div>
          ))}
        </div>
      </Field>
      <Repeater items={r.items} onChange={(items) => set({ items })} blank={{ name: "", rating: "5", date: "", service: "", text: "", liked: [] }} addLabel="Add review"
        render={(it, up) => (
          <>
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} placeholder="Customer name" value={it.name || ""} onChange={(e) => up({ name: e.target.value })} />
              <input type="number" min="1" max="5" className={inputCls} placeholder="Rating (1-5)" value={it.rating ?? ""} onChange={(e) => up({ rating: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} placeholder="Date e.g. 12 Oct 2026" value={it.date || ""} onChange={(e) => up({ date: e.target.value })} />
              <input className={inputCls} placeholder="Service e.g. Furnished Apartment - Essential" value={it.service || ""} onChange={(e) => up({ service: e.target.value })} />
            </div>
            <textarea rows={3} className={inputCls} placeholder="Review text" value={it.text || ""} onChange={(e) => up({ text: e.target.value })} />
            <input className={inputCls} placeholder="Liked tags, comma separated e.g. Timely start/completion, Seamless process"
              defaultValue={(it.liked || []).join(", ")} onBlur={(e) => up({ liked: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
          </>
        )} />
    </Section>
  );
};

export default ReviewsEditor;
