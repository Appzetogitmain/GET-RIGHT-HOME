// utils/seoSlug.js
//
// SEO-friendly URLs for property/project detail pages, matching the 99acres
// pattern: <name>-<locality>-<city>-npxid-<code>
// e.g. https://www.99acres.com/sujay-global-elara-nallagandla-hyderabad-npxid-r435679
//
// The trailing `-npxid-<code>` is what makes the slug a reliable lookup key
// even though the human-readable part isn't unique on its own (two builders
// can both have a project called "Elara"). `<code>` is derived from the
// document's own ObjectId, so it's already guaranteed unique — no uniqueness
// retry-loop needed, unlike a typical "slugify the title" scheme.

const slugifyPart = (text) =>
  String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/**
 * Builds the SEO slug for a property/project document.
 *
 * @param {object} doc — needs propertyName and address.{area,city}, plus an _id
 */
export const buildSeoSlug = (doc) => {
  const name = slugifyPart(doc.propertyName);
  const place = slugifyPart(doc.address?.area) || slugifyPart(doc.address?.city);
  const code = String(doc._id).slice(-8);

  const parts = [name, place].filter(Boolean);
  // A doc with no name at all (shouldn't happen — propertyName is required)
  // still gets a resolvable slug rather than crashing the save.
  const humanPart = parts.length ? parts.join('-') : 'listing';

  return `${humanPart}-npxid-${code}`;
};

/**
 * Mongoose pre-save hook: generates a slug once, on first save, and never
 * overwrites one that already exists — a listing's URL must not change
 * under anyone who already bookmarked or shared it.
 */
export const attachSlugHook = (schema) => {
  // Zero-arg pre-save hooks run synchronously in this codebase's Mongoose
  // version — a `next` parameter turns it into async middleware Mongoose then
  // waits on forever, throwing "next is not a function" the moment it's
  // actually called (confirmed against Property/Project's real save path).
  schema.pre('save', function generateSeoSlug() {
    if (!this.slug) {
      this.slug = buildSeoSlug(this);
    }
  });
};

export default buildSeoSlug;
