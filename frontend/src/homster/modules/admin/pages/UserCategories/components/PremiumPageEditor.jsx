import React, { useState } from "react";
import { FiImage, FiPlus, FiTrash2 } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { subCategoryService } from "../../../../../services/catalogService";
import { toAssetUrl } from "../utils";

export const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500";

export const Field = ({ label, children }) => (
  <label className="block">
    {label && <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</span>}
    {children}
  </label>
);

export const ImageField = ({ label, value, onChange }) => {
  const [busy, setBusy] = useState(false);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      const res = await subCategoryService.uploadImage(file, "banners");
      if (res.success) onChange(res.imageUrl);
      else toast.error("Upload failed");
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      {label && <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</span>}
      <div className="flex items-center gap-2">
        <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
          {value ? <img src={toAssetUrl(value)} alt="" className="h-full w-full object-cover" /> : <FiImage className="text-gray-400" />}
        </div>
        <label className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50">
          <input type="file" accept="image/*" className="hidden" onChange={upload} />
          {busy ? "Uploading..." : value ? "Change" : "Upload"}
        </label>
        {value && <button type="button" onClick={() => onChange("")} className="text-xs font-semibold text-red-500">Remove</button>}
      </div>
    </div>
  );
};

/** A titled block holding a heading + sub-text, used by every section. */
export const Section = ({ title, hint, children }) => (
  <details className="rounded-xl border border-gray-200 bg-white">
    <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold text-gray-800">
      {title}
      {hint && <span className="ml-2 text-[11px] font-normal text-gray-400">{hint}</span>}
    </summary>
    <div className="space-y-3 border-t border-gray-100 p-4">{children}</div>
  </details>
);

export const Repeater = ({ items = [], onChange, blank, addLabel, render }) => {
  const update = (i, patch) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={it._k ?? `${items.length}-${i}`} className="relative space-y-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3 pr-9">
          <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="absolute right-2 top-2 p-1 text-red-500 hover:bg-red-50 rounded" aria-label="Remove">
            <FiTrash2 className="h-4 w-4" />
          </button>
          {render(it, (patch) => update(i, patch), i)}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { ...blank, _k: Math.random().toString(36).slice(2) }])} className="flex items-center gap-1.5 rounded-lg border border-dashed border-emerald-400 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
        <FiPlus className="h-3.5 w-3.5" /> {addLabel}
      </button>
    </div>
  );
};

export const TitleText = ({ p, set, titleKey, textKey, titlePh, textPh }) => (
  <div className="space-y-2">
    <input className={inputCls} placeholder={titlePh} value={p[titleKey] || ""} onChange={(e) => set({ [titleKey]: e.target.value })} />
    <textarea rows={2} className={inputCls} placeholder={textPh} value={p[textKey] || ""} onChange={(e) => set({ [textKey]: e.target.value })} />
  </div>
);

// "Label | value" lines <-> [{label, value}]
const detailsToText = (d = []) => d.map((x) => `${x.label} | ${x.value || ""}`).join("\n");
const textToDetails = (t = "") => t.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((x) => x[0]).map((x) => ({ label: x[0], value: x[1] || "" }));
// plain lines <-> [string]
const linesToText = (a = []) => a.join("\n");
const textToLines = (t = "") => t.split("\n").map((l) => l.trim()).filter(Boolean);
// "Name | #hex" lines <-> [{name, hex}]
const coloursToText = (c = []) => c.map((x) => `${x.name} | ${x.hex}`).join("\n");
const textToColours = (t = "") => t.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((x) => x[0] && x[1]).map((x) => ({ name: x[0], hex: x[1] }));

/**
 * Admin editor for everything on a premium estimate page. `value` is the sub-category's
 * `premium` object (saved as-is); every section is optional and only shows to customers
 * when it has content.
 */
