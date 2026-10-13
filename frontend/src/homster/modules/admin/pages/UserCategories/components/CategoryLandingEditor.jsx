import React from "react";
import { Field, ImageField, Repeater, Section, inputCls } from "./PremiumPageEditor";
import ExploreEditor from "./ExploreEditor";
import ReviewsEditor from "./ReviewsEditor";
import FaqEditor from "./FaqEditor";

/**
 * Admin editor for the landing page of an estimate-based category (e.g. Home Painting): the blocks shown
 * below "Services we offer". `value` is saved as the category's `page`; empty blocks are hidden from customers.
 */
const CategoryLandingEditor = ({ value, onChange, categories = [] }) => {
  const p = value || {};
  const set = (patch) => onChange({ ...p, ...patch });

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-bold text-gray-800">Landing page content</p>
        <p className="text-[11px] text-gray-500">Shown below "Services we offer" on this category's page. Empty blocks are hidden.</p>
      </div>

      <Section title="Ideas for your home" hint="Swipeable image / colour cards">
        <input className={inputCls} placeholder="Heading (default: Ideas for your Home)" value={p.ideasTitle || ""} onChange={(e) => set({ ideasTitle: e.target.value })} />
        <Repeater items={p.ideas} onChange={(ideas) => set({ ideas })} blank={{ title: "", image: "", color: "" }} addLabel="Add idea"
          render={(it, up) => (
            <>
              <input className={inputCls} placeholder="Caption e.g. Rich Chocolate" value={it.title || ""} onChange={(e) => up({ title: e.target.value })} />
              <ImageField label="Image" value={it.image} onChange={(image) => up({ image })} />
              <Field label="Or a colour (used when there is no image)">
                <div className="flex items-center gap-2">
                  <input type="color" className="h-9 w-12 cursor-pointer rounded border border-gray-300" value={it.color || "#8b5e3c"} onChange={(e) => up({ color: e.target.value })} />
                  <input className={inputCls} placeholder="#8b5e3c" value={it.color || ""} onChange={(e) => up({ color: e.target.value })} />
                </div>
              </Field>
            </>
          )} />
      </Section>

      <Section title="How it works" hint="Steps with icon">
        <input className={inputCls} placeholder="Heading e.g. How painting works" value={p.howTitle || ""} onChange={(e) => set({ howTitle: e.target.value })} />
        <Repeater items={p.howSteps} onChange={(howSteps) => set({ howSteps })} blank={{ title: "", text: "", image: "" }} addLabel="Add step"
          render={(it, up) => (
            <>
              <input className={inputCls} placeholder="Step title e.g. Book Home Inspection" value={it.title || ""} onChange={(e) => up({ title: e.target.value })} />
              <input className={inputCls} placeholder="Description" value={it.text || ""} onChange={(e) => up({ text: e.target.value })} />
              <ImageField label="Icon" value={it.image} onChange={(image) => up({ image })} />
            </>
          )} />
      </Section>

      <Section title="Recent projects" hint="Photo cards with painter and rating">
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Heading e.g. Tour our Recent Projects" value={p.projectsTitle || ""} onChange={(e) => set({ projectsTitle: e.target.value })} />
          <input className={inputCls} placeholder="Tag e.g. New" value={p.projectsTag || ""} onChange={(e) => set({ projectsTag: e.target.value })} />
        </div>
        <Repeater items={p.projects} onChange={(projects) => set({ projects })} blank={{ image: "", name: "", service: "", rating: "" }} addLabel="Add project"
          render={(it, up) => (
            <>
              <div className="grid grid-cols-3 gap-3">
                <input className={inputCls} placeholder="Painter name" value={it.name || ""} onChange={(e) => up({ name: e.target.value })} />
                <input className={inputCls} placeholder="Service e.g. Interior Painting" value={it.service || ""} onChange={(e) => up({ service: e.target.value })} />
                <input type="number" min="0" max="5" step="0.1" className={inputCls} placeholder="Rating" value={it.rating ?? ""} onChange={(e) => up({ rating: e.target.value })} />
              </div>
              <ImageField label="Project photo" value={it.image} onChange={(image) => up({ image })} />
            </>
          )} />
      </Section>

      <ExploreEditor categories={categories} value={p.explore} onChange={(explore) => set({ explore })} />
      <ReviewsEditor value={p.reviews} onChange={(reviews) => set({ reviews })} />
      <FaqEditor value={p.faq} onChange={(faq) => set({ faq })} />
    </div>
  );
};

export default CategoryLandingEditor;
