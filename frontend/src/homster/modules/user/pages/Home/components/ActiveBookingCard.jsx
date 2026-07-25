import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiChevronRight, FiX } from 'react-icons/fi';

const ActiveBookingCard = () => {
  const navigate = useNavigate();
  const [activeBooking, setActiveBooking] = useState(null);

  useEffect(() => {
    const checkActiveBooking = () => {
      const stored = localStorage.getItem('activeAssignedBooking');
      if (stored) {
        setActiveBooking(JSON.parse(stored));
      } else {
        setActiveBooking(null);
      }
    };

    checkActiveBooking();
    window.addEventListener('activeAssignedBookingUpdated', checkActiveBooking);

    return () => {
      window.removeEventListener('activeAssignedBookingUpdated', checkActiveBooking);
    };
  }, []);

  if (!activeBooking) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="fixed bottom-[88px] left-0 right-0 z-30 px-4 pointer-events-none lg:hidden"
      >
        <div className="max-w-md mx-auto pointer-events-auto">
          <div
            onClick={() => navigate(`/user/booking/${activeBooking.bookingId}`)}
            className="bg-blue-600 rounded-2xl shadow-[0_8px_30px_rgba(37,99,235,0.3)] p-3 cursor-pointer relative overflow-hidden"
          >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shrink-0">
                  <FiClock className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Active Booking</h4>
                  <p className="text-blue-100 text-xs">
                    {activeBooking.worker?.name ? `${activeBooking.worker.name} is assigned` : 'Your expert is assigned!'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center shrink-0 border border-white/20">
                  <FiChevronRight className="w-5 h-5 text-white" />
                </div>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    const activeBookingData = JSON.parse(localStorage.getItem('activeAssignedBooking'));
                    if (activeBookingData && activeBookingData.bookingId) {
                       const dismissed = JSON.parse(localStorage.getItem('dismissedActiveBookings') || '[]');
                       if (!dismissed.includes(activeBookingData.bookingId)) {
                           dismissed.push(activeBookingData.bookingId);
                           // Keep only last 20 to avoid unbounded growth
                           if (dismissed.length > 20) dismissed.shift();
                           localStorage.setItem('dismissedActiveBookings', JSON.stringify(dismissed));
                       }
                    }
                    localStorage.removeItem('activeAssignedBooking');
                    window.dispatchEvent(new Event('activeAssignedBookingUpdated'));
                  }}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center shrink-0 border border-white/20 transition-colors"
                >
                  <FiX className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ActiveBookingCard;
