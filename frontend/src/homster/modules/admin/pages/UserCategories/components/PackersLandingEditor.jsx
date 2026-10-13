import React from "react";
import { Field, ImageField, Repeater, Section, TitleText, inputCls } from "./PremiumPageEditor";

const linesToText = (a = []) => a.join("\n");
const textToLines = (t = "") => t.split("\n").map((l) => l.trim()).filter(Boolean);

/**
 * Admin editor for the Packers & Movers landing page of a sub-category (Within City,
 * Between Cities, Vehicle Shifting ...). `value` is saved as the sub-category's `premium`
 * object; every section is optional and hidden from customers when empty.
 */
const PackersLandingEditor = ({ value, onChange }) => {
  const p = value || {};
  const set = (patch) => onChange({ ...p, ...patch });

  return (
    <div className="space-y-3">
      <Section title="Hero" hint="Top banner and booking card">
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Title e.g. India's Largest" value={p.heroTitle || ""} onChange={(e) => set({ heroTitle: e.target.value })} />
          <input className={inputCls} placeholder="Highlighted line e.g. Packers and Movers" value={p.heroHighlight || ""} onChange={(e) => set({ heroHighlight: e.target.value })} />
        </div>
        <textarea rows={2} className={inputCls} placeholder="Short description under the title" value={p.heroText || ""} onChange={(e) => set({ heroText: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Rating chip e.g. 4.8" value={p.heroRating || ""} onChange={(e) => set({ heroRating: e.target.value })} />
          <input className={inputCls} placeholder="Button text e.g. Check Prices" value={p.ctaLabel || ""} onChange={(e) => set({ ctaLabel: e.target.value })} />
        </div>
        <input className={inputCls} placeholder="Certification strip e.g. ISO 9001:2015 Certified | 10+ years of experience" value={p.certText || ""} onChange={(e) => set({ certText: e.target.value })} />
        <Field label="Trust points under the button (one per line)">
          <textarea rows={2} className={inputCls} defaultValue={linesToText(p.trustPoints)} onBlur={(e) => set({ trustPoints: textToLines(e.target.value) })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Coupon label e.g. COUPON" value={p.couponLabel || ""} onChange={(e) => set({ couponLabel: e.target.value })} />
          <input className={inputCls} placeholder="Coupon title e.g. Freedom Plan Sale" value={p.couponTitle || ""} onChange={(e) => set({ couponTitle: e.target.value })} />
        </div>
        <input className={inputCls} placeholder="Coupon text e.g. 10% OFF on booking" value={p.couponText || ""} onChange={(e) => set({ couponText: e.target.value })} />
        <ImageField label="Coupon image (optional)" value={p.couponImage} onChange={(couponImage) => set({ couponImage })} />
      </Section>

      <Section title="What sets us apart" hint="Highlights with icon">
        <input className={inputCls} placeholder="Heading e.g. What sets us apart?" value={p.highlightsTitle || ""} onChange={(e) => set({ highlightsTitle: e.target.value })} />
        <Repeater items={p.highlights} onChange={(highlights) => set({ highlights })} blank={{ image: "", title: "", link: "" }} addLabel="Add highlight"
          render={(it, up) => (
            <>
              <input className={inputCls} placeholder="Text e.g. 100% Damage & Delay Protection" value={it.title || ""} onChange={(e) => up({ title: e.target.value })} />
              <input className={inputCls} placeholder="Link text (optional) e.g. Customer Reviews" value={it.link || ""} onChange={(e) => up({ link: e.target.value })} />
              <ImageField label="Icon" value={it.image} onChange={(image) => up({ image })} />
            </>
          )} />
      </Section>

      <Section title="Services we offer" hint="Cards below the hero">
        <input className={inputCls} placeholder="Heading e.g. House Relocation Services We Offer" value={p.servicesTitle || ""} onChange={(e) => set({ servicesTitle: e.target.value })} />
        <Repeater items={p.serviceCards} onChange={(serviceCards) => set({ serviceCards })} blank={{ title: "", text: "", image: "", linkLabel: "Explore", type: "" }} addLabel="Add service card"
          render={(it, up) => (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input className={inputCls} placeholder="Title e.g. Vehicle Shifting" value={it.title || ""} onChange={(e) => up({ title: e.target.value })} />
                <input className={inputCls} placeholder="Link label e.g. Explore" value={it.linkLabel || ""} onChange={(e) => up({ linkLabel: e.target.value })} />
              </div>
              <input className={inputCls} placeholder="Description" value={it.text || ""} onChange={(e) => up({ text: e.target.value })} />
              <Field label="Opens quote flow for">
                <select className={inputCls} value={it.type || ""} onChange={(e) => up({ type: e.target.value })}>
                  <option value="">Within City</option>
                  <option value="INTER_CITY">Between Cities</option>
                </select>
              </Field>
              <ImageField label="Image" value={it.image} onChange={(image) => up({ image })} />
            </>
          )} />
        <input className={inputCls} placeholder="Trusted-by heading e.g. Trusted by" value={p.trustedTitle || ""} onChange={(e) => set({ trustedTitle: e.target.value })} />
        <Repeater items={p.trustedLogos} onChange={(trustedLogos) => set({ trustedLogos })} blank={{ image: "", name: "" }} addLabel="Add partner logo"
          render={(it, up) => (
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} placeholder="Name" value={it.name || ""} onChange={(e) => up({ name: e.target.value })} />
              <ImageField label="Logo" value={it.image} onChange={(image) => up({ image })} />
            </div>
          )} />
      </Section>

      <Section title="How it works" hint="Steps + packaging promo">
        <input className={inputCls} placeholder="Heading e.g. How Packers and Movers Works?" value={p.howTitle || ""} onChange={(e) => set({ howTitle: e.target.value })} />
        <Repeater items={p.howSteps} onChange={(howSteps) => set({ howSteps })} blank={{ image: "", title: "", text: "" }} addLabel="Add step"
          render={(it, up) => (
            <>
              <input className={inputCls} placeholder="Step title" value={it.title || ""} onChange={(e) => up({ title: e.target.value })} />
              <input className={inputCls} placeholder="Description" value={it.text || ""} onChange={(e) => up({ text: e.target.value })} />
              <ImageField label="Icon / image" value={it.image} onChange={(image) => up({ image })} />
            </>
          )} />
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Promo tag e.g. NEW" value={p.promoTag || ""} onChange={(e) => set({ promoTag: e.target.value })} />
          <input className={inputCls} placeholder="Promo button e.g. Know More" value={p.promoButton || ""} onChange={(e) => set({ promoButton: e.target.value })} />
        </div>
        <input className={inputCls} placeholder="Promo text e.g. Our step-by-step packaging process" value={p.promoText || ""} onChange={(e) => set({ promoText: e.target.value })} />
        <ImageField label="Promo image" value={p.promoImage} onChange={(promoImage) => set({ promoImage })} />
      </Section>

      <Section title="Completed trips" hint="Recent trip cards">
        <input className={inputCls} placeholder="Heading e.g. 15 lakh+ trips completed all over India" value={p.tripsTitle || ""} onChange={(e) => set({ tripsTitle: e.target.value })} />
        <Repeater items={p.trips} onChange={(trips) => set({ trips })} blank={{ rating: "", tag: "", name: "", date: "", city: "" }} addLabel="Add trip"
          render={(it, up) => (
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} placeholder="Customer name" value={it.name || ""} onChange={(e) => up({ name: e.target.value })} />
              <input className={inputCls} placeholder="Rating e.g. 5.0" value={it.rating || ""} onChange={(e) => up({ rating: e.target.value })} />
              <input className={inputCls} placeholder="Tag e.g. WITHIN CITY" value={it.tag || ""} onChange={(e) => up({ tag: e.target.value })} />
              <input className={inputCls} placeholder="Completed on e.g. 08 Oct 2026" value={it.date || ""} onChange={(e) => up({ date: e.target.value })} />
              <input className={inputCls} placeholder="City e.g. MUMBAI" value={it.city || ""} onChange={(e) => up({ city: e.target.value })} />
            </div>
          )} />
      </Section>

      <Section title="Why choose us" hint="Feature list with icons">
        <input className={inputCls} placeholder="Heading e.g. Why Choose Us for House Shifting?" value={p.whyTitle || ""} onChange={(e) => set({ whyTitle: e.target.value })} />
        <Repeater items={p.whyItems} onChange={(whyItems) => set({ whyItems })} blank={{ image: "", title: "", text: "" }} addLabel="Add reason"
          render={(it, up) => (
            <>
              <input className={inputCls} placeholder="Title e.g. Lowest Price Guarantee" value={it.title || ""} onChange={(e) => up({ title: e.target.value })} />
              <input className={inputCls} placeholder="Description" value={it.text || ""} onChange={(e) => up({ text: e.target.value })} />
              <ImageField label="Icon / image" value={it.image} onChange={(image) => up({ image })} />
            </>
          )} />
      </Section>

      <Section title="Customer reviews">
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Average rating e.g. 4.8" value={p.reviewsRating || ""} onChange={(e) => set({ reviewsRating: e.target.value })} />
          <input className={inputCls} placeholder="Basis e.g. Average rating based on 90,445 reviews" value={p.reviewsText || ""} onChange={(e) => set({ reviewsText: e.target.value })} />
        </div>
        <Repeater items={p.reviews} onChange={(reviews) => set({ reviews })} blank={{ name: "", rating: "", text: "", image: "" }} addLabel="Add review"
          render={(it, up) => (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input className={inputCls} placeholder="Customer name" value={it.name || ""} onChange={(e) => up({ name: e.target.value })} />
                <input className={inputCls} placeholder="Rating e.g. 5.0" value={it.rating || ""} onChange={(e) => up({ rating: e.target.value })} />
              </div>
              <textarea rows={3} className={inputCls} placeholder="Review text" value={it.text || ""} onChange={(e) => up({ text: e.target.value })} />
              <ImageField label="Photo (optional)" value={it.image} onChange={(image) => up({ image })} />
            </>
          )} />
      </Section>

      <Section title="FAQs" hint="Grouped by filter chips">
        <input className={inputCls} placeholder="Heading e.g. FAQs - Packers and Movers" value={p.faqTitle || ""} onChange={(e) => set({ faqTitle: e.target.value })} />
        <Repeater items={p.faqs} onChange={(faqs) => set({ faqs })} blank={{ category: "", q: "", a: "" }} addLabel="Add FAQ"
          render={(it, up) => (
            <>
              <input className={inputCls} placeholder="Filter chip e.g. Price (optional)" value={it.category || ""} onChange={(e) => up({ category: e.target.value })} />
              <input className={inputCls} placeholder="Question" value={it.q || ""} onChange={(e) => up({ q: e.target.value })} />
              <textarea rows={2} className={inputCls} placeholder="Answer" value={it.a || ""} onChange={(e) => up({ a: e.target.value })} />
            </>
          )} />
      </Section>
    </div>
  );
};

export default PackersLandingEditor;
