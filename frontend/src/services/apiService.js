import axios from 'axios';


import { API_BASE_URL } from '../config/apiConfig';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true,
});

// Simple GET request cache to prevent layout shifts on back navigation
const apiCache = new Map();

// Interceptor to add Token, Log, and check Cache
api.interceptors.request.use((config) => {
  let token = localStorage.getItem('token') || localStorage.getItem('userToken');
  
  // Only check adminToken if on an admin API route
  if (!token && config.url?.startsWith('/admin')) {
    token = localStorage.getItem('adminToken') || localStorage.getItem('adminAccessToken');
  }

  if (!token) {
    const userStr = localStorage.getItem('user') || localStorage.getItem('userData');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        token = u.token || u.accessToken;
      } catch (e) {}
    }
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Cache GET requests except saved-places to prevent layout collapse on back navigation
  if (config.method?.toLowerCase() === 'get' && !config.url?.includes('/users/saved-places')) {
    const fullUrl = `${config.baseURL || ''}${config.url || ''}?${new URLSearchParams(config.params || {}).toString()}`;
    const cached = apiCache.get(fullUrl);
    
    if (cached && Date.now() - cached.timestamp < 120000) {
      config.adapter = () => Promise.resolve({
        data: cached.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        request: {}
      });
      return config;
    }
  }

  console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data || '');
  return config;
}, (error) => Promise.reject(error));

