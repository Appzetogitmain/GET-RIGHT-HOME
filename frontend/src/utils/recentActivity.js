// "Recent searches" and "recently viewed properties" — tracked entirely
// client-side in localStorage so it works for guests too (matches how
// sites like 99acres show recent activity before you've ever logged in).
// Logged-in users get this for free on this device; syncing it server-side
// per account is a separate, later step if that's ever needed.

const SEARCH_KEY = 'grh_recent_searches';
const VIEW_KEY = 'grh_recently_viewed';
const MAX_SEARCHES = 5;
const MAX_VIEWED = 8;

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
 * entry: { label: string, url: string }
 * e.g. { label: 'Buy in Indore', url: '/search?areas=Indore&transactionType=buy' }
 */
export const addRecentSearch = (entry) => {
  if (!entry?.label || !entry?.url) return;
  const existing = readList(SEARCH_KEY).filter((s) => s.label !== entry.label);
  const next = [{ ...entry, at: Date.now() }, ...existing].slice(0, MAX_SEARCHES);
  writeList(SEARCH_KEY, next);
};

export const getRecentSearches = () => readList(SEARCH_KEY);

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
