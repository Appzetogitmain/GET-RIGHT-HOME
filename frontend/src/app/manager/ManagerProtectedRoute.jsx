import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useManagerStore from './store/managerStore';
import { Loader2, ShieldAlert } from 'lucide-react';

const ManagerProtectedRoute = ({ module, action = 'view' }) => {
  const { isAuthenticated, loading, checkAuth, hasPermission } = useManagerStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
        <p className="text-gray-400 font-medium">Verifying Manager Access...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to manager login while saving the attempted location
    return <Navigate to="/manager/login" state={{ from: location }} replace />;
  }

  // Optional: Gate route by specific module and action
  if (module && !hasPermission(module, action)) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100">
          <ShieldAlert className="text-red-600" size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 uppercase">Access Denied</h2>
        <p className="text-gray-500 max-w-md mt-2 text-xs font-bold uppercase tracking-tight">
          You do not have permission to access the "{module}" module. Please contact your administrator to grant access.
        </p>
      </div>
    );
  }

  return <Outlet />;
};

export default ManagerProtectedRoute;
