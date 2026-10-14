import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiClock, FiArrowLeft, FiCheckCircle, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { workerTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import AvailabilityEditor from '../../components/common/AvailabilityEditor';
import WorkerOfflineModal from '../Dashboard/components/WorkerOfflineModal';
import workerService from '../../../../services/workerService';
import LogoLoader from '../../../../components/common/LogoLoader';

const Availability = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [submittingOffline, setSubmittingOffline] = useState(false);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = '#F8FAFC'; // slate-50

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workerService.getMyAvailability();
      if (res?.success) {
        setData(res.data);
      } else {
        toast.error(res?.message || 'Could not load your availability');
      }
    } catch (err) {
      console.error('Failed to load availability:', err);
      toast.error(err?.response?.data?.message || 'Could not load your availability');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      const res = await workerService.updateMyAvailability(payload);
      if (res?.success) {
        toast.success(res.message || 'Availability saved successfully');
        setData(res.data);
      } else {
        toast.error(res?.message || 'Could not save availability');
      }
    } catch (err) {
      console.error('Failed to save availability:', err);
      toast.error(err?.response?.data?.message || 'Could not save availability');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitOfflineRequest = async (requestData) => {
    setSubmittingOffline(true);
    try {
      const res = await workerService.requestOffline(requestData);
      if (res?.success) {
        toast.success(res.message || 'Offline request submitted. Awaiting admin approval.');
        setOfflineModalOpen(false);
        loadAvailability();
      } else {
        toast.error(res?.message || 'Failed to submit offline request');
      }
    } catch (err) {
      console.error('Failed to submit offline request:', err);
      toast.error(err?.response?.data?.message || 'Failed to submit offline request');
    } finally {
      setSubmittingOffline(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Header */}
      <Header
        title="My Availability"
        showBack={true}
        onBack={() => navigate('/worker/dashboard')}
      />

      <main className="max-w-xl mx-auto px-4 py-4 space-y-4">
        {/* Banner card */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shadow-xs">
              <FiCalendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">My Availability</h1>
              <p className="text-xs text-slate-500 mt-0.5 truncate">Tell us when you can take customer jobs</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadAvailability}
            disabled={loading}
            title="Refresh availability"
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50 shrink-0"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>

        {/* Loading state */}
        {loading && !data ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <LogoLoader />
            <p className="mt-3 text-xs font-semibold text-slate-400">Loading your schedule…</p>
          </div>
        ) : !data ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
            <FiAlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Unable to load availability</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">Please check your network connection and try again.</p>
            <button
              onClick={loadAvailability}
              className="px-4 py-2 bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-teal-800 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-100">
            {/* Per-day Availability & Slot Editor */}
            <AvailabilityEditor
              data={data}
              onSave={handleSave}
              saving={saving}
              isPage={true}
            />

            {/* Request Hourly Leave Fallback */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOfflineModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
              >
                <FiClock className="w-4 h-4 text-teal-600" /> Need only a few hours off? Request hourly leave
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Hourly Leave Request Modal */}
      <WorkerOfflineModal
        isOpen={offlineModalOpen}
        onClose={() => setOfflineModalOpen(false)}
        onSubmitRequest={handleSubmitOfflineRequest}
        submitting={submittingOffline}
      />
    </div>
  );
};

export default Availability;
