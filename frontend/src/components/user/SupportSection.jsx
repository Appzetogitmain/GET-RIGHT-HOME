import React, { useState, useEffect } from 'react';
import { Star, Phone, MessageCircle, MessageSquare, Heart, X, Loader2, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { feedbackService, authService, legalService } from '../../services/apiService';
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
  const [supportPhone, setSupportPhone] = useState('+91 63044 71791');
  const [supportPhoneRaw, setSupportPhoneRaw] = useState('+916304471791');
  const [supportEmail, setSupportEmail] = useState('getrighthome7@gmail.com');

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

  const fetchContactInfo = async () => {
    try {
      const res = await legalService.getAdminContact();
      if (res && res.success) {
        setSupportEmail(res.email);
        setSupportPhoneRaw(res.phone);
        // Format the phone if it's 10 digits
        const digits = res.phone.replace(/\D/g, '');
        if (digits.length === 12 && digits.startsWith('91')) {
          setSupportPhone(`+91 ${digits.slice(2, 7)} ${digits.slice(7)}`);
        } else if (digits.length === 10) {
          setSupportPhone(`+91 ${digits.slice(0, 5)} ${digits.slice(5)}`);
        } else {
          setSupportPhone(res.phone);
        }
      }
    } catch (err) {
      console.error('Failed to load contact info:', err);
    }
  };

  useEffect(() => {
    fetchUserFeedback();
    fetchContactInfo();

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
    } else if (action.type === 'email') {
      window.location.href = `mailto:${supportEmail}`;
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
          <div className="flex justify-between items-center px-4 text-[10px] font-semibold text-slate-400 mb-6 uppercase tracking-wider">
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

            <div className="flex items-center justify-center gap-4 w-full max-w-md mx-auto">
              {isSaved && (
                <button
                  type="button"
                  onClick={handleDeleteFeedback}
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-2xl transition-all disabled:opacity-50 whitespace-nowrap text-center"
                >
                  Remove Feedback
                </button>
              )}
              <button
                type="submit"
                disabled={loading || rating === 0}
                className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-2xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 whitespace-nowrap text-center"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : isSaved ? 'Update Review' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 2. Get Support Section */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center gap-2.5 text-slate-500 font-semibold text-base px-1">
          <Headphones size={20} className="text-slate-400 stroke-[1.75]" />
          <span>Get support</span>
        </div>

        {/* Support Options Card */}
        <div className="bg-white rounded-[24px] border border-slate-100/80 shadow-sm overflow-hidden divide-y divide-slate-100">
          {/* Toll Free Option */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Call on support number</span>
              <span className="text-base font-extrabold text-slate-800 mt-1 block">{supportPhone}</span>
            </div>
            <button
              onClick={() => handleSupportAction('call')}
              className="w-12 h-12 rounded-[14px] bg-[#EEF2F6]/80 hover:bg-[#E2E8F0] flex items-center justify-center transition-all cursor-pointer"
              title="Call Support"
            >
              <Phone size={18} className="fill-[#0d6efd] text-[#0d6efd]" />
            </button>
          </div>

          {/* Chat with us Option */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chat with us</span>
              <span className="text-base font-extrabold text-slate-800 mt-1 block">WhatsApp | Chat</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleSupportAction('whatsapp')}
                className="w-12 h-12 rounded-[14px] bg-[#EEF2F6]/80 hover:bg-[#E2E8F0] flex items-center justify-center transition-all cursor-pointer"
                title="Chat via WhatsApp"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" className="fill-[#25D366]">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.498 1.45 5.419 1.451 5.428 0 9.848-4.42 9.851-9.85.002-2.63-1.019-5.1-2.872-6.956-1.854-1.855-4.325-2.877-6.953-2.878-5.433 0-9.854 4.421-9.856 9.852-.001 1.93.502 3.816 1.457 5.429L1.712 21.8l4.935-1.294z" />
                  <path d="M12.004 3.731c-4.484 0-8.132 3.648-8.134 8.134a8.106 8.106 0 0 0 1.258 4.316l-.824 3.013 3.083-.808a8.093 8.093 0 0 0 4.617 1.413c4.483 0 8.132-3.648 8.134-8.134a8.12 8.12 0 0 0-8.134-8.134zm4.846 11.385c-.266-.134-1.573-.775-1.817-.864-.243-.089-.422-.134-.599.134-.177.268-.687.864-.842 1.042-.156.177-.312.2-.578.067-.266-.134-1.123-.414-2.14-1.322-.79-.705-1.324-1.577-1.48-1.844-.156-.268-.017-.412.117-.545.12-.12.266-.312.4-.467.133-.156.177-.267.266-.445.089-.178.045-.334-.022-.467-.067-.134-.599-1.442-.82-1.975-.215-.518-.432-.448-.599-.457l-.51-.01c-.178 0-.467.067-.71.334-.244.267-.932.912-.932 2.224 0 1.312.954 2.58 1.088 2.758.133.178 1.877 2.867 4.548 4.02.635.275 1.13.438 1.517.562.638.203 1.22.175 1.679.106.512-.077 1.573-.642 1.795-1.264.222-.622.222-1.156.156-1.267-.067-.111-.244-.178-.51-.312z" />
                </svg>
              </button>
              <button
                onClick={() => handleSupportAction('chat')}
                className="w-12 h-12 rounded-[14px] bg-[#EEF2F6]/80 hover:bg-[#E2E8F0] flex items-center justify-center transition-all cursor-pointer"
                title="Live Chat"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" className="fill-[#0D6EFD] text-[#0D6EFD]">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Email Support Option */}
          <div className="p-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Support</span>
              <a href={`mailto:${supportEmail}`} className="text-base font-extrabold text-[#0d6efd] hover:underline mt-1 block">{supportEmail}</a>
            </div>
            <button
              onClick={() => handleSupportAction('email')}
              className="w-12 h-12 rounded-[14px] bg-[#EEF2F6]/80 hover:bg-[#E2E8F0] flex items-center justify-center transition-all cursor-pointer"
              title="Email Support"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" className="fill-none stroke-[#0d6efd] stroke-[2] stroke-linecap-round stroke-linejoin-round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </button>
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