const PremiumPageEditor = ({ value, onChange }) => {
  const p = value || {};
  const set = (patch) => onChange({ ...p, ...patch });

  return (
    <div className="space-y-3">
      <Section title="Hero & intro" hint="Banner image above is the hero">
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Location e.g. Bangalore" value={p.location || ""} onChange={(e) => set({ location: e.target.value })} />
          <input className={inputCls} placeholder="Jobs e.g. 380 premium jobs" value={p.jobsCount || ""} onChange={(e) => set({ jobsCount: e.target.value })} />
        </div>
        <TitleText p={p} set={set} titleKey="headline" textKey="intro" titlePh="Headline e.g. Find the Quality You Deserve" textPh="Text under the headline" />
        <Repeater items={p.gallery} onChange={(gallery) => set({ gallery })} blank={{ image: "", tag: "" }} addLabel="Add gallery card"
          render={(it, up) => (
            <div className="grid grid-cols-2 gap-3">
              <ImageField label="Image" value={it.image} onChange={(image) => up({ image })} />
              <Field label="Tag"><input className={inputCls} placeholder="e.g. TEXTURE" value={it.tag || ""} onChange={(e) => up({ tag: e.target.value })} /></Field>
            </div>
          )} />
      </Section>

      <Section title="Our process" hint="Step cards">
        <TitleText p={p} set={set} titleKey="processTitle" textKey="processText" titlePh="Heading e.g. Our Process" textPh="Text under the heading" />
        <Repeater items={p.steps} onChange={(steps) => set({ steps })} blank={{ title: "", text: "", image: "", tag: "" }} addLabel="Add step"
          render={(it, up) => (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input className={inputCls} placeholder="Step title" value={it.title || ""} onChange={(e) => up({ title: e.target.value })} />
                <input className={inputCls} placeholder="Tag e.g. TODAY" value={it.tag || ""} onChange={(e) => up({ tag: e.target.value })} />
              </div>
              <input className={inputCls} placeholder="Description" value={it.text || ""} onChange={(e) => up({ text: e.target.value })} />
              <ImageField label="Image" value={it.image} onChange={(image) => up({ image })} />
            </>
          )} />
      </Section>

      <Section title="Team / management" hint="Partners with ratings">
        <TitleText p={p} set={set} titleKey="teamTitle" textKey="teamText" titlePh="Heading e.g. Effortless Management for You" textPh="Text under the heading" />
        <input className={inputCls} placeholder="Average team rating e.g. 4.8" value={p.teamRating || ""} onChange={(e) => set({ teamRating: e.target.value })} />
        <Repeater items={p.team} onChange={(team) => set({ team })} blank={{ name: "", role: "", rating: "" }} addLabel="Add team member"
          render={(it, up) => (
            <div className="grid grid-cols-3 gap-3">
              <input className={inputCls} placeholder="Name" value={it.name || ""} onChange={(e) => up({ name: e.target.value })} />
              <input className={inputCls} placeholder="Role" value={it.role || ""} onChange={(e) => up({ role: e.target.value })} />
              <input className={inputCls} placeholder="Rating" value={it.rating || ""} onChange={(e) => up({ rating: e.target.value })} />
            </div>
          )} />
      </Section>

      <Section title="Brands & grades" hint="Swipeable product cards">
        <TitleText p={p} set={set} titleKey="brandsTitle" textKey="brandsText" titlePh="Heading e.g. Pick a Brand, See the Grades" textPh="Text under the heading" />
        <Repeater items={p.brands} onChange={(brands) => set({ brands })} blank={{ name: "", grade: "", image: "", details: [] }} addLabel="Add brand / grade"
          render={(it, up) => (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input className={inputCls} placeholder="Product e.g. Royale Luxury Emulsion" value={it.name || ""} onChange={(e) => up({ name: e.target.value })} />
                <input className={inputCls} placeholder="Grade badge e.g. IMPROVED GRADE" value={it.grade || ""} onChange={(e) => up({ grade: e.target.value })} />
              </div>
              <ImageField label="Product image" value={it.image} onChange={(image) => up({ image })} />
              <textarea rows={3} className={inputCls} placeholder={"Details, one per line: Label | value\nLooks good for | 5-7 years"}
                defaultValue={detailsToText(it.details)} onBlur={(e) => up({ details: textToDetails(e.target.value) })} />
            </>
          )} />
      </Section>

      <Section title="Colour visualiser" hint="Palettes shown on a photo">
        <TitleText p={p} set={set} titleKey="coloursTitle" textKey="coloursText" titlePh="Heading e.g. Test a Colour Virtually" textPh="Text under the heading" />
        <Repeater items={p.colourGroups} onChange={(colourGroups) => set({ colourGroups })} blank={{ name: "", image: "", colours: [] }} addLabel="Add palette"
          render={(it, up) => (
            <>
              <input className={inputCls} placeholder="Palette name e.g. Quiet Mornings" value={it.name || ""} onChange={(e) => up({ name: e.target.value })} />
              <ImageField label="Room photo" value={it.image} onChange={(image) => up({ image })} />
              <textarea rows={3} className={inputCls} placeholder={"Colours, one per line: Name | #hex\nSilver Mist | #D8D6E0"}
                defaultValue={coloursToText(it.colours)} onBlur={(e) => up({ colours: textToColours(e.target.value) })} />
            </>
          )} />
        <textarea rows={2} className={inputCls} placeholder="Disclaimer note under the palette" value={p.coloursNote || ""} onChange={(e) => set({ coloursNote: e.target.value })} />
      </Section>

      <Section title="Homes we painted" hint="Before / after slider">
        <TitleText p={p} set={set} titleKey="projectsTitle" textKey="projectsText" titlePh="Heading e.g. Homes We Painted Near You" textPh="Text under the heading" />
        <Repeater items={p.projects} onChange={(projects) => set({ projects })} blank={{ title: "", subtitle: "", quote: "", beforeImage: "", afterImage: "" }} addLabel="Add project"
          render={(it, up) => (
            <>
              <input className={inputCls} placeholder="Title e.g. 3 BHK · Whitefield" value={it.title || ""} onChange={(e) => up({ title: e.target.value })} />
              <input className={inputCls} placeholder="Subtitle e.g. Royale Luxury Emulsion · 6 days" value={it.subtitle || ""} onChange={(e) => up({ subtitle: e.target.value })} />
              <textarea rows={2} className={inputCls} placeholder="Customer quote" value={it.quote || ""} onChange={(e) => up({ quote: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <ImageField label="Before image" value={it.beforeImage} onChange={(beforeImage) => up({ beforeImage })} />
                <ImageField label="After image" value={it.afterImage} onChange={(afterImage) => up({ afterImage })} />
              </div>
            </>
          )} />
      </Section>

      <Section title="Guarantees" hint="Two tabs">
        <TitleText p={p} set={set} titleKey="guaranteeTitle" textKey="guaranteeText" titlePh="Heading e.g. Before We Take Charge" textPh="Text under the heading" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tab 1 label"><input className={inputCls} placeholder="What We Guarantee" value={p.guaranteeTab || ""} onChange={(e) => set({ guaranteeTab: e.target.value })} /></Field>
          <Field label="Tab 2 label"><input className={inputCls} placeholder="Outside Our Scope" value={p.outsideTab || ""} onChange={(e) => set({ outsideTab: e.target.value })} /></Field>
        </div>
        <Field label="Tab 1 points (one per line)">
          <textarea rows={4} className={inputCls} defaultValue={linesToText(p.guarantee)} onBlur={(e) => set({ guarantee: textToLines(e.target.value) })} />
        </Field>
        <Field label="Tab 2 points (one per line)">
          <textarea rows={4} className={inputCls} defaultValue={linesToText(p.outsideScope)} onBlur={(e) => set({ outsideScope: textToLines(e.target.value) })} />
        </Field>
      </Section>

      <Section title="Customer queries & FAQ">
        <TitleText p={p} set={set} titleKey="queriesTitle" textKey="queriesText" titlePh="Heading e.g. Customer Queries Addressed" textPh="Text under the heading" />
        <Repeater items={p.queries} onChange={(queries) => set({ queries })} blank={{ quote: "", name: "", meta: "" }} addLabel="Add customer query"
          render={(it, up) => (
            <>
              <textarea rows={3} className={inputCls} placeholder="Question / review text" value={it.quote || ""} onChange={(e) => up({ quote: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className={inputCls} placeholder="Customer name" value={it.name || ""} onChange={(e) => up({ name: e.target.value })} />
                <input className={inputCls} placeholder="e.g. 5 BHK · Sadashivanagar" value={it.meta || ""} onChange={(e) => up({ meta: e.target.value })} />
              </div>
            </>
          )} />
        <input className={inputCls} placeholder="FAQ heading e.g. FAQ" value={p.faqTitle || ""} onChange={(e) => set({ faqTitle: e.target.value })} />
        <Repeater items={p.faqs} onChange={(faqs) => set({ faqs })} blank={{ q: "", a: "" }} addLabel="Add FAQ"
          render={(it, up) => (
            <>
              <input className={inputCls} placeholder="Question" value={it.q || ""} onChange={(e) => up({ q: e.target.value })} />
              <textarea rows={2} className={inputCls} placeholder="Answer" value={it.a || ""} onChange={(e) => up({ a: e.target.value })} />
            </>
          )} />
      </Section>
    </div>
  );
};

export default PremiumPageEditor;
