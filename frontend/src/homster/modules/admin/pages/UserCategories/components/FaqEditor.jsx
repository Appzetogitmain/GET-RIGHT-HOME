import React from "react";
import { Repeater, Section, inputCls } from "./PremiumPageEditor";

/**
 * Admin editor for a sub-category's FAQ block (shown at the end of its page).
 * `value` is saved as `page.faq`.
 */
const FaqEditor = ({ value, onChange }) => {
  const f = value || {};
  const set = (patch) => onChange({ ...f, ...patch });
  return (
    <Section title="FAQs" hint="Questions & answers at the end of the page">
      <input className={inputCls} placeholder="Heading (default: Frequently Asked Questions)" value={f.title || ""} onChange={(e) => set({ title: e.target.value })} />
      <Repeater items={f.items} onChange={(items) => set({ items })} blank={{ q: "", a: "" }} addLabel="Add FAQ"
        render={(it, up) => (
          <>
            <input className={inputCls} placeholder="Question" value={it.q || ""} onChange={(e) => up({ q: e.target.value })} />
            <textarea rows={2} className={inputCls} placeholder="Answer" value={it.a || ""} onChange={(e) => up({ a: e.target.value })} />
          </>
        )} />
    </Section>
  );
};

export default FaqEditor;
