import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const useScrollRestoration = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // If navigation type is POP (e.g. Back button), restore scroll position
    if (navigationType === 'POP') {
      const scrollY = sessionStorage.getItem(`scrollPos_${location.pathname}`);
      if (scrollY) {
        // Small timeout to allow DOM to render before scrolling
        setTimeout(() => {
          window.scrollTo(0, parseInt(scrollY, 10));
        }, 0);
      }
    } else {
      // If it's a PUSH or REPLACE, we usually want to scroll to top
      window.scrollTo(0, 0);
    }

    // Save the current scroll position before the component unmounts or navigates away
    const handleScroll = () => {
      sessionStorage.setItem(`scrollPos_${location.pathname}`, window.scrollY.toString());
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname, navigationType]);
};

export default useScrollRestoration;
