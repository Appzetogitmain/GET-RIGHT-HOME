import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Search, Filter, MoreVertical,
    CheckCircle, XCircle, Clock, ArrowRight, X, AlertTriangle, Eye,
    FileText, Download, Loader2, ChevronLeft, ChevronRight, Edit2, Trash2
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const EnquiryStatusBadge = ({ status }) => {
    const rawStatus = (status || 'new').toLowerCase();
    const styles = {
        new: 'bg-blue-100 text-blue-700 border-blue-200 font-bold',
        scheduled: 'bg-purple-100 text-purple-700 border-purple-200 font-bold',
        contacted: 'bg-amber-100 text-amber-700 border-amber-200 font-bold',
        closed: 'bg-green-100 text-green-700 border-green-200 font-bold',
        sold: 'bg-green-100 text-green-700 border-green-200 font-bold',
        rented: 'bg-green-100 text-green-700 border-green-200 font-bold',
        dropped: 'bg-red-100 text-red-700 border-red-200 font-bold',
    };

    const icons = {
        new: <Clock size={10} className="mr-1" />,
        scheduled: <Calendar size={10} className="mr-1" />,
        contacted: <Clock size={10} className="mr-1" />,
        closed: <CheckCircle size={10} className="mr-1" />,
        sold: <CheckCircle size={10} className="mr-1" />,
        rented: <CheckCircle size={10} className="mr-1" />,
        dropped: <XCircle size={10} className="mr-1" />,
    };

    return (
        <span className={`flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${styles[rawStatus] || styles.new}`}>
            {icons[rawStatus] || icons.new}
            {rawStatus}
        </span>
    );
};

const MetricCard = ({ label, value, subLabel, loading }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-1">
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
            {loading ? (
                <div className="h-8 w-16 bg-gray-50 animate-pulse rounded-md"></div>
            ) : (
                <h3 className="text-2xl font-bold text-gray-900 uppercase">
                    {(value ?? 0).toLocaleString()}
                </h3>
            )}
            {subLabel && <span className="text-[10px] font-bold uppercase text-gray-400">{subLabel}</span>}
        </div>
    </div>
);

