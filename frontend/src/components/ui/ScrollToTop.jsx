import { useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const action = useNavigationType();

  // We use useLayoutEffect to aggressively hijack the scroll before the browser paints
  useLayoutEffect(() => {
    // 1. Tell browser we are handling our own scroll
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    if (action === 'PUSH' || action === 'REPLACE') {
      // FORWARD NAVIGATION: Start at top exactly
      if (window.lenis) window.lenis.stop();
      
      const goToTop = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (window.lenis) {
            window.lenis.scrollTo(0, { immediate: true });
            window.lenis.start();
        }
      };
      
      goToTop();
      setTimeout(goToTop, 50);

    } else if (action === 'POP') {
      // BACK NAVIGATION: Anchor to exact section if clicked, else restore pixel position
      const lastSectionId = sessionStorage.getItem(`last-clicked-section-${pathname}`);
      const savedPosition = sessionStorage.getItem(`scrollPos-${pathname}`);
      
      if (lastSectionId) {
        // --- ELEMENT ANCHOR LOGIC ---
        let attempts = 0;
        let success = false;

        const tryScrollToElement = () => {
          if (success) return;
          const el = document.getElementById(lastSectionId);
          if (el) {
            if (window.lenis) window.lenis.stop();
            // Scroll to the element, offset by 80px for header
            const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80);
            window.scrollTo({ top: y, left: 0, behavior: 'instant' });
            if (window.lenis) {
              window.lenis.scrollTo(y, { immediate: true });
              window.lenis.start();
            }
            success = true; // We found it and scrolled!
          }
        };

        tryScrollToElement();
        [50, 150, 300, 600].forEach(time => setTimeout(tryScrollToElement, time));

        // Use ResizeObserver to keep the camera locked on the section while skeletons load
        const observer = new ResizeObserver(() => {
          if (attempts < 30) {
            attempts++;
            const el = document.getElementById(lastSectionId);
            if (el) {
                const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80);
                // Only scroll if there is a meaningful shift (prevent micro-jitter)
                if (Math.abs(window.scrollY - y) > 5) {
                    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
                    if (window.lenis) {
                        window.lenis.scrollTo(y, { immediate: true });
                    }
                }
            }
          }
        });
        
        observer.observe(document.body);
        setTimeout(() => observer.disconnect(), 2500);

      } else if (savedPosition) {
        // --- FALLBACK PIXEL LOGIC ---
        const targetPos = parseInt(savedPosition, 10);
        let attempts = 0;
        let success = false;

        const tryRestore = () => {
          if (success) return;
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const posToScroll = Math.min(targetPos, maxScroll);
          
          if (window.lenis) window.lenis.stop();
          window.scrollTo({ top: posToScroll, left: 0, behavior: 'instant' });
          if (window.lenis) {
            window.lenis.scrollTo(posToScroll, { immediate: true });
            window.lenis.start();
          }

          if (maxScroll >= targetPos - 10) success = true;
        };

        tryRestore();
        [50, 150, 300, 600].forEach(time => setTimeout(tryRestore, time));

        const observer = new ResizeObserver(() => {
          if (!success && attempts < 20) {
            attempts++;
            tryRestore();
          }
        });
        observer.observe(document.body);
        setTimeout(() => observer.disconnect(), 2500);
      }
    }
  }, [pathname, action]);

  useEffect(() => {
    // 1. Vertical Scroll tracker
    const handleScroll = () => {
      const currentPos = window.lenis ? window.lenis.scroll : window.scrollY;
      sessionStorage.setItem(`scrollPos-${pathname}`, (currentPos || 0).toString());
      sessionStorage.setItem(`scrollHeight-${pathname}`, document.documentElement.scrollHeight.toString());
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
            // Save it specific to the current page path so back nav knows where to go
            sessionStorage.setItem(`last-clicked-section-${pathname}`, section.id);
        }
    };
    window.addEventListener('click', clickTracker, true); // use capture phase

    return () => {
      clearTimeout(scrollTimeout);
      if (window.lenis) window.lenis.off('scroll', onScrollHandler);
      window.removeEventListener('scroll', onScrollHandler);
      window.removeEventListener('click', clickTracker, true);
    };
  }, [pathname]);

  return null;
};

export default ScrollToTop;
