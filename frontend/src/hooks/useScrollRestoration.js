import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const useScrollRestoration = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Enable the browser's native scroll restoration mechanism
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'auto';
    }

    // Only scroll to top if the user is navigating to a new page (PUSH or REPLACE).
    // If they are going Back (POP), let the browser handle native scroll restoration.
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.search, navigationType]);
};

export default useScrollRestoration;
