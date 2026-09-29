import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
    Phone, Mail, User, Calendar, Clock, DollarSign,
    FileText, X, Trash2, Edit3, Eye, TrendingUp,
    IndianRupee, Users, CheckCircle, AlertCircle,
    Building2, Loader2
} from 'lucide-react';
import { adminGetLoanLeads, adminUpdateLoanLead, adminDeleteLoanLead } from '../../../services/loanLeadService';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
    new: { label: 'New', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
    contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
    in_review: { label: 'In Review', color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
    documents_pending: { label: 'Docs Pending', color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
    approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
    closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
};

const SOURCE_CONFIG = {
    apply_for_loan: { label: 'Apply for Loan', icon: '📝' },
    emi_calculator: { label: 'EMI Calculator', icon: '🧮' },
    loan_eligibility: { label: 'Loan Eligibility', icon: '✅' },
    instant_loan: { label: 'Instant Loan', icon: '⚡' },
    request_callback: { label: 'Callback Request', icon: '📞' },
    general: { label: 'General', icon: '📋' },
};

const formatCurrency = (n) => {
    if (!n || n === 0) return '—';
    return '₹ ' + Number(n).toLocaleString('en-IN');
};

const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
};

const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const AdminLoanLeads = () => {
    const [leads, setLeads] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [selectedLead, setSelectedLead] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (sourceFilter !== 'all') params.leadSource = sourceFilter;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const data = await adminGetLoanLeads(params);
            if (data.success) {
                setLeads(data.leads);
                setTotalPages(data.totalPages);
                setTotal(data.total);
                if (data.stats) setStats(data.stats);
            }
        } catch (err) {
            toast.error('Failed to fetch loan leads');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, sourceFilter, searchQuery]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const handleStatusChange = async (leadId, newStatus) => {
        setUpdating(true);
        try {
            const data = await adminUpdateLoanLead(leadId, { status: newStatus });
            if (data.success) {
                toast.success('Status updated');
                setLeads(prev => prev.map(l => l._id === leadId ? data.lead : l));
                if (selectedLead?._id === leadId) setSelectedLead(data.lead);
                fetchLeads();
            }
        } catch (err) {
            toast.error('Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    const handleNotesUpdate = async (leadId, notes) => {
        try {
            const data = await adminUpdateLoanLead(leadId, { adminNotes: notes });
            if (data.success) {
                toast.success('Notes saved');
                setLeads(prev => prev.map(l => l._id === leadId ? data.lead : l));
                if (selectedLead?._id === leadId) setSelectedLead(data.lead);
            }
        } catch (err) {
            toast.error('Failed to save notes');
        }
    };

    const handleDelete = async (leadId) => {
        if (!window.confirm('Are you sure you want to delete this lead?')) return;
        setDeleting(leadId);
        try {
            const data = await adminDeleteLoanLead(leadId);
            if (data.success) {
                toast.success('Lead deleted');
                setLeads(prev => prev.filter(l => l._id !== leadId));
                if (selectedLead?._id === leadId) {
                    setSelectedLead(null);
                    setShowDetail(false);
                }
                fetchLeads();
            }
        } catch (err) {
            toast.error('Failed to delete lead');
        } finally {
            setDeleting(null);
        }
    };

    const openDetail = (lead) => {
        setSelectedLead(lead);
        setShowDetail(true);
    };

    const StatCard = ({ label, value, icon, color }) => (
        <div className={`rounded-2xl p-4 border ${color} flex items-center gap-3.5`}>
            <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center text-lg shadow-sm">
                {icon}
            </div>
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-xl font-black text-gray-900">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Loan Leads</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage home loan applications & enquiries</p>
                </div>
                <button
                    onClick={fetchLeads}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-semibold text-gray-700 transition active:scale-[0.98]"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard label="Total Leads" value={stats.total || 0} icon="📊" color="bg-white border-gray-200" />
                <StatCard label="New" value={stats.new || 0} icon="🆕" color="bg-blue-50 border-blue-100" />
                <StatCard label="Contacted" value={stats.contacted || 0} icon="📞" color="bg-yellow-50 border-yellow-100" />
                <StatCard label="In Review" value={stats.inReview || 0} icon="🔍" color="bg-purple-50 border-purple-100" />
                <StatCard label="Approved" value={stats.approved || 0} icon="✅" color="bg-emerald-50 border-emerald-100" />
                <StatCard label="Loan Volume" value={formatCurrency(stats.totalVolume)} icon="💰" color="bg-amber-50 border-amber-100" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, phone, email, lead ID..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition"
                        />
                    </div>
                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 outline-none focus:border-blue-300 min-w-[150px]"
                    >
                        <option value="all">All Statuses</option>
                        {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>
                    {/* Source Filter */}
                    <select
                        value={sourceFilter}
                        onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 outline-none focus:border-blue-300 min-w-[170px]"
                    >
                        <option value="all">All Sources</option>
                        {Object.entries(SOURCE_CONFIG).map(([key, val]) => (
                            <option key={key} value={key}>{val.icon} {val.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Leads Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={28} className="animate-spin text-blue-500" />
                    </div>
                ) : leads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <FileText size={40} className="mb-3 opacity-50" />
                        <p className="text-sm font-semibold">No loan leads found</p>
                        <p className="text-xs mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Lead</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Contact</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Source</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Loan Amount</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">EMI</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Date</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {leads.map((lead) => {
                                    const stConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                                    const srcConfig = SOURCE_CONFIG[lead.leadSource] || SOURCE_CONFIG.general;
                                    return (
                                        <tr key={lead._id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => openDetail(lead)}>
                                            <td className="px-4 py-3.5">
                                                <div className="font-bold text-gray-900 text-[13px]">{lead.name}</div>
                                                <div className="text-[11px] text-gray-400 font-mono mt-0.5">{lead.leadId}</div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-1.5 text-gray-700 text-[13px]">
                                                    <Phone size={12} className="text-gray-400" />
                                                    <span>{lead.phone}</span>
                                                </div>
                                                {lead.email && (
                                                    <div className="flex items-center gap-1.5 text-gray-500 text-[11px] mt-0.5">
                                                        <Mail size={10} className="text-gray-300" />
                                                        <span className="truncate max-w-[150px]">{lead.email}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                                                    <span>{srcConfig.icon}</span>
                                                    <span>{srcConfig.label}</span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="font-semibold text-gray-900 text-[13px]">
                                                    {formatCurrency(lead.loanAmount || lead.eligibilityMaxLoan)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="text-[13px] text-gray-700">
                                                    {formatCurrency(lead.calculatedEmi)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${stConfig.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${stConfig.dot}`}></span>
                                                    {stConfig.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-[12px] text-gray-500">
                                                {formatDate(lead.createdAt)}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => openDetail(lead)}
                                                        className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                                                        title="View Details"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(lead._id)}
                                                        disabled={deleting === lead._id}
                                                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition disabled:opacity-50"
                                                        title="Delete"
                                                    >
                                                        {deleting === lead._id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                        <span className="text-xs text-gray-500 font-medium">
                            Showing page {page} of {totalPages} ({total} total leads)
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="p-2 rounded-lg border border-gray-200 hover:bg-white text-gray-500 disabled:opacity-30 transition"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                                const pg = start + i;
                                if (pg > totalPages) return null;
                                return (
                                    <button
                                        key={pg}
                                        onClick={() => setPage(pg)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition ${pg === page ? 'bg-blue-600 text-white shadow-sm' : 'border border-gray-200 hover:bg-white text-gray-600'}`}
                                    >
                                        {pg}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="p-2 rounded-lg border border-gray-200 hover:bg-white text-gray-500 disabled:opacity-30 transition"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Lead Detail Modal */}
            <AnimatePresence>
                {showDetail && selectedLead && (
                    <LeadDetailModal
                        lead={selectedLead}
                        onClose={() => { setShowDetail(false); setSelectedLead(null); }}
                        onStatusChange={handleStatusChange}
                        onNotesUpdate={handleNotesUpdate}
                        onDelete={handleDelete}
                        updating={updating}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

/* ─── Detail Modal ──────────────────────────────────────────────────── */
const LeadDetailModal = ({ lead, onClose, onStatusChange, onNotesUpdate, onDelete, updating }) => {
    const [notes, setNotes] = useState(lead.adminNotes || '');
    const [editingNotes, setEditingNotes] = useState(false);
    const stConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
    const srcConfig = SOURCE_CONFIG[lead.leadSource] || SOURCE_CONFIG.general;

    const InfoRow = ({ label, value, icon }) => (
        <div className="flex items-start gap-3 py-2.5">
            <div className="w-5 text-gray-400 mt-0.5 flex-shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5 break-words">{value || '—'}</p>
            </div>
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto border border-gray-100"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <h3 className="font-black text-gray-900 text-lg sm:text-xl">{lead.name}</h3>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{lead.leadId}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1 overscroll-contain">
                    {/* Status & Source */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${stConfig.color}`}>
                            <span className={`w-2 h-2 rounded-full ${stConfig.dot}`}></span>
                            {stConfig.label}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                            <span>{srcConfig.icon}</span>
                            {srcConfig.label}
                        </span>
                    </div>

                    {/* Status Change */}
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Change Status</p>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                                <button
                                    key={key}
                                    onClick={() => onStatusChange(lead._id, key)}
                                    disabled={updating || lead.status === key}
                                    className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition active:scale-[0.97] ${
                                        lead.status === key
                                            ? val.color + ' ring-2 ring-offset-1 ring-blue-300'
                                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                    } disabled:opacity-40`}
                                >
                                    {val.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contact Information</p>
                        <InfoRow label="Phone" value={lead.phone} icon={<Phone size={14} />} />
                        <InfoRow label="Email" value={lead.email} icon={<Mail size={14} />} />
                        {lead.userId && (
                            <InfoRow label="Registered User" value={lead.userId.name || lead.userId.phone || 'Yes'} icon={<User size={14} />} />
                        )}
                    </div>

                    {/* Loan Details */}
                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Loan Details</p>
                        <div className="grid grid-cols-2 gap-x-4">
                            <InfoRow label="Loan Amount" value={formatCurrency(lead.loanAmount)} icon={<IndianRupee size={14} />} />
                            <InfoRow label="Monthly EMI" value={formatCurrency(lead.calculatedEmi)} icon={<DollarSign size={14} />} />
                            <InfoRow label="Interest Rate" value={lead.interestRate ? `${lead.interestRate}%` : '—'} icon={<TrendingUp size={14} />} />
                            <InfoRow label="Tenure" value={lead.tenureYears ? `${lead.tenureYears} years` : '—'} icon={<Calendar size={14} />} />
                            <InfoRow label="Total Payable" value={formatCurrency(lead.totalPayable)} icon={<IndianRupee size={14} />} />
                            <InfoRow label="Total Interest" value={formatCurrency(lead.totalInterest)} icon={<IndianRupee size={14} />} />
                        </div>
                    </div>

                    {/* Eligibility Details (if applicable) */}
                    {(lead.eligibilityMaxLoan > 0 || lead.netMonthlyIncome > 0) && (
                        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Eligibility Details</p>
                            <div className="grid grid-cols-2 gap-x-4">
                                <InfoRow label="Max Eligible Loan" value={formatCurrency(lead.eligibilityMaxLoan)} icon={<CheckCircle size={14} />} />
                                <InfoRow label="Net Monthly Income" value={formatCurrency(lead.netMonthlyIncome)} icon={<IndianRupee size={14} />} />
                                <InfoRow label="Existing EMI" value={formatCurrency(lead.existingMonthlyEmi)} icon={<AlertCircle size={14} />} />
                                <InfoRow label="Borrower Type" value={lead.borrowerType === 'Two' ? 'Two Borrowers' : 'Single Borrower'} icon={<Users size={14} />} />
                                <InfoRow label="Age" value={lead.applicantAge || '—'} icon={<User size={14} />} />
                                <InfoRow label="Occupation" value={lead.applicantOccupation || '—'} icon={<Building2 size={14} />} />
                                {lead.borrowerType === 'Two' && (
                                    <>
                                        <InfoRow label="Co-Borrower Income" value={formatCurrency(lead.coBorrowerIncome)} icon={<IndianRupee size={14} />} />
                                        <InfoRow label="Co-Borrower EMI" value={formatCurrency(lead.coBorrowerEmi)} icon={<IndianRupee size={14} />} />
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Additional Info */}
                    <div className="grid grid-cols-2 gap-x-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <InfoRow label="Source Page" value={lead.sourcePage} icon={<FileText size={14} />} />
                        <InfoRow label="Preferred Bank" value={lead.preferredBank} icon={<Building2 size={14} />} />
                        <InfoRow label="Property Value" value={formatCurrency(lead.propertyValue)} icon={<Building2 size={14} />} />
                        <InfoRow label="Created At" value={formatDateTime(lead.createdAt)} icon={<Clock size={14} />} />
                    </div>

                    {/* Message */}
                    {lead.message && (
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Message</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{lead.message}</p>
                        </div>
                    )}

                    {/* Admin Notes */}
                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Admin Notes</p>
                            {!editingNotes && (
                                <button
                                    onClick={() => setEditingNotes(true)}
                                    className="text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 transition"
                                >
                                    <Edit3 size={11} /> Edit
                                </button>
                            )}
                        </div>
                        {editingNotes ? (
                            <div className="space-y-2">
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={4}
                                    className="w-full p-3 rounded-xl border border-amber-200 bg-white text-sm font-medium text-gray-900 outline-none focus:border-amber-400 resize-none"
                                    placeholder="Add internal notes about this lead..."
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { onNotesUpdate(lead._id, notes); setEditingNotes(false); }}
                                        className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => { setNotes(lead.adminNotes || ''); setEditingNotes(false); }}
                                        className="px-4 py-2 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-300 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-700 leading-relaxed">
                                {lead.adminNotes || <span className="text-gray-400 italic">No notes yet</span>}
                            </p>
                        )}
                    </div>

                    {/* Delete Action */}
                    <button
                        onClick={() => onDelete(lead._id)}
                        className="w-full py-3 rounded-xl border-2 border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition flex items-center justify-center gap-2"
                    >
                        <Trash2 size={14} />
                        Delete this Lead
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminLoanLeads;
