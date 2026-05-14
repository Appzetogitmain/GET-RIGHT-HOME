export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://homezoo.onrender.com/api';

export const getApiUrl = (endpoint) => {
    return `${API_BASE_URL}${endpoint}`;
};
