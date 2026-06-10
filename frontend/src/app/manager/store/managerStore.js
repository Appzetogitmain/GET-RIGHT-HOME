import { create } from 'zustand';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/apiConfig';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

const useManagerStore = create((set, get) => ({
  manager: null,
  isAuthenticated: false,
  loading: true,
  permissions: [], // Cache manager's permissions for quick UI gating

  login: async (email, password) => {
    try {
      const response = await axiosInstance.post('/auth/manager/login', { email, password });
      const { user, token } = response.data;

      if (token) {
        localStorage.setItem('managerToken', token);
        localStorage.setItem('managerAccessToken', token);
        // Bridge: adminToken is read by adminService axiosInstance & all admin page components.
        // Mirroring it here lets managers reuse admin pages without modification.
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminAccessToken', token);
      }
      if (user) {
        localStorage.setItem('managerData', JSON.stringify(user));
        localStorage.setItem('adminData', JSON.stringify(user));
      }

      set({ 
        manager: user, 
        isAuthenticated: true, 
        permissions: user.permissions || [],
        loading: false 
      });
      return { success: true };
    } catch (error) {
      console.error('Manager Login Error:', error);
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
      console.error('Manager logout error:', error);
    } finally {
      localStorage.removeItem('managerToken');
      localStorage.removeItem('managerAccessToken');
      localStorage.removeItem('managerData');
      // Remove the bridged admin tokens so admin pages can't be accessed after manager logout
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminData');
      set({ manager: null, isAuthenticated: false, permissions: [] });
    }
  },

  checkAuth: async () => {
    try {
      const response = await axiosInstance.get('/auth/manager/me');

      if (response.data.user && response.data.user.role === 'manager') {
        localStorage.setItem('managerData', JSON.stringify(response.data.user));
        localStorage.setItem('adminData', JSON.stringify(response.data.user));
        const token = localStorage.getItem('managerToken');
        if (token) {
          localStorage.setItem('adminToken', token);
          localStorage.setItem('adminAccessToken', token);
        }
        set({
          manager: response.data.user,
          isAuthenticated: true,
          permissions: response.data.user.permissions || [],
          loading: false
        });
      } else {
        await get().logout();
        set({ loading: false });
      }
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Manager Check Auth Error:', error);
      }
      await get().logout();
      set({ loading: false });
    }
  },

  // Helper function to check if the manager has permission for a specific module and action
  hasPermission: (moduleKey, action = 'view') => {
    const permissions = get().permissions;
    const entry = permissions.find((p) => p.module === moduleKey);
    if (!entry) return false;
    return entry.actions.includes(action);
  }
}));

// Add response interceptor to handle 401 globally for this instance
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config && !error.config.url.endsWith('/auth/logout')) {
      useManagerStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// Add request interceptor to automatically attach token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('managerToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export { axiosInstance };
export default useManagerStore;
