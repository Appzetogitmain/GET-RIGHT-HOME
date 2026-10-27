import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import PageTransition from '../components/common/PageTransition';
import BottomNav from '../components/layout/BottomNav';
import ErrorBoundary from '../components/common/ErrorBoundary';
import useFeatureFlags from '../../../hooks/useFeatureFlags';
// Removed SocketProvider import since it's now global

// Redirects away from a page whose admin feature switch is OFF.
const FeatureRoute = ({ flag, children }) => {
  const flags = useFeatureFlags();
  return flags[flag] === false ? <Navigate to="/worker/dashboard" replace /> : children;
};

// Worker routes only need a local token check. The shared guards also import
// the complete admin Zustand/auth stack, which is irrelevant here and greatly
// expands the worker app's cold-start module graph.
const hasWorkerSession = () => Boolean(
  (localStorage.getItem('workerAccessToken') || sessionStorage.getItem('workerAccessToken')) &&
  (localStorage.getItem('workerData') || sessionStorage.getItem('workerData'))
);

const WorkerProtectedRoute = ({ children }) => (
  hasWorkerSession() ? children : <Navigate to="/worker/login" replace />
);

const WorkerPublicRoute = ({ children }) => (
  hasWorkerSession() ? <Navigate to="/worker/dashboard" replace /> : children
);

