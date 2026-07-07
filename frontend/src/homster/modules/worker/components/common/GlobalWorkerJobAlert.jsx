import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiX, FiMapPin, FiClock, FiCheck, FiBell, FiMinimize2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { workerTheme as themeColors } from '../../../../theme';
import { playAlertRing, stopAlertRing } from '../../../../utils/notificationSound';
import workerService from '../../../../services/workerService';

const WorkerAlertCard = ({ booking, onAccept, onReject, initialTimeLeft = 120 }) => {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const [loadingAction, setLoadingAction] = useState(null);

  const handleAction = async (actionFn, actionType) => {
    if (loadingAction) return;
    setLoadingAction(actionType);
    const bookingId = booking.id || booking._id;
    try {
      if (actionFn) await actionFn(bookingId);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAction(null);
    }
  };

  useEffect(() => {
    if (!booking) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReject?.(booking.id || booking._id, true); // true = auto-reject
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [booking, onReject]);

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / initialTimeLeft) * circumference;
  const dashoffset = circumference - progress;

  return (
    <div className="bg-white w-full sm:w-[320px] flex-none rounded-[2rem] overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] relative snap-center">
      {/* Header Section */}
      <div className="relative h-20 bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col items-center justify-center">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-10 -left-10 w-32 h-32 bg-white rounded-full"
          />
        </div>

        <div className="flex items-center gap-2 relative z-10 w-full px-4 justify-center">
          <div className="w-8 h-8 bg-white/10 backdrop-blur-xl rounded-lg border border-white/20 flex items-center justify-center shadow-md relative">
            <FiBell className="w-4 h-4 text-white animate-bounce" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-white text-lg font-black tracking-tight leading-none">New Job Assigned!</h2>
            <div className="text-[8px] font-bold text-blue-100 uppercase tracking-widest mt-0.5">
              Action Required Quickly
            </div>
          </div>
        </div>
      </div>

      {/* Body Section */}
      <div className="px-5 py-4">
        <div className="flex justify-center -mt-9 mb-3 relative z-20">
          <div className="relative w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl p-0.5">
            <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="4" />
              <motion.circle
                cx="30" cy="30" r={radius} fill="none"
                stroke={timeLeft <= 30 ? '#EF4444' : '#4F46E5'} strokeWidth="5" // Indigo for worker config
                strokeDasharray={circumference} strokeDashoffset={dashoffset}
                strokeLinecap="round" className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="text-center mt-0.5">
              <span className={`text-xl font-black block leading-none ${timeLeft <= 30 ? 'text-red-500' : 'text-blue-600'}`}>{timeLeft}</span>
              <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter block -mt-1">Sec</span>
            </div>
          </div>
        </div>

        <div className="mb-4 space-y-2.5">
          {/* Service Details Card */}
          <div className="bg-white rounded-[1rem] p-3 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <div className="pl-2 flex flex-col h-full">
              <h4 className="text-[14px] font-black text-gray-900 leading-tight">
                {booking.serviceName || booking.serviceType || 'Service Job'}
              </h4>
              
              {/* Display Booked Items or Requirement Text */}
              <div className="mt-2 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                {booking.isConsultancyRequest && booking.requirementText && (
                  <p className="text-[11px] text-gray-600 bg-orange-50/50 p-2 rounded-lg border border-orange-100/50 italic leading-snug">
                    <span className="font-bold text-orange-600 block mb-0.5 not-italic">Problem Description:</span>
                    "{booking.requirementText}"
                  </p>
                )}
                {booking.bookedItems && booking.bookedItems.length > 0 && (
                  <div className="space-y-1">
                    {booking.bookedItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-[11px] border-b border-gray-50/50 pb-1 last:border-0 last:pb-0">
                        <span className="text-gray-700 font-medium leading-tight line-clamp-2 pr-2">
                          <span className="font-bold text-blue-600 mr-1">{item.quantity}x</span>
                          {item.brandName || item.card?.title || 'Service Item'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-50 mt-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Total Price
                </span>
                <span className={`text-[13px] font-black ${booking.isEstimateBased ? 'text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100' : 'text-green-600'}`}>
                  {booking.isEstimateBased ? 'Estimate Based' : `₹${booking.price || 'N/A'}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-5 text-xs space-y-2">
          <div className="flex items-start gap-2">
            <FiMapPin className="text-gray-400 w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="font-bold text-gray-800 leading-snug line-clamp-2">{booking.location?.address || booking.address?.addressLine1 || 'Address not available'}</span>
          </div>
          <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
            <FiClock className="text-gray-400 w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="font-bold text-gray-800">
              {booking.timeSlot?.date || (booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString() : '')} {booking.timeSlot?.time || booking.scheduledTime || 'N/A'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            disabled={!!loadingAction}
            onClick={() => handleAction(onAccept, 'accept')}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            <FiCheck className="w-4 h-4" /> {loadingAction === 'accept' ? '...' : 'Accept Job'}
          </button>

          <button
            disabled={!!loadingAction}
            onClick={() => handleAction(onReject, 'reject')}
            className="w-full py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm shadow-none active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            <FiX className="w-4 h-4" /> {loadingAction === 'reject' ? '...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function GlobalWorkerJobAlert() {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleShowAlert = (e) => {
      if (e.detail) {
        let isNew = false;
        setActiveAlerts(prev => {
          if (prev.find(b => String(b.id || b._id) === String(e.detail.id || e.detail._id))) return prev;
          isNew = true;
          return [e.detail, ...prev];
        });
        if (isNew) {
          playAlertRing(true);
        }
      }
    };

    const handleRemoveAlert = (e) => {
      if (e.detail?.id) {
        setActiveAlerts(prev => {
          const np = prev.filter(b => String(b.id || b._id) !== String(e.detail.id));
          return np;
        });
        
        // Use a setTimeout to allow state to settle, or check current length
        setActiveAlerts(prev => {
          if (prev.length === 0) { 
             stopAlertRing();
          }
          return prev;
        });
      }
    };

    window.addEventListener('showWorkerJobAlert', handleShowAlert);
    window.addEventListener('removeWorkerJobAlert', handleRemoveAlert);

    return () => {
      window.removeEventListener('showWorkerJobAlert', handleShowAlert);
      window.removeEventListener('removeWorkerJobAlert', handleRemoveAlert);
      stopAlertRing();
    };
  }, []);

  const handleAccept = async (id) => {
    try {
      await workerService.respondToJob(id, 'ACCEPTED');

      // Clear from pending local storage
      const pendingJobs = JSON.parse(localStorage.getItem('workerPendingJobs') || '[]');
      const updated = pendingJobs.filter(b => String(b.id || b._id) !== String(id));
      localStorage.setItem('workerPendingJobs', JSON.stringify(updated));

      setActiveAlerts(prev => prev.filter(b => String(b.id || b._id) !== String(id)));
      
      // Stop alert ring if this was the last alert
      if (activeAlerts.length <= 1) {
        stopAlertRing();
      }

      window.dispatchEvent(new Event('workerJobsUpdated'));
      toast.success('Job Accepted Successfully!');
      navigate(`/worker/job/${id}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to accept job');
    }
  };

  const handleReject = async (id, isAutoReject = false) => {
    try {
      await workerService.respondToJob(id, 'REJECTED');
    } catch (error) {
      console.error("Failed to reject on backend", error);
    } finally {
      const pendingJobs = JSON.parse(localStorage.getItem('workerPendingJobs') || '[]');
      const updated = pendingJobs.filter(b => String(b.id || b._id) !== String(id));
      localStorage.setItem('workerPendingJobs', JSON.stringify(updated));

      setActiveAlerts(prev => prev.filter(b => String(b.id || b._id) !== String(id)));
      
      // Stop alert ring if this was the last alert
      if (activeAlerts.length <= 1) {
        stopAlertRing();
      }

      if (!isAutoReject) toast.success('Job Rejected');
      window.dispatchEvent(new Event('workerJobsUpdated'));
    }
  };

  if (activeAlerts.length === 0) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
        <button onClick={() => { stopAlertRing(); setActiveAlerts([]); }} className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full text-white transition-all active:scale-95" title="Minimize Alert">
          <FiMinimize2 className="w-5 h-5" />
        </button>

        <div className="w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide flex gap-4 px-8 items-center h-full">
          <div className="flex gap-4 m-auto">
            {activeAlerts.map(b => (
              <WorkerAlertCard
                key={b.id || b._id}
                booking={b}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>

        {activeAlerts.length > 1 && (
          <div className="absolute bottom-10 left-0 right-0 flex justify-center text-white text-sm font-medium animate-pulse drop-shadow-lg">
            Swipe to see all {activeAlerts.length} alerts →
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}

