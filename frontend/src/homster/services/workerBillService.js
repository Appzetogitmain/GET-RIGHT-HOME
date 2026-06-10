import api from './api';

/**
 * Worker Bill Service
 * Handles final billing by workers using catalog items and custom items
 */
const workerBillService = {
  /**
   * Create or Update a bill for a job
   */
  createOrUpdateBill: async (jobId, billData) => {
    const response = await api.post(`/workers/jobs/${jobId}/bill`, billData);
    return response.data;
  },

  /**
   * Get bill details for a job
   */
  getBill: async (jobId) => {
    const response = await api.get(`/workers/jobs/${jobId}/bill`);
    return response.data;
  },

  /**
   * Get service catalog for billing
   */
  getServiceCatalog: async () => {
    try {
      const response = await api.get('/public/services');
      return { success: true, services: response.data.services || response.data.data || [] };
    } catch (e) {
      return { success: false, services: [] };
    }
  },

  /**
   * Get parts catalog for billing
   */
  getPartsCatalog: async () => {
    // Currently no dedicated parts catalog, workers use custom items for parts
    return { success: true, parts: [] };
  }
};

export default workerBillService;

