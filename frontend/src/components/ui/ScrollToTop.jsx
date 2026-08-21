import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  const action = useNavigationType();

  // Scroll state is keyed on the FULL url, not just the path.
  //
  // Searching and filtering only change the query string — /search?areas=Indore
  // to /search?areas=Pune is the same pathname. Keying on pathname alone meant
  // the effect never re-ran for a new search, so the page kept the old scroll
  // offset and a fresh result list opened halfway down (or at the very bottom
  // on mobile, where lists are much taller). It also made every query on a
  // route share one saved position, so "back" could restore an offset that
  // belonged to a completely different result set.
  const locationKey = `${pathname}${search}`;

  // `performance.getEntriesByType('navigation')[0].type` describes how the
  // DOCUMENT loaded and keeps saying "reload" for the rest of the session.
  // Checking it on every POP meant that after a single refresh, back-button
  // restoration stayed broken until a full re-navigation. Only the first run
  // after mount can be a reload.
  const isFirstRunRef = useRef(true);

  // We use useLayoutEffect to aggressively hijack the scroll before the browser paints
  useLayoutEffect(() => {
    // 1. Tell browser we are handling our own scroll
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    if (action === 'PUSH' || action === 'REPLACE') {
      // FORWARD NAVIGATION: Start at top exactly
      
      const goToTop = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (window.lenis) {
            window.lenis.scrollTo(0, { immediate: true });
        }
      };
      
      goToTop();
      setTimeout(goToTop, 50);

    } else if (action === 'POP') {
      const lastSectionId = sessionStorage.getItem(`last-clicked-section-${locationKey}`);
      const savedPosition = sessionStorage.getItem(`scrollPos-${locationKey}`);

      // Instantly wipe memory so a refresh never triggers this twice
      if (lastSectionId) sessionStorage.removeItem(`last-clicked-section-${locationKey}`);

      const isReload =
        isFirstRunRef.current &&
        performance.getEntriesByType('navigation')[0]?.type === 'reload';

      if (lastSectionId) {
        // --- ELEMENT ANCHOR LOGIC ---
        let attempts = 0;
        let success = false;

        const tryScrollToElement = () => {
          if (success) return;
          const el = document.getElementById(lastSectionId);
          if (el) {
            if (Math.abs(el.getBoundingClientRect().top - 80) > 5) {
                if (window.lenis) {
                    window.lenis.scrollTo(el, { offset: -80, immediate: true });
                } else {
                    const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80);
                    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
                }
            }
            success = true; // We found it and scrolled!
          }
        };

        tryScrollToElement();
        [50, 150, 300, 600].forEach(time => setTimeout(tryScrollToElement, time));

        let userInteracted = false;
        const abortLock = () => { userInteracted = true; observer.disconnect(); };
        window.addEventListener('wheel', abortLock, { passive: true, once: true });
        window.addEventListener('touchstart', abortLock, { passive: true, once: true });
        window.addEventListener('click', abortLock, { passive: true, once: true });

        // Use ResizeObserver to keep the camera locked on the section while skeletons load
        const observer = new ResizeObserver(() => {
          if (userInteracted) return;
          if (attempts < 50) {
            attempts++;
            const el = document.getElementById(lastSectionId);
            if (el) {
                if (Math.abs(el.getBoundingClientRect().top - 80) > 5) {
                    if (window.lenis) {
                        window.lenis.scrollTo(el, { offset: -80, immediate: true });
                    } else {
                        const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80);
                        window.scrollTo({ top: y, left: 0, behavior: 'instant' });
                    }
                }
            }
          }
        });
        
        observer.observe(document.body);
        setTimeout(() => {
            observer.disconnect();
            window.removeEventListener('wheel', abortLock);
            window.removeEventListener('touchstart', abortLock);
            window.removeEventListener('click', abortLock);
        }, 8000);

      } else if (savedPosition && !isReload) {
        // --- FALLBACK PIXEL LOGIC (Only for back-button, not refresh) ---
        const targetPos = parseInt(savedPosition, 10);
        let attempts = 0;
        let success = false;

        let userInteracted = false;
        const abortLock = () => { userInteracted = true; observer.disconnect(); };
        window.addEventListener('wheel', abortLock, { passive: true, once: true });
        window.addEventListener('touchstart', abortLock, { passive: true, once: true });
        window.addEventListener('click', abortLock, { passive: true, once: true });

        const tryRestore = () => {
          if (success) return;
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const posToScroll = Math.min(targetPos, maxScroll);
          
          const currentPos = window.lenis ? window.lenis.scroll : window.scrollY;
          if (Math.abs(currentPos - posToScroll) > 5) {
              window.scrollTo({ top: posToScroll, left: 0, behavior: 'instant' });
              if (window.lenis) {
                window.lenis.scrollTo(posToScroll, { immediate: true });
              }
          }

          if (maxScroll >= targetPos - 10) success = true;
        };

        tryRestore();
        [50, 150, 300, 600].forEach(time => setTimeout(tryRestore, time));

        const observer = new ResizeObserver(() => {
          if (userInteracted) return;
          if (!success && attempts < 50) {
            attempts++;
            tryRestore();
          }
        });
        observer.observe(document.body);
        setTimeout(() => {
            observer.disconnect();
            window.removeEventListener('wheel', abortLock);
            window.removeEventListener('touchstart', abortLock);
            window.removeEventListener('click', abortLock);
        }, 8000);
      }
    }

    isFirstRunRef.current = false;
  }, [locationKey, action]);

  useEffect(() => {
    // Prevent saving scroll state during the chaotic first second of mount/restoration
    let isRestoring = true;
    setTimeout(() => isRestoring = false, 1000);

    // 1. Vertical Scroll tracker
    const handleScroll = () => {
      if (isRestoring) return;
      const currentPos = window.lenis ? window.lenis.scroll : window.scrollY;
      sessionStorage.setItem(`scrollPos-${locationKey}`, (currentPos || 0).toString());
    };

    let scrollTimeout;
    const onScrollHandler = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    };

    if (window.lenis) window.lenis.on('scroll', onScrollHandler);
    window.addEventListener('scroll', onScrollHandler, { passive: true });

    // 2. Global Click Tracker to save section ID
    const clickTracker = (e) => {
        // Find the closest parent that has an ID containing 'section'
        const section = e.target.closest('[id*="section"]');
        if (section && section.id) {
            // Save it specific to the current URL so back nav knows where to go
            sessionStorage.setItem(`last-clicked-section-${locationKey}`, section.id);
        }
    };
    window.addEventListener('click', clickTracker, true); // use capture phase

    return () => {
      clearTimeout(scrollTimeout);
      if (window.lenis) window.lenis.off('scroll', onScrollHandler);
      window.removeEventListener('scroll', onScrollHandler);
      window.removeEventListener('click', clickTracker, true);
    };
  }, [locationKey]);

  return null;
};

export default ScrollToTop;
