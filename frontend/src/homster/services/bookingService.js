import api from './api';

/**
 * Booking Service
 * Handles all API calls for Bookings
 */

export const bookingService = {
  // Create a new booking
  create: async (bookingData) => {
    console.log('[BookingService] Creating booking with payload:', JSON.stringify(bookingData, null, 2));
    const response = await api.post('/hs-bookings', bookingData);
    return response.data;
  },

  // Get user bookings with filters
  getUserBookings: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await api.get(`/hs-bookings/my${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    return response.data;
  },

  // Get booking details by ID
  getById: async (id) => {
    const response = await api.get(`/hs-bookings/${id}`);
    return response.data;
  },

  // Cancel booking
  cancel: async (id, cancellationReason) => {
    const response = await api.post(`/hs-bookings/${id}/cancel`, { cancellationReason });
    return response.data;
  },

  // Reschedule booking
  reschedule: async (id, rescheduleData) => {
    const response = await api.put(`/hs-bookings/${id}/reschedule`, rescheduleData);
    return response.data;
  },

  // Add review and rating
  addReview: async (id, reviewData) => {
    const response = await api.post(`/hs-bookings/${id}/review`, reviewData);
    return response.data;
  },

  // Get user ratings and reviews
  getRatings: async (params = {}) => {
    const response = await api.get('/hs-bookings/ratings', { params });
    return response.data;
  },

  // Approve Estimate and pay token
  approveEstimate: async (id) => {
    const response = await api.post(`/hs-bookings/${id}/approve-estimate`);
    return response.data;
  }
};

export default bookingService;


