// Navigates back if there's real browser history to return to, otherwise
// falls back to a safe default route. Plain navigate(-1) breaks when a page
// is opened via a direct/shared deep link or a push notification, since
// there's nothing behind it in history.
//
// The very first page a browser tab ever loads already makes
// window.history.length === 2 (the blank tab counts as entry 1), so that's
// the length for BOTH a fresh deep link and a normal first load of the app.
// A meaningful in-app "previous page" only exists once at least one more
// client-side navigation has happened on top of that, i.e. length > 2.
export const goBackOrHome = (navigate, fallback = '/') => {
  if (window.history.length > 2) {
    navigate(-1);
  } else {
    navigate(fallback);
  }
};
