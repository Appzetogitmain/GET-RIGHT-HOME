import React, { useState, useEffect } from 'react';
import { Star, Phone, MessageCircle, MessageSquare, Heart, X, Loader2, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { feedbackService, authService } from '../../services/apiService';
import toast from 'react-hot-toast';

const SupportSection = () => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(null);

  // Lazy Login Modal States
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    otp: '',
    message: 'Interested in support / feedback.'
  });
  const [enquiryErrors, setEnquiryErrors] = useState({});
  const [actionAfterLogin, setActionAfterLogin] = useState(null); // { type: 'feedback'|'call'|'whatsapp'|'callback', payload: any }

  // Support details
  const supportPhone = '+91 63044 71791';
  const supportPhoneRaw = '+916304471791';

  const checkLogin = () => {
    return !!localStorage.getItem('user');
  };

  const fetchUserFeedback = async () => {
    if (!checkLogin()) return;
    try {
      const res = await feedbackService.getMyFeedback();
      if (res && res.success && res.feedback) {
        setSavedFeedback(res.feedback);
        setRating(res.feedback.rating);
        setReviewText(res.feedback.review || '');
        setIsSaved(true);
      } else {
        setSavedFeedback(null);
        setIsSaved(false);
      }
    } catch (err) {
      console.error('Failed to load feedback:', err);
    }
  };

  useEffect(() => {
    fetchUserFeedback();

    // Listen for storage events (login/logout changes)
    const handleStorageChange = () => {
      fetchUserFeedback();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const triggerAction = async (action) => {
    if (action.type === 'call') {
      window.location.href = `tel:${supportPhoneRaw}`;
    } else if (action.type === 'whatsapp') {
      const msg = encodeURIComponent("Hi, I need support regarding Get Right Home.");
      window.open(`https://wa.me/${supportPhoneRaw.replace('+', '')}?text=${msg}`, '_blank');
    } else if (action.type === 'callback') {
      toast.success("Callback requested! Our support team will contact you shortly.");
    } else if (action.type === 'feedback') {
      await submitFeedbackData(action.payload.rating, action.payload.review);
    }
  };

  const handleSupportAction = (type) => {
    if (!checkLogin()) {
      setActionAfterLogin({ type });
      setShowEnquiryModal(true);
      return;
    }
    triggerAction({ type });
  };

  const handleRatingClick = (selectedRating) => {
    if (!checkLogin()) {
      setActionAfterLogin({
        type: 'feedback',
        payload: { rating: selectedRating, review: reviewText }
      });
      setShowEnquiryModal(true);
      return;
    }
    setRating(selectedRating);
  };

  const submitFeedbackData = async (r, text) => {
    setLoading(true);
    try {
      const res = await feedbackService.saveFeedback({ rating: r, review: text });
      if (res && res.success) {
        toast.success(isSaved ? "Feedback updated successfully!" : "Feedback submitted! Thank you.");
        setSavedFeedback(res.feedback);
        setIsSaved(true);
      }
    } catch (err) {
      toast.error(err.message || "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a star rating first");
      return;
    }
    if (!checkLogin()) {
      setActionAfterLogin({
        type: 'feedback',
        payload: { rating, review: reviewText }
      });
      setShowEnquiryModal(true);
      return;
    }
    submitFeedbackData(rating, reviewText);
  };

  const handleDeleteFeedback = async () => {
    setLoading(true);
    try {
      const res = await feedbackService.deleteFeedback();
      if (res && res.success) {
        toast.success("Feedback removed successfully");
        setRating(0);
        setReviewText('');
        setIsSaved(false);
        setSavedFeedback(null);
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete feedback");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!enquiryForm.phone || enquiryForm.phone.length < 10) {
      setEnquiryErrors({ phone: "Please enter a valid 10-digit phone number" });
      return;
    }
    setSendingOtp(true);
    try {
      await authService.sendOtp(enquiryForm.phone, 'login', 'user');
      setOtpSent(true);
      toast.success("OTP sent successfully! (Use 123456 to bypass)");
    } catch (err) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!enquiryForm.name) errors.name = "Name is required";
    if (!enquiryForm.phone) errors.phone = "Phone number is required";
    if (!enquiryForm.otp) errors.otp = "OTP is required";
    if (Object.keys(errors).length > 0) {
      setEnquiryErrors(errors);
      return;
    }
    setEnquiryErrors({});
    setEnquiryLoading(true);

    try {
      const response = await authService.lazyEnquiryLogin({
        name: enquiryForm.name,
        email: enquiryForm.email || `${enquiryForm.phone}@getrighthome.com`,
        phone: enquiryForm.phone,
        otp: enquiryForm.otp,
        message: enquiryForm.message
      });

      if (response.success) {
        toast.success("Details verified successfully!");
        setShowEnquiryModal(false);
        setOtpSent(false);
        setEnquiryForm({ name: '', email: '', phone: '', otp: '', message: 'Interested in support / feedback.' });
        
        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));
          // Dispatch storage event to let app know user is logged in
          window.dispatchEvent(new Event('storage'));
        }

        if (actionAfterLogin) {
          await triggerAction(actionAfterLogin);
          setActionAfterLogin(null);
        }
      }
    } catch (err) {
      const errData = err.response?.data || err;
      toast.error(errData?.message || "Verification failed");
    } finally {
      setEnquiryLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#f8fafc] py-12 px-6 border-t border-slate-100 font-sans max-w-4xl mx-auto">
      {/* 1. Feedback Card */}
      <div className="bg-gradient-to-br from-[#FFF9F2] to-[#FFF0DF] rounded-[24px] p-6 shadow-sm border border-[#FFE7CD] mb-8 relative overflow-hidden">
        {/* Decorative subtle shine */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/30 rounded-full blur-2xl" />

        <div className="text-center max-w-lg mx-auto">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Are you finding us helpful?</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">Your feedback will help us make Get Right Home better.</p>

          {/* Interactive Star Rating */}
          <div className="flex justify-center items-center gap-3 mb-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const isActive = (hoverRating || rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => handleRatingClick(star)}
                  className="transition-transform active:scale-90 duration-150 relative p-1 focus:outline-none"
                >
                  <Star
                    size={36}
                    className={`transition-colors duration-200 ${
                      isActive 
                        ? 'text-amber-400 fill-amber-400 drop-shadow-[0_2px_4px_rgba(251,191,36,0.2)]' 
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Text Labels */}
          <div className="flex justify-between items-center px-4 text-[10px] font-bold text-amber-700/80 mb-6 uppercase tracking-wider">
            <span>Not Really</span>
            <span>Loving It</span>
          </div>

          {/* Feedback Review Form */}
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Tell us what you like or how we can improve..."
              className="w-full bg-white border border-slate-200/80 rounded-xl p-3 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all font-medium text-slate-700 min-h-[70px] resize-none"
            />

            <div className="flex items-center justify-center gap-3">
              {isSaved && (
                <button
                  type="button"
                  onClick={handleDeleteFeedback}
                  disabled={loading}
                  className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  Remove Feedback
                </button>
              )}
              <button
                type="submit"
                disabled={loading || rating === 0}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : isSaved ? 'Update Review' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 2. Get Support Section */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm uppercase tracking-wider px-1">
          <Headphones size={18} className="text-slate-600" />
          <span>Get Support</span>
        </div>

        {/* Support Options Card */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
          {/* Toll Free Option */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Call on support number</span>
              <span className="text-base font-extrabold text-slate-800 mt-1 block">{supportPhone}</span>
            </div>
            <button
              onClick={() => handleSupportAction('call')}
              className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-all"
              title="Call Support"
            >
              <Phone size={16} className="fill-slate-600 text-slate-600" />
            </button>
          </div>

          {/* Chat with us Option */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Chat with us</span>
              <span className="text-base font-extrabold text-slate-800 mt-1 block">WhatsApp | Chat</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSupportAction('whatsapp')}
                className="w-10 h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-all"
                title="Chat via WhatsApp"
              >
                <MessageCircle size={18} className="fill-emerald-600 text-emerald-600" />
              </button>
              <button
                onClick={() => handleSupportAction('chat')}
                className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-all"
                title="Live Chat"
              >
                <MessageSquare size={16} className="fill-blue-600 text-blue-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Request Callback CTA */}
        <button
          onClick={() => handleSupportAction('callback')}
          className="w-full py-3.5 bg-[#0d6efd] hover:bg-[#0b5ed7] text-white font-bold rounded-xl text-xs shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Phone size={14} className="fill-white" />
          <span>Request a callback</span>
        </button>
      </div>

      {/* LAZY LOGIN / OTP drawer MODAL */}
      <AnimatePresence>
        {showEnquiryModal && (
          <div
            className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowEnquiryModal(false);
              setOtpSent(false);
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-xl rounded-t-[2.5rem] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden pb-8"
            >
              {/* Drawer handle indicator */}
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />

              <div className="px-6 pb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Verification Required</h3>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Please verify details to proceed</p>
                </div>
                <button
                  onClick={() => {
                    setShowEnquiryModal(false);
                    setOtpSent(false);
                  }}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleEnquirySubmit} className="p-6 overflow-y-auto space-y-4 max-h-[70vh]">
                {/* Name */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 focus-within:border-amber-400 transition-all">
                  <label className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Your Full Name</label>
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
                  {enquiryErrors.name && (
                    <p className="text-red-500 text-[10px] font-bold mt-1">{enquiryErrors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 focus-within:border-amber-400 transition-all">
                  <label className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Email Address</label>
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
                  {enquiryErrors.email && (
                    <p className="text-red-500 text-[10px] font-bold mt-1">{enquiryErrors.email}</p>
                  )}
                </div>

                {/* Phone + Send OTP */}
                <div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-3 focus-within:border-amber-400 transition-all">
                      <label className="text-[9px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">Mobile Number</label>
                      <div className="flex items-center">
                        <span className="text-xs text-slate-500 font-bold mr-1.5">+91</span>
                        <input
                          type="tel"
                          required
                          value={enquiryForm.phone}
                          onChange={(e) => {
                            setEnquiryForm({ ...enquiryForm, phone: e.target.value });
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
                      className="px-4 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center shrink-0 border border-amber-100/50"
                    >
                      {sendingOtp ? <Loader2 className="animate-spin" size={16} /> : otpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  </div>
                  {enquiryErrors.phone && (
                    <p className="text-red-500 text-[10px] font-bold mt-1">{enquiryErrors.phone}</p>
                  )}
                </div>

                {/* OTP */}
                {otpSent && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 relative focus-within:border-amber-400 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
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
                    {enquiryErrors.otp && (
                      <p className="text-red-500 text-[10px] font-bold mt-1">{enquiryErrors.otp}</p>
                    )}
                  </div>
                )}

                {/* Submit / Cancel buttons */}
                <div className="flex items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEnquiryModal(false);
                      setOtpSent(false);
                    }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={enquiryLoading}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    {enquiryLoading ? <Loader2 className="animate-spin text-white" size={16} /> : 'Verify & Submit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupportSection;