const AdminEnquiries = () => {
    const [enquiries, setEnquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalEnquiries, setTotalEnquiries] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit] = useState(10);

    const [filters, setFilters] = useState({
        search: '',
        status: ''
    });

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });
    
    // Details & Edit Modal States
    const [selectedEnquiry, setSelectedEnquiry] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ status: '', preferredDate: '', message: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Global counts
    const [metrics, setMetrics] = useState({ total: 0, new: 0, scheduled: 0, closed: 0 });

    const fetchEnquiries = useCallback(async (page, currentFilters) => {
        try {
            setLoading(true);
            const res = await adminService.getEnquiries({
                page,
                limit,
                search: currentFilters.search,
                status: currentFilters.status
            });

            if (res.success) {
                setEnquiries(res.enquiries);
                setTotalEnquiries(res.total);
                setTotalPages(Math.ceil(res.total / limit));
            }
        } catch (error) {
            console.error('Error fetching enquiries:', error);
            toast.error('Failed to load enquiries');
        } finally {
            setLoading(false);
        }
    }, [limit]);

    // Fetch Global Metrics for Enquiries
    const fetchMetrics = useCallback(async () => {
        try {
            // We can fetch a page of size 1000 or query total/status counts from stats
            const res = await adminService.getEnquiries({ page: 1, limit: 1000 });
            if (res.success) {
                const list = res.enquiries || [];
                const counts = {
                    total: res.total || list.length,
                    new: list.filter(e => (e.status || e.inquiryMetadata?.status || 'new').toLowerCase() === 'new').length,
                    scheduled: list.filter(e => (e.status || e.inquiryMetadata?.status || '').toLowerCase() === 'scheduled').length,
                    closed: list.filter(e => ['closed', 'sold', 'rented'].includes((e.status || e.inquiryMetadata?.status || '').toLowerCase())).length,
                };
                setMetrics(counts);
            }
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchEnquiries(currentPage, filters);
        }, 300);
        return () => clearTimeout(timer);
    }, [currentPage, filters, fetchEnquiries]);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleDelete = async (id) => {
        try {
            const res = await adminService.deleteEnquiry(id);
            if (res.success) {
                toast.success('Enquiry deleted successfully');
                fetchEnquiries(currentPage, filters);
                fetchMetrics();
            }
        } catch (error) {
            toast.error('Failed to delete enquiry');
        }
    };

    const handleOpenEdit = (enquiry) => {
        setSelectedEnquiry(enquiry);
        const status = enquiry.status || enquiry.status || enquiry.inquiryMetadata?.status || 'new';
        const rawDate = enquiry.preferredDate || enquiry.preferredDate || enquiry.inquiryMetadata?.preferredDate;
        const pDate = rawDate ? new Date(rawDate).toISOString().split('T')[0] : '';
        const messageVal = enquiry.message || enquiry.message || enquiry.inquiryMetadata?.message || '';
        setEditForm({
            status,
            preferredDate: pDate,
            message: messageVal,
            timeSlot: enquiry.timeSlot || enquiry.inquiryMetadata?.timeSlot || ''
        });
        setIsEditModalOpen(true);
        setActiveDropdown(null);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const res = await adminService.updateEnquiry(selectedEnquiry._id, editForm);
            if (res.success) {
                toast.success('Enquiry details updated successfully');
                setIsEditModalOpen(false);
                fetchEnquiries(currentPage, filters);
                fetchMetrics();
            }
        } catch (error) {
            toast.error('Failed to update enquiry details');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAction = (action, enquiry) => {
        setActiveDropdown(null);
        if (action === 'delete') {
            setModalConfig({
                isOpen: true,
                title: 'Delete Enquiry?',
                message: `Are you sure you want to delete enquiry #${enquiry.bookingId || enquiry._id.slice(-8).toUpperCase()}? This action is permanent.`,
                type: 'danger',
                confirmText: 'Delete',
                onConfirm: () => handleDelete(enquiry._id)
            });
        } else if (action === 'view') {
            setSelectedEnquiry(enquiry);
            setIsDetailsModalOpen(true);
        }
    };

    const handleExportCSV = () => {
        if (enquiries.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['ID', 'Enquiry ID', 'Property Name', 'Property Type', 'Price', 'User Name', 'Phone', 'Email', 'Preferred Date', 'Status', 'Message'];
        const csvContent = [
            headers.join(','),
            ...enquiries.map(e => {
                const prop = e.propertyId || {};
                const pType = prop.propertyType || '';
                const price = pType === 'buy' ? prop.buyDetails?.expectedPrice : (pType === 'rent' ? prop.rentDetails?.monthlyRent : prop.plotDetails?.expectedPrice);
                return [
                    e._id,
                    e.bookingId || e._id.slice(-8).toUpperCase(),
                    `"${prop.propertyName || 'N/A'}"`,
                    `"${prop.propertyType || 'N/A'}"`,
                    price || 'N/A',
                    `"${e.userId?.name || 'N/A'}"`,
                    e.userId?.phone || 'N/A',
                    e.userId?.email || 'N/A',
                    e.preferredDate || e.inquiryMetadata?.preferredDate ? new Date(e.preferredDate || e.inquiryMetadata.preferredDate).toLocaleDateString() : 'N/A',
                    e.status || e.inquiryMetadata?.status || 'new',
                    `"${(e.message || e.inquiryMetadata?.message || '').replace(/"/g, '""')}"`
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `enquiries-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exported successfully');
    };

    return (
        <div className="space-y-6 relative pb-10 uppercase tracking-tight" onClick={() => setActiveDropdown(null)}>
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 uppercase">Enquiry Manager ({totalEnquiries})</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">Manage user queries, visits, and meetings schedule.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <MetricCard label="Total Enquiries" value={metrics.total} subLabel="ALL TIME" loading={loading} />
                <MetricCard label="New Enquiries" value={metrics.new} subLabel="NEEDS RESPONSE" loading={loading} />
                <MetricCard label="Scheduled Visits" value={metrics.scheduled} subLabel="UPCOMING VISITS" loading={loading} />
                <MetricCard label="Closed Deals" value={metrics.closed} subLabel="SUCCESSFUL" loading={loading} />
            </div>

            {/* Filters */}
            <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search via ID, Buyer or Property Name..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-xs font-bold uppercase focus:bg-white focus:border-black outline-none transition-all tracking-tight"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
                    >
                        <option value="">All Status</option>
                        <option value="new">New</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="contacted">Contacted</option>
                        <option value="closed">Closed</option>
                        <option value="sold">Sold</option>
                        <option value="rented">Rented</option>
                        <option value="dropped">Dropped</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                <th className="p-4">Enquiry ID</th>
                                <th className="p-4">Property</th>
                                <th className="p-4">Buyer Details</th>
                                <th className="p-4">Scheduled Date</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="p-4"><div className="h-10 bg-gray-50 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : (
                                <AnimatePresence>
                                    {enquiries.length > 0 ? (
                                        enquiries.map((enquiry, index) => {
                                            const prop = enquiry.propertyId || {};
                                            const pType = prop.propertyType || '';
                                            const price = pType === 'buy' ? prop.buyDetails?.expectedPrice : (pType === 'rent' ? prop.rentDetails?.monthlyRent : prop.plotDetails?.expectedPrice);

                                            return (
                                                <motion.tr
                                                    key={enquiry._id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="hover:bg-gray-50/50 transition-colors group relative font-bold"
                                                >
                                                    <td className="p-4">
                                                        <span className="font-mono text-xs font-bold text-gray-900 uppercase tracking-tight">
                                                            #{enquiry.bookingId || enquiry._id.slice(-8).toUpperCase()}
                                                        </span>
                                                        <p className="text-[10px] text-gray-400 mt-0.5 font-bold">
                                                            {new Date(enquiry.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                                                                {prop.propertyName || 'Deleted Property'}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 font-semibold uppercase">
                                                                {prop.propertyType} • ₹{price ? price.toLocaleString() : 'N/A'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col">
                                                            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                                                                {enquiry.userId?.name || 'N/A'}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase">
                                                                {enquiry.userId?.phone || 'No Phone'}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase">
                                                                {enquiry.userId?.email || 'No Email'}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="text-xs font-bold text-gray-700">
                                                            {enquiry.preferredDate || enquiry.inquiryMetadata?.preferredDate
                                                                ? new Date((enquiry.preferredDate || enquiry.inquiryMetadata.preferredDate)).toLocaleDateString()
                                                                : 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <EnquiryStatusBadge status={enquiry.status || enquiry.inquiryMetadata?.status} />
                                                    </td>
                                                    <td className="p-4 text-center relative">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === enquiry._id ? null : enquiry._id); }}
                                                            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors"
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>

                                                        {activeDropdown === enquiry._id && (
                                                            <div className="absolute right-8 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1 text-left">
                                                                <button
                                                                    onClick={() => handleAction('view', enquiry)}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-[10px] font-bold uppercase text-gray-700"
                                                                >
                                                                    <Eye size={14} /> View Details
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenEdit(enquiry)}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-[10px] font-bold uppercase text-gray-700"
                                                                >
                                                                    <Edit2 size={14} /> Edit / Reschedule
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAction('delete', enquiry)}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-600"
                                                                >
                                                                    <Trash2 size={14} /> Delete Enquiry
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                                No enquiries found matching filters.
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                             )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && enquiries.length > 0 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase text-gray-500 tracking-tight">
                            Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalEnquiries)} of {totalEnquiries} enquiries
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-10 h-10 rounded-lg text-[10px] font-bold uppercase transition-all ${currentPage === i + 1 ? 'bg-black text-white shadow-md' : 'hover:bg-gray-100 text-gray-600 border border-transparent hover:border-gray-200'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            <AnimatePresence>
                {isDetailsModalOpen && selectedEnquiry && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl border border-gray-200 max-w-lg w-full overflow-hidden shadow-2xl"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 uppercase">Enquiry Details</h3>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Property Info</p>
                                    <h4 className="text-base font-bold text-gray-900 uppercase mt-1">
                                        {selectedEnquiry.propertyId?.propertyName || 'N/A'}
                                    </h4>
                                    <p className="text-xs text-gray-500 uppercase mt-0.5">
                                        Type: {selectedEnquiry.propertyId?.propertyType} • {selectedEnquiry.propertyId?.address?.city || 'N/A'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">Buyer Name</p>
                                        <p className="text-sm font-bold text-gray-900 uppercase mt-1">
                                            {selectedEnquiry.userId?.name || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">Buyer Phone</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">
                                            {selectedEnquiry.userId?.phone || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">Buyer Email</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">
                                            {selectedEnquiry.userId?.email || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">Preferred Visit Date</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">
                                            {selectedEnquiry.preferredDate || selectedEnquiry.inquiryMetadata?.preferredDate
                                                ? new Date((selectedEnquiry.preferredDate || selectedEnquiry.inquiryMetadata.preferredDate)).toLocaleDateString()
                                                : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Status</p>
                                    <div className="mt-1">
                                        <EnquiryStatusBadge status={selectedEnquiry.status || selectedEnquiry.inquiryMetadata?.status} />
                                    </div>
                                </div>
                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">Message / Slot details</p>
                                    <div className="mt-1 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs text-gray-700 font-bold uppercase">
                                        {selectedEnquiry.message || selectedEnquiry.inquiryMetadata?.message || 'I am interested in this property.'}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit / Reschedule Modal */}
            <AnimatePresence>
                {isEditModalOpen && selectedEnquiry && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl border border-gray-200 max-w-lg w-full overflow-hidden shadow-2xl"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 uppercase">Edit Enquiry details</h3>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                                    <X size={18} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveEdit}>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Status</label>
                                        <select
                                            value={editForm.status}
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:bg-white focus:border-black"
                                        >
                                            <option value="new">New</option>
                                            <option value="scheduled">Scheduled</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="closed">Closed</option>
                                            <option value="sold">Sold</option>
                                            <option value="rented">Rented</option>
                                            <option value="dropped">Dropped</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Scheduled / Preferred Visit Date</label>
                                        <input
                                            type="date"
                                            value={editForm.preferredDate}
                                            onChange={(e) => setEditForm({ ...editForm, preferredDate: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:bg-white focus:border-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Message / Notes</label>
                                        <textarea
                                            value={editForm.message}
                                            onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                                            rows="4"
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold uppercase outline-none focus:bg-white focus:border-black resize-none"
                                            placeholder="Update message or add visit notes..."
                                        />
                                    </div>
                                </div>
                                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-bold uppercase rounded-xl hover:bg-gray-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="px-5 py-2 bg-black text-white text-xs font-bold uppercase rounded-xl hover:bg-gray-900 flex items-center gap-1.5"
                                    >
                                        {isSaving && <Loader2 size={12} className="animate-spin" />}
                                        Save Changes
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

export default AdminEnquiries;
