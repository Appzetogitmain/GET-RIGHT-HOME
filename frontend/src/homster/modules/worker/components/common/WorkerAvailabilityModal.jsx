import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FiX, FiClock, FiCalendar } from 'react-icons/fi';
import workerService from '../../../../services/workerService';
import AvailabilityEditor from './AvailabilityEditor';

/**
 * Opened from the online/offline toggle: the worker marks which weekdays they
 * work and which dates they're on leave. `onRequestHourlyLeave` lets them fall
 * back to the older partial-day leave request.
 */
export default function WorkerAvailabilityModal({ isOpen, onClose, onRequestHourlyLeave }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workerService.getMyAvailability();
      if (res?.success) setData(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not load your availability');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      const res = await workerService.updateMyAvailability(payload);
      if (res?.success) {
        toast.success(res.message || 'Availability saved');
        setData(res.data);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save availability');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white px-4 pb-4 sm:px-5 sm:pb-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-5 px-4 sm:px-5 pt-4 pb-3 mb-3 bg-white/95 backdrop-blur border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <FiCalendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">My availability</h2>
              <p className="text-xs text-slate-500 mt-0.5">Tell us when you can take jobs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            aria-label="Close"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {loading && !data ? (
          <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
        ) : (
          <AvailabilityEditor data={data} onSave={handleSave} saving={saving} />
        )}

        {onRequestHourlyLeave && (
          <button
            type="button"
            onClick={() => { onClose(); onRequestHourlyLeave(); }}
            className="mt-4 w-full flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 py-2"
          >
            <FiClock className="w-3.5 h-3.5" /> Need only a few hours off? Request hourly leave
          </button>
        )}
      </div>
    </div>
  );
}
