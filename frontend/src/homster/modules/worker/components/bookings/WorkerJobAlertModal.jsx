import React, { useState, useEffect } from 'react';
import { FiX, FiMapPin, FiClock, FiArrowRight, FiBell, FiBriefcase, FiMinimize2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { playAlertRing, stopAlertRing } from '../../../../utils/notificationSound';
import workerService from '../../../../services/workerService';
import { toast } from 'react-hot-toast';

const WorkerJobAlertModal = ({ isOpen, jobId, onClose, onJobAccepted }) => {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (isOpen && jobId) {
      loadJobDetails();
      playAlertRing(true);
      setTimeLeft(60);
    } else {
      stopAlertRing();
      setJob(null);
    }
    return () => stopAlertRing();
  }, [isOpen, jobId]);

  useEffect(() => {
    if (!job || !isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onClose(); // Auto-close if not responded
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [job, isOpen, onClose]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      if (jobId === 'test-id') {
        // Mock data for UI testing
        setJob({
          id: 'test-id',
          serviceType: 'AC Service & Repair',
          address: '123 Main Street, Delhi',
          distance: 2.4,
        });
        setLoading(false);
        return;
      }
      const res = await workerService.getJobById(jobId);
      if (res.success) {
        setJob(res.data);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      const res = await workerService.respondToJob(jobId, 'ACCEPTED');
      if (res.success) {
        toast.success('Job Accepted Successfully!');
        onJobAccepted && onJobAccepted(jobId);
        onClose();
      } else {
        toast.error(res.message || 'Failed to accept job');
      }
    } catch (error) {
      toast.error('Failed to accept job');
    }
  };

  const handleReject = async () => {
    try {
      const res = await workerService.respondToJob(jobId, 'REJECTED');
      if (res.success) {
        toast.success('Job Declined');
        onClose();
      } else {
        toast.error(res.message || 'Failed to reject job');
      }
    } catch (error) {
      toast.error('Failed to decline job');
    }
  };

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / 60) * circumference;
  const dashoffset = circumference - progress;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          className="bg-white w-full max-w-[320px] rounded-[2rem] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative"
        >
          {/* Compact Header */}
          <div className="relative h-28 bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] flex flex-col items-center justify-center pt-2 overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full"
              />
            </div>

            <div className="relative z-10 mb-0.5">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 flex items-center justify-center shadow-lg relative">
                <FiBell className="w-5 h-5 text-white animate-bounce" />
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              </div>
            </div>

            <h2 className="relative z-10 text-white text-lg font-black tracking-tight">New Job!</h2>
            <div className="relative z-10 px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full border border-white/10 text-[8px] font-bold text-white uppercase tracking-widest">
              Action Required
            </div>
          </div>

          {/* Body Section */}
          <div className="px-5 py-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-10 h-10 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Syncing details...</p>
              </div>
            ) : job ? (
              <>
                {/* Timer Circle */}
                <motion.div 
                  initial={{ scale: 0.8 }} 
                  animate={{ scale: 1 }} 
                  className="flex justify-center -mt-12 mb-3 relative z-20"
                >
                  <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(59,130,246,0.3)] p-0.5 border-4 border-white">
                    <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r={radius} fill="none" stroke="#FFF7ED" strokeWidth="6" />
                      <motion.circle
                        cx="40" cy="40" r={radius} fill="none"
                        stroke={timeLeft <= 10 ? '#EF4444' : '#3B82F6'} strokeWidth="6"
                        strokeDasharray={circumference} strokeDashoffset={dashoffset}
                        strokeLinecap="round" className="transition-all duration-1000 ease-linear"
                      />
                    </svg>
                    <div className="text-center flex flex-col items-center">
                      <motion.span 
                        key={timeLeft}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`text-2xl font-black block leading-none ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-[#3B82F6]'}`}
                      >
                        {timeLeft}
                      </motion.span>
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mt-1">Sec</span>
                    </div>
                  </div>
                </motion.div>

                {/* Distance/Location info */}
                <div className="flex items-center justify-center mb-4 bg-blue-50/60 py-3 rounded-2xl border border-blue-100/60 shadow-sm">
                  <div className="text-center">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.1em] mb-1 block">Travel Distance</span>
                    <div className="text-xl font-black text-[#3B82F6] tracking-tight flex items-center gap-1.5 justify-center">
                      <FiMapPin className="w-4 h-4" />
                      {job.distance ? (typeof job.distance === 'number' ? `${job.distance.toFixed(1)} km` : job.distance) : 'Near You'}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[1.25rem] p-4 border border-blue-100 shadow-[0_8px_25px_-5px_rgba(59,130,246,0.12)] relative overflow-hidden mb-5">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#3B82F6]" />
                  <div className="pl-3">
                    <p className="text-[10px] font-black text-[#3B82F6]/80 uppercase tracking-[0.15em] mb-1">Service Requested</p>
                    <h4 className="text-[16px] font-black text-gray-900 leading-snug">
                      {job.serviceType || job.serviceId?.title || 'Service Request'}
                    </h4>
                    <p className="text-[11px] font-bold text-gray-500 mt-1.5 line-clamp-2">
                      {typeof job.address === 'string' ? job.address : (job.address?.addressLine1 || job.location?.address)}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleAccept}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] text-white font-black text-base shadow-[0_8px_20px_rgba(59,130,246,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    <span className="relative z-10 flex items-center gap-2">
                      <FiBriefcase className="w-5 h-5" /> Accept Job
                      <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                  <button
                    onClick={handleReject}
                    className="w-full py-2.5 rounded-xl bg-red-50 text-red-500 font-bold text-[10px] active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-1.5 border border-red-100"
                  >
                    <FiX className="w-3.5 h-3.5" /> Decline
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-red-500 font-bold text-sm">Booking details missing.</p>
                <button onClick={onClose} className="mt-4 text-xs font-bold text-gray-400 uppercase underline">Dismiss</button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WorkerJobAlertModal;

