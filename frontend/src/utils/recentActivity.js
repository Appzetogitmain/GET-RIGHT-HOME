// "Recent searches" and "recently viewed properties" — tracked entirely
// client-side in localStorage so it works for guests too (matches how
// sites like 99acres show recent activity before you've ever logged in).
// Logged-in users get this for free on this device; syncing it server-side
// per account is a separate, later step if that's ever needed.

const SEARCH_KEY = 'grh_recent_searches';
const VIEW_KEY = 'grh_recently_viewed';
const MAX_SEARCHES = 6;
const MAX_VIEWED = 8;

export const formatMoneyValue = (v) => {
  if (v === null || v === undefined) return 'Any';
  const num = Number(v);
  if (isNaN(num)) return `${v}`;
  if (num >= 10000000) return `${+(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `${+(num / 100000).toFixed(2)} Lac`;
  if (num >= 1000) return `${+(num / 1000).toFixed(1)}K`;
  return `${num}`;
};

const readList = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeList = (key, list) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // ignore (private browsing / storage full)
  }
};

/**
 * Normalizes any search entry (rich or legacy) into the 99acres-style schema:
 * {
 *   id: string,
 *   tab: 'buy' | 'rent' | 'pg' | 'commercial' | 'plots',
 *   places: string[],
 *   city: string,
 *   label: string,
 *   subLabel: string,
 *   filters: { types, bhks, status, postedBy, budget },
 *   url: string,
 *   timestamp: number
 * }
 */
export const normalizeSearchEntry = (entry) => {
  if (!entry) return null;
  const url = entry.url || '';
  const timestamp = entry.timestamp || entry.at || Date.now();
  let tab = entry.tab || 'buy';
  let places = Array.isArray(entry.places) ? [...entry.places] : [];
  let types = entry.filters?.types ? [...entry.filters.types] : [];
  let bhks = entry.filters?.bhks ? [...entry.filters.bhks] : [];
  let status = entry.filters?.status ? [...entry.filters.status] : [];
  let postedBy = entry.filters?.postedBy ? [...entry.filters.postedBy] : [];
  let budget = Array.isArray(entry.filters?.budget) ? [...entry.filters.budget] : [0, null];

  // If url has query params and fields are missing, extract from url
  if (url && (places.length === 0 || !entry.tab)) {
    try {
      const qIndex = url.indexOf('?');
      if (qIndex !== -1) {
        const params = new URLSearchParams(url.slice(qIndex));
        if (!entry.tab) {
          const t = (params.get('transactionType') || '').toLowerCase();
          if (params.get('propertyCategory') === 'Commercial') tab = 'commercial';
          else if (t === 'rent') tab = 'rent';
          else if (t === 'pg') tab = 'pg';
          else if ((params.get('subType') || '').toLowerCase().includes('plot')) tab = 'plots';
          else tab = 'buy';
        }
        if (places.length === 0) {
          const raw = params.get('areas') || params.get('search') || '';
          if (raw) places = raw.split(',').map((s) => s.trim()).filter(Boolean);
        }
        if (types.length === 0 && (params.get('subType') || params.get('propertyType'))) {
          types = (params.get('subType') || params.get('propertyType')).split(',').map((s) => s.trim()).filter(Boolean);
        }
        if (bhks.length === 0 && params.get('bhkType')) {
          bhks = params.get('bhkType').split(',').map((s) => s.trim()).filter(Boolean);
        }
        if (status.length === 0 && params.get('availability')) {
          status = params.get('availability').split(',').map((s) => s.trim()).filter(Boolean);
        }
        if (postedBy.length === 0 && params.get('postedBy')) {
          postedBy = params.get('postedBy').split(',').map((s) => s.trim()).filter(Boolean);
        }
        const minP = Number(params.get('minPrice')) || 0;
        const maxP = Number(params.get('maxPrice')) || null;
        if (minP || maxP) {
          budget = [minP, maxP];
        }
      }
    } catch {
      // ignore
    }
  }

  const tabTitle = tab ? tab.charAt(0).toUpperCase() + tab.slice(1) : 'Buy';
  const label = entry.label || (places.length ? `${tabTitle} in ${places.join(', ')}` : `${tabTitle} Properties`);
  const city = entry.city || places[0] || '';

  let subLabel = entry.subLabel;
  if (!subLabel) {
    const parts = [];
    if (bhks.length) parts.push(bhks.map((b) => b.replace(/BHK/i, ' BHK')).join(', '));
    if (budget[0] || budget[1]) {
      const minF = budget[0] ? formatMoneyValue(budget[0]) : null;
      const maxF = budget[1] ? formatMoneyValue(budget[1]) : null;
      if (minF && maxF) parts.push(`₹${minF} - ₹${maxF}`);
      else if (maxF) parts.push(`Under ₹${maxF}`);
      else if (minF) parts.push(`₹${minF}+`);
    }
    if (types.length) parts.push(types.slice(0, 2).join(', ') + (types.length > 2 ? ` +${types.length - 2}` : ''));
    if (status.length) parts.push(status.join(', '));
    if (postedBy.length) parts.push(postedBy.join(', '));
    subLabel = parts.length ? parts.join(' • ') : 'All Property Types • Any Budget';
  }

  const id = entry.id || `${tab}-${places.join('-')}-${bhks.join('-')}-${types.join('-')}-${budget[0] || 0}-${budget[1] || 0}`.toLowerCase().replace(/[^a-z0-9-]/g, '_');

  return {
    id,
    tab,
    places,
    city,
    label,
    subLabel,
    filters: {
      types,
      bhks,
      status,
      postedBy,
      budget
    },
    url,
    timestamp,
    at: timestamp
  };
};

/**
 * entry: {
 *   id?: string,
 *   tab?: string,
 *   places?: string[],
 *   city?: string,
 *   label?: string,
 *   subLabel?: string,
 *   filters?: { types?: string[], bhks?: string[], status?: string[], postedBy?: string[], budget?: [number, number|null] },
 *   url: string,
 *   timestamp?: number
 * }
 */
export const addRecentSearch = (entry) => {
  if (!entry?.url && !entry?.label) return;
  const normalized = normalizeSearchEntry(entry);
  if (!normalized) return;

  const existing = readList(SEARCH_KEY);
  const filtered = existing.filter((s) => {
    if (normalized.id && s.id === normalized.id) return false;
    if (normalized.url && s.url === normalized.url) return false;
    if (normalized.label && s.label === normalized.label) return false;
    return true;
  });

  const next = [normalized, ...filtered].slice(0, MAX_SEARCHES);
  writeList(SEARCH_KEY, next);
  return next;
};

export const getRecentSearches = () => {
  const list = readList(SEARCH_KEY);
  return list.map(normalizeSearchEntry).filter(Boolean);
};

export const removeRecentSearch = (idOrLabelOrUrl) => {
  if (!idOrLabelOrUrl) return getRecentSearches();
  const target = String(idOrLabelOrUrl).toLowerCase();
  const list = readList(SEARCH_KEY);
  const next = list.filter((s) => {
    if (s.id && String(s.id).toLowerCase() === target) return false;
    if (s.label && String(s.label).toLowerCase() === target) return false;
    if (s.url && String(s.url).toLowerCase() === target) return false;
    return true;
  });
  writeList(SEARCH_KEY, next);
  return next.map(normalizeSearchEntry).filter(Boolean);
};

export const clearRecentSearches = () => {
  writeList(SEARCH_KEY, []);
  return [];
};

/**
 * property: { id, name, image, city, url }
 */
export const addRecentlyViewed = (property) => {
  if (!property?.id) return;
  const existing = readList(VIEW_KEY).filter((p) => p.id !== property.id);
  const next = [{ ...property, at: Date.now() }, ...existing].slice(0, MAX_VIEWED);
  writeList(VIEW_KEY, next);
};

export const getRecentlyViewed = () => readList(VIEW_KEY);