// Interceptor to handle 401 Unauthorized and populate Cache
api.interceptors.response.use(
  (response) => {
    if (response.config.method?.toLowerCase() === 'get') {
      const fullUrl = `${response.config.baseURL || ''}${response.config.url || ''}?${new URLSearchParams(response.config.params || {}).toString()}`;
      apiCache.set(fullUrl, {
        data: response.data,
        timestamp: Date.now()
      });
    }
    return response;
  },
  (error) => {
    const status = error.response ? error.response.status : null;
    const isBlocked = error.response?.data?.isBlocked;

    if (status === 401 || (status === 403 && isBlocked)) {
      // Clear invalid session metadata completely
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('userToken');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('accessToken');
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/otp')) {
        console.warn("Session expired or account blocked. Redirecting to login...");
        const path = window.location.pathname;
        const isUserHotelDetail = /^\/hotel\/[0-9a-fA-F]{24}(\/(amenities|reviews|offers))?$/.test(path);
        const isPartnerPath = path.startsWith('/hotel/') && !isUserHotelDetail;
        if (isPartnerPath) {
          window.location.href = '/hotel/login';
        } else {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// User Auth Services
export const authService = {
  // Send OTP
  sendOtp: async (phone, type = 'login', role = 'user') => {
    try {
      const response = await api.post('/auth/send-otp', { phone, type, role });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Verify OTP & Login/Register
  verifyOtp: async (data) => {
    try {
      const response = await api.post('/auth/verify-otp', data);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userToken', response.data.token);
      }
      if (response.data.user) {
        const userWithToken = {
          ...response.data.user,
          token: response.data.token || response.data.user.token
        };
        localStorage.setItem('user', JSON.stringify(userWithToken));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Verify Partner OTP & Register
  verifyPartnerOtp: async (data) => {
    try {
      const response = await api.post('/auth/partner/verify-otp', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Initiate Partner Registration (Step 1 & 2)
  registerPartner: async (data) => {
    try {
      const response = await api.post('/auth/partner/register', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Upload Partner Docs
  uploadDocs: async (formData) => {
    try {
      const response = await api.post('/auth/partner/upload-docs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete Partner Doc
  deleteDoc: async (publicId) => {
    try {
      const response = await api.post('/auth/partner/delete-doc', { publicId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Upload Partner Docs via Base64 (Flutter Camera)
  uploadDocsBase64: async (images) => {
    try {
      const response = await api.post('/auth/partner/upload-docs-base64', { images });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update Profile
  updateProfile: async (data) => {
    try {
      const response = await api.put('/auth/update-profile', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Lazy Enquiry Login/Register
  lazyEnquiryLogin: async (data) => {
    try {
      const response = await api.post('/auth/lazy-enquiry-login', data);
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Lazy Listing Login/Register
  lazyListingLogin: async (data) => {
    try {
      const response = await api.post('/auth/lazy-listing-login', data);
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('user');
  }
};

// Booking Services
export const bookingService = {
  create: async (bookingData) => {
    try {
      const response = await api.post('/bookings', bookingData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getMyBookings: async (type) => {
    try {
      const url = type ? `/bookings/my?type=${type}` : '/bookings/my';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPartnerBookings: async (status) => {
    try {
      const url = status ? `/bookings/partner?status=${status}` : '/bookings/partner';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getBookingDetail: async (id) => {
    try {
      const response = await api.get(`/bookings/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPartnerBookingDetail: async (id) => {
    try {
      const response = await api.get(`/bookings/${id}/partner-detail`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  markAsPaid: async (id) => {
    try {
      const response = await api.put(`/bookings/${id}/mark-paid`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  markNoShow: async (id) => {
    try {
      const response = await api.put(`/bookings/${id}/no-show`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  checkIn: async (id) => {
    try {
      const response = await api.put(`/bookings/${id}/check-in`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  checkOut: async (id, force = false) => {
    try {
      const url = force ? `/bookings/${id}/check-out?force=true` : `/bookings/${id}/check-out`;
      const response = await api.put(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updateInquiryStatus: async (id, status, message) => {
    try {
      const response = await api.put(`/bookings/${id}/inquiry-status`, { status, message });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  cancel: async (bookingId, reason) => {
    try {
      const response = await api.post(`/bookings/${bookingId}/cancel`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // ── Enquiry helpers (now proxied to /enquiries) ───────────────────────────
  getReceivedEnquiries: async (params = {}) => {
    try {
      const q = new URLSearchParams(params).toString();
      const url = q ? `/enquiries/received?${q}` : '/enquiries/received';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updateReceivedEnquiryStatus: async (id, status) => {
    try {
      const response = await api.put(`/enquiries/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

// Home Service Booking Services
export const hsBookingService = {
  getMyBookings: async (status) => {
    try {
      const url = status ? `/hs-bookings/my?status=${status}` : '/hs-bookings/my';
      const response = await api.get(url);
      return response.data; // Note: This usually returns { success: true, data: [...] }
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getBookingDetail: async (id) => {
    try {
      const response = await api.get(`/hs-bookings/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  cancelBooking: async (id, reason) => {
    try {
      const response = await api.post(`/hs-bookings/${id}/cancel`, { cancellationReason: reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

// ── Dedicated Enquiry Service ─────────────────────────────────────────────────
export const enquiryService = {
  // Submit an enquiry from the property details page
  create: async (data) => {
    try {
      const response = await api.post('/enquiries', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Get enquiries I submitted (buyer)
  getMy: async () => {
    try {
      const response = await api.get('/enquiries/my');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Get enquiries received on my properties (owner)
  getReceived: async (params = {}) => {
    try {
      const q = new URLSearchParams(params).toString();
      const url = q ? `/enquiries/received?${q}` : '/enquiries/received';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Update status of an enquiry on my property
  updateStatus: async (id, status) => {
    try {
      const response = await api.put(`/enquiries/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

// Property Services (New)
export const propertyService = {
  createProperty: async (propertyData) => {
    try {
      // Ensure structureDetails is included if present
      const response = await api.post('/properties', propertyData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Alias for backward compatibility with wizards
  create: async (propertyData) => {
    return propertyService.createProperty(propertyData);
  },
  upsertDocuments: async (propertyId, documents) => {
    try {
      const response = await api.post(`/properties/${propertyId}/documents`, { documents });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  update: async (id, data) => {
    try {
      const response = await api.put(`/properties/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  delete: async (id) => {
    try {
      const response = await api.delete(`/properties/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  addRoomType: async (propertyId, data) => {
    try {
      const response = await api.post(`/properties/${propertyId}/room-types`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updateRoomType: async (propertyId, roomTypeId, data) => {
    try {
      const response = await api.put(`/properties/${propertyId}/room-types/${roomTypeId}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteRoomType: async (propertyId, roomTypeId) => {
    try {
      const response = await api.delete(`/properties/${propertyId}/room-types/${roomTypeId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getMy: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = params ? `/properties/my?${params}` : '/properties/my';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPublic: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = params ? `/properties?${params}` : '/properties';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getRecommendedSellers: async () => {
    try {
      const response = await api.get('/properties/recommended-sellers');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getDetails: async (id) => {
    try {
      const response = await api.get(`/properties/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  revealContact: async (id) => {
    try {
      const response = await api.get(`/properties/${id}/reveal-contact`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPartnerPublicDetails: async (id) => {
    try {
      const response = await api.get(`/properties/partner-public-details/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export const propertyVideoService = {
  getVideos: async (page) => {
    try {
      const url = page ? `/property-videos?page=${page}` : '/property-videos';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getAllAdmin: async () => {
    try {
      const response = await api.get('/property-videos/all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  create: async (data) => {
    try {
      const response = await api.post('/property-videos', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  update: async (id, data) => {
    try {
      const response = await api.put(`/property-videos/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  delete: async (id) => {
    try {
      const response = await api.delete(`/property-videos/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};


// Hotel Services (Updated)
export const hotelService = {
  getAll: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = params ? `/properties?${params}` : '/properties';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/properties/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getMyHotels: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const url = params ? `/properties/my?${params}` : '/properties/my';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getCurrentLocation: async () => {
    try {
      const response = await api.get('/hotels/location/current');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  uploadImages: async (formData) => {
    try {
      const response = await api.post('/hotels/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  uploadImagesBase64: async (images) => {
    try {
      const response = await api.post('/hotels/upload-base64', { images });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getAddressFromCoordinates: async (lat, lng) => {
    try {
      const response = await api.post('/hotels/location/address', { lat, lng });
      return response.data;
    } catch (error) {
      const err = error.response?.data || { message: error.message };
      console.error('[getAddressFromCoordinates] Backend error:', err);
      throw err;
    }
  },
  saveOnboardingStep: async (data) => {
    try {
      const response = await api.post('/hotels/onboarding/save-step', data);
      return response.data;
    } catch (error) {
      console.warn("Draft Save Error:", error);
      if (error.response && error.response.status === 404) {
        const errObj = typeof error.response.data === 'object' ? { ...error.response.data } : { message: error.response.data };
        errObj.status = 404;
        throw errObj;
      }
      throw error.response?.data || error.message;
    }
  },
  searchLocation: async (query) => {
    try {
      const response = await api.get(`/hotels/location/search?query=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      const err = error.response?.data || { message: error.message };
      console.error('[searchLocation] Backend error:', err);
      throw err;
    }
  },
  calculateDistance: async (originLat, originLng, destLat, destLng) => {
    try {
      const response = await api.get(`/hotels/location/distance?originLat=${originLat}&originLng=${originLng}&destLat=${destLat}&destLng=${destLng}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteHotel: async (id) => {
    try {
      const response = await api.delete(`/hotels/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Notification Methods for Partners
  getNotifications: async (page = 1, limit = 20) => {
    try {
      const response = await api.get(`/hotels/notifications?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  markAllNotificationsRead: async () => {
    try {
      const response = await api.put('/hotels/notifications/read-all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteNotifications: async (ids) => {
    try {
      const response = await api.delete('/hotels/notifications', { data: { ids } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteImage: async (url, publicId) => {
    try {
      const response = await api.post('/hotels/delete-image', { url, publicId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

// User Profile Services
export const userService = {
  getProfile: async () => {
    try {
      const response = await api.get('/users/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  updateProfile: async (data) => {
    try {
      const response = await api.put('/users/profile', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Get Saved Places
  getSavedPlaces: async () => {
    try {
      apiCache.clear();
      const response = await api.get('/users/saved-places');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Toggle Saved Place
  toggleSavedPlace: async (id, type) => {
    try {
      apiCache.clear();
      const response = await api.post(`/users/saved-places/toggle`, { id, type });
      apiCache.clear();
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Update FCM Token
  updateFcmToken: async (fcmToken, platform = 'web') => {
    try {
      const response = await api.put('/users/fcm-token', { fcmToken, platform });
      return response.data;
    } catch (error) {
      console.warn('FCM Token Update Failed:', error);
      return null;
    }
  },

  // Get Notifications
  getNotifications: async (page = 1, limit = 20) => {
    try {
      const response = await api.get(`/users/notifications?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete Notifications (Bulk)
  deleteNotifications: async (ids) => {
    try {
      // Use DELETE method with data body (supported by Axios)
      const response = await api.delete('/users/notifications', { data: { ids } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Mark All Notifications Read
  markAllNotificationsRead: async () => {
    try {
      const response = await api.put('/users/notifications/read-all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

// Offer & Coupon Services
export const offerService = {
  // Use by users to see available coupons
  getActive: async () => {
    try {
      const response = await api.get('/offers');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Validate coupon before booking
  validate: async (code, bookingAmount) => {
    try {
      const response = await api.post('/offers/validate', { code, bookingAmount });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Get all for admin management
  getAll: async () => {
    try {
      const response = await api.get('/offers/all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Create new (Admin)
  create: async (offerData) => {
    try {
      const response = await api.post('/offers', offerData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};



export const paymentService = {
  createOrder: async (bookingId) => {
    try {
      const response = await api.post('/payments/create-order', { bookingId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  verifyPayment: async (paymentData) => {
    try {
      const response = await api.post('/payments/verify', paymentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export const legalService = {
  getPage: async (audience, slug) => {
    try {
      const response = await api.get(`/info/${audience}/${slug}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPlatformStatus: async () => {
    try {
      const response = await api.get('/info/platform/status');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getFinancialSettings: async () => {
    try {
      const response = await api.get('/info/platform/financials');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getAdminContact: async () => {
    try {
      const response = await api.get('/info/contact');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  submitContact: async (audience, payload) => {
    try {
      const response = await api.post(`/contact/${audience}`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

// Availability & Inventory Services
export const availabilityService = {
  check: async (params) => {
    try {
      const response = await api.get('/availability/check', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  createWalkIn: async (data) => {
    try {
      const response = await api.post('/availability/partner/walkin', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  createExternal: async (data) => {
    try {
      const response = await api.post('/availability/partner/external-booking', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  blockDates: async (data) => {
    try {
      const response = await api.post('/availability/partner/block-inventory', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getLedger: async (params) => {
    try {
      const response = await api.get('/availability/partner/ledger', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export const reviewService = {
  getPropertyReviews: async (propertyId) => {
    try {
      const response = await api.get(`/reviews/${propertyId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  createReview: async (reviewData) => {
    try {
      const response = await api.post('/reviews', reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getPartnerStats: async () => {
    try {
      const response = await api.get('/reviews/partner/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getAllPartnerReviews: async (status) => {
    try {
      const url = status ? `/reviews/partner/all?status=${status}` : '/reviews/partner/all';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  reply: async (reviewId, reply) => {
    try {
      const response = await api.post(`/reviews/${reviewId}/reply`, { reply });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  toggleHelpful: async (reviewId) => {
    try {
      const response = await api.post(`/reviews/${reviewId}/helpful`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export const referralService = {
  getMyStats: async () => {
    try {
      const response = await api.get('/referrals/my-stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getActiveProgram: async () => {
    try {
      const response = await api.get('/referrals/program/active');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  // Update FCM Token
  updateFcmToken: async (token, platform = 'web') => {
    try {
      const response = await api.post('/fcm-tokens/save', { token, platform });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export const handleResponse = (response) => response.data;

export const handleError = (error) => {
  throw error.response?.data || error.message;
};

/* --- FAQ SERVICES --- */
export const faqService = {
  // Public - Get active FAQs for an audience
  getFaqs: async (audience) => {
    try {
      const response = await api.get(`/faqs?audience=${audience}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Admin - Get all FAQs
  getAllFaqsAdmin: async (audience) => {
    try {
      const response = await api.get(`/faqs/admin?audience=${audience}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  createFaq: async (faqData) => {
    try {
      const response = await api.post('/faqs', faqData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  updateFaq: async (id, faqData) => {
    try {
      const response = await api.put(`/faqs/${id}`, faqData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  deleteFaq: async (id) => {
    try {
      const response = await api.delete(`/faqs/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export const localityReviewService = {
  createReview: async (reviewData) => {
    try {
      const response = await api.post('/locality-reviews', reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getStats: async (localityName) => {
    try {
      const response = await api.get('/locality-reviews/stats', { params: { localityName } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  getReviews: async (localityName, page = 1, limit = 10) => {
    try {
      const response = await api.get('/locality-reviews', { params: { localityName, page, limit } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export const feedbackService = {
  getMyFeedback: async () => {
    try {
      const response = await api.get('/feedback/my');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  saveFeedback: async (feedbackData) => {
    try {
      const response = await api.post('/feedback', feedbackData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
  deleteFeedback: async () => {
    try {
      const response = await api.delete('/feedback');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default api;
