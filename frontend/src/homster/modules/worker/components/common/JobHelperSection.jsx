import React, { useState } from 'react';
import { FiPhone, FiUserPlus, FiUsers, FiX, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import workerService from '../../../../services/workerService';

const HELPABLE = ['assigned', 'confirmed', 'accepted', 'journey_started', 'visited', 'estimate_provided', 'estimate_accepted', 'in_progress'];

/**
 * Lead worker's view of extra hands on a job: who admin has added (no pay
 * shown), the state of any request, and a way to ask admin for more help.
 */
const JobHelperSection = ({ job, onChanged, open: openProp, onOpenChange }) => {
  // The request dialog can be opened from a button elsewhere on the page.
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const [count, setCount] = useState(1);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  const helpers = job.helpers || [];
  const requests = job.helperRequests || [];
  const pending = requests.find((r) => r.status === 'pending');
  const latest = requests[requests.length - 1];
  const canRequest = HELPABLE.includes(String(job.status).toLowerCase()) && !pending;

  const submit = async () => {
    if (reason.trim().length < 3) return toast.error('Please tell admin why you need extra help');
    try {
      setSending(true);
      const res = await workerService.requestHelper(job._id || job.id, { count, reason: reason.trim() });
      if (res.success) {
        toast.success('Request sent to admin');
        setOpen(false);
        setReason('');
        setCount(1);
        onChanged?.();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send the request');
    } finally {
      setSending(false);
    }
  };

  if (!helpers.length && !canRequest && !latest) return null;

  return (
    <div className="bg-white rounded-2xl p-5 mb-6 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-gray-900 flex items-center gap-2">
          <FiUsers className="w-5 h-5 text-gray-500" /> Extra Workers
        </h4>
        {canRequest && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 border border-blue-100 active:scale-95 transition"
          >
            <FiUserPlus className="w-4 h-4" /> Request help
          </button>
        )}
      </div>

      {helpers.length > 0 ? (
        <ul className="space-y-2">
          {helpers.map((h) => (
            <li key={String(h.workerId)} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {h.name ? h.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-800">{h.name || 'Helper'}</p>
                  <p className="text-[11px] text-gray-500">Working with you on this job</p>
                </div>
              </div>
              {h.phone && (
                <a href={`tel:${h.phone}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600 border border-blue-100">
                  <FiPhone className="w-4 h-4" />
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">Need an extra pair of hands? Ask admin to add a worker to this job.</p>
      )}

      {pending && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <FiClock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>You asked for {pending.count} extra worker{pending.count > 1 ? 's' : ''}. Waiting for admin to respond.</p>
        </div>
      )}
      {!pending && latest?.status === 'rejected' && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
          <FiXCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Your last request was declined{latest.note ? `: ${latest.note}` : '.'}</p>
        </div>
      )}
      {!pending && latest?.status === 'fulfilled' && helpers.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
          <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Admin added help for this job.</p>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Request extra worker</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">How many extra workers?</label>
            <div className="mb-4 flex items-center gap-3">
              <button type="button" onClick={() => setCount((c) => Math.max(1, c - 1))} className="h-10 w-10 rounded-xl border border-gray-200 text-lg font-bold">−</button>
              <span className="w-8 text-center text-lg font-black">{count}</span>
              <button type="button" onClick={() => setCount((c) => Math.min(10, c + 1))} className="h-10 w-10 rounded-xl border border-gray-200 text-lg font-bold">+</button>
            </div>

            <label className="mb-1.5 block text-xs font-bold uppercase text-gray-500">Why do you need help?</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Large flat, heavy furniture to move"
              className="mb-4 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-blue-400"
            />

            <button
              type="button"
              onClick={submit}
              disabled={sending}
              className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg active:scale-95 transition disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Send request to admin'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobHelperSection;
