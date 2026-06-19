import React, { useEffect, useState } from 'react';
import { FiMapPin, FiX, FiCheckCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const WorkerArrivalModal = ({ isOpen, onClose, booking }) => {
  if (!isOpen || !booking) return null;

  const otp = String(booking.arrivalOTP || booking.visitOtp || '');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', bounce: 0.4 }}
          className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-center">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <FiX className="w-5 h-5 text-white/80" />
            </button>
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mx-auto flex items-center justify-center border border-white/30 mb-4">
              <FiMapPin className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">Professional Arrived!</h3>
            <p className="text-blue-100 text-sm mt-1">Please share this OTP to start the work</p>
          </div>

          <div className="p-8 flex flex-col items-center">
            {/* OTP Display */}
            {otp ? (
              <div className="flex justify-center gap-3 w-full">
                {otp.split('').map((digit, idx) => (
                  <div
                    key={idx}
                    className="flex-1 aspect-square max-w-[64px] bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-indigo-100 shadow-inner"
                  >
                    <span className="text-4xl font-black text-indigo-900">{digit}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">OTP not available</p>
            )}

            <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3 w-full">
              <FiCheckCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                The professional will enter this code in their app to verify the visit and begin the service.
              </p>
            </div>

            <button
              onClick={onClose}
              className="mt-6 w-full py-4 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-900/20"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WorkerArrivalModal;
