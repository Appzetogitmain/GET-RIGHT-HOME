import React, { useState, useEffect } from 'react';
import usePartnerStore from '../../app/partner/store/partnerStore';
import { useNavigate } from 'react-router-dom';
import StepWrapper from '../../app/partner/components/StepWrapper';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useLenis } from '../../app/shared/hooks/useLenis';
import { authService, userService } from '../../services/apiService';
import { requestNotificationPermission } from '../../utils/firebase';

// Updated Steps Components
import StepUserRegistration from '../../app/partner/steps/StepUserRegistration';
import StepOwnerDetails from '../../app/partner/steps/StepOwnerDetails';

const OTPInput = () => {
    const { formData, updateFormData } = usePartnerStore();
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-[#004F4D]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#004F4D]"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-[#003836]">Verify Phone Number</h3>
                <p className="text-sm text-gray-500">
                    We've sent a 6-digit code to <span className="font-bold text-[#003836]">{formData.phone}</span>
                </p>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">One Time Password (OTP)</label>
                <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    className="w-full h-14 text-center text-2xl font-bold tracking-widest border border-gray-400 rounded-xl focus:border-[#004F4D] focus:ring-2 focus:ring-[#004F4D]/10 outline-none transition-all placeholder:text-gray-200"
                    value={formData.otpCode || ''}
                    onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        updateFormData({ otpCode: val });
                    }}
                    autoFocus
                />
            </div>

            <p className="text-center text-xs text-gray-400">
                Didn't receive code? <button className="text-[#004F4D] font-bold hover:underline">Resend</button>
            </p>
        </div>
    );
};


const steps = [
    { id: 1, title: 'Registration', desc: 'Create your partner account' },
    { id: 2, title: 'Owner Details', desc: 'Identity and Address' },
];

