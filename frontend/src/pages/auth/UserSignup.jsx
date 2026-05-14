import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, ArrowRight, Loader2, Shield, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/rokologin-removebg-preview.png';
import { authService, userService } from '../../services/apiService';
import { requestNotificationPermission } from '../../utils/firebase';
import toast from 'react-hot-toast';

const UserSignup = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [step, setStep] = useState(1); // 1: Enter Details, 2: Enter OTP
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: ''
    });
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(120);
    const [canResend, setCanResend] = useState(false);

    // Pre-fill phone if coming from login
    useEffect(() => {
        if (location.state?.phone) {
            setFormData(prev => ({ ...prev, phone: location.state.phone }));
        }
    }, [location]);

    // Timer countdown effect
    useEffect(() => {
        let interval;
        if (step === 2 && resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        } else if (resendTimer === 0) {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [step, resendTimer === 0]); // Re-run when step changes or timer hits 0

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name || formData.name.length < 3) {
            setError('Please enter your full name');
            return;
        }

        if (formData.phone.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        try {
            setLoading(true);
            await authService.sendOtp(formData.phone, 'register');
            setResendTimer(120);
            setCanResend(false);
            setStep(2);
        } catch (err) {
            // Check if account already exists
            if (err.response?.data?.requiresLogin ||
                err.response?.status === 409 ||
                err.message?.includes('already exists')) {
                setError('Account already exists. Redirecting to login...');
                setTimeout(() => {
                    navigate('/login', { state: { phone: formData.phone } });
                }, 1500);
            } else {
                setError(err.message || 'Failed to send OTP');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOTPChange = (index, value) => {
        if (value.length > 1) return;
        if (!/^\d*$/.test(value)) return; // Only allow numbers

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }
    };

    const handleResendOTP = async () => {
        if (!canResend) return;

        try {
            setLoading(true);
            setError('');
            await authService.sendOtp(formData.phone, 'register');
            setResendTimer(120);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']); // Clear OTP
            toast.success('OTP sent successfully!');
        } catch (err) {
            setError(err.message || 'Failed to resend OTP');
            toast.error(err.message || 'Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Please enter complete OTP');
            return;
        }

        try {
            setLoading(true);
            // Send name (required), phone, otp, and email (optional)
            await authService.verifyOtp({
                phone: formData.phone,
                otp: otpString,
                name: formData.name,
                email: formData.email || undefined // Only send if provided
            });

            // Update FCM Token after successful registration
            try {
                const fcmToken = await requestNotificationPermission();
                if (fcmToken) {
                    await userService.updateFcmToken(fcmToken, 'web');
                }
            } catch (fcmError) {
                console.warn('FCM update failed after signup', fcmError);
            }

            navigate('/');
        } catch (err) {
            setError(err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.2 }}
                        className="inline-block mb-4"
                    >
                        <div className="flex flex-col items-start">
                            <span className="text-4xl font-black tracking-tighter text-[#111827] flex items-center gap-1">
                                HOOM<span className="text-amber-600">ZO</span>
                            </span>
                            <div className="h-1 w-8 bg-amber-600 rounded-full -mt-1 shadow-sm"></div>
                        </div>
                    </motion.div>
                    <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
                    <p className="text-gray-500 mt-2">Join thousands of happy travelers</p>
                </div>

                <motion.div
                    layout
                    className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100"
                >
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h2 className="text-xl font-bold text-gray-900 mb-6">Sign Up</h2>

                                <form onSubmit={handleSendOTP} className="space-y-5">
                                    {/* Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="John Doe"
                                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Phone Number <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="9876543210"
                                                maxLength={10}
                                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Email (Optional) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Address <span className="text-gray-400 text-xs">(Optional)</span>
                                        </label>
                                        <div className="relative">
                                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="you@example.com"
                                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-red-500 text-sm"
                                        >
                                            {error}
                                        </motion.p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-amber-600 to-amber-700 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            <>
                                                Continue
                                                <ArrowRight size={20} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Shield size={32} className="text-amber-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">Verify OTP</h2>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Code sent to +91 {formData.phone}
                                    </p>
                                </div>

                                <form onSubmit={handleVerifyOTP} className="space-y-6">
                                    <div className="flex gap-2 justify-center">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                id={`otp-${index}`}
                                                type="tel"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOTPChange(index, e.target.value)}
                                                className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-400 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                                            />
                                        ))}
                                    </div>

                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-red-500 text-sm text-center"
                                        >
                                            {error}
                                        </motion.p>
                                    )}

                                    <div className="text-center py-2">
                                        {canResend ? (
                                            <p className="text-gray-600 text-sm">
                                                Didn't receive code?{' '}
                                                <button
                                                    type="button"
                                                    onClick={handleResendOTP}
                                                    className="text-amber-600 font-bold hover:underline"
                                                >
                                                    Resend OTP
                                                </button>
                                            </p>
                                        ) : (
                                            <p className="text-gray-500 text-sm">
                                                Resend OTP in{' '}
                                                <span className="text-amber-600 font-bold tabular-nums">
                                                    {Math.floor(resendTimer / 60)}:{String(resendTimer % 60).padStart(2, '0')}
                                                </span>
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-amber-600 to-amber-700 text-white py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            'Create Account'
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="w-full text-gray-500 text-sm hover:text-gray-700"
                                    >
                                        Change details
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                <p className="text-center text-gray-500 text-sm mt-6">
                    Already have an account?{' '}
                    <button
                        onClick={() => navigate('/login')}
                        className="text-amber-600 font-medium hover:underline"
                    >
                        Login
                    </button>
                </p>
            </motion.div >
        </div >
    );
};

export default UserSignup;