// Lazy load wrapper with error handling
const lazyLoad = (importFunc) => {
  return lazy(() => {
    return Promise.resolve(importFunc()).catch((error) => {
      console.error('Failed to load worker page:', error);
      // Return a fallback component wrapped in a Promise
      return Promise.resolve({
        default: () => (
          <div className="flex items-center justify-center min-h-screen bg-white">
            <div className="text-center p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Failed to load page</h2>
              <p className="text-gray-600 mb-4">Please refresh the page or try again later.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:opacity-90"
                style={{ backgroundColor: '#3B82F6' }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        ),
      });
    });
  });
};

// Lazy load worker pages for code splitting
const Login = lazyLoad(() => import('../pages/login'));
const Signup = lazyLoad(() => import('../pages/signup'));
const Dashboard = lazyLoad(() => import('../pages/Dashboard'));
const AssignedJobs = lazyLoad(() => import('../pages/AssignedJobs'));
const JobDetails = lazyLoad(() => import('../pages/JobDetails'));
const Profile = lazyLoad(() => import('../pages/Profile'));
const EditProfile = lazyLoad(() => import('../pages/Profile/EditProfile'));
const Documents = lazyLoad(() => import('../pages/Documents'));
const Settings = lazyLoad(() => import('../pages/Settings'));
const Notifications = lazyLoad(() => import('../pages/Notifications'));
const JobMap = lazyLoad(() => import('../pages/JobMap'));
const JobTimeline = lazyLoad(() => import('../pages/JobTimeline'));
const Wallet = lazyLoad(() => import('../pages/Wallet'));
const BillingPage = lazyLoad(() => import('../pages/BillingPage'));
const Subscription = lazyLoad(() => import('../pages/Subscription'));
const Training = lazyLoad(() => import('../pages/Training'));
const Support = lazyLoad(() => import('../pages/Support'));
const Referrals = lazyLoad(() => import('../pages/Referrals'));
const Complaints = lazyLoad(() => import('../pages/Complaints'));
const PrivacyPolicy = lazyLoad(() => import('../pages/PrivacyPolicy'));
const LegalDocument = lazyLoad(() => import('../pages/LegalDocument'));
const DigitalId = lazyLoad(() => import('../pages/DigitalId'));
const Availability = lazyLoad(() => import('../pages/Availability'));

// Loading fallback component
import LogoLoader from '../../../components/common/LogoLoader';

const LoadingFallback = () => (
  <LogoLoader />
);

import WorkerLocationGuard from '../components/common/WorkerLocationGuard';

// Background overlays are not required to paint the current page. Keeping
// them lazy prevents their notification/audio/modal dependency trees from
// delaying worker navigation.
const GlobalWorkerJobAlert = lazyLoad(() => import('../components/common/GlobalWorkerJobAlert'));
const JobReminderModal = lazyLoad(() => import('../components/common/JobReminderModal'));

const WorkerRoutes = () => {
  const location = useLocation();

  // Enable global notifications for worker
  // Global notifications are now handled by SocketProvider at App level
  // useAppNotifications('worker');

  // Check if current route should hide bottom nav
  const isAuthenticated = Boolean(
    localStorage.getItem('workerAccessToken') || sessionStorage.getItem('workerAccessToken')
  );
  const shouldHideBottomNav =
    !isAuthenticated ||
    location.pathname === '/worker/login' ||
    location.pathname === '/worker/signup' ||
    location.pathname.endsWith('/map') ||
    location.pathname.includes('/billing');

  const shouldShowBottomNav = !shouldHideBottomNav;

  return (

      <ErrorBoundary>
        {/* Main content area - leaves space for bottom nav when needed */}
        <div className={shouldShowBottomNav ? "pb-24" : ""}>
          <Suspense fallback={<LoadingFallback />}>
            <PageTransition>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<WorkerPublicRoute><Login /></WorkerPublicRoute>} />
                <Route path="/signup" element={<WorkerPublicRoute><Signup /></WorkerPublicRoute>} />

                {/* Protected routes (auth required) */}
                <Route path="/" element={<WorkerProtectedRoute><Navigate to="dashboard" replace /></WorkerProtectedRoute>} />
                <Route path="/dashboard" element={<WorkerProtectedRoute><Dashboard /></WorkerProtectedRoute>} />
                <Route path="/availability" element={<WorkerProtectedRoute><Availability /></WorkerProtectedRoute>} />
                <Route path="/jobs" element={<WorkerProtectedRoute><AssignedJobs /></WorkerProtectedRoute>} />
                <Route path="/job/:id" element={<WorkerProtectedRoute><JobDetails /></WorkerProtectedRoute>} />
                <Route path="/job/:id/map" element={<WorkerProtectedRoute><JobMap /></WorkerProtectedRoute>} />
                <Route path="/job/:id/timeline" element={<WorkerProtectedRoute><JobTimeline /></WorkerProtectedRoute>} />
                <Route path="/job/:id/billing" element={<WorkerProtectedRoute><BillingPage /></WorkerProtectedRoute>} />
                <Route path="/profile" element={<WorkerProtectedRoute><Profile /></WorkerProtectedRoute>} />
                <Route path="/profile/edit" element={<WorkerProtectedRoute><EditProfile /></WorkerProtectedRoute>} />
                <Route path="/documents" element={<WorkerProtectedRoute><Documents /></WorkerProtectedRoute>} />
                <Route path="/settings" element={<WorkerProtectedRoute><Settings /></WorkerProtectedRoute>} />
                <Route path="/notifications" element={<WorkerProtectedRoute><Notifications /></WorkerProtectedRoute>} />
                <Route path="/wallet" element={<WorkerProtectedRoute><Wallet /></WorkerProtectedRoute>} />
                <Route path="/subscription" element={<WorkerProtectedRoute><FeatureRoute flag="workerSubscription"><Subscription /></FeatureRoute></WorkerProtectedRoute>} />
                <Route path="/training" element={<WorkerProtectedRoute><Training /></WorkerProtectedRoute>} />
                <Route path="/support" element={<Support />} />
                <Route path="/referrals" element={<WorkerProtectedRoute><Referrals /></WorkerProtectedRoute>} />
                <Route path="/complaints" element={<WorkerProtectedRoute><Complaints /></WorkerProtectedRoute>} />
                <Route path="/digital-id" element={<WorkerProtectedRoute><DigitalId /></WorkerProtectedRoute>} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/privacy" element={<LegalDocument type="privacy" />} />
                <Route path="/terms" element={<LegalDocument type="terms" />} />
              </Routes>
            </PageTransition>
          </Suspense>
        </div>

        {/* BottomNav is OUTSIDE Suspense so it persists during page loads */}
        {shouldShowBottomNav && <BottomNav />}

        <Suspense fallback={null}><GlobalWorkerJobAlert /></Suspense>
        {/* Logged-in workers must keep device location on */}
        {isAuthenticated && !['/worker/login', '/worker/signup'].includes(location.pathname) && <WorkerLocationGuard />}
        <Suspense fallback={null}><JobReminderModal /></Suspense>
      </ErrorBoundary>

  );
};

export default WorkerRoutes;


