import React, { useState } from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

const QUICK_REASONS = ['Not available at this time', 'Too far from my location', 'Not my skill', 'Personal emergency'];

/**
 * Rejecting an assigned job needs a reason. The job goes back to admin, who
 * reassigns it or sends it out again.
 */
const RejectJobModal = ({ isOpen, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState('');
  if (!isOpen) return null;

  const valid = reason.trim().length >= 3;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <FiAlertTriangle className="h-6 w-6" />
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <h3 className="text-lg font-bold text-gray-900">Reject this job?</h3>
        <p className="mt-1 text-sm text-gray-500">
          The job goes back to admin to be given to someone else. Please tell us why.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${reason === r ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 text-gray-600'}`}
            >
              {r}
            </button>
          ))}
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Reason for rejecting (required)"
          className="mt-3 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-red-300"
        />

        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-gray-200 py-3.5 text-sm font-bold text-gray-700">
            Keep job
          </button>
          <button
            type="button"
            disabled={!valid || loading}
            onClick={() => onConfirm(reason.trim())}
            className="flex-1 rounded-2xl bg-red-500 py-3.5 text-sm font-bold text-white shadow-lg active:scale-95 transition disabled:opacity-50"
          >
            {loading ? 'Rejecting…' : 'Reject job'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectJobModal;
