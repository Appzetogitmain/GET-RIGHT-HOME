import { create } from 'zustand';
import axios from 'axios';

import { API_BASE_URL } from '../../../config/apiConfig';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

// Interceptor to add Token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken') || localStorage.getItem('adminAccessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

const useAdminStore = create((set, get) => ({
  admin: null,
  isAuthenticated: false,
  loading: true,

  login: async (email, password) => {
    try {
      const response = await axiosInstance.post(`/auth/admin/login`, { email, password });
      const { user, token } = response.data;

      if (token) {
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminAccessToken', token);
      }
      if (user) {
        localStorage.setItem('adminData', JSON.stringify(user));
      }

      set({ admin: user, isAuthenticated: true, loading: false });
      return { success: true };
    } catch (error) {
      console.error('Admin Login Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      console.error('Admin logout error:', error);
    } finally {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminData');
      set({ admin: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    try {
      const response = await axiosInstance.get('/auth/me');

      if (response.data.user && ['admin', 'superadmin'].includes(response.data.user.role)) {
        localStorage.setItem('adminData', JSON.stringify(response.data.user));
        set({
          admin: response.data.user,
          isAuthenticated: true,
          loading: false
        });
      } else {
        await get().logout();
        set({ loading: false });
      }
    } catch (error) {
      // Only log non-401 errors (401 is expected when not logged in)
      if (error.response?.status !== 401) {
        console.error('Check Auth Error:', error);
      }
      await get().logout();
      set({ loading: false });
    }
  }
}));

// Add response interceptor to handle 401 globally for this instance
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config && !error.config.url.endsWith('/auth/logout')) {
      useAdminStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export { axiosInstance };
export default useAdminStore;
