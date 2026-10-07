import api from './api';

const unwrap = async (promise, fallback) => {
  try {
    const res = await promise;
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: fallback };
  }
};

// Estimate-based services (Home Painting ...): visit booking, worker rate card, admin pricing.
export const estimateService = {
  // customer
  getVisitConfig: (categoryId) => unwrap(api.get('/estimates/config', { params: { categoryId } }), 'Could not load this service'),
  bookVisit: (payload) => unwrap(api.post('/estimates/book-visit', payload), 'Could not book the visit'),
  rejectEstimate: (bookingId, reason) => unwrap(api.post(`/estimates/${bookingId}/reject`, { reason }), 'Could not decline the estimate'),

  // worker
  getOptions: (jobId) => unwrap(api.get(`/workers/jobs/${jobId}/estimate-options`), 'Could not load the rate card'),

  // admin
  adminCategories: () => unwrap(api.get('/admin/estimates/categories'), 'Could not load categories'),
  adminItems: (categoryId) => unwrap(api.get('/admin/estimates/items', { params: { categoryId } }), 'Could not load the rate card'),
  adminCreateItem: (data) => unwrap(api.post('/admin/estimates/items', data), 'Could not add the line'),
  adminUpdateItem: (id, data) => unwrap(api.put(`/admin/estimates/items/${id}`, data), 'Could not update the line'),
  adminDeleteItem: (id) => unwrap(api.delete(`/admin/estimates/items/${id}`), 'Could not delete the line'),
  adminSeed: (categoryId) => unwrap(api.post('/admin/estimates/items/seed', { categoryId }), 'Could not load the sample'),
  adminRule: (categoryId) => unwrap(api.get('/admin/estimates/rule', { params: { categoryId } }), 'Could not load settings'),
  adminSaveRule: (data) => unwrap(api.put('/admin/estimates/rule', data), 'Could not save settings'),
  adminBookings: (categoryId) => unwrap(api.get('/admin/estimates/bookings', { params: { categoryId } }), 'Could not load estimates')
};

export default estimateService;
