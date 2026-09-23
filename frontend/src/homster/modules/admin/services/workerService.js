import api from '../../../services/api';

/**
 * Admin Worker Service
 * Handles all admin worker management API calls
 */

/**
 * Get all workers with filters and pagination
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Workers data
 */
export const getAllWorkers = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.approvalStatus) queryParams.append('approvalStatus', params.approvalStatus);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await api.get(`/admin/workers?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching workers:', error);
    throw error;
  }
};

/**
 * Get worker details by ID
 * @param {string} id - Worker ID
 * @returns {Promise<Object>} Worker details
 */
export const getWorkerDetails = async (id) => {
  try {
    const response = await api.get(`/admin/workers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching worker details:', error);
    throw error;
  }
};

/**
 * Approve worker registration
 * @param {string} id - Worker ID
 * @returns {Promise<Object>} Approval result
 */
export const approveWorker = async (id) => {
  try {
    const response = await api.post(`/admin/workers/${id}/approve`);
    return response.data;
  } catch (error) {
    console.error('Error approving worker:', error);
    throw error;
  }
};

/**
 * Reject worker registration
 * @param {string} id - Worker ID
 * @param {string} reason - Rejection reason (optional)
 * @returns {Promise<Object>} Rejection result
 */
export const rejectWorker = async (id, reason = '') => {
  try {
    const response = await api.post(`/admin/workers/${id}/reject`, { reason });
    return response.data;
  } catch (error) {
    console.error('Error rejecting worker:', error);
    throw error;
  }
};

/**
 * Suspend worker
 * @param {string} id - Worker ID
 * @returns {Promise<Object>} Suspension result
 */
export const suspendWorker = async (id) => {
  try {
    const response = await api.post(`/admin/workers/${id}/suspend`);
    return response.data;
  } catch (error) {
    console.error('Error suspending worker:', error);
    throw error;
  }
};

/**
 * Get worker jobs
 * @param {string} id - Worker ID
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Worker jobs
 */
export const getWorkerJobs = async (id, params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await api.get(`/admin/workers/${id}/jobs?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching worker jobs:', error);
    throw error;
  }
};

/**
 * Get worker earnings
 * @param {string} id - Worker ID
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Worker earnings
 */
export const getWorkerEarnings = async (id, params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const response = await api.get(`/admin/workers/${id}/earnings?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching worker earnings:', error);
    throw error;
  }
};

/**
 * Pay worker manually
 * @param {string} id - Worker ID
 * @param {Object} data - Payment data { amount, reference, notes }
 * @returns {Promise<Object>} Payment result
 */
export const payWorker = async (id, data) => {
  try {
    const response = await api.post(`/admin/workers/${id}/pay`, data);
    return response.data;
  } catch (error) {
    console.error('Error paying worker:', error);
    throw error;
  }
};

/**
 * Get all worker offline requests with filters
 */
export const getOfflineRequests = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await api.get(`/admin/workers/offline-requests?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching offline requests:', error);
    throw error;
  }
};

/**
 * Approve offline request (with optional adjusted slots)
 */
export const approveOfflineRequest = async (id, data = {}) => {
  try {
    const response = await api.post(`/admin/workers/offline-requests/${id}/approve`, data);
    return response.data;
  } catch (error) {
    console.error('Error approving offline request:', error);
    throw error;
  }
};

/**
 * Reject offline request
 */
export const rejectOfflineRequest = async (id, reason) => {
  try {
    const response = await api.post(`/admin/workers/offline-requests/${id}/reject`, { reason });
    return response.data;
  } catch (error) {
    console.error('Error rejecting offline request:', error);
    throw error;
  }
};

/**
 * Adjust offline request time
 */
export const adjustOfflineRequestTime = async (id, data) => {
  try {
    const response = await api.patch(`/admin/workers/offline-requests/${id}/adjust-time`, data);
    return response.data;
  } catch (error) {
    console.error('Error adjusting offline request time:', error);
    throw error;
  }
};

/**
 * Force worker online immediately
 */
export const forceWorkerOnline = async (workerId) => {
  try {
    const response = await api.post(`/admin/workers/${workerId}/force-online`);
    return response.data;
  } catch (error) {
    console.error('Error forcing worker online:', error);
    throw error;
  }
};

export default {
  getAllWorkers,
  getWorkerDetails,
  approveWorker,
  rejectWorker,
  suspendWorker,
  getWorkerJobs,
  getWorkerEarnings,
  payWorker,
  getOfflineRequests,
  approveOfflineRequest,
  rejectOfflineRequest,
  adjustOfflineRequestTime,
  forceWorkerOnline
};

