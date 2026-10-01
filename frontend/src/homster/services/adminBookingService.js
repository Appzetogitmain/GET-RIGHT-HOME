import api from './api';

export const adminBookingService = {
  // Get all bookings with filters and search
  getAllBookings: async (params) => {
    try {
      const response = await api.get('/admin/workers/jobs', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch bookings' };
    }
  },

  // Get booking details by ID
  getBookingById: async (id) => {
    try {
      const response = await api.get(`/admin/workers/jobs/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch booking details' };
    }
  },

  // Get booking analytics
  getAnalytics: async (filters = {}) => {
    try {
      const response = await api.get('/admin/bookings/analytics', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch analytics' };
    }
  },

  // Cancel booking
  cancelBooking: async (id, reason) => {
    try {
      const response = await api.post(`/admin/bookings/${id}/cancel`, { cancellationReason: reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to cancel booking' };
    }
  },

  // Take the booking from its current worker and offer it to everyone else again
  rebroadcastBooking: async (jobId, reason = '') => {
    try {
      const response = await api.post(`/admin/workers/jobs/${jobId}/rebroadcast`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to re-broadcast booking' };
    }
  },

  // Extra workers on a job (admin sees what each helper earns)
  getHelpers: async (jobId) => {
    try {
      const response = await api.get(`/admin/workers/jobs/${jobId}/helpers`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to load helpers' };
    }
  },

  addHelper: async (jobId, workerId, payoutAmount, override = false) => {
    try {
      const response = await api.post(`/admin/workers/jobs/${jobId}/helpers`, { workerId, payoutAmount, override });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add helper' };
    }
  },

  removeHelper: async (jobId, workerId) => {
    try {
      const response = await api.delete(`/admin/workers/jobs/${jobId}/helpers/${workerId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to remove helper' };
    }
  },

  rejectHelperRequest: async (jobId, requestId, note = '') => {
    try {
      const response = await api.post(`/admin/workers/jobs/${jobId}/helper-requests/${requestId}/reject`, { note });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to decline the request' };
    }
  },

  // Assign worker manually
  assignWorker: async (jobId, workerId, override = false) => {
    try {
      const response = await api.post(`/admin/workers/jobs/${jobId}/assign`, { workerId, override });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to assign worker' };
    }
  }
};

