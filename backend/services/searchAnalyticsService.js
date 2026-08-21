// services/searchAnalyticsService.js
//
// Write path for search analytics. Every function here is best-effort: a
// failure to record an event must never fail, delay or alter the user's
// search, so nothing throws and nothing is awaited on the request path.

import SearchEvent from '../models/SearchEvent.js';

// Query params that describe paging/sorting rather than intent — recording
// them would fragment the "top searches" report across pages of one search.
const NON_INTENT_PARAMS = new Set(['page', 'limit', 'pageSize', 'sort', 'sessionId']);

const cleanFilters = (query = {}) => {
  const out = {};
  Object.entries(query).forEach(([k, v]) => {
    if (NON_INTENT_PARAMS.has(k)) return;
    if (k === 'q' || k === 'search') return; // captured separately as `query`
    if (v === undefined || v === null || v === '') return;
    out[k] = v;
  });
  return out;
};

const deviceFrom = (userAgent = '') => {
  const ua = String(userAgent).toLowerCase();
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/mobi|android|iphone/.test(ua)) return 'mobile';
  if (!ua) return '';
  return 'desktop';
};

/**
 * Records one search. Call WITHOUT awaiting.
 *
 * @param {object}  req            express request (for query, user, headers)
 * @param {object}  opts
 * @param {number}  opts.resultsCount
 * @param {object} [opts.parsedQuery]
 */
export const recordSearch = (req, { resultsCount = 0, parsedQuery = {} } = {}) => {
  try {
    const q = String(req.query?.search || req.query?.q || '').trim();
    const filters = cleanFilters(req.query);

    // Nothing was actually asked for — a bare catalogue load isn't a search and
    // would drown the reports in noise.
    if (!q && Object.keys(filters).length === 0) return;

    SearchEvent.create({
      query: q,
      parsedQuery,
      filters,
      location: String(req.query?.areas || req.query?.city || '').trim(),
      resultsCount,
      zeroResult: resultsCount === 0,
      sessionId: String(req.query?.sessionId || req.headers?.['x-session-id'] || '').slice(0, 64),
      userId: req.user?._id || null,
      device: deviceFrom(req.headers?.['user-agent'])
    }).catch(() => {
      // Analytics must never surface as a user-facing failure.
    });
  } catch {
    // ditto — never let instrumentation break a search
  }
};

/**
 * Attributes a click (or enquiry) back to that session's most recent search,
 * which is what makes search→click and search→enquiry rates computable.
 */
export const recordSearchOutcome = (sessionId, propertyId, kind = 'click') => {
  try {
    if (!sessionId || !propertyId) return;
    const now = new Date();
    const update = kind === 'enquiry'
      ? { enquiredPropertyId: propertyId, enquiredAt: now }
      : { clickedPropertyId: propertyId, clickedAt: now };

    SearchEvent.findOneAndUpdate(
      { sessionId: String(sessionId).slice(0, 64) },
      { $set: update },
      { sort: { createdAt: -1 } }
    ).catch(() => {});
  } catch {
    /* best effort */
  }
};

/** Aggregates behind the admin search-analytics dashboard. */
export const getSearchAnalytics = async ({ days = 30, limit = 10 } = {}) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const base = { createdAt: { $gte: since } };

  const topBy = (field) => ([
    { $match: { ...base, [field]: { $nin: ['', null] } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { _id: 0, value: '$_id', count: 1 } }
  ]);

  const [totals, topSearches, topLocations, zeroResults] = await Promise.all([
    SearchEvent.aggregate([
      { $match: base },
      {
        $group: {
          _id: null,
          searches: { $sum: 1 },
          zeroResults: { $sum: { $cond: ['$zeroResult', 1, 0] } },
          clicks: { $sum: { $cond: [{ $ifNull: ['$clickedPropertyId', false] }, 1, 0] } },
          enquiries: { $sum: { $cond: [{ $ifNull: ['$enquiredPropertyId', false] }, 1, 0] } }
        }
      }
    ]),
    SearchEvent.aggregate(topBy('query')),
    SearchEvent.aggregate(topBy('location')),
    SearchEvent.aggregate([
      { $match: { ...base, zeroResult: true } },
      { $group: { _id: { query: '$query', location: '$location' }, count: { $sum: 1 }, lastSeen: { $max: '$createdAt' } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, query: '$_id.query', location: '$_id.location', count: 1, lastSeen: 1 } }
    ])
  ]);

  const t = totals[0] || { searches: 0, zeroResults: 0, clicks: 0, enquiries: 0 };
  const rate = (n) => (t.searches ? Number(((n / t.searches) * 100).toFixed(1)) : 0);

  return {
    windowDays: days,
    totals: t,
    rates: {
      zeroResultRate: rate(t.zeroResults),
      searchToClickRate: rate(t.clicks),
      searchToEnquiryRate: rate(t.enquiries)
    },
    topSearches,
    topLocations,
    zeroResultSearches: zeroResults
  };
};
