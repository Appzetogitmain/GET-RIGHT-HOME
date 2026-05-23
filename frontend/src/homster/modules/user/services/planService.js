import api from '../../../services/api';

export const getPlans = async () => {
  try {
    const response = await api.get('/public/plans');
    return response.data;
  } catch (error) {
    console.error('Error fetching plans:', error);
    throw error;
  }
};

// Create Razorpay order for VIP Membership purchase
export const createVipOrder = async (cityId) => {
  try {
    const response = await api.post('/users/vip/purchase', { cityId });
    return response.data;
  } catch (error) {
    console.error('Error creating VIP order:', error);
    throw error;
  }
};

// Verify VIP payment and activate membership
export const verifyVipPayment = async (payload) => {
  try {
    const response = await api.post('/users/vip/verify', payload);
    return response.data;
  } catch (error) {
    console.error('Error verifying VIP payment:', error);
    throw error;
  }
};

export default { getPlans, createVipOrder, verifyVipPayment };

