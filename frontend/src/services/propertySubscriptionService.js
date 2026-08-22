import { api } from './apiService';
import { axiosInstance } from '../app/admin/store/adminStore';

/**
 * Client for the new property-level subscription system
 * (`/api/property-subscriptions/*`). Kept separate from the legacy
 * `subscriptionService.js`, which still serves the old account-level plans
 * so existing subscribers on that system keep working untouched.
 */
const propertySubscriptionService = {
  // ── Subscriber (Owner / Broker / Builder — role comes from the token) ────
  getCatalog: async ({ mode, propertyId } = {}) => {
    const params = new URLSearchParams();
    if (mode) params.set('mode', mode);
    if (propertyId) params.set('propertyId', propertyId);
    const qs = params.toString();
    const res = await api.get(`/property-subscriptions/catalog${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  getEligibleProperties: async (mode) => {
    const res = await api.get(`/property-subscriptions/properties?mode=${mode}`);
    return res.data;
  },

  getFeatureCatalog: async (mode) => {
    const res = await api.get(`/property-subscriptions/features${mode ? `?mode=${mode}` : ''}`);
    return res.data;
  },

  createCheckout: async ({ planId, propertyIds }) => {
    const res = await api.post('/property-subscriptions/checkout', { planId, propertyIds });
    return res.data;
  },

  verifyCheckout: async (payload) => {
    const res = await api.post('/property-subscriptions/verify', payload);
    return res.data;
  },

  getMySubscriptions: async ({ mode, status } = {}) => {
    const params = new URLSearchParams();
    if (mode) params.set('mode', mode);
    if (status) params.set('status', status);
    const qs = params.toString();
    const res = await api.get(`/property-subscriptions/mine${qs ? `?${qs}` : ''}`);
    return res.data;
  },

  getPropertyStatus: async (propertyId) => {
    const res = await api.get(`/property-subscriptions/property/${propertyId}/status`);
    return res.data;
  },

  // ── Admin / Manager ──────────────────────────────────────────────────────
  admin: {
    getSummary: async () => (await axiosInstance.get('/property-subscriptions/admin/summary')).data,

    listPlans: async (params = {}) =>
      (await axiosInstance.get('/property-subscriptions/admin/plans', { params })).data,
    createPlan: async (data) => (await axiosInstance.post('/property-subscriptions/admin/plans', data)).data,
    updatePlan: async (id, data) => (await axiosInstance.put(`/property-subscriptions/admin/plans/${id}`, data)).data,
    deactivatePlan: async (id) => (await axiosInstance.delete(`/property-subscriptions/admin/plans/${id}`)).data,

    listFeatures: async () => (await axiosInstance.get('/property-subscriptions/admin/features')).data,
    createFeature: async (data) => (await axiosInstance.post('/property-subscriptions/admin/features', data)).data,
    updateFeature: async (id, data) => (await axiosInstance.put(`/property-subscriptions/admin/features/${id}`, data)).data,
    deleteFeature: async (id) => (await axiosInstance.delete(`/property-subscriptions/admin/features/${id}`)).data,

    listSubscriptions: async (params = {}) =>
      (await axiosInstance.get('/property-subscriptions/admin', { params })).data,

    assign: async (data) => (await axiosInstance.post('/property-subscriptions/admin/assign', data)).data,
    extend: async (id, data) => (await axiosInstance.patch(`/property-subscriptions/admin/${id}/extend`, data)).data,
    cancel: async (id, data) => (await axiosInstance.patch(`/property-subscriptions/admin/${id}/cancel`, data)).data,
    getAudit: async (id) => (await axiosInstance.get(`/property-subscriptions/admin/${id}/audit`)).data,

    searchUsers: async (params = {}) =>
      (await axiosInstance.get('/property-subscriptions/admin/users', { params })).data,
    getUserProperties: async (userId, mode) =>
      (await axiosInstance.get(`/property-subscriptions/admin/users/${userId}/properties${mode ? `?mode=${mode}` : ''}`)).data,
  },
};

export default propertySubscriptionService;
