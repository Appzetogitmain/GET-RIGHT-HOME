import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  const action = useNavigationType();
  const locationKey = `${pathname}${search}`;
  const isFirstRunRef = useRef(true);

  useLayoutEffect(() => {
    // 1. Tell browser we are handling manual scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    if (action === 'PUSH' || action === 'REPLACE') {
      // Forward Navigation: Scroll to top immediately
      const goToTop = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (window.lenis) {
          window.lenis.scrollTo(0, { immediate: true });
        }
      };
      goToTop();
      setTimeout(goToTop, 30);
      setTimeout(goToTop, 100);
    } else if (action === 'POP') {
      // Back Navigation: Restore previous scroll position or target element
      // The un-keyed "last-*" values describe the most recent click anywhere in
      // the app, so they are only meaningful if that click was on THIS page —
      // otherwise a stale card/section from another visit would win and yank
      // the user to the wrong spot.
      const globalIsOurs = sessionStorage.getItem('last-page-locationKey') === locationKey;
      const lastElementId = sessionStorage.getItem(`last-clicked-id-${locationKey}`) || (globalIsOurs ? sessionStorage.getItem('last-clicked-card-id') : null);
      const lastSectionId = sessionStorage.getItem(`last-clicked-section-${locationKey}`) || (globalIsOurs ? sessionStorage.getItem('last-clicked-section-id') : null);
      const savedPosition = sessionStorage.getItem(`scrollPos-${locationKey}`) || (globalIsOurs ? sessionStorage.getItem('last-page-scrollPos') : null);

      const isReload =
        isFirstRunRef.current &&
        performance.getEntriesByType('navigation')[0]?.type === 'reload';

      if (!isReload && (lastElementId || lastSectionId || savedPosition)) {
        let userInteracted = false;
        let restorationFinished = false;

        const abortLock = () => {
          userInteracted = true;
          if (observer) observer.disconnect();
        };

        window.addEventListener('wheel', abortLock, { passive: true, once: true });
        window.addEventListener('touchstart', abortLock, { passive: true, once: true });
        window.addEventListener('pointerdown', abortLock, { passive: true, once: true });
        window.addEventListener('keydown', abortLock, { passive: true, once: true });

        const performRestoration = () => {
          if (userInteracted || restorationFinished) return;

          // Priority 1: Specific clicked card element
          if (lastElementId) {
            const el = document.getElementById(lastElementId);
            if (el) {
              const rect = el.getBoundingClientRect();
              const offsetTop = rect.top + window.scrollY - 90;
              window.scrollTo({ top: Math.max(0, offsetTop), left: 0, behavior: 'instant' });
              if (window.lenis) window.lenis.scrollTo(Math.max(0, offsetTop), { immediate: true });
              restorationFinished = true;
              return;
            }
          }

          // Priority 2: Containing section
          if (lastSectionId) {
            const sec = document.getElementById(lastSectionId);
            if (sec) {
              const rect = sec.getBoundingClientRect();
              const offsetTop = rect.top + window.scrollY - 70;
              window.scrollTo({ top: Math.max(0, offsetTop), left: 0, behavior: 'instant' });
              if (window.lenis) window.lenis.scrollTo(Math.max(0, offsetTop), { immediate: true });
              restorationFinished = true;
              return;
            }
          }

          // Priority 3: Pixel Scroll Position
          if (savedPosition) {
            const targetPos = parseInt(savedPosition, 10);
            if (!isNaN(targetPos) && targetPos > 0) {
              const maxScroll = Math.max(
                0,
                document.documentElement.scrollHeight - window.innerHeight
              );

              if (maxScroll >= targetPos - 50) {
                window.scrollTo({ top: targetPos, left: 0, behavior: 'instant' });
                if (window.lenis) window.lenis.scrollTo(targetPos, { immediate: true });
                restorationFinished = true;
                return;
              } else if (maxScroll > 0) {
                // Scroll as far down as currently rendered content allows while waiting for more data
                window.scrollTo({ top: Math.min(targetPos, maxScroll), left: 0, behavior: 'instant' });
                if (window.lenis) window.lenis.scrollTo(Math.min(targetPos, maxScroll), { immediate: true });
              }
            }
          }
        };

        // Run immediately and across key render intervals
        performRestoration();
        const intervals = [30, 80, 150, 300, 500, 800, 1200, 1800, 2500];
        intervals.forEach(t => setTimeout(performRestoration, t));

        // Use ResizeObserver to restore as dynamic content/sections render
        const observer = new ResizeObserver(() => {
          if (!userInteracted && !restorationFinished) {
            performRestoration();
          }
        });

        observer.observe(document.body);
        if (document.documentElement) observer.observe(document.documentElement);

        setTimeout(() => {
          observer.disconnect();
          window.removeEventListener('wheel', abortLock);
          window.removeEventListener('touchstart', abortLock);
          window.removeEventListener('pointerdown', abortLock);
          window.removeEventListener('keydown', abortLock);
        }, 10000);
      }
    }

    isFirstRunRef.current = false;
  }, [locationKey, action]);

  useEffect(() => {
    let isRestoring = true;
    setTimeout(() => { isRestoring = false; }, 600);

    // While the side menu / a modal is open the body is pinned with
    // position:fixed; top:-Ypx, which makes window.scrollY read 0. The real
    // position is the pinned offset, so read that instead of saving a bogus 0.
    const readScroll = () => {
      if (document.body.style.position === 'fixed') {
        const pinned = parseInt(document.body.style.top || '0', 10);
        return Math.abs(Number.isNaN(pinned) ? 0 : pinned);
      }
      return window.lenis ? window.lenis.scroll : window.scrollY;
    };

    const saveCurrentScroll = () => {
      if (isRestoring) return;
      sessionStorage.setItem(`scrollPos-${locationKey}`, Math.round(readScroll() || 0).toString());
    };

    let scrollTimeout;
    const onScrollHandler = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(saveCurrentScroll, 50);
    };

    if (window.lenis) window.lenis.on('scroll', onScrollHandler);
    window.addEventListener('scroll', onScrollHandler, { passive: true });

    // Global Click Tracker to save clicked element ID, section ID, and current scroll immediately
    const clickTracker = (e) => {
      const scrollVal = Math.round(readScroll() || 0).toString();
      sessionStorage.setItem(`scrollPos-${locationKey}`, scrollVal);
      sessionStorage.setItem('last-page-scrollPos', scrollVal);
      sessionStorage.setItem('last-page-locationKey', locationKey);

      // Check for card item ID
      const itemEl = e.target.closest('[id^="property-"], [id^="broker-"], [id^="builder-"], [id^="reel-"], [id^="video-"]');
      if (itemEl && itemEl.id) {
        sessionStorage.setItem(`last-clicked-id-${locationKey}`, itemEl.id);
        sessionStorage.setItem('last-clicked-card-id', itemEl.id);
      } else {
        // Clicked something that isn't a card (e.g. a side-menu item): forget the
        // old card so "back" returns to where the user actually was.
        sessionStorage.removeItem(`last-clicked-id-${locationKey}`);
        sessionStorage.removeItem('last-clicked-card-id');
      }

      // Check for section container ID
      const section = e.target.closest('[id*="section"]');
      if (section && section.id) {
        sessionStorage.setItem(`last-clicked-section-${locationKey}`, section.id);
        sessionStorage.setItem('last-clicked-section-id', section.id);
      } else {
        sessionStorage.removeItem(`last-clicked-section-${locationKey}`);
        sessionStorage.removeItem('last-clicked-section-id');
      }
    };

    window.addEventListener('click', clickTracker, true);
    window.addEventListener('beforeunload', saveCurrentScroll);

    return () => {
      clearTimeout(scrollTimeout);
      if (window.lenis) window.lenis.off('scroll', onScrollHandler);
      window.removeEventListener('scroll', onScrollHandler);
      window.removeEventListener('click', clickTracker, true);
      window.removeEventListener('beforeunload', saveCurrentScroll);
    };
  }, [locationKey]);

  return null;
};

export default ScrollToTop;