const HotelSignup = () => {
    const navigate = useNavigate();
    const { currentStep, nextStep, prevStep, formData, setStep } = usePartnerStore();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Resume from persisted step on mount & handle error timeout
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError('');
            }, 3000); // 3 seconds
            return () => clearTimeout(timer);
        }
    }, [error]);

    const currentStepIndex = currentStep - 1;
    const progress = (currentStep / steps.length) * 100;

    const handleNext = async () => {
        setError('');

        // --- STEP 1: BASIC INFO VALIDATION ---
        if (currentStep === 1) {
            if (!formData.full_name || formData.full_name.length < 3) return setError('Please enter a valid full name');
            if (!formData.email || !formData.email.includes('@')) return setError('Please enter a valid email');
            if (!formData.phone || formData.phone.length !== 10) return setError('Please enter a valid 10-digit phone number');
            if (!formData.termsAccepted) return setError('You must accept the Terms & Conditions');

            // Proceed to Step 2
            nextStep();
        }

        // --- STEP 2: OWNER DETAILS SUBMISSION & REGISTRATION ---
        else if (currentStep === 2) {
            // Validation
            if (!formData.owner_name) return setError('Owner Name is required');
            if (!formData.aadhaar_number || formData.aadhaar_number.length !== 12) return setError('Valid 12-digit Aadhaar Number is required');
            if (!formData.aadhaar_front) return setError('Aadhaar Front Image is required');
            if (!formData.aadhaar_back) return setError('Aadhaar Back Image is required');
            if (!formData.pan_number || formData.pan_number.length !== 10) return setError('Valid 10-digit PAN Number is required');

            // PAN Regex Validation
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (!panRegex.test(formData.pan_number)) {
                return setError('Invalid PAN format. Please use (e.g., ABCDE1234F)');
            }

            if (!formData.pan_card_image) return setError('PAN Card Image is required');

            if (!formData.owner_address?.street || !formData.owner_address?.city || !formData.owner_address?.state || !formData.owner_address?.zipCode) {
                return setError('Complete address details are required');
            }

            // SUBMIT REGISTRATION TO BACKEND
            setLoading(true);
            try {
                // Prepare clean payload with only required fields
                const payload = {
                    full_name: formData.full_name,
                    email: formData.email,
                    phone: formData.phone,
                    owner_name: formData.owner_name,
                    aadhaar_number: formData.aadhaar_number,
                    aadhaar_front: formData.aadhaar_front,
                    aadhaar_back: formData.aadhaar_back,
                    pan_number: formData.pan_number,
                    pan_card_image: formData.pan_card_image,
                    owner_address: formData.owner_address,
                    termsAccepted: formData.termsAccepted,
                    role: 'partner'
                };

                const response = await authService.registerPartner(payload);
                setLoading(false);

                // Show success message
                alert(response.message || 'Registration successful! Your account is pending admin approval. You can login once approved.');

                // Redirect to login
                navigate('/hotel/login');
            } catch (err) {
                setLoading(false);
                console.error("Registration Error:", err);
                setError(err.message || "Registration failed. Please check your details.");
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            prevStep();
        }
        // Disabled redirection on Step 1
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1: return <StepUserRegistration />;
            case 2: return <StepOwnerDetails />;
            default: return <div>Unknown Step</div>;
        }
    };

    return (
        <div className="min-h-screen bg-white text-[#003836] flex flex-col font-sans selection:bg-[#004F4D] selection:text-white overflow-x-hidden">
            {/* Top Bar */}
            <header className="sticky top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md z-50 px-4 flex items-center justify-between border-b border-gray-100">
                <button
                    onClick={handleBack}
                    className={`p-2 rounded-full transition-colors ${currentStep === 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                    disabled={currentStep === 1}
                >
                    <ArrowLeft size={20} className="text-[#003836]" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Step {currentStep} of {steps.length}</span>
                    <span className="text-xs md:text-sm font-bold text-[#003836] truncate">{steps[currentStepIndex]?.title}</span>
                </div>
                <button onClick={() => navigate('/hotel/login')} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <X size={20} className="text-[#003836]" />
                </button>

                {/* Progress Bar (Nested for sticky) */}
                <div className="absolute bottom-0 left-0 right-0 bg-gray-100 h-[2px]">
                    <div
                        className="h-full bg-[#004F4D] transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 pt-8 pb-32 px-4 md:px-0">
                <div className="max-w-lg mx-auto w-full">
                    <div className="mb-6 md:text-center px-1">
                        <h1 className="text-2xl md:text-3xl font-black mb-1 leading-tight">{steps[currentStepIndex]?.title}</h1>
                        <p className="text-gray-500 text-sm md:text-base leading-snug">{steps[currentStepIndex]?.desc}</p>
                    </div>

                    <div className="relative">
                        <StepWrapper stepKey={currentStep}>
                            {renderStep()}
                        </StepWrapper>

                        {currentStep === 1 && (
                            <div className="mt-8 text-center border-t border-gray-100 pt-6">
                                <p className="text-gray-500 text-sm">
                                    Already have a partner account?{' '}
                                    <button
                                        onClick={() => navigate('/hotel/login')}
                                        className="text-[#004F4D] font-bold hover:underline"
                                    >
                                        Login Here
                                    </button>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Bottom Action Bar */}
            <footer className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 p-4 md:p-6 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBack}
                            className={`text-xs font-bold underline px-3 py-2 transition-colors ${currentStep === 1 || loading ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-[#004F4D]'}`}
                            disabled={currentStep === 1 || loading}
                        >
                            Back
                        </button>
                        {!loading && (
                            <button
                                onClick={() => { if (window.confirm("Clear all fields in this step?")) { usePartnerStore.getState().clearCurrentStep('signup'); } }}
                                className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors px-3 py-2 ml-2 border border-red-100 rounded-lg hover:bg-red-50"
                            >
                                Clear Step
                            </button>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col items-end">
                        <button
                            onClick={handleNext}
                            disabled={loading}
                            className={`bg-[#004F4D] text-white px-8 py-3.5 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2 w-full md:w-auto justify-center ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    {currentStep === steps.length ? 'Submit Registration' : 'Next Step'}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
                {error && (
                    <div className="absolute top-0 left-0 right-0 flex justify-center w-full px-4 transform -translate-y-[120%] pointer-events-none">
                        <div className="bg-red-500 text-white text-[10px] md:text-sm font-bold px-4 py-2 rounded-full shadow-lg animate-bounce text-center break-words max-w-full">
                            {error}
                        </div>
                    </div>
                )}
            </footer>
        </div>
    );
};

export default HotelSignup;
