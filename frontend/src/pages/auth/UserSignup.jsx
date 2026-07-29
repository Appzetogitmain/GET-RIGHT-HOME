import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, ArrowRight, Loader2, Shield, User, UploadCloud } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import logo from '../../assets/grh-logo.png';
import { authService, userService } from '../../services/apiService';
import { requestNotificationPermission } from '../../utils/firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const UserSignup = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [step, setStep] = useState(1); // 1: Enter Details, 2: Enter OTP
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        role: 'owner' // Default role
    });
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const [resendTimer, setResendTimer] = useState(120);
    const [canResend, setCanResend] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState({});
    const [uploadedFileNames, setUploadedFileNames] = useState({});

    const clearPendingSession = () => {
        sessionStorage.removeItem('pending_signup_data');
        sessionStorage.removeItem('pending_signup_step');
        sessionStorage.removeItem('pending_signup_timer_start');
    };

    const savePendingSession = (data) => {
        sessionStorage.setItem('pending_signup_data', JSON.stringify(data));
        sessionStorage.setItem('pending_signup_step', '2');
        sessionStorage.setItem('pending_signup_timer_start', Date.now().toString());
    };

    // Restore session if page refreshed while on signup OTP step
    useEffect(() => {
        const savedStep = sessionStorage.getItem('pending_signup_step');
        const savedData = sessionStorage.getItem('pending_signup_data');
        const savedStartTime = sessionStorage.getItem('pending_signup_timer_start');

        if (savedStep === '2' && savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                setFormData(parsedData);
                setStep(2);

                if (savedStartTime) {
                    const elapsedSeconds = Math.floor((Date.now() - Number(savedStartTime)) / 1000);
                    const remaining = 120 - elapsedSeconds;
                    if (remaining > 0) {
                        setResendTimer(remaining);
                        setCanResend(false);
                    } else {
                        setResendTimer(0);
                        setCanResend(true);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        } else if (location.state?.phone) {
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

    const handleDocumentUpload = async (e, fieldName, docLabel) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error(`${docLabel} size must be less than 5MB`);
            return;
        }

        try {
            setUploadingFiles(prev => ({ ...prev, [fieldName]: true }));
            toast.loading(`Uploading ${docLabel}...`, { id: fieldName });
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64Data = reader.result;
                    // Using authService.uploadDocsBase64 which is public route
                    const response = await authService.uploadDocsBase64([{ base64: base64Data, fileName: file.name }]);
                    if (response.success) {
                        const uploadedUrl = response.urls ? response.urls[0] : response.url;
                        setFormData(prev => ({ ...prev, [fieldName]: uploadedUrl }));
                        setUploadedFileNames(prev => ({ ...prev, [fieldName]: file.name }));
                        toast.success(`${docLabel} uploaded successfully`, { id: fieldName });
                    }
                } catch (err) {
                    toast.error(`Failed to upload ${docLabel}`, { id: fieldName });
                } finally {
                    setUploadingFiles(prev => ({ ...prev, [fieldName]: false }));
                }
            };
            reader.onerror = () => {
                toast.error(`Failed to read ${docLabel}`, { id: fieldName });
                setUploadingFiles(prev => ({ ...prev, [fieldName]: false }));
            };
        } catch (error) {
            console.error('Upload Error', error);
            toast.error(`Failed to start upload for ${docLabel}`, { id: fieldName });
            setUploadingFiles(prev => ({ ...prev, [fieldName]: false }));
        }
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        setErrors({});

        const tempErrors = {};
        const nameRegex = /^[a-zA-Z\s]+$/;

        if (!formData.name) {
            tempErrors.name = 'Full Name is required';
        } else if (!nameRegex.test(formData.name)) {
            tempErrors.name = 'Full Name must contain only alphabets';
        } else if (formData.name.trim().length < 3) {
            tempErrors.name = 'Full Name must be at least 3 characters';
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (!formData.phone) {
            tempErrors.phone = 'Phone Number is required';
        } else if (!phoneRegex.test(formData.phone)) {
            tempErrors.phone = 'Please enter a valid 10-digit Indian phone number starting with 6-9';
        }

        if (formData.email) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                tempErrors.email = 'Please enter a valid email address';
            }
        }

        if (formData.role === 'builder') {
            if (!formData.companyName || formData.companyName.trim().length < 2) {
                tempErrors.companyName = 'Company Name is required';
            }
        }

        if (Object.keys(tempErrors).length > 0) {
            setErrors(tempErrors);
            return;
        }

        try {
            setLoading(true);
            await authService.sendOtp(formData.phone, 'register', formData.role);
            savePendingSession(formData);
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

    // Auto focus first OTP input box when step 2 mounts
    useEffect(() => {
        if (step === 2) {
            [50, 150, 300].forEach(delay => {
                setTimeout(() => {
                    const firstInput = document.getElementById('otp-0');
                    if (firstInput) {
                        firstInput.focus();
                    }
                }, delay);
            });
        }
    }, [step]);

    const verifySignupOTPCode = async (otpString) => {
        if (otpString.length !== 6 || loading) return;

        try {
            setLoading(true);
            setError('');
            const res = await authService.verifyOtp({
                phone: formData.phone,
                otp: otpString,
                name: formData.name,
                email: formData.email || undefined,
                role: formData.role,
                companyName: formData.companyName,
                officeAddress: formData.officeAddress,
                cinNumber: formData.cinNumber,
                reraRegistrationNumber: formData.reraRegistrationNumber,
                reraCertificate: formData.reraCertificate,
                gstNumber: formData.gstNumber,
                gstCertificate: formData.gstCertificate,
                companyRegistrationCertificate: formData.companyRegistrationCertificate,
                brandLogo: formData.brandLogo,
                description: formData.description,
                establishedYear: formData.establishedYear,
                activeProjects: formData.activeProjects,
                completedProjects: formData.completedProjects
            });

            // Update FCM Token after successful registration
            try {
                const token = await requestNotificationPermission();
                if (token) {
                    await userService.updateFcmToken(token, 'web');
                }
            } catch (fcmError) {
                console.warn('FCM update failed', fcmError);
            }

            login(res.user);
            clearPendingSession();
            navigate('/');
        } catch (err) {
            if (err.response?.data?.requiresLogin ||
                err.response?.status === 409 ||
                err.message?.includes('already exists')) {
                setError('Account already exists. Redirecting to login...');
                setTimeout(() => {
                    navigate('/login', { state: { phone: formData.phone } });
                }, 1500);
            } else {
                setError(err.message || 'Verification failed');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = (e) => {
        if (e) e.preventDefault();
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Please enter complete 6-digit OTP');
            return;
        }
        verifySignupOTPCode(otpString);
    };

    const handleOTPChange = (index, value) => {
        if (value.length > 1) {
            const digits = value.replace(/\D/g, '').slice(0, 6).split('');
            if (digits.length > 0) {
                const newOtp = [...otp];
                digits.forEach((d, i) => {
                    if (i < 6) newOtp[i] = d;
                });
                setOtp(newOtp);
                const nextIndex = Math.min(digits.length, 5);
                document.getElementById(`otp-${nextIndex}`)?.focus();
                
                if (newOtp.join('').length === 6) {
                    verifySignupOTPCode(newOtp.join(''));
                }
            }
            return;
        }

        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`)?.focus();
        }

        if (newOtp.join('').length === 6) {
            verifySignupOTPCode(newOtp.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (!otp[index] && index > 0) {
                const newOtp = [...otp];
                newOtp[index - 1] = '';
                setOtp(newOtp);
                document.getElementById(`otp-${index - 1}`)?.focus();
            } else if (otp[index]) {
                const newOtp = [...otp];
                newOtp[index] = '';
                setOtp(newOtp);
            }
        }
    };

    const handleResendOTP = async () => {
        if (!canResend) return;

        try {
            setLoading(true);
            setError('');
            await authService.sendOtp(formData.phone, 'register', formData.role);
            savePendingSession(formData);
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <Link to="/" className="inline-block mb-2">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                        >
                            <img src={logo} alt="GRH Logo" className="h-24 w-auto mx-auto object-contain" />
                        </motion.div>
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 uppercase">Create Account</h1>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Get-Right-Home Hub</p>
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

                                <form onSubmit={handleSendOTP} noValidate className="space-y-5">
                                    {/* User Type Selection */}
                                    <div className="mb-6">
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                            I am an
                                        </label>
                                        <div className="flex gap-3">
                                            {['owner', 'broker', 'builder'].map((r) => (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, role: r })}
                                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all border ${
                                                        formData.role === r
                                                            ? 'bg-amber-50 text-amber-700 border-amber-500 shadow-sm'
                                                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                id="signup-name-input"
                                                autoFocus
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z\s]/g, '') });
                                                    if (errors.name) {
                                                        setErrors(prev => {
                                                            const clone = { ...prev };
                                                            delete clone.name;
                                                            return clone;
                                                        });
                                                    }
                                                }}
                                                placeholder="John Doe"
                                                className={`w-full pl-12 pr-4 py-3 border ${errors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-amber-500'} rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all`}
                                            />
                                        </div>
                                        {errors.name && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.name}</p>}
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Phone Number <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative flex">
                                            <div className={`flex items-center gap-1 bg-gray-50 border ${errors.phone ? 'border-red-500' : 'border-gray-200'} border-r-0 rounded-l-xl px-3 text-sm font-bold text-gray-500 select-none`}>
                                                <Phone size={16} className="text-gray-400" />
                                                <span>+91</span>
                                            </div>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') });
                                                    if (errors.phone) {
                                                        setErrors(prev => {
                                                            const clone = { ...prev };
                                                            delete clone.phone;
                                                            return clone;
                                                        });
                                                    }
                                                }}
                                                placeholder="9876543210"
                                                maxLength={10}
                                                className={`w-full px-4 py-3 border ${errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-amber-500'} rounded-r-xl focus:ring-2 focus:border-transparent outline-none transition-all font-medium`}
                                            />
                                        </div>
                                        {errors.phone && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.phone}</p>}
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
                                                onChange={(e) => {
                                                    setFormData({ ...formData, email: e.target.value });
                                                    if (errors.email) {
                                                        setErrors(prev => {
                                                            const clone = { ...prev };
                                                            delete clone.email;
                                                            return clone;
                                                        });
                                                    }
                                                }}
                                                placeholder="you@example.com"
                                                className={`w-full pl-12 pr-4 py-3 border ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-amber-500'} rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all`}
                                            />
                                        </div>
                                        {errors.email && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.email}</p>}
                                    </div>

                                    {/* Builder Specific Fields */}
                                    {formData.role === 'builder' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-5 border-t border-gray-100 pt-5 mt-5"
                                        >
                                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Builder Profile Details</h3>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Company Name <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.companyName || ''}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, companyName: e.target.value });
                                                        if (errors.companyName) {
                                                            setErrors(prev => {
                                                                const clone = { ...prev };
                                                                delete clone.companyName;
                                                                return clone;
                                                            });
                                                        }
                                                    }}
                                                    placeholder="e.g. Prestige Estates"
                                                    className={`w-full px-4 py-3 border ${errors.companyName ? 'border-red-500 focus:ring-red-200' : 'border-gray-200 focus:ring-amber-500'} rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all`}
                                                />
                                                {errors.companyName && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.companyName}</p>}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand Logo (Max 2MB)</label>
                                                    <div className="flex items-center gap-4">
                                                        {formData.brandLogo && (
                                                            <div className="w-16 h-16 rounded-xl border border-gray-200 p-1 shrink-0 overflow-hidden bg-gray-50">
                                                                <img src={formData.brandLogo} alt="Logo preview" className="w-full h-full object-contain" />
                                                            </div>
                                                        )}
                                                        <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors relative">
                                                            {uploadingFiles.brandLogo ? (
                                                                <span className="text-xs font-bold text-gray-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Uploading...</span>
                                                            ) : (
                                                                <>
                                                                    <UploadCloud size={20} className="text-gray-400 mb-1" />
                                                                    <span className="text-[10px] font-bold text-gray-600 uppercase">Click to upload logo</span>
                                                                </>
                                                            )}
                                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleDocumentUpload(e, 'brandLogo', 'Brand Logo')} disabled={uploadingFiles.brandLogo} />
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Registered Office Address</label>
                                                    <textarea rows="2" value={formData.officeAddress || ''} onChange={e => setFormData({ ...formData, officeAddress: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all resize-none" placeholder="Full office address..." />
                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Registration (CIN)</label>
                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                        <input type="text" value={formData.cinNumber || ''} onChange={e => setFormData({ ...formData, cinNumber: e.target.value })} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all uppercase" placeholder="CIN Number" />
                                                        <label className="sm:w-auto w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors relative overflow-hidden">
                                                            {uploadingFiles.companyRegistrationCertificate ? (
                                                                <Loader2 size={16} className="animate-spin text-amber-600" />
                                                            ) : (
                                                                <UploadCloud size={16} className={formData.companyRegistrationCertificate ? 'text-green-500' : 'text-gray-500'} />
                                                            )}
                                                            <span className="text-xs font-bold text-gray-600 uppercase truncate max-w-[150px]">
                                                                {uploadingFiles.companyRegistrationCertificate ? 'Uploading...' : (uploadedFileNames.companyRegistrationCertificate || (formData.companyRegistrationCertificate ? 'Uploaded' : 'Upload'))}
                                                            </span>
                                                            <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleDocumentUpload(e, 'companyRegistrationCertificate', 'Company Registration')} disabled={uploadingFiles.companyRegistrationCertificate} />
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">RERA No.</label>
                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                        <input type="text" value={formData.reraRegistrationNumber || ''} onChange={e => setFormData({ ...formData, reraRegistrationNumber: e.target.value })} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all uppercase" placeholder="RERA Number" />
                                                        <label className="sm:w-auto w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors relative overflow-hidden">
                                                            {uploadingFiles.reraCertificate ? (
                                                                <Loader2 size={16} className="animate-spin text-amber-600" />
                                                            ) : (
                                                                <UploadCloud size={16} className={formData.reraCertificate ? 'text-green-500' : 'text-gray-500'} />
                                                            )}
                                                            <span className="text-xs font-bold text-gray-600 uppercase truncate max-w-[150px]">
                                                                {uploadingFiles.reraCertificate ? 'Uploading...' : (uploadedFileNames.reraCertificate || (formData.reraCertificate ? 'Uploaded' : 'Upload'))}
                                                            </span>
                                                            <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleDocumentUpload(e, 'reraCertificate', 'RERA Certificate')} disabled={uploadingFiles.reraCertificate} />
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">GST No.</label>
                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                        <input type="text" value={formData.gstNumber || ''} onChange={e => setFormData({ ...formData, gstNumber: e.target.value })} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all uppercase" placeholder="GSTIN" />
                                                        <label className="sm:w-auto w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors relative overflow-hidden">
                                                            {uploadingFiles.gstCertificate ? (
                                                                <Loader2 size={16} className="animate-spin text-amber-600" />
                                                            ) : (
                                                                <UploadCloud size={16} className={formData.gstCertificate ? 'text-green-500' : 'text-gray-500'} />
                                                            )}
                                                            <span className="text-xs font-bold text-gray-600 uppercase truncate max-w-[150px]">
                                                                {uploadingFiles.gstCertificate ? 'Uploading...' : (uploadedFileNames.gstCertificate || (formData.gstCertificate ? 'Uploaded' : 'Upload'))}
                                                            </span>
                                                            <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleDocumentUpload(e, 'gstCertificate', 'GST Certificate')} disabled={uploadingFiles.gstCertificate} />
                                                        </label>
                                                    </div>
                                                </div>
                                                
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">About Company</label>
                                                    <textarea rows="3" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all resize-none" placeholder="Brief description about the builder's history..." />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Established Year</label>
                                                    <input type="number" min="1800" max={new Date().getFullYear()} value={formData.establishedYear || ''} onChange={e => setFormData({ ...formData, establishedYear: Math.max(0, parseInt(e.target.value) || '') })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all" placeholder="1995" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Active Projects</label>
                                                    <input type="number" min="0" value={formData.activeProjects !== undefined ? formData.activeProjects : 0} onChange={e => setFormData({ ...formData, activeProjects: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0) })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Completed Projects</label>
                                                    <input type="number" min="0" value={formData.completedProjects !== undefined ? formData.completedProjects : 0} onChange={e => setFormData({ ...formData, completedProjects: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0) })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

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
                                                autoFocus={index === 0}
                                                type="tel"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={1}
                                                value={digit}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => handleOTPChange(index, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(index, e)}
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
                                        onClick={() => {
                                            clearPendingSession();
                                            setStep(1);
                                        }}
                                        className="w-full text-gray-500 text-sm hover:text-gray-700"
                                    >
                                        Change details
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                <div className="flex flex-col items-center gap-3 mt-6">
                    <p className="text-center text-gray-500 text-sm">
                        Already have an account?{' '}
                        <button
                            onClick={() => navigate('/login')}
                            className="text-amber-600 font-medium hover:underline"
                        >
                            Login
                        </button>
                    </p>
                    <Link
                        to="/"
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-600 font-bold transition-colors mt-2"
                    >
                        ← Back to Store
                    </Link>
                </div>
            </motion.div >
        </div >
    );
};

export default UserSignup;
