import api from './api';

const JOBS_CACHE_TTL = 15000;
const PERSISTED_JOBS_TTL = 5 * 60 * 1000;
let assignedJobsCache = null;
let pendingRequestsCache = null;
let assignedJobsRequest = null;
let pendingRequestsRequest = null;

const isFresh = (entry) => entry && Date.now() - entry.savedAt < JOBS_CACHE_TTL;
const getCurrentWorkerId = () => {
  try {
    const raw = localStorage.getItem('workerData') || sessionStorage.getItem('workerData');
    const worker = JSON.parse(raw || 'null');
    return String(worker?._id || worker?.id || '');
  } catch {
    return '';
  }
};

const getPersistedAssignedJobs = () => {
  try {
    const jobs = JSON.parse(localStorage.getItem('workerAssignedJobs') || 'null');
    const meta = JSON.parse(localStorage.getItem('workerAssignedJobsMeta') || 'null');
    const workerId = getCurrentWorkerId();
    if (!Array.isArray(jobs) || !workerId || meta?.workerId !== workerId) return null;
    if (Date.now() - Number(meta.savedAt || 0) > PERSISTED_JOBS_TTL) return null;
    return { success: true, data: jobs };
  } catch {
    return null;
  }
};
const clearJobsCache = () => {
  assignedJobsCache = null;
  pendingRequestsCache = null;
};

// Socket/dashboard events mean server state changed; never serve a still-fresh
// cache entry after such an event.
if (typeof window !== 'undefined') {
  window.addEventListener('workerJobsUpdated', clearJobsCache);
}

const workerService = {
  // Profile
  getProfile: async (params) => {
    const response = await api.get('/workers/profile', { params });
    return response.data;
  },

  // Admin-defined professions (e.g. Electrician) a worker can choose from
  getProfessions: async () => {
    const response = await api.get('/workers/professions');
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

  /**
   * Submit worker offline leave request
   */
  // Weekly days + full-day leave calendar
  getMyAvailability: async () => {
    const response = await api.get('/workers/availability');
    return response.data;
  },

  updateMyAvailability: async (data) => {
    const response = await api.put('/workers/availability', data);
    return response.data;
  },

  requestOffline: async (data) => {
    const response = await api.post('/workers/offline-requests', data);
    return response.data;
  },

  /**
   * Get active/pending offline request
   */
  getActiveOfflineRequest: async () => {
    const response = await api.get('/workers/offline-requests/active');
    return response.data;
  },

  /**
   * Cancel pending offline request
   */
  cancelOfflineRequest: async (id) => {
    const response = await api.delete(`/workers/offline-requests/${id}`);
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

  /**
   * Silent SOS — sends an emergency alert to admin. Never places a call.
   */
  sendEmergencyAlert: async (message, location) => {
    const response = await api.post('/workers/emergency', { message, location });
    return response.data;
  },

  // Jobs
  getAssignedJobs: async (params) => {
    if (isFresh(assignedJobsCache)) return assignedJobsCache.data;
    if (assignedJobsRequest) return assignedJobsRequest;
    assignedJobsRequest = api.get('/workers/jobs', { params }).then((response) => {
      assignedJobsCache = { data: response.data, savedAt: Date.now() };
      try {
        localStorage.setItem('workerAssignedJobs', JSON.stringify(response.data?.data || []));
        localStorage.setItem('workerAssignedJobsMeta', JSON.stringify({
          workerId: getCurrentWorkerId(),
          savedAt: Date.now()
        }));
      } catch { /* ignore */ }
      return response.data;
    }).finally(() => { assignedJobsRequest = null; });
    return assignedJobsRequest;
  },

  getJobById: async (id) => {
    const response = await api.get(`/workers/jobs/${id}`);
    return response.data;
  },

  // Job offers still open for this worker (fetch-on-load catch-up for the
  // real-time 'new_booking_request'/'new_job_assigned' socket alert, in case
  // the app wasn't connected yet when it was sent).
  getPendingRequests: async () => {
    if (isFresh(pendingRequestsCache)) return pendingRequestsCache.data;
    if (pendingRequestsRequest) return pendingRequestsRequest;
    pendingRequestsRequest = api.get('/workers/jobs/pending-requests').then((response) => {
      pendingRequestsCache = { data: response.data, savedAt: Date.now() };
      return response.data;
    }).finally(() => { pendingRequestsRequest = null; });
    return pendingRequestsRequest;
  },

  getCachedJobs: () => ({
    assigned: assignedJobsCache?.data || getPersistedAssignedJobs(),
    pending: pendingRequestsCache?.data || null
  }),

  invalidateJobsCache: clearJobsCache,

  prefetchJobs: () => Promise.allSettled([
    workerService.getAssignedJobs({ limit: 100, includeTotal: false }),
    workerService.getPendingRequests()
  ]),

  // Pre-job reminder handshake
  getJobReminders: async () => {
    const response = await api.get('/workers/jobs/reminders');
    return response.data;
  },

  confirmJobReminder: async (id) => {
    const response = await api.post(`/workers/jobs/${id}/confirm-reminder`);
    return response.data;
  },

  // Ask admin to add extra workers to a job
  requestHelper: async (id, { count = 1, reason = '' } = {}) => {
    const response = await api.post(`/workers/jobs/${id}/helper-request`, { count, reason });
    return response.data;
  },

  releaseJob: async (id, reason = '') => {
    const response = await api.post(`/workers/jobs/${id}/release`, { reason });
    clearJobsCache();
    return response.data;
  },

  updateJobStatus: async (id, status, data = {}) => {
    const response = await api.put(`/workers/jobs/${id}/status`, { status, ...data });
    clearJobsCache();
    return response.data;
  },

  startJob: async (id) => {
    const response = await api.post(`/workers/jobs/${id}/start`);
    clearJobsCache();
    return response.data;
  },

  workerReached: async (id) => {
    const response = await api.post(`/workers/jobs/${id}/reached`);
    return response.data;
  },

  completeJob: async (id, data = {}) => {
    const response = await api.post(`/workers/jobs/${id}/complete`, data);
    clearJobsCache();
    return response.data;
  },

  verifyVisit: async (id, otp, location, verification = {}) => {
    const response = await api.post(`/workers/jobs/${id}/visit/verify`, { otp, location, ...verification });
    clearJobsCache();
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

  /**
   * Confirm with the customer's OTP that they've seen & approved the extra
   * items added to the bill so far. Does not close the job — just a gate
   * before letting the worker move on to Review.
   */
  verifyItemsOtp: async (id, otp) => {
    const response = await api.post(`/workers/jobs/${id}/verify-items-otp`, { otp });
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
    clearJobsCache();
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

