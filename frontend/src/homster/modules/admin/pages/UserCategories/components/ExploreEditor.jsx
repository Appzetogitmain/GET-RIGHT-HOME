import React from "react";
import { Field, ImageField, Repeater, Section, inputCls } from "./PremiumPageEditor";

/**
 * Admin editor for the "Explore Other Services" row at the end of a sub-category's page.
 * Each card links to a category. `value` is saved as `page.explore`.
 */
const ExploreEditor = ({ value, onChange, categories = [] }) => {
  const e = value || {};
  const set = (patch) => onChange({ ...e, ...patch });

  return (
    <Section title="Explore other services" hint="Category cards shown below Mini Services">
      <input className={inputCls} placeholder="Heading (default: Explore Other Services)" value={e.title || ""} onChange={(ev) => set({ title: ev.target.value })} />
      <Repeater items={e.items} onChange={(items) => set({ items })} blank={{ categoryId: "", title: "", image: "", rating: "" }} addLabel="Add card"
        render={(it, up) => (
          <>
            <Field label="Opens category">
              <select className={inputCls} value={it.categoryId || ""}
                onChange={(ev) => {
                  const cat = categories.find((c) => String(c.id) === ev.target.value);
                  up({ categoryId: ev.target.value, title: it.title || cat?.title || "", image: it.image || cat?.imageUrl || "" });
                }}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} placeholder="Card title e.g. AC Services" value={it.title || ""} onChange={(ev) => up({ title: ev.target.value })} />
              <input type="number" step="0.1" min="0" max="5" className={inputCls} placeholder="Rating e.g. 4.8 (optional)" value={it.rating ?? ""} onChange={(ev) => up({ rating: ev.target.value })} />
            </div>
            <ImageField label="Card image" value={it.image} onChange={(image) => up({ image })} />
          </>
        )} />
    </Section>
  );
};

export default ExploreEditor;
