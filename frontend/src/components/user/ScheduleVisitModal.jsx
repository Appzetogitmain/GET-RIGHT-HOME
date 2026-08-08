import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Loader2, CalendarDays } from 'lucide-react';

// Same shape NoBroker's own visit scheduler uses: pick a day, then a coarse
// time-of-day band, then a specific 2-hour window inside that band.
const TIME_BANDS = [
  {
    id: 'morning',
    label: 'Morning',
    slots: ['08:00 AM - 10:00 AM', '10:00 AM - 12:00 PM']
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    slots: ['12:00 PM - 02:00 PM', '02:00 PM - 04:00 PM']
  },
  {
    id: 'evening',
    label: 'Evening',
    slots: ['04:00 PM - 06:00 PM', '06:00 PM - 08:00 PM']
  }
];

const buildNextDays = (count = 7) => {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
};

const dayLabel = (date, index) => {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-IN', { weekday: 'short' });
};

const formatConfirmationDate = (date) =>
  date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

/**
 * Bottom-sheet visit scheduler for a property details page.
 *
 * Purely presentational + local pick-state — actually submitting the request
 * (including the login/OTP gate for guests) is the caller's job via onConfirm,
 * same division of responsibility as the page's existing Call/WhatsApp buttons.
 */
const ScheduleVisitModal = ({ isOpen, onClose, onConfirm, loading = false, confirmation = null }) => {
  const days = useMemo(() => buildNextDays(7), []);
  const [selectedDate, setSelectedDate] = useState(days[0]);
  const [activeBand, setActiveBand] = useState(TIME_BANDS[0].id);
  const [selectedSlot, setSelectedSlot] = useState(null);

  if (!isOpen) return null;

  const activeBandSlots = TIME_BANDS.find(b => b.id === activeBand)?.slots || [];

  const handleConfirm = () => {
    if (!selectedDate || !selectedSlot) return;
    onConfirm(selectedDate, selectedSlot);
  };

  const handleClose = () => {
    onClose();
    // Reset pick-state for next time, but leave it a beat so the closing
    // animation doesn't visibly reset the selection first.
    setTimeout(() => {
      setSelectedDate(days[0]);
      setActiveBand(TIME_BANDS[0].id);
      setSelectedSlot(null);
    }, 200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-xl rounded-t-[2rem] max-h-[88vh] flex flex-col shadow-2xl overflow-hidden pb-8"
        >
          <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />

          {confirmation ? (
            // ── Confirmation view ──────────────────────────────────────────
            <div className="px-6 pt-4 pb-2 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Visit scheduled!</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Your visit is scheduled successfully on{' '}
                <span className="font-bold text-slate-900">{formatConfirmationDate(confirmation.date)}</span>{' '}
                between <span className="font-bold text-slate-900">{confirmation.slotLabel}</span>.
              </p>
              <p className="text-xs text-slate-400 mt-3">
                The owner/dealer will confirm shortly. You can track this under your enquiries.
              </p>
              <button
                onClick={handleClose}
                className="mt-6 w-full py-3 bg-[#0061df] hover:bg-blue-700 text-white rounded-full text-sm font-bold active:scale-95 transition-all"
              >
                Done
              </button>
            </div>
          ) : (
            // ── Picker view ────────────────────────────────────────────────
            <>
              <div className="px-5 pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                    <CalendarDays size={16} className="text-[#0061df]" /> Schedule a Visit
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Pick a day and time that works for you</p>
                </div>
                <button onClick={handleClose} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-5">
                {/* Date chips */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Select a day</label>
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                    {days.map((d, i) => {
                      const isSelected = d.toDateString() === selectedDate.toDateString();
                      return (
                        <button
                          key={d.toISOString()}
                          onClick={() => setSelectedDate(d)}
                          className={`shrink-0 flex flex-col items-center justify-center w-16 py-2.5 rounded-2xl border-2 transition-all ${
                            isSelected ? 'bg-[#0061df]/5 border-[#0061df] text-[#0061df]' : 'bg-slate-50 border-transparent text-slate-500'
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase">{dayLabel(d, i)}</span>
                          <span className="text-base font-black mt-0.5">{d.getDate()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time band tabs */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Time of day</label>
                  <div className="flex gap-2">
                    {TIME_BANDS.map(band => (
                      <button
                        key={band.id}
                        onClick={() => { setActiveBand(band.id); setSelectedSlot(null); }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          activeBand === band.id ? 'bg-[#0061df] text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {band.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific slots within the chosen band */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Available slots</label>
                  <div className="grid grid-cols-2 gap-2">
                    {activeBandSlots.map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                          selectedSlot === slot ? 'bg-[#0061df]/5 border-[#0061df] text-[#0061df]' : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={!selectedSlot || loading}
                  className="w-full py-3.5 bg-[#0061df] hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-[#0061df] text-white rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? 'Scheduling…' : 'Confirm Visit'}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ScheduleVisitModal;
