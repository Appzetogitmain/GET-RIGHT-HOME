import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Was: trust the browser's native `scrollRestoration = 'auto'` for POP
// (back/forward) and only reset scroll ourselves on PUSH/REPLACE.
//
// That relies on the browser correctly remembering, per history ENTRY, how
// far down that entry was scrolled — which native restoration is built for
// a multi-document site, not an SPA. Here every route is a REPLACE-heavy
// virtual page on top of one real document (13+ `replace` redirects in
// App.jsx alone: role guards, canonical-URL redirects, login bounces, plus
// every `navigate(-1)` back button across the app). A `replace` collapses
// the current history entry into the new URL without clearing the browser's
// separately-tracked scroll-position cache for that stack slot, so the next
// POP into it can restore a stale Y offset left over from whatever long,
// deep-scrolled page occupied that slot before — most visibly landing back
// on Home (short-ish page) scrolled to where a long results list used to be,
// i.e. off the bottom of the actual content. Reported as "back takes me to /
// at the very bottom," reproducible from many different starting pages
// because the cause is this one shared mechanism, not any one page's code.
//
// Fix: stop asking the browser to remember anything, and reset to top on
// every navigation — POP included. This trades away "back restores your
// exact prior scroll depth" for "back never leaves you scrolled to a
// position that has nothing to do with the page you're now looking at."
const useScrollRestoration = () => {
  const location = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);
};

export default useScrollRestoration;
