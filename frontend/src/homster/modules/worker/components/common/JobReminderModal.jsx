import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FiClock, FiCheck, FiMapPin, FiX } from 'react-icons/fi';
import workerService from '../../../../services/workerService';
import { stopAlertRing } from '../../../../utils/notificationSound';

const formatCountdown = (sec) => {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Popup shown a configurable time before an assigned job starts (admin setting),
 * asking the worker to confirm they'll be there. Ignoring it alerts the admin,
 * who can re-broadcast the booking to other workers. Driven by the
 * 'job_reminder' socket event, with a poll as a fail-safe for a worker whose
 * app wasn't open when it was sent.
 */
export default function JobReminderModal() {
  const [reminders, setReminders] = useState([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    if (!localStorage.getItem('workerAccessToken')) return;
    try {
      const res = await workerService.getJobReminders();
      if (res?.success) {
        const fetchedAt = Date.now();
        setReminders((res.data || []).map((r) => ({ ...r, deadline: fetchedAt + (r.confirmBySeconds || 0) * 1000 })));
      }
    } catch {
      // silent — next poll retries
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 20000);
    const onReminder = () => load();
    window.addEventListener('jobReminder', onReminder);
    window.addEventListener('focus', load);
    return () => {
      clearInterval(poll);
      window.removeEventListener('jobReminder', onReminder);
      window.removeEventListener('focus', load);
    };
  }, [load]);

  useEffect(() => {
    if (reminders.length === 0) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [reminders.length]);

  const current = reminders[0];
  if (!current) return null;

  const id = current.bookingId;
  const remove = () => {
    setReminders((prev) => prev.filter((r) => String(r.bookingId) !== String(id)));
    stopAlertRing();
  };

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await workerService.confirmJobReminder(id);
      toast.success('Thanks for confirming!');
      remove();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not confirm. Please try again.');
      if (err?.response?.status === 404) remove();
    } finally {
      setBusy(false);
    }
  };

  const handleCannotAttend = async () => {
    if (!window.confirm('Release this job? It will be offered to other professionals.')) return;
    setBusy(true);
    try {
      await workerService.releaseJob(id, 'Cannot attend (pre-job reminder)');
      toast.success('Job released');
      remove();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not release the job.');
    } finally {
      setBusy(false);
    }
  };

  const secondsLeft = Math.max(0, Math.round((current.deadline - now) / 1000));
  const dateLabel = current.scheduledDate ? new Date(current.scheduledDate).toLocaleDateString() : '';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <FiClock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black leading-tight text-gray-900">Upcoming job — confirm?</h2>
            <p className="text-xs font-medium text-gray-500">
              {dateLabel} • {current.scheduledTime}
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-sm font-bold text-gray-900">{current.serviceName || 'Service Job'}</p>
          <p className="text-[11px] text-gray-500">Booking #{current.bookingNumber}</p>
          {current.address?.addressLine1 && (
            <p className="mt-1 flex items-start gap-1 text-[11px] text-gray-600">
              <FiMapPin className="mt-0.5 h-3 w-3 shrink-0" />
              {current.address.addressLine1}{current.address.city ? `, ${current.address.city}` : ''}
            </p>
          )}
        </div>

        <p className="mb-4 text-center text-xs text-gray-600">
          Please confirm within{' '}
          <span className={`font-black ${secondsLeft <= 60 ? 'text-red-500' : 'text-amber-600'}`}>
            {formatCountdown(secondsLeft)}
          </span>{' '}
          or the admin will be alerted and may reassign this job.
        </p>

        <button
          onClick={handleConfirm}
          disabled={busy}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          <FiCheck className="h-4 w-4" /> Yes, I'll be there
        </button>
        <button
          onClick={handleCannotAttend}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-600 disabled:opacity-60"
        >
          <FiX className="h-4 w-4" /> I can't make it
        </button>
      </div>
    </div>
  );
}
