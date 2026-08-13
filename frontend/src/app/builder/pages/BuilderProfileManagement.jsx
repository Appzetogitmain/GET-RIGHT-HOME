import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../../services/apiService';
import toast from 'react-hot-toast';
import {
  Building2, CheckCircle2, AlertCircle, Clock, ShieldCheck,
  Upload, FileText, MapPin, Award, Layers, Sparkles, Plus
} from 'lucide-react';

const BuilderProfileManagement = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    about: '',
    experienceYears: 8,
    officeAddress: '',
    gstNumber: '',
    reraRegistrationNumber: '',
    cinNumber: '',
    logo: '',
    coverImage: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiService.get('/users/me');
      if (res.data?.user) {
        const u = res.data.user;
        const bp = u.builderProfile || {};
        setProfile(u);
        setForm({
          companyName: u.companyName || u.name || '',
          about: bp.description || bp.about || '',
          experienceYears: bp.experienceYears || bp.experience || 8,
          officeAddress: bp.officeAddress || '',
          gstNumber: bp.gstNumber || '',
          reraRegistrationNumber: bp.reraRegistrationNumber || bp.reraNumber || '',
          cinNumber: bp.cinNumber || '',
          logo: bp.logo || u.avatar || '',
          coverImage: bp.coverImage || bp.banner || ''
        });
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        companyName: form.companyName,
        builderProfile: {
          ...(profile.builderProfile || {}),
          description: form.about,
          experienceYears: Number(form.experienceYears),
          officeAddress: form.officeAddress,
          gstNumber: form.gstNumber,
          reraRegistrationNumber: form.reraRegistrationNumber,
          cinNumber: form.cinNumber,
          logo: form.logo,
          coverImage: form.coverImage
        }
      };

      const res = await apiService.put('/users/profile', payload);
      if (res.data?.success || res.status === 200) {
        toast.success('Builder profile updated successfully');
        setEditing(false);
        fetchProfile();
      }
    } catch (err) {
      console.error('Update profile error:', err);
      toast.error('Failed to update builder profile');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const kycStatus = profile?.builderProfile?.approvalStatus || 'verified';

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-2 shadow-inner shrink-0">
              {form.logo ? (
                <img src={form.logo} alt="Logo" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <Building2 size={32} className="text-blue-300" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black">{form.companyName || 'Builder Profile'}</h1>
              <p className="text-xs text-blue-200 mt-1 flex items-center gap-2">
                <span>{form.experienceYears} Years Experience</span> • 
                <span className="capitalize text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck size={14} /> KYC {kycStatus}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/list-property')}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-bold transition-all shadow-md hover:bg-slate-100"
            >
              <Plus size={16} strokeWidth={2.5} /> Add Project
            </button>
            <button
              onClick={() => setEditing(!editing)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              {editing ? 'Cancel Editing' : 'Edit Profile & Details'}
            </button>
          </div>
        </div>
      </div>

      {/* KYC & Verification Summary Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">KYC Verification</p>
            <p className="text-sm font-black text-slate-800 capitalize">{kycStatus}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">RERA Number</p>
            <p className="text-sm font-black text-slate-800">{form.reraRegistrationNumber || 'RERA/KA/2026/001'}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">GSTIN Number</p>
            <p className="text-sm font-black text-slate-800">{form.gstNumber || '29AAAAA0000A1Z5'}</p>
          </div>
        </div>
      </div>

      {/* Edit or Details View Form */}
      {editing ? (
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
          <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">Edit Builder Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company / Brand Name</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Industry Experience (Years)</label>
              <input
                type="number"
                value={form.experienceYears}
                onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Logo Image URL</label>
              <input
                type="text"
                value={form.logo}
                onChange={(e) => setForm({ ...form, logo: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cover Banner URL</label>
              <input
                type="text"
                value={form.coverImage}
                onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Registration</label>
              <input
                type="text"
                value={form.gstNumber}
                onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">RERA Number</label>
              <input
                type="text"
                value={form.reraRegistrationNumber}
                onChange={(e) => setForm({ ...form, reraRegistrationNumber: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">About Builder / Company Summary</label>
            <textarea
              rows={4}
              value={form.about}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md"
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">Company Overview</h2>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {form.about || 'No detailed company description provided yet.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default BuilderProfileManagement;
