import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, CheckCircle2, XCircle, Search, FileText, ExternalLink, RefreshCw, Eye } from 'lucide-react';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const AdminBuilderVerification = () => {
    const [pendingBuilders, setPendingBuilders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBuilder, setSelectedBuilder] = useState(null);
    const [reviewMessage, setReviewMessage] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchPendingBuilders = useCallback(async () => {
        try {
            setLoading(true);
            // Fetch builders where builderApprovalStatus is pending
            const response = await adminService.getPendingBuilders();
            if (response.success) {
                setPendingBuilders(response.builders || []);
            }
        } catch (error) {
            console.error('Error fetching pending builders:', error);
            toast.error('Failed to load pending builders');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPendingBuilders();
    }, [fetchPendingBuilders]);

    const handleAction = async (status) => {
        if (!selectedBuilder) return;
        
        if (status === 'rejected' && !reviewMessage.trim()) {
            toast.error('Please provide a reason for rejection.');
            return;
        }

        try {
            setActionLoading(true);
            const payload = {
                status,
                message: reviewMessage
            };
            const res = await adminService.verifyBuilder(selectedBuilder._id, payload);
            if (res.success) {
                toast.success(`Builder ${status} successfully!`);
                setSelectedBuilder(null);
                setReviewMessage('');
                fetchPendingBuilders();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || `Failed to ${status} builder`);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 uppercase">Builder Verification</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">Review and verify builder compliance documents.</p>
                </div>
                <button
                    onClick={fetchPendingBuilders}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold uppercase hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* List Column */}
                <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search builders..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-black transition-colors"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {loading ? (
                            <div className="p-4 text-center text-xs font-bold text-gray-400 uppercase animate-pulse">Loading...</div>
                        ) : pendingBuilders.length > 0 ? (
                            pendingBuilders.map((builder) => (
                                    <div
                                        key={builder._id}
                                        onClick={() => setSelectedBuilder(builder)}
                                        className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedBuilder?._id === builder._id ? 'bg-amber-50 border-amber-200 shadow-md ring-1 ring-amber-500' : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-md'}`}
                                    >
                                        <h4 className={`text-sm font-black uppercase truncate ${selectedBuilder?._id === builder._id ? 'text-amber-900' : 'text-gray-900'}`}>{builder.builderProfile?.companyName || builder.name}</h4>
                                        <p className={`text-[10px] font-bold uppercase truncate ${selectedBuilder?._id === builder._id ? 'text-amber-700' : 'text-gray-500'}`}>
                                        {builder.email || builder.phone}
                                    </p>
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${selectedBuilder?._id === builder._id ? 'bg-white/20 text-white' : 'bg-yellow-100 text-yellow-700'}`}>
                                            Pending Review
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                                <ShieldCheck size={40} className="text-gray-200 mb-3" />
                                <p className="text-xs font-bold text-gray-400 uppercase">No pending verifications</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Details Column */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm h-[calc(100vh-200px)] flex flex-col overflow-hidden">
                    {selectedBuilder ? (
                        <>
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 uppercase">{selectedBuilder.builderProfile?.companyName || 'N/A'}</h3>
                                        <p className="text-xs font-bold text-gray-500 uppercase mt-1">Rep: {selectedBuilder.name} | {selectedBuilder.phone}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Company Registration (CIN)</p>
                                        <p className="text-sm font-black text-gray-900 uppercase">{selectedBuilder.builderProfile?.cinNumber || 'Not Provided'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Established Year</p>
                                        <p className="text-sm font-black text-gray-900 uppercase">{selectedBuilder.builderProfile?.establishedYear || 'Not Provided'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Registered Office Address</p>
                                        <p className="text-xs font-bold text-gray-700">{selectedBuilder.builderProfile?.officeAddress || 'Not Provided'}</p>
                                    </div>
                                </div>

                                {/* Documents Section */}
                                <div>
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 border-b pb-2">Compliance Documents</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        
                                        {/* CIN Doc */}
                                        <div className="border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-3">
                                            <FileText size={24} className={selectedBuilder.builderProfile?.companyRegistrationCertificate ? 'text-blue-500' : 'text-gray-300'} />
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-900 uppercase">CIN Certificate</p>
                                                {selectedBuilder.builderProfile?.companyRegistrationCertificate ? (
                                                    <a href={selectedBuilder.builderProfile.companyRegistrationCertificate} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-blue-600 hover:underline uppercase flex items-center justify-center gap-1 mt-1">
                                                        <ExternalLink size={10} /> View Doc
                                                    </a>
                                                ) : (
                                                    <p className="text-[9px] font-bold text-red-500 uppercase mt-1">Missing</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* RERA Doc */}
                                        <div className="border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-3">
                                            <FileText size={24} className={selectedBuilder.builderProfile?.reraCertificate ? 'text-blue-500' : 'text-gray-300'} />
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-900 uppercase">RERA Certificate</p>
                                                <p className="text-[9px] font-bold text-gray-500 uppercase">{selectedBuilder.builderProfile?.reraRegistrationNumber}</p>
                                                {selectedBuilder.builderProfile?.reraCertificate ? (
                                                    <a href={selectedBuilder.builderProfile.reraCertificate} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-blue-600 hover:underline uppercase flex items-center justify-center gap-1 mt-1">
                                                        <ExternalLink size={10} /> View Doc
                                                    </a>
                                                ) : (
                                                    <p className="text-[9px] font-bold text-red-500 uppercase mt-1">Missing</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* GST Doc */}
                                        <div className="border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-3">
                                            <FileText size={24} className={selectedBuilder.builderProfile?.gstCertificate ? 'text-blue-500' : 'text-gray-300'} />
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-900 uppercase">GST Certificate</p>
                                                <p className="text-[9px] font-bold text-gray-500 uppercase">{selectedBuilder.builderProfile?.gstNumber}</p>
                                                {selectedBuilder.builderProfile?.gstCertificate ? (
                                                    <a href={selectedBuilder.builderProfile.gstCertificate} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-blue-600 hover:underline uppercase flex items-center justify-center gap-1 mt-1">
                                                        <ExternalLink size={10} /> View Doc
                                                    </a>
                                                ) : (
                                                    <p className="text-[9px] font-bold text-red-500 uppercase mt-1">Missing</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Admin Notes */}
                                <div>
                                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4 border-b pb-2">Admin Notes (Visible to Builder if Rejected)</h4>
                                    <textarea 
                                        rows="3" 
                                        value={reviewMessage}
                                        onChange={(e) => setReviewMessage(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-black outline-none font-medium resize-none"
                                        placeholder="E.g., RERA certificate is unreadable, please re-upload..."
                                    />
                                </div>
                            </div>
                            
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                                <button 
                                    onClick={() => handleAction('rejected')}
                                    disabled={actionLoading}
                                    className="px-6 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold uppercase text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <XCircle size={16} /> Reject
                                </button>
                                <button 
                                    onClick={() => handleAction('approved')}
                                    disabled={actionLoading}
                                    className="px-6 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg font-bold uppercase text-xs flex items-center gap-2 transition-colors shadow-lg disabled:opacity-50"
                                >
                                    <CheckCircle2 size={16} /> Approve Verified
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <Eye size={48} className="text-gray-200 mb-4" />
                            <h3 className="text-lg font-black text-gray-900 uppercase">Select a Builder</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase mt-2 max-w-xs">Choose a pending builder from the list to review their compliance documents.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminBuilderVerification;
