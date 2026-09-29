import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FiX, FiClock } from 'react-icons/fi';
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
        className="w-full sm:max-w-md max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white p-4 sm:p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-black text-gray-900 leading-tight">My availability</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tell us when you can take jobs.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <FiX className="w-5 h-5" />
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
