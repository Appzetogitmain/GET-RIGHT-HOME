import api from './api';

export const getDashboardStats = async (params) => {
  try {
    const response = await api.get('/admin/reports/workers', { params });
    // Map the worker analytics response to the format expected by the Dashboard
    const data = response.data.data;
    return {
      success: true,
      stats: {
        totalWorkers: data.totalWorkers,
        totalUsers: 0, // Not provided by this endpoint currently
        totalVendors: 0,
        pendingBookings: data.activeJobs,
        completedBookings: data.completedJobs,
        totalBookings: data.activeJobs + data.completedJobs,
        totalRevenue: data.totalRevenue || 0,
      },
      recentBookings: data.recentBookings || []
    };
  } catch (error) {
    console.error('API Error:', error.response?.data || error);
    throw error;
  }
};

export const getRevenueAnalytics = async (params) => {
  try {
    const response = await api.get('/admin/dashboard/revenue', { params });
    return response.data;
  } catch (error) {
    console.warn('getRevenueAnalytics API not found, returning empty array');
    return { success: true, data: { revenueData: [] } };
  }
};

export const getBookingTrends = async (days = 30) => {
  try {
    const response = await api.get('/admin/dashboard/bookings/trends', { params: { days } });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getUserGrowthMetrics = async (days = 30) => {
  try {
    const response = await api.get('/admin/dashboard/users/growth', { params: { days } });
    return response.data;
  } catch (error) {
    throw error;
  }
};

