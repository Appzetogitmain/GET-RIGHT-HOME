import api from './api';

/**
 * Wallet Service
 * Handles all API calls for User Wallet
 */

export const walletService = {
  // Get wallet balance
  getBalance: async () => {
    // The wallet lives at /api/wallet (the user's own 'user' wallet).
    const response = await api.get('/wallet', { params: { viewAs: 'user' } });
    const w = response.data?.wallet || {};
    return { success: !!response.data?.success, data: { ...w, balance: w.balance || 0 } };
  },

  // Add money to wallet (create Razorpay order)
  addMoney: async (amount) => {
    const response = await api.post('/wallet/add-money', { amount, viewAs: 'user' });
    return response.data;
  },

  // Verify wallet top-up payment
  verifyTopup: async (paymentData) => {
    const response = await api.post('/wallet/verify-add-money', { ...paymentData, viewAs: 'user' });
    return response.data;
  },

  // Get wallet transaction history
  getTransactions: async (params = {}) => {
    const queryParams = new URLSearchParams({ viewAs: 'user' });
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await api.get(`/wallet/transactions?${queryParams.toString()}`);
    return { success: !!response.data?.success, data: response.data?.transactions || [], pagination: response.data?.pagination };
  }
};

export default walletService;


