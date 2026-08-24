import React, { useState } from 'react';
import { AlertTriangle, X, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/apiService';

const DEFAULT_EMERGENCY_MESSAGE = 'I feel unsafe / need urgent help — please contact me immediately.';

/**
 * Silent SOS — sends a message + best-effort location straight to admin.
 * Never places a call. Same backend endpoint (/api/users/emergency) as the
 * homster module's EmergencySOSButton — same User accounts, same Admin
 * notification pipeline.
 */
const EmergencySOSButton = () => {
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState(DEFAULT_EMERGENCY_MESSAGE);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      let location = null;
      try {
        location = await new Promise((resolve) => {
          if (!navigator.geolocation) return resolve(null);
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 3000 }
          );
        });
      } catch {
        location = null;
      }

      const res = await api.post('/users/emergency', { message: message.trim(), location });
      if (res.data.success) {
        toast.success('Alert sent to admin');
        setShowModal(false);
        setMessage(DEFAULT_EMERGENCY_MESSAGE);
      } else {
        toast.error(res.data.message || 'Failed to send alert');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send alert');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        title="Emergency SOS"
        className="relative p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-all active:scale-90"
      >
        <AlertTriangle size={20} strokeWidth={1.75} />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-red-600 px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-black text-base leading-tight">Emergency SOS</h3>
                <p className="text-red-100 text-[11px]">This silently alerts admin — no call is made</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                disabled={sending}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white active:scale-95 transition-all disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5 block">
                Message to admin
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
                rows={4}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none disabled:opacity-60"
                placeholder="Describe what's happening..."
              />
              <p className="text-[10px] text-gray-400 mt-1.5">
                A default message is filled in — send as-is or edit it. Your current location is shared if available.
              </p>
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="w-full mt-4 py-3.5 rounded-xl bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {sending ? 'Sending...' : <><Send size={16} /> Send Alert to Admin</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencySOSButton;
