import mongoose from 'mongoose';

/**
 * One row per search performed against the public catalogue.
 *
 * This is the substrate every "improve ranking from real behaviour" goal needs:
 * ranking weights, zero-result recovery and conversion signals are all tuned
 * from history, and history cannot be backfilled — so the write is deliberately
 * cheap and fire-and-forget rather than something that can slow a search down.
 *
 * Deliberately stores no personal data beyond an optional userId: the session
 * id is a random client-side token, not an identifier we can resolve to a
 * person, which keeps this useful for funnels without becoming a tracking log.
 */
const searchEventSchema = new mongoose.Schema(
  {
    // Raw text the user typed (empty for pure filter/browse navigation).
    query: { type: String, default: '', trim: true },

    // What the query parser understood — lets us measure parser accuracy later
    // by comparing intent against what the user actually clicked.
    parsedQuery: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Filters actually applied (URL params), minus paging noise.
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Denormalised for the "popular locations" report without touching filters.
    location: { type: String, default: '', trim: true },

    resultsCount: { type: Number, default: 0 },

    // Stored rather than derived so the zero-result report is a plain indexed
    // lookup instead of a scan comparing counts.
    zeroResult: { type: Boolean, default: false, index: true },

    // Anonymous, client-generated. Groups a search with the clicks/enquiries
    // that followed it so search→enquiry conversion is measurable.
    sessionId: { type: String, default: '', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    device: { type: String, default: '' },

    // Attribution, filled in later by the click/enquiry endpoints.
    clickedPropertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    clickedAt: { type: Date, default: null },
    enquiredPropertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    enquiredAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// "Top searches" / "popular locations" over a recent window.
searchEventSchema.index({ createdAt: -1 });
searchEventSchema.index({ query: 1, createdAt: -1 });
searchEventSchema.index({ location: 1, createdAt: -1 });
// Zero-result report, newest first.
searchEventSchema.index({ zeroResult: 1, createdAt: -1 });

export default mongoose.model('SearchEvent', searchEventSchema);
