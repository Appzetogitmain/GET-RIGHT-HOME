import { api } from './apiService';

export const supportService = {
  getMyConversation: () => api.get('/support/my-conversation').then((r) => r.data),

  getMessages: (params = {}) => api.get('/support/messages', { params }).then((r) => r.data),

  sendMessage: (text) => api.post('/support/messages', { text }).then((r) => r.data),
};

export default supportService;
