import api from './api';

const workerService = {
  // Profile
  getProfile: async () => {
    const response = await api.get('/workers/profile');
    return response.data;
  },

  getReferrals: async () => {
    const response = await api.get('/workers/referrals');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/workers/profile', profileData);
    return response.data;
  },

  updateLocation: async (lat, lng) => {
    return api.put('/workers/profile/location', { lat, lng });
  },

  toggleOnline: async (isOnline, lat, lng) => {
    const response = await api.post('/workers/toggle-online', { isOnline, lat, lng });
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await api.get('/workers/stats');
    return response.data;
  },

  getPublicSettings: async () => {
    const response = await api.get('/workers/public-settings');
    return response.data;
  },

  // Jobs
  getAssignedJobs: async (params) => {
    const response = await api.get('/workers/jobs', { params });
    return response.data;
  },

  getJobById: async (id) => {
    const response = await api.get(`/workers/jobs/${id}`);
    return response.data;
  },

  // Job offers still open for this worker (fetch-on-load catch-up for the
  // real-time 'new_booking_request'/'new_job_assigned' socket alert, in case
  // the app wasn't connected yet when it was sent).
  getPendingRequests: async () => {
    const response = await api.get('/workers/jobs/pending-requests');
    return response.data;
  },

  updateJobStatus: async (id, status, data = {}) => {
    const response = await api.put(`/workers/jobs/${id}/status`, { status, ...data });
    return response.data;
  },

  startJob: async (id) => {
    const response = await api.post(`/workers/jobs/${id}/start`);
    return response.data;
  },

  workerReached: async (id) => {
    const response = await api.post(`/workers/jobs/${id}/reached`);
    return response.data;
  },

  completeJob: async (id, data = {}) => {
    const response = await api.post(`/workers/jobs/${id}/complete`, data);
    return response.data;
  },

  verifyVisit: async (id, otp, location) => {
    const response = await api.post(`/workers/jobs/${id}/visit/verify`, { otp, location });
    return response.data;
  },

  initiateCashCollection: async (id, totalAmount, extraItems = []) => {
    const response = await api.post(`/workers/jobs/${id}/payment/initiate-cash`, {
      amount: totalAmount,
      extraItems
    });
    return response.data;
  },

  initiateOnlineCollection: async (id, totalAmount, extraItems = []) => {
    const response = await api.post(`/bookings/cash/${id}/initiate-online`, {
      totalAmount,
      extraItems
    });
    return response.data;
  },

  /**
   * Verify online collection (QR) and finalize
   */
  verifyOnlineCollection: async (id) => {
    const response = await api.post(`/bookings/cash/${id}/verify-online`);
    return response.data;
  },

  collectCash: async (id, otp, amount, extraItems = []) => {
    const response = await api.post(`/workers/jobs/${id}/payment/collect`, {
      otp,
      amount,
      extraItems
    });
    return response.data;
  },

  addJobNotes: async (id, notes) => {
    const response = await api.post(`/workers/jobs/${id}/notes`, { notes });
    return response.data;
  },

  respondToJob: async (id, status) => {
    const response = await api.put(`/workers/jobs/${id}/respond`, { status });
    return response.data;
  },

  // Notifications
  getNotifications: async (params) => {
    const response = await api.get('/notifications/worker', { params });
    return response.data;
  },

  markNotificationAsRead: async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  markAllNotificationsAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  deleteNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },

  deleteAllNotifications: async () => {
    const response = await api.delete('/notifications/delete-all');
    return response.data;
  },

  getSubscriptionStatus: async () => {
    const response = await api.get('/workers/subscription/status');
    return response.data;
  },

  testPushNotification: async () => {
    const response = await api.post('/workers/fcm-tokens/test');
    return response.data;
  },

  generateEstimate: async (jobId, data) => {
    const response = await api.patch(`/workers/jobs/${jobId}/estimate`, data);
    return response.data;
  },

  getComplaints: async () => {
    const response = await api.get('/workers/complaints');
    return response.data;
  },

  createComplaint: async (data) => {
    const response = await api.post('/workers/complaints', data);
    return response.data;
  }
};

export default workerService;

