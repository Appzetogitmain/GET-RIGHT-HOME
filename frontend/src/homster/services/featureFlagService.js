import api from './api';

// All ON by default: if the flags can't be fetched the app behaves as before.
export const DEFAULT_FEATURE_FLAGS = {
  userRazorpay: true,
  workerRazorpay: true,
  userSubscription: true,
  workerSubscription: true
};

export const featureFlagService = {
  // Public: used by the user and worker apps.
  getFlags: async () => {
    const response = await api.get('/public/feature-flags');
    return { ...DEFAULT_FEATURE_FLAGS, ...(response.data?.flags || {}) };
  },
  // Admin
  getAdminFlags: async () => {
    const response = await api.get('/admin/feature-flags');
    return { ...DEFAULT_FEATURE_FLAGS, ...(response.data?.flags || {}) };
  },
  updateAdminFlags: async (patch) => {
    const response = await api.put('/admin/feature-flags', patch);
    return { ...DEFAULT_FEATURE_FLAGS, ...(response.data?.flags || {}) };
  }
};
