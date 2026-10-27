import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './homster/context/SocketContext';

const WorkerRoutes = lazy(() => import('./homster/modules/worker/routes/index.jsx'));

const WorkerLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
  </div>
);

/**
 * Lightweight worker-only application shell.
 *
 * The main marketplace App imports user, hotel, partner and admin providers.
 * Loading all of that before a worker route produced hundreds of dev-server
 * module requests and a 30s+ cold start. Worker URLs enter here directly and
 * load only the router, socket provider and worker module.
 */
const WorkerApp = () => {
  // Fix for Back Button in WebView/App Wrappers (Flutter/Android)
  // Ensures history stack has depth so "canGoBack" is true, preventing immediate app exit.
  React.useEffect(() => {
    if (window.history && window.history.length === 1) {
      window.history.pushState(null, document.title, window.location.href);
    }
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-center" reverseOrder={false} />
      <SocketProvider>
        <Suspense fallback={<WorkerLoader />}>
          <Routes>
            <Route path="/worker/*" element={<WorkerRoutes />} />
            <Route path="*" element={<Navigate to="/worker/dashboard" replace />} />
          </Routes>
        </Suspense>
      </SocketProvider>
    </BrowserRouter>
  );
};

export default WorkerApp;
