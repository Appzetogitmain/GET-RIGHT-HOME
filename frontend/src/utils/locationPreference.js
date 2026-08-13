// Shared "which city am I browsing" preference — read by the persistent top
// nav (so it can show "Buy in Bengaluru" everywhere, not just on the home
// page) and written by the hero search's city picker. Plain localStorage +
// a custom event, since introducing a full context provider just for one
// value isn't worth it here — components that need live updates on the
// same page listen for 'grh-city-changed'.

const KEY = 'grh_selected_city';
const EVENT = 'grh-city-changed';

export const getPreferredCity = () => {
  try {
    return localStorage.getItem(KEY) || 'Bengaluru';
  } catch {
    return 'Bengaluru';
  }
};

export const setPreferredCity = (city) => {
  if (!city) return;
  try {
    localStorage.setItem(KEY, city);
  } catch {
    // localStorage unavailable (private browsing etc.) — degrade silently
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: city }));
};

export const onPreferredCityChange = (handler) => {
  const listener = (e) => handler(e.detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
};
