import React, { useState } from 'react';
import { FiAlertCircle, FiX } from 'react-icons/fi';
import { themeColors } from '../../theme';

// Cancellation reasons, matching the required customer cancellation workflow.
const CANCELLATION_REASONS = [
  'Service no longer required',
  'Worker not assigned',
  'Taking too long',
  'Price too high',
  'Wrong service',
  'Wrong date/time',
  'Found another provider',
  'Personal/emergency reason',
  'Other'
];

/**
 * CancelBookingModal — asks for a cancellation reason (+ optional comments)
 * before cancelling, instead of a plain yes/no confirm. Shared by every
 * "Cancel Booking" entry point so the collected reason/feedback is consistent.
 *
 * onConfirm receives the final reason string to send as `cancellationReason`.
 */
const CancelBookingModal = ({ isOpen, onClose, onConfirm, feeWarning, loading = false }) => {
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');

  if (!isOpen) return null;

  const isOtherReason = reason === 'Other';
  const canConfirm = reason && (!isOtherReason || comments.trim().length > 0);

  const handleClose = () => {
    setReason('');
    setComments('');
    onClose();
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    const finalReason = comments.trim() ? `${reason} — ${comments.trim()}` : reason;
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <FiX className="w-5 h-5 text-gray-500" />
        </button>

        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-50">
          <FiAlertCircle className="w-8 h-8 text-red-500" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Cancel Booking</h3>
        <p className="text-sm text-gray-600 text-center mb-4">
          Please let us know why you're cancelling — this helps us improve.
        </p>

        {feeWarning && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
            {feeWarning}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Reason for cancelling
          </label>
          <div className="flex flex-wrap gap-2">
            {CANCELLATION_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  reason === r
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
                style={reason === r ? { backgroundColor: themeColors.button || '#00a6a6' } : undefined}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Additional comments {isOtherReason ? '(required)' : '(optional)'}
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={isOtherReason ? 'Please tell us more...' : 'Anything else you want us to know?'}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 transition-all resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-3.5 rounded-xl font-bold border-2 border-gray-100 text-gray-600 transition-all active:scale-95 hover:bg-gray-50 disabled:opacity-50"
          >
            Keep Booking
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="flex-1 py-3.5 rounded-xl font-bold text-white transition-all active:scale-95 hover:brightness-105 disabled:opacity-50 disabled:pointer-events-none"
            style={{ background: '#EF4444' }}
          >
            {loading ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;
