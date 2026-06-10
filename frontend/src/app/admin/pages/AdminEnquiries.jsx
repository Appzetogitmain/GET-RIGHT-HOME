import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Search, Filter, CheckCircle, XCircle, Clock, ArrowRight, X,
    AlertTriangle, Eye, FileText, Download, Loader2, ChevronLeft, ChevronRight, Edit2, Trash2
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import LeadTypeBadge from '../../../components/LeadTypeBadge';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const EnquiryStatusBadge = ({ status }) => {
    const rawStatus = (status || 'new').toLowerCase();
    const styles = {
        new: 'bg-blue-50 text-blue-700 border-blue-100',
        scheduled: 'bg-amber-50 text-amber-700 border-amber-100',
        contacted: 'bg-purple-50 text-purple-700 border-purple-100',
        closed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        sold: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        rented: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        dropped: 'bg-red-50 text-red-700 border-red-100',
    };

    const labelMap = {
        new: 'New',
        scheduled: 'Visit Scheduled',
        contacted: 'Contacted',
        closed: 'Closed',
        sold: 'Sold',
        rented: 'Rented',
        dropped: 'Dropped/Lost'
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${styles[rawStatus] || styles.new}`}>
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
            {labelMap[rawStatus] || rawStatus}
        </span>
    );
};

const getPropertySpecs = (prop) => {
    if (!prop) return { price: 0, priceStr: 'Price on Request', area: '–', areaStr: '–', unit: '' };

    const pType = (prop.propertyType || '').toLowerCase();
    const transaction = (prop.transactionType || '').toLowerCase();

    // 1. Resolve Price
    let priceVal =
        prop.startingPrice ??
        prop.rentDetails?.monthlyRent ??
        prop.pgDetails?.monthlyRent ??
        prop.buyDetails?.expectedPrice ??
        prop.plotDetails?.expectedPrice ??
        prop.dynamicData?.expectedPrice ??
        prop.dynamicData?.monthlyRent ??
        prop.dynamicData?.expectedRent ??
        prop.dynamicData?.price ??
        prop.price;

    if (priceVal && typeof priceVal === 'object') {
        const possiblePriceKeys = ['value', 'amount', 'price', 'expectedPrice', 'monthlyRent'];
        for (const key of possiblePriceKeys) {
            if (priceVal[key] !== undefined && priceVal[key] !== null) {
                priceVal = priceVal[key];
                break;
            }
        }
    }
    const price = Number(priceVal) || 0;

    // 2. Resolve Area
    let area = null;
    const possibleAreaValues = [
        prop.buyDetails?.area?.superBuiltUp,
        prop.buyDetails?.area?.carpet,
        prop.carpetArea,
        prop.superArea,
        prop.dynamicData?.carpetArea,
        prop.dynamicData?.superArea,
        prop.dynamicData?.plotArea,
        prop.plotDetails?.plotArea,
        prop.rentDetails?.area,
        prop.buyDetails?.area,
        prop.area
    ];

    for (const val of possibleAreaValues) {
        if (val !== undefined && val !== null) {
            if (typeof val === 'object') {
                const possibleAreaKeys = ['superBuiltUp', 'carpet', 'value', 'amount', 'size', 'super'];
                let found = false;
                for (const key of possibleAreaKeys) {
                    if (val[key] !== undefined && val[key] !== null && val[key] !== '') {
                        area = val[key];
                        found = true;
                        break;
                    }
                }
                if (found) break;
            } else if (val !== '') {
                area = val;
                break;
            }
        }
    }

    // 3. Resolve Unit
    let unit = '';
    const possibleUnitValues = [
        prop.buyDetails?.area?.unit,
        prop.carpetAreaUnit,
        prop.areaUnit,
        prop.dynamicData?.carpetAreaUnit,
        prop.dynamicData?.areaUnit,
        prop.dynamicData?.superAreaUnit,
        prop.plotDetails?.unit,
        prop.rentDetails?.unit
    ];

    for (const val of possibleUnitValues) {
        if (val && typeof val === 'string') {
            unit = val;
            break;
        }
    }
    if (!unit) {
        unit = (pType === 'plot' || prop.plotDetails) ? 'sq.yrd' : 'sq.ft';
    }

    // 4. Format Price
    const formatPriceLakhCrore = (num) => {
        if (!num || isNaN(num)) return 'Price on Request';
        if (num >= 10000000) {
            return `₹${(num / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
        }
        if (num >= 100000) {
            return `₹${(num / 100000).toFixed(2).replace(/\.00$/, '')} L`;
        }
        return `₹${num.toLocaleString('en-IN')}`;
    };

    const isRent = ['rent', 'lease', 'pg', 'hostel'].includes(pType) || transaction.includes('rent');
    const priceStr = price > 0 ? (formatPriceLakhCrore(price) + (isRent ? '/mo' : '')) : 'Price on Request';
    const areaStr = area && area !== '–' ? `${area} ${unit}` : '–';

    return { price, priceStr, area, areaStr, unit };
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '–';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

const MetricCard = ({ label, value, subLabel, loading }) => (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex-1 transition-all hover:shadow-md">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5">{label}</p>
        <div className="flex items-baseline gap-2">
            {loading ? (
                <div className="h-8 w-16 bg-gray-50 animate-pulse rounded-md"></div>
            ) : (
                <h3 className="text-2xl font-bold text-gray-900">
                    {(value ?? 0).toLocaleString()}
                </h3>
            )}
            {subLabel && <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{subLabel}</span>}
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
        status: '',
        category: '',
        startDate: '',
        endDate: '',
        ownerBroker: ''
    });

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
                status: currentFilters.status,
                category: currentFilters.category,
                startDate: currentFilters.startDate,
                endDate: currentFilters.endDate,
                ownerBroker: currentFilters.ownerBroker
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

    const handleClearFilters = () => {
        setFilters({
            search: '',
            status: '',
            category: '',
            startDate: '',
            endDate: '',
            ownerBroker: ''
        });
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
        const status = enquiry.status || enquiry.inquiryMetadata?.status || 'new';
        const rawDate = enquiry.preferredDate || enquiry.inquiryMetadata?.preferredDate;
        const pDate = rawDate ? new Date(rawDate).toISOString().split('T')[0] : '';
        const messageVal = enquiry.message || enquiry.inquiryMetadata?.message || '';
        setEditForm({
            status,
            preferredDate: pDate,
            message: messageVal,
            timeSlot: enquiry.timeSlot || enquiry.inquiryMetadata?.timeSlot || ''
        });
        setIsEditModalOpen(true);
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
        if (action === 'delete') {
            setModalConfig({
                isOpen: true,
                title: 'Delete Enquiry?',
                message: `Are you sure you want to delete enquiry #${enquiry.enquiryId || enquiry._id.slice(-8).toUpperCase()}? This action is permanent.`,
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

        const headers = ['ID', 'Enquiry ID', 'Property Name', 'Property Type', 'Area', 'Price', 'User Name', 'Phone', 'Email', 'Preferred Date', 'Status', 'Message'];
        const csvContent = [
            headers.join(','),
            ...enquiries.map(e => {
                const prop = e.propertyId || {};
                const specs = getPropertySpecs(prop);
                return [
                    e._id,
                    e.enquiryId || e._id.slice(-8).toUpperCase(),
                    `"${prop.propertyName || 'N/A'}"`,
                    `"${prop.propertyType || 'N/A'}"`,
                    `"${specs.areaStr}"`,
                    `"${specs.priceStr}"`,
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

    const hasActiveFilters = filters.search || filters.status || filters.category || filters.startDate || filters.endDate || filters.ownerBroker;

    return (
        <div className="space-y-6 relative pb-10 tracking-tight text-gray-900">
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Enquiry Manager ({totalEnquiries})</h2>
                    <p className="text-gray-500 text-xs mt-1">Manage user queries, visits, and meetings schedule.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard label="Total Enquiries" value={metrics.total} subLabel="ALL TIME" loading={loading} />
                <MetricCard label="New Enquiries" value={metrics.new} subLabel="NEEDS RESPONSE" loading={loading} />
                <MetricCard label="Scheduled Visits" value={metrics.scheduled} subLabel="UPCOMING VISITS" loading={loading} />
                <MetricCard label="Closed Deals" value={metrics.closed} subLabel="SUCCESSFUL" loading={loading} />
            </div>

            {/* Filter Suite */}
            <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
                    {/* Search Input */}
                    <div className="relative lg:col-span-4 w-full">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by ID, name, email or phone..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-black outline-none transition-all tracking-tight"
                        />
                    </div>

                    {/* Category Dropdown */}
                    <div className="lg:col-span-2 w-full">
                        <select
                            value={filters.category}
                            onChange={(e) => handleFilterChange('category', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-black transition-all"
                        >
                            <option value="">All Categories</option>
                            <option value="Rent">Rent</option>
                            <option value="Buy">Buy</option>
                            <option value="PG">PG</option>
                            <option value="Commercial">Commercial</option>
                            <option value="Plot">Plot</option>
                        </select>
                    </div>

                    {/* Status Dropdown */}
                    <div className="lg:col-span-2 w-full">
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-black transition-all"
                        >
                            <option value="">All Statuses</option>
                            <option value="new">New</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="contacted">Contacted</option>
                            <option value="closed">Closed</option>
                            <option value="sold">Sold</option>
                            <option value="rented">Rented</option>
                            <option value="dropped">Dropped</option>
                        </select>
                    </div>

                    {/* Owner/Broker Dropdown */}
                    <div className="lg:col-span-2 w-full">
                        <select
                            value={filters.ownerBroker}
                            onChange={(e) => handleFilterChange('ownerBroker', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-black transition-all"
                        >
                            <option value="">All Sources</option>
                            <option value="owner">By Owner</option>
                            <option value="broker">By Broker</option>
                        </select>
                    </div>

                    {/* Clear Button */}
                    <div className="lg:col-span-2 w-full flex justify-end">
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="text-xs font-semibold text-gray-500 hover:text-black transition-colors py-2 px-3 hover:underline"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* Date range picker line */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <Calendar size={14} /> Date Filter:
                    </span>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-black"
                        />
                        <span className="text-gray-400 text-xs font-medium">to</span>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-black"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/75 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold">
                                <th className="p-4 w-[120px]">Enquiry ID</th>
                                <th className="p-4 w-[280px]">Property</th>
                                <th className="p-4 w-[250px]">Buyer Details</th>
                                <th className="p-4 w-[160px]">Received Date</th>
                                <th className="p-4 w-[120px]">Status</th>
                                <th className="p-4 text-center w-[140px]">Actions</th>
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
                                            const specs = getPropertySpecs(prop);

                                            return (
                                                <motion.tr
                                                    key={enquiry._id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    transition={{ delay: index * 0.03 }}
                                                    className="hover:bg-gray-50/50 transition-colors group relative"
                                                >
                                                    {/* ID Column */}
                                                    <td className="p-4">
                                                        <span 
                                                            onClick={() => handleAction('view', enquiry)}
                                                            className="font-mono text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                                                        >
                                                            #{enquiry.enquiryId || enquiry._id.slice(-8).toUpperCase()}
                                                        </span>
                                                        <p className="text-[10px] text-gray-400 mt-1 font-medium">
                                                            {new Date(enquiry.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </td>

                                                    {/* Property Column */}
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            {/* Thumbnail Preview */}
                                                            {prop.coverImage ? (
                                                                <img 
                                                                    src={prop.coverImage} 
                                                                    alt={prop.propertyName} 
                                                                    className="w-10 h-10 object-cover rounded-lg border border-gray-100 shrink-0" 
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                                                                    <FileText size={16} />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="text-sm font-semibold text-gray-900 leading-tight">
                                                                    {prop.propertyName || 'Deleted Property'}
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-0.5 font-normal">
                                                                    {prop.propertyType || 'N/A'} • {specs.areaStr} • {specs.priceStr}
                                                                </div>
                                                                <span className="inline-block mt-1 text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                    {prop.partnerId ? 'Broker Property' : 'Owner Property'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Buyer Details Column */}
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            {/* Circle Avatar */}
                                                            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 text-xs font-bold shrink-0">
                                                                {getInitials(enquiry.userId?.name)}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-semibold text-gray-900 leading-tight">
                                                                    {enquiry.userId?.name || 'Guest User'}
                                                                </div>
                                                                {/* Lead type badge */}
                                                                <LeadTypeBadge type={enquiry.enquiryType || 'callback'} />
                                                                <div className="text-xs text-gray-500 font-normal mt-0.5">
                                                                    {enquiry.userId?.phone && <span>{enquiry.userId.phone}</span>}
                                                                    {enquiry.userId?.email && <span className="block">{enquiry.userId.email}</span>}
                                                                </div>
                                                                <span className="inline-block mt-1 text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                    {enquiry.userId?.role || 'Buyer'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Received / Created Date */}
                                                    <td className="p-4">
                                                        <div className="text-xs text-gray-700 font-medium">
                                                            {formatDateTime(enquiry.createdAt)}
                                                        </div>
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="p-4">
                                                        <EnquiryStatusBadge status={enquiry.status || enquiry.inquiryMetadata?.status} />
                                                    </td>

                                                    {/* Quick Actions Column */}
                                                    <td className="p-4 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                onClick={() => handleAction('view', enquiry)}
                                                                className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-black rounded-lg transition-colors border border-gray-200 shadow-sm"
                                                                title="View Details"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenEdit(enquiry)}
                                                                className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-black rounded-lg transition-colors border border-gray-200 shadow-sm"
                                                                title="Edit Status"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction('delete', enquiry)}
                                                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg transition-colors border border-red-200 shadow-sm"
                                                                title="Delete Enquiry"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="p-12 text-center text-gray-400 text-xs font-semibold tracking-wider">
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
                    <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
                        <p className="text-xs text-gray-500 font-medium">
                            Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalEnquiries)} of {totalEnquiries} enquiries
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors bg-white shadow-sm"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-black text-white shadow-sm' : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300 shadow-sm'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors bg-white shadow-sm"
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
                            <div className="flex items-center justify-between p-6 border-b border-gray-150">
                                <h3 className="text-lg font-bold text-gray-900">Enquiry Details</h3>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Property Info</p>
                                    <h4 className="text-base font-bold text-gray-900 mt-1">
                                        {selectedEnquiry.propertyId?.propertyName || 'N/A'}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Type: {selectedEnquiry.propertyId?.propertyType || 'N/A'} • {getPropertySpecs(selectedEnquiry.propertyId).areaStr} • {getPropertySpecs(selectedEnquiry.propertyId).priceStr} • {selectedEnquiry.propertyId?.address?.city || 'N/A'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Buyer Name</p>
                                        <p className="text-sm font-semibold text-gray-900 mt-1">
                                            {selectedEnquiry.userId?.name || 'Guest User'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Buyer Phone</p>
                                        <p className="text-sm font-semibold text-gray-900 mt-1">
                                            {selectedEnquiry.userId?.phone || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Buyer Email</p>
                                        <p className="text-sm font-semibold text-gray-900 mt-1">
                                            {selectedEnquiry.userId?.email || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preferred Visit Date</p>
                                        <p className="text-sm font-semibold text-gray-900 mt-1">
                                            {selectedEnquiry.preferredDate || selectedEnquiry.inquiryMetadata?.preferredDate
                                                ? new Date((selectedEnquiry.preferredDate || selectedEnquiry.inquiryMetadata.preferredDate)).toLocaleDateString()
                                                : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
                                    <div className="mt-1">
                                        <EnquiryStatusBadge status={selectedEnquiry.status || selectedEnquiry.inquiryMetadata?.status} />
                                    </div>
                                </div>
                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Message / Slot details</p>
                                    <div className="mt-1 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-700 font-medium">
                                        {selectedEnquiry.message || selectedEnquiry.inquiryMetadata?.message || 'No additional message provided.'}
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
                            <div className="flex items-center justify-between p-6 border-b border-gray-150">
                                <h3 className="text-lg font-bold text-gray-900">Edit Enquiry Details</h3>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveEdit}>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status</label>
                                        <select
                                            value={editForm.status}
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-black"
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
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Scheduled / Preferred Visit Date</label>
                                        <input
                                            type="date"
                                            value={editForm.preferredDate}
                                            onChange={(e) => setEditForm({ ...editForm, preferredDate: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Message / Notes</label>
                                        <textarea
                                            value={editForm.message}
                                            onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                                            rows="4"
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-black resize-none"
                                            placeholder="Update message or add visit notes..."
                                        />
                                    </div>
                                </div>
                                <div className="p-6 border-t border-gray-150 bg-gray-50/50 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-bold uppercase rounded-xl hover:bg-gray-100 transition-colors bg-white shadow-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="px-5 py-2 bg-black text-white text-xs font-bold uppercase rounded-xl hover:bg-gray-900 flex items-center gap-1.5 transition-colors shadow-sm"
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
