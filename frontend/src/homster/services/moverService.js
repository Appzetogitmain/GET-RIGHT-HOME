import api from './api';

const unwrap = async (promise, fallback) => {
  try {
    const res = await promise;
    return res.data;
  } catch (error) {
    throw error.response?.data || { message: fallback };
  }
};

// Packers & Movers: customer wizard + admin configuration.
export const moverService = {
  getConfig: () => unwrap(api.get('/movers/config'), 'Could not load Packers & Movers'),
  checkArea: (payload) => unwrap(api.post('/movers/check-area', payload), 'Could not check the service area'),
  quote: (payload) => unwrap(api.post('/movers/quote', payload), 'Could not calculate the price'),
  book: (payload) => unwrap(api.post('/movers/book', payload), 'Could not create the booking'),

  // admin
  adminInventory: () => unwrap(api.get('/admin/movers/inventory'), 'Could not load inventory'),
  adminCreateItem: (data) => unwrap(api.post('/admin/movers/inventory', data), 'Could not add the item'),
  adminUpdateItem: (id, data) => unwrap(api.put(`/admin/movers/inventory/${id}`, data), 'Could not update the item'),
  adminDeleteItem: (id) => unwrap(api.delete(`/admin/movers/inventory/${id}`), 'Could not delete the item'),
  adminSeed: () => unwrap(api.post('/admin/movers/inventory/seed'), 'Could not load defaults'),
  adminZones: () => unwrap(api.get('/admin/movers/zones'), 'Could not load zones'),
  adminSettings: () => unwrap(api.get('/admin/movers/settings'), 'Could not load settings'),
  adminSaveSettings: (data) => unwrap(api.put('/admin/movers/settings', data), 'Could not save settings'),
  adminSummary: () => unwrap(api.get('/admin/movers/summary'), 'Could not load the summary')
};

export default moverService;
