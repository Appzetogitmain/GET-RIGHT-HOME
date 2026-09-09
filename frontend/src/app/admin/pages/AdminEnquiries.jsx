import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Search, Filter, CheckCircle, XCircle, Clock, ArrowRight, X,
    AlertTriangle, Eye, FileText, Download, Loader2, ChevronLeft, ChevronRight,
    Edit2, Trash2, PhoneCall, MessageSquare, FileDown, UserCheck, BellRing,
    Building2, User, Home, MapPin, Tag, IndianRupee, Compass, Layers, ExternalLink
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
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
        'follow-up': 'bg-indigo-50 text-indigo-700 border-indigo-100',
        negotiation: 'bg-orange-50 text-orange-700 border-orange-100'
    };

    const labelMap = {
        new: 'New Lead',
        scheduled: 'Visit Scheduled',
        contacted: 'Contacted',
        closed: 'Closed',
        sold: 'Sold',
        rented: 'Rented',
        dropped: 'Dropped/Lost',
        'follow-up': 'Follow-Up',
        negotiation: 'Negotiation'
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${styles[rawStatus] || styles.new}`}>
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
            {labelMap[rawStatus] || rawStatus}
        </span>
    );
};

const ActionTypeBadge = ({ action }) => {
    const raw = (action || 'callback').toLowerCase();
    const config = {
        call: { label: 'Call', icon: PhoneCall, style: 'bg-amber-50 text-amber-700 border-amber-200' },
        whatsapp: { label: 'WhatsApp', icon: MessageSquare, style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        view_number: { label: 'View Number', icon: Eye, style: 'bg-sky-50 text-sky-700 border-sky-200' },
        download_brochure: { label: 'Brochure', icon: FileDown, style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        brochure_download: { label: 'Brochure', icon: FileDown, style: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        schedule_visit: { label: 'Schedule Visit', icon: Calendar, style: 'bg-purple-50 text-purple-700 border-purple-200' },
        visit: { label: 'Visit', icon: Calendar, style: 'bg-purple-50 text-purple-700 border-purple-200' },
        callback: { label: 'Callback', icon: BellRing, style: 'bg-blue-50 text-blue-700 border-blue-200' },
        profile_view: { label: 'Profile View', icon: UserCheck, style: 'bg-teal-50 text-teal-700 border-teal-200' },
        document_view: { label: 'Document', icon: FileText, style: 'bg-violet-50 text-violet-700 border-violet-200' },
    };
    const current = config[raw] || { label: raw.replace('_', ' '), icon: BellRing, style: 'bg-gray-50 text-gray-700 border-gray-200' };
    const Icon = current.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border tracking-tight ${current.style}`}>
            <Icon size={11} className="shrink-0" />
            {current.label}
        </span>
    );
};

