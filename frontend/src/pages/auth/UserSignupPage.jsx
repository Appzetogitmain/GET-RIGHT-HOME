import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, ArrowRight, User, CheckCircle } from 'lucide-react';
import { authService } from '../../services/apiService';
import toast, { Toaster } from 'react-hot-toast';

const UserSignupPage = () => {
    const navigate = useNavigate();
    const [signupMethod, setSignupMethod] = useState('phone'); // phone | email
    const [step, setStep] = useState('input'); // input | otp
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });
    const [isBuilder, setIsBuilder] = useState(false);
    const [builderData, setBuilderData] = useState({
        companyName: '',
        reraRegistrationNumber: '',
        description: '',
        establishedYear: ''
    });
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const [resendTimer, setResendTimer] = useState(120); // 2 minutes = 120 seconds
    const [canResend, setCanResend] = useState(false);

    // Timer countdown effect
    useEffect(() => {
        let interval;
        if (step === 'otp' && resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => {
                    if (prev <= 1) {
                        setCanResend(true);
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [step, resendTimer]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let finalVal = value;
        if (name === 'phone') {
            finalVal = value.replace(/\D/g, '').slice(0, 10);
        } else if (name === 'name') {
            finalVal = value.replace(/[^a-zA-Z\s]/g, '');
        }
        setFormData(prev => ({ ...prev, [name]: finalVal }));
        if (errors[name]) {
            setErrors(prev => {
                const clone = { ...prev };
                delete clone[name];
                return clone;
            });
        }
    };

    const handleBuilderChange = (e) => {
        const { name, value } = e.target;
        let finalVal = value;
        if (name === 'establishedYear') {
            finalVal = Math.max(0, parseInt(value) || '');
        }
        setBuilderData(prev => ({ ...prev, [name]: finalVal }));
        if (errors[name]) {
            setErrors(prev => {
                const clone = { ...prev };
                delete clone[name];
                return clone;
            });
        }
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        console.log("Attempting to send OTP...", { formData, signupMethod });
        setError('');
        setErrors({});

        const tempErrors = {};
        const nameRegex = /^[a-zA-Z\s]+$/;

        if (!formData.name.trim()) {
            tempErrors.name = 'Full Name is required';
        } else if (!nameRegex.test(formData.name)) {
            tempErrors.name = 'Full Name must contain only alphabets';
        } else if (formData.name.trim().length < 3) {
            tempErrors.name = 'Full Name must be at least 3 characters';
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (signupMethod === 'phone') {
            if (!formData.phone) {
                tempErrors.phone = 'Phone Number is required';
            } else if (!phoneRegex.test(formData.phone)) {
                tempErrors.phone = 'Please enter a valid 10-digit Indian phone number starting with 6-9';
            }
        }

        if (signupMethod === 'email') {
            if (!formData.email) {
                tempErrors.email = 'Email Address is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                tempErrors.email = 'Please enter a valid email address';
            }
        }

        if (isBuilder) {
            if (!builderData.companyName || builderData.companyName.trim().length < 2) {
                tempErrors.companyName = 'Company Name is required';
            }
        }

        if (Object.keys(tempErrors).length > 0) {
            setErrors(tempErrors);
            return;
        }

        setLoading(true);

        try {
            // Currently backend only supports phone OTP. 
            if (signupMethod === 'email') {
                throw new Error("Email signup is coming soon. Please use Phone.");
            }

            console.log("Calling authService.sendOtp with:", formData.phone);
            // Pass 'register' type to backend for signup flow
            await authService.sendOtp(formData.phone, 'register', isBuilder ? 'builder' : 'user');
            console.log("OTP sent successfully");
            setResendTimer(120); // Reset timer to 2 minutes
            setCanResend(false); // Disable resend button
            setStep('otp');
        } catch (err) {
            console.error("Signup Error:", err);
            setError(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            document.getElementById(`signup-otp-${index + 1}`).focus();
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        const otpValue = otp.join('');
        if (otpValue.length !== 6) {
            setError('Please enter complete OTP');
            return;
        }
        setError('');
        setLoading(true);

        try {
            const payload = {
                phone: formData.phone,
                otp: otpValue,
                name: formData.name,
                email: formData.email,
                role: isBuilder ? 'builder' : 'user'
            };
            
            if (isBuilder) {
                Object.assign(payload, builderData);
            }

            await authService.verifyOtp(payload);
            navigate(isBuilder ? '/list-property' : '/');
        } catch (err) {
            setError(err.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`signup-otp-${index - 1}`).focus();
        }
    };

    const handleResendOtp = async () => {
        if (!canResend) return;

        setError('');
        setLoading(true);

        try {
            // Pass 'register' type to backend for signup flow
            await authService.sendOtp(formData.phone, 'register', isBuilder ? 'builder' : 'user');
            setResendTimer(120);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']); // Clear OTP inputs
            toast.success('OTP sent successfully!');
        } catch (err) {
            console.error("Resend OTP Error:", err);
            setError(err.message || 'Failed to resend OTP');
            toast.error(err.message || 'Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F0F4F4] flex flex-col items-center justify-center p-4 font-sans">
            <Toaster position="top-center" />

            {/* Header Section */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
                <p className="text-gray-500">Join thousands of happy travelers</p>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative">
                <div className="p-8">

                    {step === 'input' ? (
                        <>
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Sign Up</h2>

                            <form onSubmit={handleSendOtp} noValidate>
                                {/* Full Name */}
                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Full Name
                                    </label>
                                    <div className={`flex items-center border ${errors.name ? 'border-red-500 focus-within:ring-red-200' : 'border-gray-200 focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500'} rounded-xl px-4 py-3 transition-all bg-white`}>
                                        <User className="text-gray-400 mr-3" size={20} />
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                                setFormData({ ...formData, name: val });
                                                if (errors.name) {
                                                    setErrors(prev => {
                                                        const clone = { ...prev };
                                                        delete clone.name;
                                                        return clone;
                                                    });
                                                }
                                            }}
                                            placeholder="John Doe"
                                            className="flex-1 outline-none text-gray-900 font-medium placeholder:text-gray-300"
                                            autoFocus
                                        />
                                    </div>
                                    {errors.name && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.name}</p>}
                                </div>

                                {/* Tabs */}
                                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setSignupMethod('phone')}
                                        className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${signupMethod === 'phone' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <Phone size={18} /> Phone
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSignupMethod('email')}
                                        className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${signupMethod === 'email' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        <Mail size={18} /> Email
                                    </button>
                                </div>

                                {/* Contact Input */}
                                <div className="mb-8">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        {signupMethod === 'phone' ? 'Phone Number' : 'Email Address'}
                                    </label>
                                    <div className={`flex items-center border ${((signupMethod === 'phone' && errors.phone) || (signupMethod === 'email' && errors.email)) ? 'border-red-500 focus-within:ring-red-200' : 'border-gray-200 focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500'} rounded-xl transition-all bg-white overflow-hidden`}>
                                        {signupMethod === 'phone' ? (
                                            <>
                                                <div className="flex items-center gap-1 bg-gray-50 border-r border-gray-200 px-3 py-3 text-sm font-bold text-gray-500 select-none">
                                                    <Phone size={16} className="text-gray-400" />
                                                    <span>+91</span>
                                                </div>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    placeholder="9876543210"
                                                    maxLength={10}
                                                    className="flex-1 outline-none text-gray-900 font-medium placeholder:text-gray-300 px-3"
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center px-3 py-3 border-r border-gray-200 bg-gray-50">
                                                    <Mail className="text-gray-400" size={16} />
                                                </div>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    placeholder="john@example.com"
                                                    className="flex-1 outline-none text-gray-900 font-medium placeholder:text-gray-300 px-3"
                                                />
                                            </>
                                        )}
                                    </div>
                                    {signupMethod === 'phone' && errors.phone && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.phone}</p>}
                                    {signupMethod === 'email' && errors.email && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.email}</p>}
                                    {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
                                </div>

                                {/* Builder Toggle */}
                                <div className="mb-6 flex items-center">
                                    <input 
                                        type="checkbox" 
                                        id="isBuilder"
                                        checked={isBuilder}
                                        onChange={(e) => setIsBuilder(e.target.checked)}
                                        className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                                    />
                                    <label htmlFor="isBuilder" className="ml-2 block text-sm text-gray-900 font-bold">
                                        Register as a Builder
                                    </label>
                                </div>

                                {/* Builder Fields */}
                                {isBuilder && (
                                    <div className="space-y-4 mb-6 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Company Name</label>
                                            <input
                                                type="text"
                                                name="companyName"
                                                value={builderData.companyName}
                                                onChange={handleBuilderChange}
                                                placeholder="e.g. Prestige Group"
                                                className={`w-full border ${errors.companyName ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-amber-500'} rounded-lg px-3 py-2 text-sm outline-none`}
                                            />
                                            {errors.companyName && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.companyName}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">RERA Registration No.</label>
                                            <input
                                                type="text"
                                                name="reraRegistrationNumber"
                                                value={builderData.reraRegistrationNumber}
                                                onChange={handleBuilderChange}
                                                placeholder="PR/KN/..."
                                                required
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
                                            />
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Established Year</label>
                                                <input
                                                    type="number"
                                                    name="establishedYear"
                                                    value={builderData.establishedYear}
                                                    onChange={handleBuilderChange}
                                                    placeholder="e.g. 1995"
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Brief Description</label>
                                            <textarea
                                                name="description"
                                                value={builderData.description}
                                                onChange={handleBuilderChange}
                                                placeholder="About your company..."
                                                rows="2"
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
                                            ></textarea>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>Continue <ArrowRight size={20} /></>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Verify Phone</h2>
                            <p className="text-gray-500 text-sm mb-8">
                                Enter the code sent to <span className="font-bold text-gray-800">+91 {formData.phone}</span>
                            </p>

                            <form onSubmit={handleRegister}>
                                <div className="flex gap-2 justify-center mb-8 px-4">
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`signup-otp-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            className="w-12 h-14 border border-gray-200 rounded-xl text-center text-2xl font-bold text-gray-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all bg-gray-50"
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>
                                {error && <p className="text-red-500 text-xs text-center font-medium mb-4">{error}</p>}

                                <div className="text-center mb-6">
                                    <p className="text-gray-500 text-sm">
                                        {canResend ? (
                                            <>
                                                Didn't receive code?{' '}
                                                <button
                                                    type="button"
                                                    onClick={handleResendOtp}
                                                    className="text-amber-600 font-bold hover:underline"
                                                >
                                                    Resend OTP
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                Resend OTP in{' '}
                                                <span className="text-amber-600 font-bold">
                                                    {Math.floor(resendTimer / 60)}:{String(resendTimer % 60).padStart(2, '0')}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>Create Account <CheckCircle size={20} /></>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStep('input')}
                                    className="w-full mt-4 text-gray-400 text-sm font-semibold hover:text-gray-600"
                                >
                                    Back to Details
                                </button>
                            </form>
                        </>
                    )}

                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
                <p className="text-gray-500 text-sm">
                    Already have an account?{' '}
                    <button onClick={() => navigate('/login')} className="text-amber-600 font-bold hover:underline">
                        Login
                    </button>
                </p>
            </div>

        </div>
    );
};

export default UserSignupPage;
