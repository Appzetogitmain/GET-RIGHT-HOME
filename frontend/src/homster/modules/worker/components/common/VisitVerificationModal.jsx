import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheckCircle, FiCamera, FiArrowLeft, FiCreditCard } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import workerService from '../../../../services/workerService';
import { compressImage, fileToBase64 } from '../../../../utils/imageCompression';

/**
 * Reusable Visit Verification Modal
 * Used for OTP-based arrival verification by vendors/workers
 * 
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Callback to close modal
 * @param {string} bookingId - The booking ID to verify
 * @param {function} onSuccess - Callback on successful verification
 */
const VisitVerificationModal = ({ isOpen, onClose, bookingId, onSuccess }) => {
  const [otpInput, setOtpInput] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('otp');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarPhoto, setAadhaarPhoto] = useState('');
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setOtpInput(['', '', '', '']);
    setStep('otp');
    setAadhaarNumber('');
    setAadhaarPhoto('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOtpChange = (index, value) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    if (sanitized.length > 1) return;

    const newOtp = [...otpInput];
    newOtp[index] = sanitized;
    setOtpInput(newOtp);

    // OTP comes first; reveal customer verification after the fourth digit.
    if (newOtp.join('').length === 4) setStep('customer');

    // Auto-focus next input
    if (sanitized && index < 3) {
      document.getElementById(`visit-otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpInput[index] && index > 0) {
      document.getElementById(`visit-otp-${index - 1}`)?.focus();
    }
  };

  // Robust Geolocation Helper - PERMISSIVE MODE
  const getPosition = () => {
    return new Promise((resolve, reject) => {
      // FASTEST STRATEGY: Prefer Wi-Fi/Cell (Low Accuracy) + Cached Positions
      const options = {
        enableHighAccuracy: false, // Disable GPS requirement for speed
        timeout: 30000,            // 30s timeout
        maximumAge: Infinity       // Accept any valid cached position
      };

      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          console.warn("Low accuracy geo failed, trying high accuracy fallback...", error);
          // Emergency fallback: Try GPS
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
          );
        },
        options
      );
    });
  };

  const handleVerify = async () => {
    const otp = otpInput.join('');
    if (otp.length !== 4) {
      toast.error('Please enter 4-digit OTP');
      return;
    }
    const normalizedAadhaar = aadhaarNumber.replace(/\D/g, '');
    if (normalizedAadhaar.length !== 12) {
      toast.error('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    if (!aadhaarPhoto) {
      toast.error('Please upload the customer Aadhaar card photo');
      return;
    }

    setLoading(true);

    if (!navigator.geolocation) {
      toast.error('Geolocation is required for verification');
      setLoading(false);
      return;
    }

    try {
      const position = await getPosition();
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      // Use workerService instead of direct import
      const response = await workerService.verifyVisit(bookingId, otp, location, {
        aadhaarNumber: normalizedAadhaar,
        aadhaarPhoto
      });

      if (response.success) {
        toast.success('Visit Verified Successfully!');
        resetForm();
        onClose();
        onSuccess?.();
      } else {
        toast.error(response.message || 'Verification failed');
      }
    } catch (error) {
      console.error("Verification Error:", error);

      // Handle geolocation errors
      if (error.code === 1) {
        toast.error('Location permission denied. Please enable location access.');
      } else if (error.code === 2) {
        toast.error('Location unavailable. Check your GPS settings.');
      } else if (error.code === 3) {
        toast.error('Location timeout. Please try again.');
      } else {
        // API error
        toast.error(error.response?.data?.message || 'Verification failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const handleAadhaarChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaarNumber(digits.replace(/(\d{4})(?=\d)/g, '$1 '));
  };

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image');
      return;
    }
    try {
      setLoading(true);
      const compressed = await compressImage(file, { maxWidth: 1280, maxHeight: 1280, quality: 0.72 });
      setAadhaarPhoto(await fileToBase64(compressed));
    } catch {
      toast.error('Could not process this photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white w-full max-w-sm rounded-[24px] p-6 sm:p-8 shadow-2xl relative z-10 my-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 leading-tight">
                  {step === 'otp' ? 'Verify Arrival' : 'Customer Verification'}
                </h3>
                <p className="text-xs text-teal-600 font-bold uppercase tracking-wider mt-1">
                  {step === 'otp' ? 'Step 1 of 2 · Customer OTP' : 'Step 2 of 2 · Identity Details'}
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 disabled:opacity-50"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {step === 'otp' ? (
              <>
                <p className="text-gray-500 font-medium leading-relaxed mb-8">
                  Enter the <span className="text-gray-900 font-bold">4-digit code</span> provided by the customer.
                </p>
                <div className="flex justify-between gap-3 mb-5">
                  {otpInput.map((digit, idx) => (
                    <input key={idx} id={`visit-otp-${idx}`} type="text" inputMode="numeric" maxLength={1}
                      value={digit} autoFocus={idx === 0} disabled={loading}
                      className={`w-14 h-16 text-center text-2xl font-bold rounded-2xl transition-all outline-none border-2 disabled:opacity-50 ${digit ? 'border-teal-500 bg-teal-50 text-teal-900' : 'border-gray-200 bg-gray-50 text-gray-800 focus:border-teal-400 focus:bg-white'}`}
                      onChange={(e) => handleOtpChange(idx, e.target.value)} onKeyDown={(e) => handleKeyDown(idx, e)} />
                  ))}
                </div>
                <button type="button" onClick={() => otpInput.join('').length === 4 ? setStep('customer') : toast.error('Please enter 4-digit OTP')}
                  className="w-full py-4 bg-teal-600 text-white rounded-2xl font-bold text-lg">Continue</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setStep('otp')} disabled={loading}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-5">
                  <FiArrowLeft /> Change OTP
                </button>
                <label className="block text-sm font-bold text-gray-700 mb-2">Customer Aadhaar Number</label>
                <div className="relative mb-5">
                  <FiCreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" inputMode="numeric" autoComplete="off" value={aadhaarNumber} onChange={handleAadhaarChange}
                    placeholder="1234 5678 9012" className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-gray-200 outline-none focus:border-teal-500 font-semibold tracking-wider" />
                </div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Customer Aadhaar Card Photo</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={loading}
                  className="w-full h-36 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center mb-6">
                  {aadhaarPhoto ? <img src={aadhaarPhoto} alt="Customer Aadhaar card" className="w-full h-full object-cover" /> : (
                    <span className="flex flex-col items-center gap-2 text-gray-500"><FiCamera className="w-8 h-8" /><span className="font-semibold">Upload Aadhaar Card Photo</span></span>
                  )}
                </button>
                <button onClick={handleVerify} disabled={loading}
                  className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-teal-600/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2">
                  {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><FiCheckCircle className="w-5 h-5" /><span>Verify & Start Work</span></>}
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default VisitVerificationModal;

