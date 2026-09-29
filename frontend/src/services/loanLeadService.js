import { api } from './apiService';
import { axiosInstance } from '../app/admin/store/adminStore';

// ── User / Public API ──────────────────────────────────────────────────
export const createLoanLead = async (data) => {
  const response = await api.post('/loan-leads', data);
  return response.data;
};

export const getMyLoanLeads = async () => {
  const response = await api.get('/loan-leads/my');
  return response.data;
};

// ── Admin API ──────────────────────────────────────────────────────────
export const adminGetLoanLeads = async (params = {}) => {
  const response = await axiosInstance.get('/admin/loan-leads', { params });
  return response.data;
};

export const adminUpdateLoanLead = async (id, data) => {
  const response = await axiosInstance.put(`/admin/loan-leads/${id}`, data);
  return response.data;
};

export const adminDeleteLoanLead = async (id) => {
  const response = await axiosInstance.delete(`/admin/loan-leads/${id}`);
  return response.data;
};

export default {
  createLoanLead,
  getMyLoanLeads,
  adminGetLoanLeads,
  adminUpdateLoanLead,
  adminDeleteLoanLead,
};
