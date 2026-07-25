import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useEnquiryModal } from '../../context/EnquiryModalContext';
import toast from 'react-hot-toast';
import { api } from '../../services/apiService';

const GlobalEnquiryModal = () => {
  const { isOpen, modalPayload, closeEnquiryModal } = useEnquiryModal();
  
  const [enquiryForm, setEnquiryForm] = useState({ name: '', email: '', phone: '', otp: '' });
  const [enquiryErrors, setEnquiryErrors] = useState({});
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [enquiryLoading, setEnquiryLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (window.lenis) window.lenis.stop();
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('overflow-hidden');
    } else {
      if (window.lenis) window.lenis.start();
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      if (window.lenis) window.lenis.start();
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const validatePhone = (phone) => {
    return /^[6-9]\d{9}$/.test(phone);
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendOtp = async () => {
    const errors = {};
    if (!enquiryForm.name.trim()) errors.name = 'Name is required';
    if (!enquiryForm.email.trim() || !validateEmail(enquiryForm.email)) errors.email = 'Valid email is required';
    if (!enquiryForm.phone.trim() || !validatePhone(enquiryForm.phone)) errors.phone = 'Valid 10-digit mobile number is required';
    
    if (Object.keys(errors).length > 0) {
      setEnquiryErrors(errors);
      return;
    }
    setEnquiryErrors({});

    setSendingOtp(true);
    try {
      await api.post('/auth/enquiry-otp', { phone: enquiryForm.phone });
      setOtpSent(true);
      toast.success('OTP sent to your mobile number!');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();

    if (!otpSent) {
      const errors = {};
      if (!enquiryForm.name.trim()) errors.name = 'Name is required';
      if (!enquiryForm.email.trim() || !validateEmail(enquiryForm.email)) errors.email = 'Valid email is required';
      if (!enquiryForm.phone.trim() || !validatePhone(enquiryForm.phone)) errors.phone = 'Valid 10-digit mobile number is required';
      
      if (Object.keys(errors).length > 0) {
        setEnquiryErrors(errors);
        toast.error('Please fill all required details first');
      } else {
        toast.error('Please click "Send OTP" to verify your number first');
      }
      return;
    }

    const errors = {};
    if (!enquiryForm.otp || !enquiryForm.otp.trim()) errors.otp = 'OTP is required';
    
    if (Object.keys(errors).length > 0) {
      setEnquiryErrors(errors);
      return;
    }
    setEnquiryErrors({});
    setEnquiryLoading(true);

    try {
      // Verify OTP and Login/Register
      const response = await api.post('/auth/verify-otp', {
        name: enquiryForm.name,
        email: enquiryForm.email,
        phone: enquiryForm.phone,
        otp: enquiryForm.otp,
        role: 'user'
      });

      if (response.data && response.data.token) {
        toast.success('Verified successfully!');
        
        // Ensure localStorage updates correctly for the entire app
        localStorage.setItem('token', response.data.token);
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          window.dispatchEvent(new Event('storage'));
        }
        
        closeEnquiryModal();
        setOtpSent(false);
        setEnquiryForm({ name: '', email: '', phone: '', otp: '' });
        
        if (modalPayload.onSuccess) {
          modalPayload.onSuccess();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Verification failed');
    } finally {
      setEnquiryLoading(false);
    }
  };

  // Determine Title dynamically
  let title = 'Contact Owner / Dealer';
  let subtitle = 'Submit enquiry to view phone number';
  if (modalPayload.targetType === 'Support') {
    title = 'Verification Required';
    subtitle = 'PLEASE VERIFY DETAILS TO PROCEED';
  } else if (modalPayload.targetType === 'Broker') {
    title = 'Contact to Broker';
  } else if (modalPayload.targetType === 'Builder') {
    title = 'Contact to Builder';
  } else if (modalPayload.targetType === 'Owner') {
    title = 'Contact to Owner';
  }

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 backdrop-blur-sm" 
        onClick={closeEnquiryModal}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-xl rounded-t-[2rem] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden pb-8 font-sans"
        >
          <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
          
          <div className="px-5 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">{title}</h3>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">{subtitle}</p>
            </div>
            <button 
              onClick={closeEnquiryModal} 
              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleEnquirySubmit} className="p-5 overflow-y-auto space-y-4 max-h-[70vh]">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 relative focus-within:border-blue-500 transition-all">
              <label className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Your Full Name *</label>
              <input
                type="text"
                required
                value={enquiryForm.name}
                onChange={(e) => {
                  setEnquiryForm({ ...enquiryForm, name: e.target.value });
                  if (enquiryErrors.name) setEnquiryErrors(prev => ({ ...prev, name: '' }));
                }}
                placeholder="e.g. John Doe"
                className="w-full bg-transparent outline-none text-xs font-bold text-slate-800"
              />
              {enquiryErrors.name && <p className="text-red-500 text-[10px] font-bold mt-1">{enquiryErrors.name}</p>}
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 relative focus-within:border-blue-500 transition-all">
              <label className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Email Address *</label>
              <input
                type="email"
                required
                value={enquiryForm.email}
                onChange={(e) => {
                  setEnquiryForm({ ...enquiryForm, email: e.target.value });
                  if (enquiryErrors.email) setEnquiryErrors(prev => ({ ...prev, email: '' }));
                }}
                placeholder="e.g. john@example.com"
                className="w-full bg-transparent outline-none text-xs font-bold text-slate-800"
              />
              {enquiryErrors.email && <p className="text-red-500 text-[10px] font-bold mt-1">{enquiryErrors.email}</p>}
            </div>

            <div>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 relative focus-within:border-blue-500 transition-all">
                  <label className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Mobile Number *</label>
                  <div className="flex items-center">
                    <span className="text-xs text-slate-500 font-bold mr-1.5">+91</span>
                    <input
                      type="tel"
                      required
                      value={enquiryForm.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setEnquiryForm({ ...enquiryForm, phone: val });
                        if (enquiryErrors.phone) setEnquiryErrors(prev => ({ ...prev, phone: '' }));
                      }}
                      placeholder="9876543210"
                      maxLength={10}
                      className="w-full bg-transparent outline-none text-xs font-bold tracking-wide text-slate-800"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={sendingOtp || !enquiryForm.phone || enquiryForm.phone.length < 10}
                  onClick={handleSendOtp}
                  className="px-4 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center shrink-0 border border-orange-100/50"
                >
                  {sendingOtp ? <Loader2 className="animate-spin text-orange-600" size={16} /> : otpSent ? 'Resend' : 'Send OTP'}
                </button>
              </div>
              {enquiryErrors.phone && <p className="text-red-500 text-[10px] font-bold mt-1">{enquiryErrors.phone}</p>}
            </div>

            {otpSent && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 relative focus-within:border-blue-500 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Enter OTP Sent</label>
                <input
                  type="text"
                  required
                  value={enquiryForm.otp}
                  onChange={(e) => {
                    setEnquiryForm({ ...enquiryForm, otp: e.target.value });
                    if (enquiryErrors.otp) setEnquiryErrors(prev => ({ ...prev, otp: '' }));
                  }}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full bg-transparent outline-none text-xs font-bold tracking-widest text-slate-800"
                />
                <span className="absolute right-3 bottom-3 text-[8px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                  Bypass: 123456
                </span>
                {enquiryErrors.otp && <p className="text-red-500 text-[10px] font-bold mt-1">{enquiryErrors.otp}</p>}
              </div>
            )}

            <div className="flex items-center gap-2 pt-3">
              <button
                type="button"
                onClick={closeEnquiryModal}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={enquiryLoading}
                className="flex-1 py-3 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                {enquiryLoading ? <Loader2 className="animate-spin text-white" size={16} /> : (otpSent ? 'Verify & Submit' : 'Verify OTP First')}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GlobalEnquiryModal;
