import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import WorkerWithdrawals from '../pages/Workers/WorkerWithdrawals';
import ZoneSetup from '../pages/ZoneSetup';

// Lazy load admin pages for code splitting
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Settings = lazy(() => import('../pages/Settings'));
const UserCategories = lazy(() => import('../pages/UserCategories'));
const Users = lazy(() => import('../pages/Users'));
const Workers = lazy(() => import('../pages/Workers'));
const Bookings = lazy(() => import('../pages/Bookings'));
const BookingTracking = lazy(() => import('../pages/Bookings/Tracking'));
const BookingNotifications = lazy(() => import('../pages/Bookings/BookingNotifications'));
const Payments = lazy(() => import('../pages/Payments'));
const Reports = lazy(() => import('../pages/Reports'));
const Notifications = lazy(() => import('../pages/Notifications'));
const AbandonedCarts = lazy(() => import('../pages/Notifications/AbandonedCarts'));
const PushNotifications = lazy(() => import('../pages/Notifications/PushNotifications'));

const Plans = lazy(() => import('../pages/Plans/Plans'));
const WorkerPlans = lazy(() => import('../pages/Plans/WorkerPlans'));
const Scrap = lazy(() => import('../pages/Scrap'));
const Reviews = lazy(() => import('../pages/Reviews'));

// Loading fallback component
import LogoLoader from '../../../components/common/LogoLoader';

const LoadingFallback = () => (
  <LogoLoader />
);

/**
 * Home Service Admin page routes.
 *
 * NOTE: This used to render its own <AdminLayout> (own sidebar/header/login),
 * making it a second, visually separate admin panel. It is now mounted as a
 * nested route *inside* the single, unified `app/admin` AdminLayout (see
 * App.jsx), so it only ever renders these pages into that shared shell.
 * Auth is already handled by the outer <AdminProtectedRoute> in App.jsx —
 * no layout/login/protection duplicated here.
 */
const HomeServiceAdminRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users/*" element={<Users />} />
        <Route path="workers/*" element={<Workers />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="bookings/tracking" element={<BookingTracking />} />
        <Route path="bookings/notifications" element={<BookingNotifications />} />
        <Route path="user-categories/*" element={<UserCategories />} />
        <Route path="payments/*" element={<Payments />} />
        <Route path="reports/*" element={<Reports />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="notifications/abandoned-carts" element={<AbandonedCarts />} />
        <Route path="notifications/push" element={<PushNotifications />} />
        <Route path="scrap" element={<Scrap />} />
        <Route path="plans" element={<Plans />} />
        <Route path="worker-plans" element={<WorkerPlans />} />
        <Route path="workers/withdrawals" element={<WorkerWithdrawals />} />
        <Route path="zones" element={<ZoneSetup />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="settings/*" element={<Settings />} />
      </Routes>
    </Suspense>
  );
};

export default HomeServiceAdminRoutes;
