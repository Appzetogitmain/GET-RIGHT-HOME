import React, { cloneElement } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PageTransition - Provides smooth page transitions without blocking navigation
 * Uses simple opacity fade for fast, non-intrusive page changes
 */
const PageTransition = ({ children }) => {
  const location = useLocation();

  return (
    <div>
      {cloneElement(children, { location })}
    </div>
  );
};

export default PageTransition;

