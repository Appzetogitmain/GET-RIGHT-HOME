import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle, Phone, User, Mail } from 'lucide-react';
import { createLoanLead } from '../../services/loanLeadService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const LoanLeadModal = ({ isOpen, onClose, leadData = {} }) => {
    const { user } = useAuth();
    const [form, setForm] = useState({ name: '', phone: '', email: '' });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setForm({
                name: user?.name || '',
                phone: user?.phone || '',
                email: user?.email || '',
            });
            setSuccess(false);
        }
    }, [isOpen, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.phone.trim()) {
            toast.error('Phone number is required');
            return;
        }
        if (form.phone.trim().length < 10) {
            toast.error('Enter a valid phone number');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: form.name.trim(),
                phone: form.phone.trim(),
                email: form.email.trim(),
                ...leadData,
            };
            const res = await createLoanLead(payload);
            if (res.success) {
                setSuccess(true);
                toast.success(res.message || 'Loan application submitted!');
            } else {
                toast.error(res.message || 'Something went wrong');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit loan application');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
                onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
            >
                <motion.div
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 60, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden"
                >
                    {/* Drag Handle */}
                    <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-2.5 mb-1 sm:hidden" />

                    {success ? (
                        /* Success State */
                        <div className="px-6 py-10 text-center">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle size={32} className="text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">Application Submitted!</h3>
                            <p className="text-sm text-gray-500 leading-relaxed mb-6 max-w-xs mx-auto">
                                Our loan expert will review your details and contact you within 24 hours.
                            </p>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-3.5 rounded-2xl text-sm font-black bg-gray-900 text-white hover:bg-black transition active:scale-[0.99]"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        /* Form State */
                        <form onSubmit={handleSubmit}>
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <div>
                                    <h3 className="font-black text-gray-900 text-base sm:text-lg">Apply for Home Loan</h3>
                                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                                        Fill your details — our expert will call you
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={submitting}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                {/* Loan Summary (if data provided) */}
                                {(leadData.loanAmount > 0 || leadData.eligibilityMaxLoan > 0) && (
                                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                                        <div className="flex justify-between items-center">
                                            {leadData.loanAmount > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-bold text-blue-500 uppercase">Loan Amount</p>
                                                    <p className="text-sm font-black text-blue-900">₹ {Number(leadData.loanAmount).toLocaleString('en-IN')}</p>
                                                </div>
                                            )}
                                            {leadData.eligibilityMaxLoan > 0 && (
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-blue-500 uppercase">Eligible Up To</p>
                                                    <p className="text-sm font-black text-blue-900">₹ {Number(leadData.eligibilityMaxLoan).toLocaleString('en-IN')}</p>
                                                </div>
                                            )}
                                            {leadData.calculatedEmi > 0 && !leadData.eligibilityMaxLoan && (
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-blue-500 uppercase">Monthly EMI</p>
                                                    <p className="text-sm font-black text-blue-900">₹ {Number(leadData.calculatedEmi).toLocaleString('en-IN')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Name */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Full Name</label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Enter your full name"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="tel"
                                            value={form.phone}
                                            onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="Enter your phone number"
                                            required
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Email (Optional)</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="Enter your email"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 pt-1 pb-6 sm:pb-5">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-3.5 rounded-2xl text-sm font-black bg-[#1e88e5] text-white hover:bg-[#1565c0] disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.99]"
                                >
                                    {submitting ? (
                                        <><Loader2 size={16} className="animate-spin" /><span>Submitting...</span></>
                                    ) : (
                                        <span>Submit Application</span>
                                    )}
                                </button>
                                <p className="text-[10px] text-gray-400 text-center mt-3">
                                    By submitting, you agree to be contacted by our loan experts.
                                </p>
                            </div>
                        </form>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default LoanLeadModal;
