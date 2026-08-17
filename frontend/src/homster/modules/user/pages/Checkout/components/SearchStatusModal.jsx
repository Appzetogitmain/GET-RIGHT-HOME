import React, { useEffect, useState } from 'react';
import { themeColors } from '../../../../../theme';

// The backend notifies professionals in waves of 3, each wave lasting 60s
// (see backend/cron/waveScheduler.js). Mirror that here so the user gets
// progress instead of one unchanging spinner for what can be several minutes.
const WAVE_SECONDS = 60;

const SearchStatusModal = ({ isOpen, onClose, currentStep, acceptedProfessional, onRetry, bookingModel = 'worker', searchMessage, onViewBooking, onCancelBooking }) => {
  const [dots, setDots] = useState('.');
  const [elapsed, setElapsed] = useState(0);
  const isSearching = currentStep === 'searching' || currentStep === 'waiting';

  useEffect(() => {
    if (isOpen && isSearching) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '.' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isOpen, isSearching]);

  // Elapsed-time counter. Counts locally and only pushes state from the
  // interval, resetting on teardown so the next search starts from zero.
  useEffect(() => {
    if (!isOpen || !isSearching) return undefined;
    let seconds = 0;
    const t = setInterval(() => {
      seconds += 1;
      setElapsed(seconds);
    }, 1000);
    return () => {
      clearInterval(t);
      setElapsed(0);
    };
  }, [isOpen, isSearching]);

  const waveNumber = Math.floor(elapsed / WAVE_SECONDS) + 1;
  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  const progressPct = Math.round(((elapsed % WAVE_SECONDS) / WAVE_SECONDS) * 100);

  const reassurance = elapsed < WAVE_SECONDS
    ? `Notifying professionals near you${dots}`
    : elapsed < WAVE_SECONDS * 2
      ? `Still looking — reaching out to the next set of professionals${dots}`
      : `This is taking longer than usual. You can keep waiting, or cancel and try another slot.`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all relative">

        {/* Close/Minimize Button - Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 bg-white/90 rounded-full shadow-sm text-gray-400 hover:text-gray-600 transition-colors hover:bg-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {(currentStep === 'searching' || currentStep === 'waiting') && (
          <div className="flex flex-col items-center justify-center pt-10 pb-16 px-6 relative min-h-[480px]">

            {/* Map-like Background (Subtle) */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="w-full h-full" style={{
                backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}></div>
            </div>

            {/* Central Radar Animation */}
            <div className="relative w-56 h-56 flex items-center justify-center mb-8">
              {/* Outer Ripples */}
              <div className="absolute inset-0 rounded-full border-2 opacity-20 animate-ping"
                style={{ borderColor: themeColors.brand.teal, animationDuration: '3s' }}></div>
              <div className="absolute inset-4 rounded-full border opacity-40 animate-ping"
                style={{ borderColor: themeColors.brand.teal, animationDuration: '3s', animationDelay: '0.6s' }}></div>

              {/* Rotating Scanner Gradient */}
              <div className="absolute inset-0 rounded-full animate-spin-slow opacity-30"
                style={{
                  background: `conic-gradient(transparent 180deg, ${themeColors.brand.teal})`,
                  animationDuration: '4s'
                }}></div>

              {/* Center Core */}
              <div className="relative z-10 w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center p-1">
                <div className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${themeColors.brand.teal}15, ${themeColors.brand.teal}05)` }}>
                  {/* User Icon or Brand Icon */}
                  <div className="w-3 h-3 rounded-full shadow-lg animate-pulse"
                    style={{ backgroundColor: themeColors.brand.teal }}></div>
                  <div className="absolute w-full h-full animate-pulse opacity-30 rounded-full"
                    style={{ backgroundColor: themeColors.brand.teal }}></div>
                </div>
              </div>

              {/* Floating "Found" Dots Animation */}
              <div className="absolute top-8 right-8 w-2 h-2 rounded-full animate-bounce opacity-50" style={{ backgroundColor: themeColors.brand.orange, animationDelay: '0.2s' }}></div>
              <div className="absolute bottom-6 left-6 w-2 h-2 rounded-full animate-bounce opacity-50" style={{ backgroundColor: themeColors.brand.yellow, animationDelay: '1.5s' }}></div>

              {/* Countdown Timer Badge */}
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow-lg border border-gray-100 z-20"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={themeColors.brand.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span className="text-xs font-black tabular-nums" style={{ color: themeColors.brand.teal }}>
                  {mmss}
                </span>
              </div>
            </div>

            {/* Status Text */}
            <div className="text-center relative z-20 px-4 mb-4">
              <h3 className="text-xl font-black text-gray-900 mb-2">Searching nearby {bookingModel === 'worker' ? 'workers' : 'vendors'}</h3>
              <p className="text-gray-500 text-[13px] font-medium leading-relaxed min-h-[38px]">
                {searchMessage || reassurance}
              </p>
            </div>

            {/* Progress within the current outreach round */}
            <div className="w-full max-w-[240px] relative z-20 mb-3">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPct}%`, backgroundColor: themeColors.brand.teal }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] font-bold text-gray-400">
                <span>Round {waveNumber}</span>
                <span>{mmss} elapsed</span>
              </div>
            </div>

            {/* Bottom Pill - Now positioned relative to avoid overlap */}
            <div className="flex justify-center mt-1 mb-4">
              <div className="px-4 py-2 bg-gray-50 rounded-full border border-gray-100 text-[10px] font-black uppercase tracking-tighter text-gray-400">
                Searching for available {bookingModel}s
              </div>
            </div>

            {/* Cancel Search Button */}
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-sm"
            >
              Cancel Booking
            </button>

          </div>
        )}

        {currentStep === 'accepted' && acceptedProfessional && (
          <div className="flex flex-col items-center pt-12 pb-10 px-6 bg-white w-full h-full min-h-[450px]">
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-2xl animate-bounce-short"
              style={{ background: `linear-gradient(135deg, ${themeColors.brand.teal}, ${themeColors.brand.secondary})` }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            <h3 className="text-2xl font-black text-gray-900 mb-2 italic">EXPERT FOUND!</h3>
            <p className="text-gray-400 text-[10px] text-center mb-8 px-4 font-black uppercase tracking-widest">
              Request accepted by professional
            </p>

            {/* Professional Card */}
            <div className="w-full bg-gray-50 rounded-[32px] p-6 border border-gray-100 mb-10 relative overflow-hidden shadow-sm">
              <div className="relative z-10">
                <h4 className="font-black text-xl text-gray-900 mb-1">{acceptedProfessional.businessName}</h4>
                <div className="flex items-center gap-4 text-xs font-bold text-gray-500 mt-3">
                  <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                    <span className="text-yellow-400">★</span> {acceptedProfessional.rating || '4.9'}
                  </span>
                  <span className="flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1.5 rounded-full border border-green-100 uppercase tracking-tighter text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    {acceptedProfessional.distance || 'Nearby'}
                  </span>
                </div>
              </div>
              {/* Background decoration */}
              <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: themeColors.brand.teal }}></div>
            </div>

            {/* Action Button */}
            <button
              onClick={onClose}
              className="w-full text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${themeColors.brand.teal}, ${themeColors.brand.secondary})`,
              }}
            >
              Continue to Details
            </button>
          </div>
        )}

        {currentStep === 'failed' && (
          <div className="flex flex-col items-center pt-12 pb-10 px-6 bg-white w-full h-full min-h-[450px]">
            {/* Failed Icon */}
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-2xl bg-red-50 border-2 border-red-100">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>

            <h3 className="text-2xl font-black text-gray-900 mb-2 italic text-center">Booking Cancelled</h3>
            <p className="text-gray-600 text-sm text-center mb-8 px-6 font-semibold leading-relaxed">
              {searchMessage || `This booking is no longer active.`}
            </p>

            <button
              onClick={onClose}
              className="w-full text-gray-400 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
            >
              Close
            </button>
          </div>
        )}

        {/* No worker auto-accepted yet — the booking stays active and is moving
            to admin manual assignment. This is a reassuring in-progress state,
            not a dead end, so it deliberately avoids red/failure styling. */}
        {currentStep === 'manual_assignment' && (
          <div className="flex flex-col items-center pt-12 pb-10 px-6 bg-white w-full h-full min-h-[450px]">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-2xl bg-amber-50 border-2 border-amber-100">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={themeColors.brand.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>

            <h3 className="text-2xl font-black text-gray-900 mb-2 italic text-center">We're On It</h3>
            <p className="text-gray-600 text-sm text-center mb-8 px-6 font-semibold leading-relaxed">
              {searchMessage || "Your order has been taken successfully. We are currently assigning a service professional to your booking. You will receive the professional details shortly."}
            </p>

            <button
              onClick={onViewBooking}
              className="w-full text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 mb-3"
              style={{
                background: `linear-gradient(135deg, ${themeColors.brand.teal}, ${themeColors.brand.secondary})`,
              }}
            >
              View Booking Status
            </button>

            <button
              onClick={onCancelBooking}
              className="px-6 py-2.5 rounded-full border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-sm"
            >
              Cancel Booking
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default SearchStatusModal;
