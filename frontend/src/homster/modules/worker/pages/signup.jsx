import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FiUser, FiMail, FiPhone, FiFileText, FiUpload, FiCamera, FiX, FiArrowRight, FiChevronLeft, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../theme';
import { workerAuthService } from '../../../services/authService';
import Logo from '../../../components/common/Logo';

import { z } from "zod";

// Zod schema for Worker Signup
const workerSignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").regex(/^[a-zA-Z\s]+$/, "Name can only contain letters"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z.string().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian phone number"),
  aadhar: z.string().regex(/^\d{12}$/, "Aadhar number must be exactly 12 digits"),
});

const WorkerSignup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState('details'); // 'details' or 'otp'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    aadhar: '',
    panCardNumber: '',
    drivingLicenseNumber: '',
    referralCode: '',
    aadharDocument: null,
    aadharBackDocument: null,
    panCardDocument: null,
    drivingLicenseDocument: null
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpToken, setOtpToken] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [documentPreview, setDocumentPreview] = useState({});
  const [resendTimer, setResendTimer] = useState(0);

  // Timer countdown effect
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Refs for auto-focus
  const nameInputRef = useRef(null);
  const otpInputRefs = useRef([]);

  // Pre-fill from navigation state (Unified Flow)
  useEffect(() => {
    if (location.state?.phone && location.state?.verificationToken) {
      setFormData(prev => ({ ...prev, phoneNumber: location.state.phone }));
      setVerificationToken(location.state.verificationToken);
    }
  }, [location.state]);

  // Clear any existing worker tokens on page load
  useEffect(() => {
    localStorage.removeItem('workerAccessToken');
    localStorage.removeItem('workerRefreshToken');
    localStorage.removeItem('workerData');
  }, []);

  // Auto-focus logic
  useEffect(() => {
    if (step === 'details' && nameInputRef.current) {
      setTimeout(() => nameInputRef.current.focus(), 100);
    } else if (step === 'otp' && otpInputRefs.current[0]) {
      setTimeout(() => otpInputRefs.current[0].focus(), 100);
    }
  }, [step]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAadharChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 12) val = val.slice(0, 12);
    let formatted = val;
    if (val.length > 8) {
      formatted = `${val.slice(0, 4)} ${val.slice(4, 8)} ${val.slice(8)}`;
    } else if (val.length > 4) {
      formatted = `${val.slice(0, 4)} ${val.slice(4)}`;
    }
    setFormData(p => ({ ...p, aadhar: formatted }));
  };

  const handlePanChange = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 10) val = val.slice(0, 10);
    setFormData(p => ({ ...p, panCardNumber: val }));
  };

  const handleDlChange = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (val.length > 16) val = val.slice(0, 16);
    setFormData(p => ({ ...p, drivingLicenseNumber: val }));
  };

  const handleDocumentUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image or PDF');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      let fieldName = type;
      if (type === 'aadhar') fieldName = 'aadharDocument';
      else if (type === 'aadharBack') fieldName = 'aadharBackDocument';
      else if (type === 'pan') fieldName = 'panCardDocument';
      else if (type === 'dl') fieldName = 'drivingLicenseDocument';

      setFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));
      setDocumentPreview(prev => ({
        ...prev,
        [type]: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = (type) => {
    let fieldName = type;
    if (type === 'aadhar') fieldName = 'aadharDocument';
    else if (type === 'aadharBack') fieldName = 'aadharBackDocument';
    else if (type === 'pan') fieldName = 'panCardDocument';
    else if (type === 'dl') fieldName = 'drivingLicenseDocument';

    setFormData(prev => ({
      ...prev,
      [fieldName]: null
    }));
    setDocumentPreview(prev => ({
      ...prev,
      [type]: null
    }));
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();

    const cleanAadhar = formData.aadhar.replace(/\s/g, '');

    // Zod Validation
    const validationResult = workerSignupSchema.safeParse({
      name: formData.name,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      aadhar: cleanAadhar
    });

    if (!validationResult.success) {
      const errorList = validationResult.error.errors || validationResult.error.issues || [];
      errorList.forEach(err => toast.error(err.message));
      return;
    }

    // Manual Document Check
    if (!formData.aadharDocument && !documentPreview.aadhar) {
      toast.error('Please upload Aadhar Front document');
      return;
    }
    if (!formData.aadharBackDocument && !documentPreview.aadharBack) {
      toast.error('Please upload Aadhar Back document');
      return;
    }
    
    // Manual Check for PAN
    if (!formData.panCardNumber) {
      toast.error('Please enter PAN Card Number');
      return;
    }
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(formData.panCardNumber)) {
      toast.error('Invalid PAN Card format (e.g. ABCDE1234F)');
      return;
    }
    if (!formData.panCardDocument && !documentPreview.pan) {
      toast.error('Please upload PAN Card document');
      return;
    }
    
    // DL is optional, so no check needed unless we want to enforce either both or neither
    if ((formData.drivingLicenseNumber && (!formData.drivingLicenseDocument && !documentPreview.dl)) || 
        (!formData.drivingLicenseNumber && (formData.drivingLicenseDocument || documentPreview.dl))) {
       toast.error('Please provide both DL Number and Document if you wish to add it.');
       return;
    }
    if (formData.drivingLicenseNumber && formData.drivingLicenseNumber.length < 10) {
      toast.error('Invalid Driving License format');
      return;
    }
    
    e.preventDefault();

    // const errors = validateForm(); // undefined function 'validateForm', removed call as validation is done above via Zod (line 122) or not needed. 
    // Wait, check original code... line 141: `const errors = validateForm();`. That function is NOT defined in the viewed file snippet!
    // It might be an oversight in original code or imported? 
    // I see `workerSignupSchema` used at line 122. So explicit validateForm might be legacy.
    // I will remove line 141-145 if validation matches Zod.

    setIsLoading(true);

    if (verificationToken) {
      try {
        const aadharDoc = documentPreview.aadhar || null;
        const aadharBackDoc = documentPreview.aadharBack || null;
        const panDoc = documentPreview.pan || null;
        const dlDoc = documentPreview.dl || null;

        const registerData = {
          name: formData.name,
          email: formData.email,
          phone: formData.phoneNumber,
          aadhar: cleanAadhar,
          referralCode: formData.referralCode,
          aadharDocument: aadharDoc,
          aadharBackDocument: aadharBackDoc,
          panCardNumber: formData.panCardNumber,
          panCardDocument: panDoc,
          drivingLicenseNumber: formData.drivingLicenseNumber,
          drivingLicenseDocument: dlDoc,
          verificationToken
        };

        const response = await workerAuthService.register(registerData);
        if (response.success) {
          toast.success(
            <div className="flex flex-col">
              <span className="font-bold">Registration Submitted!</span>
              <span className="text-xs">{response.message || 'Your account is pending admin approval.'}</span>
            </div>,
            { icon: <FiCheckCircle className="text-green-500" /> }
          );
          navigate('/worker/login');
        } else {
          toast.error(response.message || 'Registration failed');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Registration failed');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const response = await workerAuthService.sendOTP(formData.phoneNumber, formData.email);
      if (response.success) {
        setOtpToken(response.token);
        setIsLoading(false);
        setStep('otp');
        setResendTimer(120); // Start timer
        toast.success('OTP sent successfully');
      } else {
        setIsLoading(false);
        toast.error(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      setIsLoading(false);
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleOtpChange = (index, value) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 1);
    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);

    if (cleanValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Auto-verify as last digit enters
  useEffect(() => {
    const otpValue = otp.join('');
    if (otpValue.length === 6 && !isLoading && otpToken) {
      handleOtpSubmit();
    }
  }, [otp]);

  const handleOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter complete OTP');
      return;
    }
    if (!otpToken) {
      toast.error('Please request OTP first');
      return;
    }
    setIsLoading(true);
    try {
      const aadharDoc = documentPreview.aadhar || null;
      const aadharBackDoc = documentPreview.aadharBack || null;
      const panDoc = documentPreview.pan || null;
      const dlDoc = documentPreview.dl || null;

      const registerData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phoneNumber,
        aadhar: formData.aadhar.replace(/\s/g, ''),
        aadharDocument: aadharDoc,
        aadharBackDocument: aadharBackDoc,
        panCardNumber: formData.panCardNumber,
        panCardDocument: panDoc,
        drivingLicenseNumber: formData.drivingLicenseNumber,
        drivingLicenseDocument: dlDoc,
        referralCode: formData.referralCode,
        otp: otpValue,
        token: otpToken
      };

      const response = await workerAuthService.register(registerData);
      if (response.success) {
        setIsLoading(false);
        toast.success(response.message || 'Registration successful! Your account is pending admin approval.');
        navigate('/worker/login');
      } else {
        setIsLoading(false);
        toast.error(response.message || 'Registration failed');
      }
    } catch (error) {
      setIsLoading(false);
      toast.error(error.response?.data?.message || 'Registration failed');
    }
  };

  const brandColor = themeColors.brand?.teal || '#347989';

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col justify-start sm:justify-center py-12 sm:px-6 lg:px-8 relative overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#347989] opacity-[0.03] rounded-full blur-3xl animate-floating" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D68F35] opacity-[0.03] rounded-full blur-3xl animate-floating" style={{ animationDelay: '2s' }} />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8 relative z-10 animate-fade-in">
        <Logo className="h-16 w-auto mx-auto transform hover:scale-110 transition-transform duration-500" />
        <h2 className="mt-4 text-3xl font-extrabold text-gray-900 tracking-tight">
          {step === 'details' ? 'Xpert Registration' : 'Confirm Phone'}
        </h2>
        <p className="mt-2 text-sm text-gray-600 animate-stagger-1 animate-fade-in">
          Join the pros. Set your schedule, earn more.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 relative z-10">
        <div className="bg-white py-8 px-4 shadow-2xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100 relative overflow-hidden animate-slide-in-bottom">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#347989] via-[#D68F35] to-[#BB5F36]" />

          {step === 'details' ? (
            <form onSubmit={handleDetailsSubmit} className="space-y-6">
              <div className="animate-stagger-1 animate-fade-in">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative rounded-xl shadow-sm group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-[#347989] transition-colors">
                    <FiUser className="text-gray-400" />
                  </div>
                  <input
                    ref={nameInputRef}
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-offset-2 outline-none transition-all duration-300 hover:border-gray-400"
                    style={{ '--tw-ring-color': brandColor }}
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div className="animate-stagger-2 animate-fade-in">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative rounded-xl shadow-sm group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-[#347989] transition-colors">
                    <FiMail className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-offset-2 outline-none transition-all duration-300 hover:border-gray-400"
                    style={{ '--tw-ring-color': brandColor }}
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {!verificationToken && (
                <div className="animate-stagger-3 animate-fade-in">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="relative rounded-xl shadow-sm group">
                    <div className="absolute inset-y-0 left-0 pl-3 border-r pr-2 flex items-center pointer-events-none group-focus-within:text-[#347989] transition-colors">
                      <span className="text-gray-500 font-bold text-sm">+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData(p => ({ ...p, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      className="block w-full pl-14 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-offset-2 outline-none transition-all duration-300 hover:border-gray-400"
                      style={{ '--tw-ring-color': brandColor }}
                      placeholder="9876543210"
                    />
                  </div>
                </div>
              )}

              {/* Referral Code */}
              <div className="animate-stagger-4 animate-fade-in relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#347989] transition-colors">
                  <FiUser className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  name="referralCode"
                  value={formData.referralCode}
                  onChange={handleInputChange}
                  className="block w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-offset-2 outline-none transition-all duration-300 hover:border-gray-300 bg-gray-50/50 focus:bg-white text-gray-900 placeholder-gray-400"
                  style={{ '--tw-ring-color': themeColors.primary }}
                  placeholder="Referral Code (Optional)"
                />
              </div>

              <div className="animate-stagger-4-5 animate-fade-in mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
                <div className="relative rounded-xl shadow-sm group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-[#347989] transition-colors">
                    <FiFileText className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.aadhar}
                    onChange={handleAadharChange}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-offset-2 outline-none transition-all duration-300 hover:border-gray-400"
                    style={{ '--tw-ring-color': brandColor }}
                    placeholder="XXXX XXXX XXXX"
                    maxLength={14}
                  />
                </div>
              </div>

              {/* Aadhar Upload */}
              {/* Aadhar Front Upload */}
              <div className="animate-stagger-5 animate-fade-in">
                <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Front</label>
                {documentPreview.aadhar ? (
                  <div className="relative group overflow-hidden rounded-xl">
                    <img src={documentPreview.aadhar} className="w-full h-32 object-cover border transform group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => removeDocument('aadhar')} className="bg-red-500 text-white rounded-full p-2 shadow-xl hover:bg-red-600 transition-colors">
                        <FiX size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-300 hover:border-[#347989] group bg-white">
                    <label className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-2 hover:bg-blue-100 transition-colors">
                        <FiUpload className="w-6 h-6" />
                      </div>
                      <span className="text-xs text-gray-500 font-bold">Upload Front</span>
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleDocumentUpload(e, 'aadhar')} />
                    </label>
                  </div>
                )}
              </div>

              {/* Aadhar Back Upload */}
              <div className="animate-stagger-[5.5] animate-fade-in mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Back</label>
                {documentPreview.aadharBack ? (
                  <div className="relative group overflow-hidden rounded-xl">
                    <img src={documentPreview.aadharBack} className="w-full h-32 object-cover border transform group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => removeDocument('aadharBack')} className="bg-red-500 text-white rounded-full p-2 shadow-xl hover:bg-red-600 transition-colors">
                        <FiX size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-300 hover:border-[#347989] group bg-white">
                    <label className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-2 hover:bg-blue-100 transition-colors">
                        <FiUpload className="w-6 h-6" />
                      </div>
                      <span className="text-xs text-gray-500 font-bold">Upload Back</span>
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleDocumentUpload(e, 'aadharBack')} />
                    </label>
                  </div>
                )}
              </div>

              {/* PAN Card Section */}
              <div className="animate-stagger-[5.6] animate-fade-in mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">PAN Card Number</label>
                <div className="relative rounded-xl shadow-sm group mb-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-[#347989] transition-colors">
                    <FiFileText className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    name="panCardNumber"
                    value={formData.panCardNumber}
                    onChange={handlePanChange}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-offset-2 outline-none transition-all duration-300 hover:border-gray-400 uppercase"
                    style={{ '--tw-ring-color': brandColor }}
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                  />
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">PAN Card Upload</label>
                {documentPreview.pan ? (
                  <div className="relative group overflow-hidden rounded-xl">
                    <img src={documentPreview.pan} className="w-full h-32 object-cover border transform group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => removeDocument('pan')} className="bg-red-500 text-white rounded-full p-2 shadow-xl hover:bg-red-600 transition-colors">
                        <FiX size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-300 hover:border-[#347989] group bg-white">
                    <label className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-2 hover:bg-blue-100 transition-colors">
                        <FiUpload className="w-6 h-6" />
                      </div>
                      <span className="text-xs text-gray-500 font-bold">Upload PAN Card</span>
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleDocumentUpload(e, 'pan')} />
                    </label>
                  </div>
                )}
              </div>

              {/* Driving License Section (Optional) */}
              <div className="animate-stagger-[5.7] animate-fade-in mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Driving License Number (Optional)</label>
                <div className="relative rounded-xl shadow-sm group mb-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none group-focus-within:text-[#347989] transition-colors">
                    <FiFileText className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="drivingLicenseNumber"
                    value={formData.drivingLicenseNumber}
                    onChange={handleDlChange}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-offset-2 outline-none transition-all duration-300 hover:border-gray-400 uppercase"
                    style={{ '--tw-ring-color': brandColor }}
                    placeholder="e.g. MH0420110062821"
                    maxLength={16}
                  />
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">Driving License Upload (Optional)</label>
                {documentPreview.dl ? (
                  <div className="relative group overflow-hidden rounded-xl">
                    <img src={documentPreview.dl} className="w-full h-32 object-cover border transform group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => removeDocument('dl')} className="bg-red-500 text-white rounded-full p-2 shadow-xl hover:bg-red-600 transition-colors">
                        <FiX size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-300 hover:border-[#347989] group bg-white">
                    <label className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-2 hover:bg-blue-100 transition-colors">
                        <FiUpload className="w-6 h-6" />
                      </div>
                      <span className="text-xs text-gray-500 font-bold">Upload DL</span>
                      <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleDocumentUpload(e, 'dl')} />
                    </label>
                  </div>
                )}
              </div>

              <div className="animate-stagger-[6] animate-fade-in">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-base font-bold rounded-xl text-white transition-all transform hover:-translate-y-1 shadow-lg disabled:opacity-50 overflow-hidden"
                  style={{ backgroundColor: brandColor, boxShadow: `0 10px 15px -3px ${brandColor}4D` }}
                >
                  <span className="absolute inset-0 w-full h-full bg-white/10 group-hover:translate-x-full transition-transform duration-700 -translate-x-full" />
                  {isLoading ? 'Processing...' : (
                    <span className="flex items-center relative z-10">
                      {verificationToken ? 'Finish Registration' : 'Verify & Join'}
                      <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <button
                onClick={() => setStep('details')}
                className="flex items-center text-sm text-gray-500 hover:text-[#347989] transition-colors mb-4 animate-fade-in"
              >
                <FiChevronLeft className="mr-1" /> Edit details
              </button>

              <div className="text-center animate-fade-in">
                <h3 className="text-xl font-bold text-gray-900">Enter OTP</h3>
                <p className="text-sm text-gray-600">Waiting for 6-digit code...</p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-8">
                <div className="flex justify-between gap-2 animate-stagger-1 animate-fade-in">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-full h-14 text-center text-xl font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-offset-2 outline-none transition-all duration-300 hover:border-gray-400"
                      style={{ '--tw-ring-color': brandColor, backgroundColor: digit ? `${brandColor}05` : 'white' }}
                    />
                  ))}
                </div>

                <div className="text-center animate-stagger-2 animate-fade-in">
                  <button
                    type="button"
                    onClick={async () => {
                      if (resendTimer > 0) return;
                      try {
                        const response = await workerAuthService.sendOTP(formData.phoneNumber, formData.email);
                        if (response.success) {
                          setOtpToken(response.token);
                          setResendTimer(120);
                          toast.success('OTP sent again');
                        }
                      } catch (e) { toast.error('Resend failed'); }
                    }}
                    className="text-sm font-semibold transition-colors duration-300 opacity-70 hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={resendTimer > 0}
                    style={{ color: brandColor }}
                  >
                    {resendTimer > 0
                      ? `Resend in ${Math.floor(resendTimer / 60)}:${String(resendTimer % 60).padStart(2, '0')}`
                      : 'Resend Code'}
                  </button>
                </div>

                <div className="animate-stagger-3 animate-fade-in">
                  <button
                    type="submit"
                    disabled={isLoading || otp.join('').length !== 6}
                    className="group relative w-full py-4 rounded-xl text-white font-bold transform hover:-translate-y-1 transition-all shadow-lg disabled:opacity-50 overflow-hidden"
                    style={{ backgroundColor: brandColor, boxShadow: `0 10px 15px -3px ${brandColor}4D` }}
                  >
                    <span className="absolute inset-0 w-full h-full bg-white/10 group-hover:translate-x-full transition-transform duration-700 -translate-x-full" />
                    <span className="relative z-10">
                      {isLoading ? 'Verifying...' : 'Complete Sign Up'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-gray-500 animate-fade-in animate-stagger-4">
          Already an Xpert?{' '}
          <Link to="/worker/login" className="font-semibold hover:text-[#D68F35] transition-colors" style={{ color: brandColor }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default WorkerSignup;