const SourceContextBadge = ({ source }) => {
    if (!source) return null;
    const labelMap = {
        card: 'Card Click',
        detail_page: 'Detail Page',
        details_page: 'Detail Page',
        profile_page: 'Profile Page',
        quick_view: 'Quick View',
        home_section: 'Home Section'
    };
    return (
        <span className="inline-block text-[9px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
            {labelMap[source] || source.replace('_', ' ')}
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

const MetricCard = ({ label, value, subLabel, loading, color = 'gray' }) => (
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
        actionType: '',
        targetType: '',
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
    const [metrics, setMetrics] = useState({ total: 0, calls: 0, whatsapps: 0, scheduled: 0, brochures: 0 });

    const fetchEnquiries = useCallback(async (page, currentFilters) => {
        try {
            setLoading(true);
            const res = await adminService.getEnquiries({
                page,
                limit,
                search: currentFilters.search,
                status: currentFilters.status,
                actionType: currentFilters.actionType,
                targetType: currentFilters.targetType,
                category: currentFilters.category,
                startDate: currentFilters.startDate,
                endDate: currentFilters.endDate,
                ownerBroker: currentFilters.ownerBroker
            });

            if (res.success) {
                setEnquiries(res.enquiries || []);
                setTotalEnquiries(res.total || 0);
                setTotalPages(Math.ceil((res.total || 0) / limit));
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
                    calls: list.filter(e => ['call', 'view_number'].includes((e.actionType || e.enquiryType || '').toLowerCase())).length,
                    whatsapps: list.filter(e => (e.actionType || e.enquiryType || '').toLowerCase() === 'whatsapp').length,
                    scheduled: list.filter(e => (e.status || e.inquiryMetadata?.status || '').toLowerCase() === 'scheduled' || (e.actionType || e.enquiryType || '').toLowerCase() === 'visit').length,
                    brochures: list.filter(e => ['brochure_download', 'download_brochure'].includes((e.actionType || e.enquiryType || '').toLowerCase())).length,
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
            actionType: '',
            targetType: '',
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
                message: `Are you sure you want to delete lead #${enquiry.enquiryId || enquiry._id.slice(-8).toUpperCase()}? This action is permanent.`,
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

        const headers = [
            'Enquiry ID',
            'Action Type',
            'Target Type',
            'Target Name',
            'Source Context',
            'Customer Name',
            'Customer Phone',
            'Customer Email',
            'Requirement Summary',
            'City',
            'Status',
            'Created Date',
            'Message'
        ];

        const csvContent = [
            headers.join(','),
            ...enquiries.map(e => {
                const targetName = e.propertyId?.propertyName || 
                                   e.brokerId?.name || 
                                   e.builderId?.builderProfile?.developerName || 
                                   e.builderId?.name || 
                                   'General';
                const reqSummary = e.requirement?.text || 
                                  `${e.requirement?.propertyType || ''} ${e.requirement?.city || ''}`.trim() || 
                                  'N/A';
                return [
                    e.enquiryId || e._id.slice(-8).toUpperCase(),
                    e.actionType || e.enquiryType || 'callback',
                    e.targetType || (e.propertyId ? 'property' : e.brokerId ? 'broker' : e.builderId ? 'builder' : 'general'),
                    `"${targetName.replace(/"/g, '""')}"`,
                    e.sourceContext || 'details_page',
                    `"${(e.name || e.userId?.name || 'Guest User').replace(/"/g, '""')}"`,
                    e.phone || e.userId?.phone || 'N/A',
                    e.email || e.userId?.email || 'N/A',
                    `"${reqSummary.replace(/"/g, '""')}"`,
                    `"${(e.requirement?.city || e.propertyId?.address?.city || 'N/A').replace(/"/g, '""')}"`,
                    e.status || e.inquiryMetadata?.status || 'new',
                    new Date(e.createdAt).toLocaleDateString(),
                    `"${(e.message || e.inquiryMetadata?.message || '').replace(/"/g, '""')}"`
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `leads-enquiries-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exported successfully');
    };

    const hasActiveFilters = Boolean(
        filters.search ||
        filters.status ||
        filters.actionType ||
        filters.targetType ||
        filters.category ||
        filters.startDate ||
        filters.endDate ||
        filters.ownerBroker
    );

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
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        Leads & Enquiry Manager
                        <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full border border-gray-200 font-semibold">
                            {totalEnquiries} Total Leads
                        </span>
                    </h2>
                    <p className="text-gray-500 text-xs mt-1">
                        Real-time tracking of calls, WhatsApp inquiries, brochure downloads, builder contacts, and scheduled visits.
                    </p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
                <MetricCard label="Total Leads" value={metrics.total} subLabel="ALL TIME" loading={loading} />
                <MetricCard label="Calls & Number Views" value={metrics.calls} subLabel="DIRECT INTENT" loading={loading} />
                <MetricCard label="WhatsApp Inquiries" value={metrics.whatsapps} subLabel="CHAT INTENT" loading={loading} />
                <MetricCard label="Scheduled Visits" value={metrics.scheduled} subLabel="SITE VISITS" loading={loading} />
                <MetricCard label="Brochure Downloads" value={metrics.brochures} subLabel="DOCUMENTS" loading={loading} />
            </div>

            {/* Filter Suite */}
            <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
                    {/* Search Input */}
                    <div className="relative lg:col-span-3 w-full">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by ID, name, phone, city..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-black outline-none transition-all tracking-tight"
                        />
                    </div>

                    {/* Action Type Dropdown */}
                    <div className="lg:col-span-2 w-full">
                        <select
                            value={filters.actionType}
                            onChange={(e) => handleFilterChange('actionType', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-black transition-all"
                        >
                            <option value="">All Action Types</option>
                            <option value="call">Call Now</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="view_number">View Number</option>
                            <option value="brochure_download">Brochure Download</option>
                            <option value="visit">Schedule Visit</option>
                            <option value="callback">Callback Request</option>
                        </select>
                    </div>

                    {/* Target Type Dropdown */}
                    <div className="lg:col-span-2 w-full">
                        <select
                            value={filters.targetType}
                            onChange={(e) => handleFilterChange('targetType', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-black transition-all"
                        >
                            <option value="">All Targets</option>
                            <option value="property">Property Listings</option>
                            <option value="broker">Brokers</option>
                            <option value="builder">Builders</option>
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
                            <option value="follow-up">Follow-Up</option>
                            <option value="closed">Closed</option>
                            <option value="sold">Sold</option>
                            <option value="rented">Rented</option>
                            <option value="dropped">Dropped</option>
                        </select>
                    </div>

                    {/* Property Category */}
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

                    {/* Clear Button */}
                    <div className="lg:col-span-1 w-full flex justify-end">
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors py-2 px-2 hover:underline"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Date range picker line */}
                <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-gray-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <Calendar size={13} /> Date Filter:
                    </span>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:bg-white focus:border-black"
                        />
                        <span className="text-gray-400 text-xs font-medium">to</span>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium outline-none focus:bg-white focus:border-black"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/75 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                                <th className="p-3.5 w-[140px]">Lead ID & Time</th>
                                <th className="p-3.5 w-[130px]">Action Intent</th>
                                <th className="p-3.5 w-[260px]">Target Entity</th>
                                <th className="p-3.5 w-[220px]">Customer Details</th>
                                <th className="p-3.5 w-[200px]">Requirement</th>
                                <th className="p-3.5 w-[110px]">Status</th>
                                <th className="p-3.5 text-center w-[110px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="7" className="p-4"><div className="h-10 bg-gray-50 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : (
                                <AnimatePresence>
                                    {enquiries.length > 0 ? (
                                        enquiries.map((enquiry, index) => {
                                            const prop = enquiry.propertyId;
                                            const broker = enquiry.brokerId;
                                            const builder = enquiry.builderId;
                                            const specs = prop ? getPropertySpecs(prop) : null;
                                            const targetType = enquiry.targetType || (prop ? 'property' : broker ? 'broker' : builder ? 'builder' : 'general');
                                            const customerName = enquiry.name || enquiry.userId?.name || 'Guest User';
                                            const customerPhone = enquiry.phone || enquiry.userId?.phone || '–';

                                            return (
                                                <motion.tr
                                                    key={enquiry._id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ delay: index * 0.02 }}
                                                    className="hover:bg-gray-50/60 transition-colors group relative"
                                                >
                                                    {/* ID & Timestamp Column */}
                                                    <td className="p-3.5">
                                                        <span 
                                                            onClick={() => handleAction('view', enquiry)}
                                                            className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors block"
                                                        >
                                                            #{enquiry.enquiryId || enquiry._id.slice(-8).toUpperCase()}
                                                        </span>
                                                        <p className="text-[10px] text-gray-500 mt-0.5 font-medium">
                                                            {formatDateTime(enquiry.createdAt)}
                                                        </p>
                                                        <div className="mt-1">
                                                            <SourceContextBadge source={enquiry.sourceContext} />
                                                        </div>
                                                    </td>

                                                    {/* Action Type Column */}
                                                    <td className="p-3.5">
                                                        <ActionTypeBadge action={enquiry.actionType || enquiry.enquiryType} />
                                                    </td>

                                                    {/* Target Entity Column */}
                                                    <td className="p-3.5">
                                                        {targetType === 'property' && prop ? (
                                                            <div className="flex items-center gap-2.5">
                                                                {prop.coverImage ? (
                                                                    <img 
                                                                        src={prop.coverImage} 
                                                                        alt={prop.propertyName} 
                                                                        className="w-10 h-10 object-cover rounded-lg border border-gray-100 shrink-0" 
                                                                    />
                                                                ) : (
                                                                    <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                                                                        <Home size={16} />
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-bold text-gray-900 truncate leading-tight">
                                                                        {prop.propertyName || 'Property'}
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-500 truncate mt-0.5">
                                                                        {prop.propertyType || 'N/A'} • {specs?.priceStr}
                                                                    </div>
                                                                    <span className="inline-block mt-0.5 text-[9px] font-semibold bg-blue-50 text-blue-600 px-1 py-0.2 rounded">
                                                                        {prop.partnerId ? 'Broker Property' : 'Direct Property'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : targetType === 'broker' && broker ? (
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-10 h-10 bg-purple-50 text-purple-700 rounded-lg border border-purple-200 flex items-center justify-center font-bold text-xs shrink-0">
                                                                    {getInitials(broker.name)}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-bold text-gray-900 truncate leading-tight">
                                                                        {broker.name || 'Broker Profile'}
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-500 truncate mt-0.5">
                                                                        {broker.address?.city || broker.phone || 'Broker Profile'}
                                                                    </div>
                                                                    <span className="inline-block mt-0.5 text-[9px] font-semibold bg-purple-50 text-purple-700 px-1 py-0.2 rounded border border-purple-100">
                                                                        Broker Profile
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : targetType === 'builder' && builder ? (
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 flex items-center justify-center font-bold text-xs shrink-0">
                                                                    <Building2 size={16} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-bold text-gray-900 truncate leading-tight">
                                                                        {builder.builderProfile?.developerName || builder.name || 'Builder Profile'}
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-500 truncate mt-0.5">
                                                                        {builder.address?.city || 'Builder Contact'}
                                                                    </div>
                                                                    <span className="inline-block mt-0.5 text-[9px] font-semibold bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded border border-indigo-100">
                                                                        Builder Profile
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-xs font-medium text-gray-500">
                                                                General Enquiry
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Customer Details Column */}
                                                    <td className="p-3.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 text-[10px] font-bold shrink-0">
                                                                {getInitials(customerName)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-bold text-gray-900 truncate">
                                                                    {customerName}
                                                                </div>
                                                                <div className="text-[11px] text-gray-500 font-medium font-mono truncate">
                                                                    {customerPhone}
                                                                </div>
                                                                <span className="inline-block mt-0.5 text-[9px] font-semibold bg-gray-100 text-gray-600 px-1 py-0.2 rounded uppercase tracking-wider">
                                                                    {enquiry.userId ? 'Registered' : 'Guest Lead'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Requirement Snapshot Column */}
                                                    <td className="p-3.5">
                                                        {enquiry.requirement?.city || enquiry.requirement?.propertyType || enquiry.requirement?.text ? (
                                                            <div 
                                                                onClick={() => handleAction('view', enquiry)}
                                                                className="cursor-pointer group/req"
                                                            >
                                                                <div className="text-xs font-semibold text-gray-800 group-hover/req:text-blue-600 truncate">
                                                                    {enquiry.requirement?.propertyType || ''} {enquiry.requirement?.bhk ? `• ${enquiry.requirement.bhk}` : ''}
                                                                </div>
                                                                <div className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
                                                                    <MapPin size={10} className="shrink-0 text-gray-400" />
                                                                    {enquiry.requirement?.city || enquiry.requirement?.location || prop?.address?.city || 'Any Location'}
                                                                </div>
                                                                {(enquiry.requirement?.budgetMax > 0 || enquiry.budget > 0) && (
                                                                    <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded mt-0.5">
                                                                        ₹{((enquiry.requirement?.budgetMax || enquiry.budget) >= 10000000 
                                                                            ? `${((enquiry.requirement?.budgetMax || enquiry.budget) / 10000000).toFixed(2)} Cr` 
                                                                            : `${((enquiry.requirement?.budgetMax || enquiry.budget) / 100000).toFixed(2)} L`)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 font-medium">Standard Intent</span>
                                                        )}
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="p-3.5">
                                                        <EnquiryStatusBadge status={enquiry.status || enquiry.inquiryMetadata?.status} />
                                                    </td>

                                                    {/* Actions Column */}
                                                    <td className="p-3.5 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => handleAction('view', enquiry)}
                                                                className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-black rounded-lg transition-colors border border-gray-200 shadow-sm"
                                                                title="View Details"
                                                            >
                                                                <Eye size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenEdit(enquiry)}
                                                                className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-black rounded-lg transition-colors border border-gray-200 shadow-sm"
                                                                title="Edit Status"
                                                            >
                                                                <Edit2 size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction('delete', enquiry)}
                                                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg transition-colors border border-red-200 shadow-sm"
                                                                title="Delete Enquiry"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="p-12 text-center text-gray-400 text-xs font-semibold tracking-wider">
                                                No leads found matching current filters.
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
                    <div className="p-3.5 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
                        <p className="text-xs text-gray-500 font-medium">
                            Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalEnquiries)} of {totalEnquiries} leads
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors bg-white shadow-sm"
                            >
                                <ChevronLeft size={15} />
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-black text-white shadow-sm' : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300 shadow-sm'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors bg-white shadow-sm"
                            >
                                <ChevronRight size={15} />
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
                            className="bg-white rounded-2xl border border-gray-200 max-w-xl w-full overflow-hidden shadow-2xl"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-gray-150">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-gray-900">Lead & Enquiry Details</h3>
                                        <ActionTypeBadge action={selectedEnquiry.actionType || selectedEnquiry.enquiryType} />
                                    </div>
                                    <p className="font-mono text-xs text-gray-400 mt-0.5">
                                        #{selectedEnquiry.enquiryId || selectedEnquiry._id} • {formatDateTime(selectedEnquiry.createdAt)}
                                    </p>
                                </div>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            
                            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                                {/* Target Entity Section */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Target Entity</p>
                                    {selectedEnquiry.propertyId ? (
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">
                                                {selectedEnquiry.propertyId.propertyName || 'Property Listing'}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Type: {selectedEnquiry.propertyId.propertyType || 'N/A'} • {getPropertySpecs(selectedEnquiry.propertyId).priceStr} • {selectedEnquiry.propertyId.address?.city || 'N/A'}
                                            </p>
                                        </div>
                                    ) : selectedEnquiry.brokerId ? (
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">
                                                {selectedEnquiry.brokerId.name || 'Broker Profile'}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Broker Phone: {selectedEnquiry.brokerId.phone || '–'} • {selectedEnquiry.brokerId.address?.city || 'N/A'}
                                            </p>
                                        </div>
                                    ) : selectedEnquiry.builderId ? (
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">
                                                {selectedEnquiry.builderId.builderProfile?.developerName || selectedEnquiry.builderId.name || 'Builder Profile'}
                                            </h4>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Builder Phone: {selectedEnquiry.builderId.phone || '–'} • {selectedEnquiry.builderId.address?.city || 'N/A'}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-600">General Platform Enquiry</p>
                                    )}
                                </div>

                                {/* Customer Info */}
                                <div className="grid grid-cols-2 gap-3.5 bg-white p-4 rounded-xl border border-gray-200">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer Name</p>
                                        <p className="text-xs font-bold text-gray-900 mt-1">
                                            {selectedEnquiry.name || selectedEnquiry.userId?.name || 'Guest User'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone</p>
                                        <p className="text-xs font-bold font-mono text-gray-900 mt-1">
                                            <a href={`tel:${selectedEnquiry.phone || selectedEnquiry.userId?.phone}`} className="text-blue-600 hover:underline">
                                                {selectedEnquiry.phone || selectedEnquiry.userId?.phone || '–'}
                                            </a>
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email</p>
                                        <p className="text-xs font-medium text-gray-700 mt-1 truncate">
                                            {selectedEnquiry.email || selectedEnquiry.userId?.email || '–'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
                                        <div className="mt-1">
                                            <EnquiryStatusBadge status={selectedEnquiry.status || selectedEnquiry.inquiryMetadata?.status} />
                                        </div>
                                    </div>
                                </div>

                                {/* Captured Requirement Snapshot */}
                                <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                            <Layers size={12} /> Captured Customer Requirement
                                        </p>
                                        <SourceContextBadge source={selectedEnquiry.sourceContext} />
                                    </div>

                                    {selectedEnquiry.requirement ? (
                                        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                                            <div className="bg-gray-50 p-2 rounded-lg">
                                                <span className="text-[10px] text-gray-400 font-bold block">CITY / LOCATION</span>
                                                <span className="font-semibold text-gray-800">
                                                    {selectedEnquiry.requirement.city || selectedEnquiry.requirement.location || selectedEnquiry.propertyId?.address?.city || 'Not specified'}
                                                </span>
                                            </div>
                                            <div className="bg-gray-50 p-2 rounded-lg">
                                                <span className="text-[10px] text-gray-400 font-bold block">PROPERTY TYPE</span>
                                                <span className="font-semibold text-gray-800">
                                                    {selectedEnquiry.requirement.propertyType || selectedEnquiry.propertyId?.propertyType || 'Any'}
                                                </span>
                                            </div>
                                            <div className="bg-gray-50 p-2 rounded-lg">
                                                <span className="text-[10px] text-gray-400 font-bold block">BHK PREFERENCE</span>
                                                <span className="font-semibold text-gray-800">
                                                    {selectedEnquiry.requirement.bhk || 'Not specified'}
                                                </span>
                                            </div>
                                            <div className="bg-gray-50 p-2 rounded-lg">
                                                <span className="text-[10px] text-gray-400 font-bold block">BUDGET ESTIMATE</span>
                                                <span className="font-semibold text-emerald-700">
                                                    {selectedEnquiry.requirement.budgetMax > 0 
                                                        ? `Up to ₹${(selectedEnquiry.requirement.budgetMax / 100000).toFixed(2)} L` 
                                                        : selectedEnquiry.budget > 0 ? `₹${(selectedEnquiry.budget / 100000).toFixed(2)} L` : 'Standard'}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500">Standard inquiry on entity profile.</p>
                                    )}

                                    {selectedEnquiry.sourceUrl && (
                                        <p className="text-[11px] text-gray-400 truncate pt-1">
                                            Source URL: <span className="font-mono text-gray-600">{selectedEnquiry.sourceUrl}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Message / Notes */}
                                {(selectedEnquiry.message || selectedEnquiry.preferredDate) && (
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            Visit Schedule & Notes
                                        </p>
                                        {selectedEnquiry.preferredDate && (
                                            <p className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                                                <Calendar size={13} /> Preferred Visit Date: {new Date(selectedEnquiry.preferredDate).toLocaleDateString()} {selectedEnquiry.timeSlot ? `(${selectedEnquiry.timeSlot})` : ''}
                                            </p>
                                        )}
                                        {selectedEnquiry.message && (
                                            <p className="text-xs text-gray-700 bg-white p-2.5 rounded-lg border border-gray-200">
                                                {selectedEnquiry.message}
                                            </p>
                                        )}
                                    </div>
                                )}
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
                            <div className="flex items-center justify-between p-5 border-b border-gray-150">
                                <h3 className="text-base font-bold text-gray-900">Edit Lead Status & Schedule</h3>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveEdit}>
                                <div className="p-5 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status</label>
                                        <select
                                            value={editForm.status}
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-black"
                                        >
                                            <option value="new">New</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="scheduled">Scheduled</option>
                                            <option value="follow-up">Follow-Up</option>
                                            <option value="negotiation">Negotiation</option>
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
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Message / Notes</label>
                                        <textarea
                                            value={editForm.message}
                                            onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                                            rows="3"
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-black resize-none"
                                            placeholder="Update message or add visit notes..."
                                        />
                                    </div>
                                </div>
                                <div className="p-4 border-t border-gray-150 bg-gray-50/50 flex justify-end gap-2">
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
