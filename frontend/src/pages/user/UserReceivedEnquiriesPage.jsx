import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, ChevronRight, Loader2, MapPin,
    MessageSquare, Send, Crown, Sparkles, PhoneCall,
    Calendar, Clock, FileText, User, Users, Building, ChevronDown, Bell,
    CheckCircle2, ExternalLink, Share2, Eye, Filter, Layers, Check, X, ShieldAlert, BadgeCheck
} from 'lucide-react';
import { enquiryService, propertyService } from '../../services/apiService';
import subscriptionService from '../../services/subscriptionService';
import LeadTypeBadge from '../../components/LeadTypeBadge';
import { usePropertyNavigate } from '../../hooks/usePropertyNavigate';
import toast from 'react-hot-toast';

// Helper: parse raw message string into structured sections
const parseEnquiryMessage = (raw = '') => {
    const result = { type: 'General', date: null, timeSlot: null, notes: '' };
    if (!raw) return result;

    if (/schedule visit/i.test(raw)) result.type = 'Schedule Visit';
    else if (/contact owner/i.test(raw)) result.type = 'Contact Owner';
    else if (/callback/i.test(raw)) result.type = 'Callback Request';

    const cleanRaw = raw.replace(/[`'"\[\]]/g, '').trim();

    const dateMatch = cleanRaw.match(/date[:\s]+([^\n\r]+)/i);
    if (dateMatch) {
        let dateVal = dateMatch[1].trim();
        dateVal = dateVal.split(/(?:time slot|notes|message|preferred)/i)[0].trim();
        result.date = dateVal;
    }

    const timeMatch = cleanRaw.match(/time slot[:\s]+([^\n\r]+)/i);
    if (timeMatch) {
        let timeVal = timeMatch[1].trim();
        timeVal = timeVal.split(/(?:notes|message|preferred)/i)[0].trim();
        result.timeSlot = timeVal;
    }

    const notesMatch = cleanRaw.match(/(?:notes|message|preferred time)[:\s]+([^\n\r]+)/i);
    if (notesMatch) {
        result.notes = notesMatch[1].trim();
    } else {
        if (!result.date && !result.timeSlot) {
            result.notes = cleanRaw;
        }
    }

    return result;
};

const MessageBlock = ({ message }) => {
    const parsed = parseEnquiryMessage(message);
    return (
        <div className="space-y-1 text-slate-700 mt-1">
            <p className="text-[8px] font-black uppercase tracking-wider text-blue-600 mb-1">{parsed.type}</p>
            {parsed.date && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 py-0.5 border-b border-slate-200/40">
                    <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[8px] shrink-0">Preferred Date:</span>
                    <span className="font-bold text-slate-700 text-xs">{parsed.date}</span>
                </div>
            )}
            {parsed.timeSlot && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 py-0.5 border-b border-slate-200/40">
                    <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[8px] shrink-0">Time Slot:</span>
                    <span className="font-bold text-slate-700 text-xs">{parsed.timeSlot}</span>
                </div>
            )}
            {parsed.notes && (
                <div className="flex flex-col gap-0.5 py-0.5">
                    <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[8px]">Notes/Message:</span>
                    <span className="font-medium text-slate-700 text-xs leading-normal whitespace-pre-wrap">{parsed.notes}</span>
                </div>
            )}
        </div>
    );
};

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
        negotiation: 'bg-teal-50 text-teal-700 border-teal-100'
    };

    const labelMap = {
        new: 'New',
        scheduled: 'Visit Scheduled',
        contacted: 'Contacted',
        closed: 'Closed',
        sold: 'Sold',
        rented: 'Rented',
        dropped: 'Dropped/Lost',
        'follow-up': 'Follow Up',
        negotiation: 'In Negotiation'
    };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${styles[rawStatus] || styles.new}`}>
            <span className="w-1.5 h-1.5 rounded-full mr-1 bg-current opacity-75"></span>
            {labelMap[rawStatus] || rawStatus}
        </span>
    );
};

const UserReceivedEnquiriesPage = () => {
    const navigate = useNavigate();
    const { navigateToProperty } = usePropertyNavigate();
    
    // Top-level tabs
    const [activeTab, setActiveTab] = useState('received'); // 'sent' | 'received'
    
    // Sub-view inside Received tab: 'all_responses' | 'all_respondents'
    const [receivedSubView, setReceivedSubView] = useState('all_responses');

    // Data States
    const [properties, setProperties] = useState([]);
    const [receivedEnquiries, setReceivedEnquiries] = useState([]);
    const [allReceivedEnquiries, setAllReceivedEnquiries] = useState([]);
    const [respondents, setRespondents] = useState([]);
    const [matchingBuyers, setMatchingBuyers] = useState([]);
    const [counts, setCounts] = useState({
        all: 0,
        contacted: 0,
        matchingBuyers: 0,
        new: 0,
        scheduled: 0,
        closed: 0,
        dropped: 0,
        respondentsCount: 0
    });
    const [sentEnquiries, setSentEnquiries] = useState([]);
    const [isPremiumUser, setIsPremiumUser] = useState(false);
    const [currentSub, setCurrentSub] = useState(null);

    // Filter states
    const [loading, setLoading] = useState(true);
    const [selectedPropertyId, setSelectedPropertyId] = useState('All');
    const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'CONTACTED' | 'MATCHING BUYERS' | 'NEW' | 'SCHEDULED' | 'CLOSED'
    const [sentFilter, setSentFilter] = useState('ALL');

    // Modals
    const [selectedEnquiry, setSelectedEnquiry] = useState(null); // Detail modal for single enquiry
    const [selectedRespondent, setSelectedRespondent] = useState(null); // Detail modal for respondent
    const [scheduleModalEnquiry, setScheduleModalEnquiry] = useState(null); // Schedule visit modal
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTimeSlot, setScheduleTimeSlot] = useState('10:00 AM - 12:00 PM');
    const [scheduleNotes, setScheduleNotes] = useState('');
    const [submittingSchedule, setSubmittingSchedule] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!loading) {
            loadReceivedData(selectedPropertyId);
        }
    }, [selectedPropertyId]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [propRes, subRes, sentRes] = await Promise.all([
                propertyService.getMy().catch(() => ({ properties: [] })),
                subscriptionService.getCurrentSubscription().catch(() => ({ success: false })),
                enquiryService.getMy().catch(() => ({ enquiries: [] }))
            ]);

            const myProps = propRes.properties || [];
            setProperties(myProps);
            setSentEnquiries(sentRes.enquiries || []);
            if (subRes.success) setCurrentSub(subRes.subscription);

            // Default to received tab if user has properties, else sent
            if (myProps.length > 0) {
                setActiveTab('received');
            } else {
                setActiveTab('sent');
            }

            await loadReceivedData('All');
        } catch (err) {
            console.error('Fetch Initial Data Error:', err);
            toast.error('Failed to load enquiries data');
        } finally {
            setLoading(false);
        }
    };

    const loadReceivedData = async (propId) => {
        try {
            const params = {};
            if (propId && propId !== 'All') {
                params.propertyId = propId;
            }
            const res = await enquiryService.getReceived(params);
            if (res.success) {
                setReceivedEnquiries(res.enquiries || []);
                setAllReceivedEnquiries(res.allEnquiries || res.enquiries || []);
                setRespondents(res.respondents || []);
                setMatchingBuyers(res.matchingBuyers || []);
                if (res.counts) setCounts(res.counts);
                setIsPremiumUser(!!res.isPremium);
            }
        } catch (err) {
            console.error('Load Received Data Error:', err);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            const res = await enquiryService.updateStatus(id, newStatus);
            if (res.success) {
                toast.success(`Status updated to ${newStatus}`);
                await loadReceivedData(selectedPropertyId);
                if (selectedEnquiry && selectedEnquiry._id === id) {
                    setSelectedEnquiry(prev => ({ ...prev, status: newStatus }));
                }
                if (selectedRespondent) {
                    // Update in respondent detail modal if open
                    setSelectedRespondent(prev => {
                        if (!prev) return null;
                        const updatedEnqs = prev.enquiries.map(enq => enq._id === id ? { ...enq, status: newStatus } : enq);
                        return { ...prev, enquiries: updatedEnqs };
                    });
                }
            }
        } catch (err) {
            toast.error(err.message || 'Failed to update status');
        }
    };

    const handleScheduleVisitSubmit = async (e) => {
        e?.preventDefault();
        if (!scheduleModalEnquiry) return;
        if (!scheduleDate) {
            toast.error('Please select a preferred date');
            return;
        }

        try {
            setSubmittingSchedule(true);
            const res = await enquiryService.updateStatus(scheduleModalEnquiry._id, {
                status: 'scheduled',
                preferredDate: scheduleDate,
                timeSlot: scheduleTimeSlot,
                adminNotes: scheduleNotes
            });

            if (res.success) {
                toast.success('Site visit scheduled successfully!');
                setScheduleModalEnquiry(null);
                setScheduleDate('');
                setScheduleNotes('');
                await loadReceivedData(selectedPropertyId);
            }
        } catch (err) {
            toast.error(err.message || 'Failed to schedule visit');
        } finally {
            setSubmittingSchedule(false);
        }
    };

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const fmtRelDate = (d) => {
        if (!d) return '';
        const days = Math.floor((new Date().setHours(0,0,0,0) - new Date(d).setHours(0,0,0,0)) / 86400000);
        if (days <= 0) return 'Today';
        if (days === 1) return 'Yesterday';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    const getSpecs = (prop) => {
        if (!prop) return 'N/A';
        const pType = (prop.propertyType || '').toLowerCase();

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
        if (!area) area = '–';

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

        const isRent = ['rent', 'lease', 'pg', 'hostel'].includes(pType) || (prop.transactionType || '').toLowerCase().includes('rent');
        const priceStr = price > 0 ? (formatPriceLakhCrore(price) + (isRent ? '/mo' : '')) : 'Price on Request';
        const areaStr = area !== '–' ? `${area} ${unit}` : '';
        const loc = prop.address?.city || prop.city || prop.address?.locality || prop.address?.fullAddress || '';
        
        const specsList = [];
        if (prop.propertyType) specsList.push(prop.propertyType);
        if (areaStr) specsList.push(areaStr);
        specsList.push(priceStr);
        if (loc) specsList.push(loc);
        return specsList.join(' • ');
    };

    // Filter Logic for Responses
    const getFilteredResponses = () => {
        let list = allReceivedEnquiries;
        if (selectedPropertyId !== 'All') {
            list = list.filter(item => item.propertyId?._id === selectedPropertyId);
        }

        if (activeFilter === 'CONTACTED') {
            return list.filter(e => (e.status || '').toLowerCase() === 'contacted');
        }
        if (activeFilter === 'NEW') {
            return list.filter(e => (e.status || 'new').toLowerCase() === 'new');
        }
        if (activeFilter === 'SCHEDULED') {
            return list.filter(e => (e.status || '').toLowerCase() === 'scheduled');
        }
        if (activeFilter === 'CLOSED') {
            return list.filter(e => ['closed', 'sold', 'rented'].includes((e.status || '').toLowerCase()));
        }
        return list;
    };

    // Filter Logic for Respondents
    const getFilteredRespondents = () => {
        let list = respondents;
        if (selectedPropertyId !== 'All') {
            list = list.filter(resp => resp.properties.some(p => p._id === selectedPropertyId));
        }

        if (activeFilter === 'CONTACTED') {
            return list.filter(resp => resp.statuses.includes('contacted'));
        }
        if (activeFilter === 'NEW') {
            return list.filter(resp => resp.statuses.includes('new'));
        }
        if (activeFilter === 'SCHEDULED') {
            return list.filter(resp => resp.statuses.includes('scheduled'));
        }
        if (activeFilter === 'CLOSED') {
            return list.filter(resp => resp.statuses.some(s => ['closed', 'sold', 'rented'].includes(s)));
        }
        return list;
    };

    const filteredResponses = getFilteredResponses();
    const filteredRespondents = getFilteredRespondents();

    // Contextual Empty State Info
    const getEmptyStateContent = () => {
        if (activeFilter === 'MATCHING BUYERS') {
            return {
                title: 'No matching buyers found',
                description: "No buyers currently match the selected property's preferences."
            };
        }
        if (activeFilter === 'CONTACTED') {
            return {
                title: 'No contacted enquiries',
                description: 'Enquiries you have contacted will appear here.'
            };
        }
        if (receivedSubView === 'all_respondents') {
            return {
                title: 'No respondents found',
                description: 'People who enquire about your properties will appear here.'
            };
        }
        if (activeFilter === 'NEW') {
            return {
                title: 'No new enquiries',
                description: 'New enquiries received from buyers will appear here.'
            };
        }
        if (activeFilter === 'SCHEDULED') {
            return {
                title: 'No scheduled visits',
                description: 'Enquiries with scheduled site visits will appear here.'
            };
        }
        if (activeFilter === 'CLOSED') {
            return {
                title: 'No closed enquiries',
                description: 'Enquiries marked as closed, sold, or rented will appear here.'
            };
        }
        return {
            title: 'No enquiries received',
            description: 'When buyers or tenants enquire about your properties, their enquiries will appear here.'
        };
    };

    const emptyState = getEmptyStateContent();

    return (
        <>
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-8 text-slate-800">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-150 shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3.5">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                        aria-label="Back"
                    >
                        <ArrowLeft size={17} className="text-slate-700" />
                    </button>
                    <div>
                        <h1 className="text-base font-black text-slate-900 leading-none">Enquiry Dashboard</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Track and follow up on leads
                        </p>
                    </div>
                </div>

                {/* Main Tabs (Sent vs Received) */}
                <div className="flex border-t border-slate-100">
                    <button
                        onClick={() => setActiveTab('sent')}
                        className={`flex-1 py-3 text-center text-xs font-bold transition-all relative ${
                            activeTab === 'sent' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Sent Enquiries
                        {activeTab === 'sent' && (
                            <motion.div
                                layoutId="activeTabUnderline"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('received')}
                        className={`flex-1 py-3 text-center text-xs font-bold transition-all relative ${
                            activeTab === 'received' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Received Enquiries ({counts.all || receivedEnquiries.length})
                        {activeTab === 'received' && (
                            <motion.div
                                layoutId="activeTabUnderline"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                            />
                        )}
                    </button>
                </div>
            </div>

            <div className="px-4 py-4 w-full md:max-w-lg md:mx-auto space-y-4">
                {/* RECEIVED TAB CONTROLS */}
                {activeTab === 'received' && (
                    <>
                        {/* Properties Dropdown */}
                        {properties.length > 0 && (
                            <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-1">
                                <select
                                    value={selectedPropertyId}
                                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                                    className="w-full appearance-none bg-transparent border-0 text-slate-800 text-sm font-extrabold py-2 pr-8 outline-none cursor-pointer"
                                >
                                    <option value="All">All Properties ({properties.length})</option>
                                    {properties.map(p => (
                                        <option key={p._id} value={p._id}>
                                            {p.propertyName}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            </div>
                        )}

                        {/* Sub-view Switcher: All Responses vs All Respondents */}
                        <div className="bg-slate-200/70 p-1 rounded-xl flex gap-1">
                            <button
                                onClick={() => setReceivedSubView('all_responses')}
                                className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                                    receivedSubView === 'all_responses'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Layers size={13} />
                                All Responses
                            </button>
                            <button
                                onClick={() => setReceivedSubView('all_respondents')}
                                className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                                    receivedSubView === 'all_respondents'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Users size={13} />
                                All Respondents ({counts.respondentsCount || respondents.length})
                            </button>
                        </div>

                        {/* Filter Tabs / Pills */}
                        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                            {[
                                { key: 'ALL', label: 'All', count: counts.all },
                                { key: 'CONTACTED', label: 'Contacted', count: counts.contacted },
                                { key: 'MATCHING BUYERS', label: 'Matching Buyers', count: counts.matchingBuyers },
                                { key: 'NEW', label: 'New', count: counts.new },
                                { key: 'SCHEDULED', label: 'Scheduled', count: counts.scheduled },
                                { key: 'CLOSED', label: 'Closed', count: counts.closed }
                            ].map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setActiveFilter(f.key)}
                                    className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
                                        activeFilter === f.key
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <span>{f.label}</span>
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                                        activeFilter === f.key
                                            ? 'bg-white/20 text-white'
                                            : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {f.count || 0}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* Loading Indicator */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {/* ─────────────────────────────────────────────────── */}
                        {/* SENT TAB CONTENT */}
                        {/* ─────────────────────────────────────────────────── */}
                        {activeTab === 'sent' && (
                            <motion.div
                                key="sent-tab"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                {/* Sent Status Filter Pills */}
                                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
                                    {[
                                        { key: 'ALL', label: 'All' },
                                        { key: 'new', label: 'New' },
                                        { key: 'scheduled', label: 'Scheduled' },
                                        { key: 'contacted', label: 'Contacted' },
                                        { key: 'closed', label: 'Closed' },
                                        { key: 'dropped', label: 'Dropped' }
                                    ].map(f => {
                                        const count = f.key === 'ALL'
                                            ? sentEnquiries.length
                                            : sentEnquiries.filter(e => (e.status || 'new').toLowerCase() === f.key).length;
                                        return (
                                            <button
                                                key={f.key}
                                                onClick={() => setSentFilter(f.key)}
                                                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
                                                    sentFilter === f.key
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'bg-white text-slate-500 hover:bg-slate-50'
                                                }`}
                                            >
                                                {f.label}
                                                <span className={`text-[8px] px-1 py-0.5 rounded-full font-black ${
                                                    sentFilter === f.key ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'
                                                }`}>{count}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {sentEnquiries.length === 0 ? (
                                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
                                        <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-500">
                                            <Building size={24} />
                                        </div>
                                        <h4 className="font-extrabold text-slate-800 text-sm">No enquiries sent yet</h4>
                                        <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                                            Explore properties and get in touch with owners or brokers to see your send history here.
                                        </p>
                                        <button
                                            onClick={() => navigate('/search')}
                                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                                        >
                                            Browse Properties
                                        </button>
                                    </div>
                                ) : (
                                    (() => {
                                        const filtered = sentEnquiries.filter(item => sentFilter === 'ALL' || (item.status || 'new').toLowerCase() === sentFilter);
                                        if (filtered.length === 0) return (
                                            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
                                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <MessageSquare size={20} className="text-slate-300" />
                                                </div>
                                                <h4 className="font-extrabold text-slate-800 text-sm">No {sentFilter === 'ALL' ? '' : sentFilter.toLowerCase() + ' '}enquiries</h4>
                                                <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                                                    {sentFilter === 'ALL' ? `You haven't sent any enquiries yet.` : `No enquiries with status "${sentFilter.toLowerCase()}" found.`}
                                                </p>
                                            </div>
                                        );
                                        return filtered.map(item => {
                                            const prop = item.propertyId || {};
                                            const host = prop.partnerId || prop.userId || {};
                                            const hostName = host.name || 'Owner/Broker';
                                            const hostPhone = host.phone || '';

                                            return (
                                                <div
                                                    key={item._id}
                                                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 cursor-pointer hover:border-blue-200 hover:shadow-md transition-all"
                                                    onClick={() => setSelectedEnquiry({ ...item, prop, hostName, hostPhone })}
                                                >
                                                    <div className="flex gap-4 pt-1">
                                                        <div className="w-[80px] shrink-0" onClick={(e) => { e.stopPropagation(); prop._id && navigateToProperty(prop); }}>
                                                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 border border-slate-150 shrink-0 shadow-sm mx-auto">
                                                                {prop.coverImage ? (
                                                                    <img src={prop.coverImage} className="w-full h-full object-cover" alt="" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50">
                                                                        <Building size={16} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 min-w-0 flex flex-wrap items-center justify-end gap-2 pt-0.5 content-start">
                                                            <EnquiryStatusBadge status={item.status} />
                                                            <LeadTypeBadge type={item.actionType || item.enquiryType} />
                                                            <div className="flex items-center justify-center h-[24px] px-2 bg-slate-50 text-slate-500 border border-slate-200 rounded-md text-[10px] font-bold">
                                                                {fmtDate(item.createdAt)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <hr className="border-t border-slate-100/80 w-full my-1" />

                                                    <div className="flex gap-3 pt-1">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Host</p>
                                                            <p className="font-extrabold text-[10px] text-slate-700 truncate">{hostName}</p>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Property</p>
                                                            <p className="font-extrabold text-[10px] text-slate-700 truncate">{prop.propertyName || 'Deleted Property'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="text-xs pt-1">
                                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Property Specs</p>
                                                        <p className="font-bold text-slate-700">{getSpecs(prop)}</p>
                                                    </div>

                                                    {(item.message || item.inquiryMetadata?.message) && (
                                                        <MessageBlock message={item.message || item.inquiryMetadata?.message} />
                                                    )}

                                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                                <User size={14} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Listing Contact</p>
                                                                <p className="text-xs font-bold text-slate-800">{hostName} ({prop.partnerId ? 'Broker' : 'Owner'})</p>
                                                            </div>
                                                        </div>

                                                        {hostPhone && (
                                                            <div className="flex gap-1.5">
                                                                <a
                                                                    href={`https://wa.me/${hostPhone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(hostName)},%20I%20enquired%20about%20your%20property%20"${encodeURIComponent(prop.propertyName || '')}"%20on%20Get-Right-Home.`}
                                                                    target="_blank" rel="noopener noreferrer"
                                                                    className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors border border-emerald-100"
                                                                    title="WhatsApp Owner"
                                                                    onClick={e => e.stopPropagation()}
                                                                >
                                                                    <Send size={13} />
                                                                </a>
                                                                <a
                                                                    href={`tel:${hostPhone}`}
                                                                    className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors border border-indigo-100"
                                                                    title="Call Owner"
                                                                    onClick={e => e.stopPropagation()}
                                                                >
                                                                    <PhoneCall size={13} />
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()
                                )}
                            </motion.div>
                        )}

                        {/* ─────────────────────────────────────────────────── */}
                        {/* RECEIVED TAB CONTENT */}
                        {/* ─────────────────────────────────────────────────── */}
                        {activeTab === 'received' && (
                            <motion.div
                                key="received-tab"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                {/* ── SUB-VIEW: MATCHING BUYERS ────────────────── */}
                                {activeFilter === 'MATCHING BUYERS' ? (
                                    matchingBuyers.length === 0 ? (
                                        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
                                            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600">
                                                <Users size={24} />
                                            </div>
                                            <h4 className="font-extrabold text-slate-800 text-sm">{emptyState.title}</h4>
                                            <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                                                {emptyState.description}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider px-1">
                                                {matchingBuyers.length} Verified Buyer Requirement{matchingBuyers.length > 1 ? 's' : ''} Matched
                                            </p>
                                            {matchingBuyers.map(buyer => (
                                                <div
                                                    key={buyer.buyerId || buyer.enquiryId}
                                                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 hover:border-blue-200 transition-all"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-sm shrink-0">
                                                                {buyer.avatar ? (
                                                                    <img src={buyer.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                                                                ) : (
                                                                    buyer.name?.charAt(0)?.toUpperCase() || 'B'
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-black text-slate-900">{buyer.name}</h4>
                                                                <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-extrabold uppercase mt-0.5">
                                                                    {buyer.userType || 'Verified Buyer'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-bold">
                                                            {fmtDate(buyer.createdAt)}
                                                        </span>
                                                    </div>

                                                    {/* Matched Listing Info */}
                                                    {buyer.matchedProperty && (
                                                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 flex items-center gap-2.5">
                                                            <BadgeCheck size={16} className="text-emerald-600 shrink-0" />
                                                            <div className="text-xs">
                                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Matched Property</span>
                                                                <span className="font-extrabold text-slate-800">{buyer.matchedProperty.propertyName}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Match Reason Badges */}
                                                    {buyer.matchReasons && buyer.matchReasons.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                            {buyer.matchReasons.map((reason, idx) => (
                                                                <span key={idx} className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                                    <Check size={10} /> {reason}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Requirement summary */}
                                                    {buyer.requirement && (
                                                        <div className="text-xs text-slate-600 space-y-1 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                                                            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Buyer Preferences</p>
                                                            {buyer.requirement.city && <p><span className="font-bold text-slate-500">City:</span> {buyer.requirement.city}</p>}
                                                            {buyer.requirement.propertyType && <p><span className="font-bold text-slate-500">Type:</span> {buyer.requirement.propertyType}</p>}
                                                            {buyer.requirement.bhk && <p><span className="font-bold text-slate-500">BHK:</span> {buyer.requirement.bhk}</p>}
                                                            {buyer.requirement.budgetMax > 0 && (
                                                                <p><span className="font-bold text-slate-500">Budget:</span> Up to ₹{buyer.requirement.budgetMax.toLocaleString('en-IN')}</p>
                                                            )}
                                                            {buyer.requirement.text && (
                                                                <p className="text-[11px] text-slate-700 italic mt-1">"{buyer.requirement.text}"</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-2 pt-1">
                                                        {buyer.isContactAuthorized ? (
                                                            <>
                                                                {buyer.phone && (
                                                                    <a
                                                                        href={`https://wa.me/${buyer.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(buyer.name)},%20I%20saw%20your%20property%20requirement%20on%20Get-Right-Home.`}
                                                                        target="_blank" rel="noopener noreferrer"
                                                                        className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs font-bold border border-emerald-100"
                                                                    >
                                                                        <Send size={12} /> WhatsApp
                                                                    </a>
                                                                )}
                                                                {buyer.phone && (
                                                                    <a
                                                                        href={`tel:${buyer.phone}`}
                                                                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs font-bold shadow-sm"
                                                                    >
                                                                        <PhoneCall size={12} /> Call Buyer
                                                                    </a>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => navigate('/my-subscriptions')}
                                                                className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold shadow-sm"
                                                            >
                                                                <Crown size={13} /> Unlock Buyer Contact ({buyer.phone})
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ) : receivedSubView === 'all_respondents' ? (
                                    /* ── SUB-VIEW: ALL RESPONDENTS (UNIQUE BUYERS) ─── */
                                    filteredRespondents.length === 0 ? (
                                        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
                                            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <Users className="text-slate-350" size={22} />
                                            </div>
                                            <h4 className="font-extrabold text-slate-800 text-sm">{emptyState.title}</h4>
                                            <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                                                {emptyState.description}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {filteredRespondents.map(respondent => (
                                                <div
                                                    key={respondent.respondentId}
                                                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 hover:border-blue-200 transition-all"
                                                >
                                                    {/* Respondent Header */}
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-11 h-11 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-sm shrink-0">
                                                                {respondent.avatar ? (
                                                                    <img src={respondent.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                                                                ) : (
                                                                    respondent.name?.charAt(0)?.toUpperCase() || 'R'
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-black text-slate-900">{respondent.name}</h4>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-[9px] font-extrabold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                                                        {respondent.userType || 'Buyer'}
                                                                    </span>
                                                                    <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
                                                                        {respondent.totalEnquiries} {respondent.totalEnquiries > 1 ? 'Enquiries' : 'Enquiry'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="text-right">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase">Latest Enquiry</p>
                                                            <p className="text-[10px] font-bold text-slate-600">{fmtDate(respondent.lastEnquiryDate)}</p>
                                                        </div>
                                                    </div>

                                                    <hr className="border-t border-slate-100 w-full" />

                                                    {/* Properties Enquired on (Chips / list) */}
                                                    <div className="space-y-1.5">
                                                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider">
                                                            Properties Enquired ({respondent.properties.length})
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {respondent.properties.map(p => (
                                                                <div
                                                                    key={p._id}
                                                                    onClick={() => navigateToProperty(p)}
                                                                    className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg bg-slate-50 border border-slate-150 hover:bg-slate-100 cursor-pointer transition-colors max-w-full"
                                                                >
                                                                    <div className="w-7 h-7 rounded-md overflow-hidden bg-slate-200 shrink-0">
                                                                        {p.coverImage ? (
                                                                            <img src={p.coverImage} className="w-full h-full object-cover" alt="" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-slate-400"><Building size={12} /></div>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-800 truncate max-w-[150px]">
                                                                        {p.propertyName}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Status Badges */}
                                                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                        <span className="text-[8px] font-black uppercase text-slate-400">Current Statuses:</span>
                                                        {respondent.statuses.map((st, i) => (
                                                            <EnquiryStatusBadge key={i} status={st} />
                                                        ))}
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-2 pt-1 border-t border-slate-100">
                                                        <button
                                                            onClick={() => setSelectedRespondent(respondent)}
                                                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs font-bold shadow-sm"
                                                        >
                                                            <Eye size={13} /> View Respondent Details ({respondent.totalEnquiries})
                                                        </button>

                                                        {respondent.isContactAuthorized && respondent.phone && (
                                                            <>
                                                                <a
                                                                    href={`https://wa.me/${respondent.rawPhone ? respondent.rawPhone.replace(/[^0-9]/g, '') : respondent.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(respondent.name)},%20I%20am%20following%20up%20on%20your%20enquiries%20on%20Get-Right-Home.`}
                                                                    target="_blank" rel="noopener noreferrer"
                                                                    className="w-9 h-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors border border-emerald-100"
                                                                    title="WhatsApp Respondent"
                                                                >
                                                                    <Send size={13} />
                                                                </a>
                                                                <a
                                                                    href={`tel:${respondent.rawPhone || respondent.phone}`}
                                                                    className="w-9 h-9 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors border border-indigo-100"
                                                                    title="Call Respondent"
                                                                >
                                                                    <PhoneCall size={13} />
                                                                </a>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                    /* ── SUB-VIEW: ALL RESPONSES (DEFAULT VIEW) ───── */
                                    filteredResponses.length === 0 ? (
                                        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
                                            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <MessageSquare className="text-slate-350" size={22} />
                                            </div>
                                            <h4 className="font-extrabold text-slate-800 text-sm">{emptyState.title}</h4>
                                            <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                                                {emptyState.description}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {filteredResponses.map(item => {
                                                const buyerName = item.userId?.name || item.name || 'Inquirer';
                                                const phone = item.phone || item.userId?.phone || '';
                                                const status = (item.status || item.inquiryMetadata?.status || 'new').toLowerCase();
                                                const rawMsg = item.message || item.inquiryMetadata?.message || '';
                                                const recvProp = item.propertyId || {};
                                                const isContactAuth = item.isContactAuthorized;

                                                return (
                                                    <div key={item._id} className="bg-white border border-slate-300 rounded-sm shadow-sm">
                                                        <div className="p-4 space-y-2.5">
                                                            {/* Row 1: Name + date */}
                                                            <div className="flex items-start justify-between gap-3">
                                                                <h4 className="text-base font-extrabold text-slate-900 leading-tight truncate">{buyerName}</h4>
                                                                <span className="text-xs text-slate-500 font-medium shrink-0">{fmtRelDate(item.createdAt)}</span>
                                                            </div>

                                                            {/* Row 2: Lead type + respondent type */}
                                                            <div className="flex items-center justify-between gap-3">
                                                                <LeadTypeBadge type={item.actionType || item.enquiryType} />
                                                                <span className="text-xs text-slate-700 font-semibold">{item.userId?.userType || 'Individual'}</span>
                                                            </div>

                                                            {/* Row 3: Property title */}
                                                            <p
                                                                onClick={() => recvProp._id && navigateToProperty(recvProp)}
                                                                className="text-sm font-semibold text-slate-800 leading-snug cursor-pointer"
                                                            >
                                                                {recvProp.propertyName || 'Property'}
                                                                <span className="block text-xs font-medium text-slate-500 mt-0.5">{getSpecs(recvProp)}</span>
                                                            </p>

                                                            {rawMsg && <MessageBlock message={rawMsg} />}

                                                            {/* Row 4: Status + contact icons */}
                                                            <div className="flex items-center justify-between gap-3 pt-1">
                                                                <div className="text-xs text-slate-500 font-medium">
                                                                    <span className="block">Enquiry status</span>
                                                                    <select
                                                                        value={status}
                                                                        onChange={(e) => handleUpdateStatus(item._id, e.target.value)}
                                                                        className="mt-0.5 text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer capitalize -ml-0.5"
                                                                    >
                                                                        <option value="new">New</option>
                                                                        <option value="contacted">Contacted</option>
                                                                        <option value="scheduled">Scheduled</option>
                                                                        <option value="closed">Closed</option>
                                                                        <option value="dropped">Dropped</option>
                                                                    </select>
                                                                </div>

                                                                <div className="flex items-center gap-3">
                                                                    <button
                                                                        onClick={() => {
                                                                            const text = `${buyerName} enquired about ${recvProp.propertyName || 'a property'}`;
                                                                            if (navigator.share) navigator.share({ text }).catch(() => {});
                                                                            else navigator.clipboard?.writeText(text).then(() => toast.success('Copied'));
                                                                        }}
                                                                        className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
                                                                        aria-label="Share"
                                                                    >
                                                                        <Share2 size={16} />
                                                                    </button>
                                                                    {phone && isContactAuth ? (
                                                                        <>
                                                                            <a
                                                                                href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(buyerName)},%20thank%20you%20for%20enquiring%20about%20"${encodeURIComponent(recvProp.propertyName || '')}".`}
                                                                                target="_blank" rel="noopener noreferrer"
                                                                                className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center"
                                                                                aria-label="WhatsApp"
                                                                            >
                                                                                <Send size={16} />
                                                                            </a>
                                                                            <a
                                                                                href={`tel:${phone}`}
                                                                                className="w-10 h-10 rounded-full bg-blue-800 text-white flex items-center justify-center"
                                                                                aria-label="Call"
                                                                            >
                                                                                <PhoneCall size={16} />
                                                                            </a>
                                                                        </>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Footer links */}
                                                        <div className="flex items-center justify-between border-t border-slate-300 px-4 py-3">
                                                            <button
                                                                onClick={() => setSelectedEnquiry({ ...item, prop: recvProp, buyerName, phone })}
                                                                className="text-sm font-medium text-blue-700"
                                                            >
                                                                View Lead Detail
                                                            </button>
                                                            <div className="flex items-center gap-4">
                                                                {!(phone && isContactAuth) && (
<button onClick={() => navigate('/my-subscriptions')} className="flex items-center gap-1 text-sm font-medium text-orange-600">
<Crown size={14} /> Upgrade
</button>
)}
                                                                {rawMsg && (
                                                                    <button
                                                                        onClick={() => setSelectedEnquiry({ ...item, prop: recvProp, buyerName, phone })}
                                                                        className="flex items-center gap-1 text-sm font-medium text-blue-700"
                                                                    >
                                                                        <MessageSquare size={14} /> View Message
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )
                                )}

                                {/* Bottom Promotional Banner (Preserved) */}
                                {(() => {
                                    const tier = currentSub?.planId?.tier;
                                    const isActive = currentSub?.status === 'active' && new Date(currentSub?.expiryDate) > new Date();
                                    const isDiamond = isActive && tier === 'diamond';
                                    const isGoldOrPlatinum = isActive && ['gold', 'platinum'].includes(tier);
                                    const isSilverOrBasic = isActive && ['silver', 'gold_basic'].includes(tier);

                                    if (isDiamond) return null;

                                    if (isGoldOrPlatinum) return (
                                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                                <Crown size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-extrabold text-indigo-900">Unlock more leads!</h4>
                                                <p className="text-[10px] text-indigo-500 font-medium mt-0.5 leading-relaxed">
                                                    Upgrade to Diamond for unlimited leads, city-level banner & 5x ranking boost.
                                                </p>
                                            </div>
                                            <button onClick={() => navigate('/my-subscriptions')} className="shrink-0 px-3 py-2 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-xl">
                                                Upgrade
                                            </button>
                                        </div>
                                    );

                                    if (isSilverOrBasic) return (
                                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                                            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                                                <Sparkles size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-extrabold text-amber-900">You're on a basic plan.</h4>
                                                <p className="text-[10px] text-amber-600 font-medium mt-0.5 leading-relaxed">
                                                    Upgrade to Gold for unlimited leads, verified badge & priority ranking.
                                                </p>
                                            </div>
                                            <button onClick={() => navigate('/my-subscriptions')} className="shrink-0 px-3 py-2 bg-amber-500 text-white text-[9px] font-black uppercase rounded-xl">
                                                Boost
                                            </button>
                                        </div>
                                    );

                                    return (
                                        <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl text-center space-y-2 shadow-sm">
                                            <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center mx-auto">
                                                <Sparkles size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-extrabold text-orange-950">Your listing's visibility is low.</h4>
                                                <p className="text-[10px] text-orange-500 font-medium max-w-[240px] mx-auto leading-relaxed mt-0.5">
                                                    Get your first plan & boost your property to top rank — get up to 10 leads/month.
                                                </p>
                                            </div>
                                            <button onClick={() => navigate('/my-subscriptions')} className="w-full py-2.5 bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl active:scale-[0.99] transition-all">
                                                Get Started — ₹999/mo
                                            </button>
                                        </div>
                                    );
                                })()}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>

        {/* ─────────────────────────────────────────────────── */}
        {/* MODAL 1: ENQUIRY DETAIL MODAL */}
        {/* ─────────────────────────────────────────────────── */}
        <AnimatePresence>
            {selectedEnquiry && (
                <motion.div
                    className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedEnquiry(null)} />

                    <motion.div
                        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <div className="flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-10 h-1 bg-slate-200 rounded-full" />
                        </div>

                        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-extrabold text-slate-900 text-base">Enquiry Details</h2>
                                <p className="text-[10px] text-slate-400 font-bold">{selectedEnquiry.enquiryId || 'Lead Record'}</p>
                            </div>
                            <button
                                onClick={() => setSelectedEnquiry(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-black text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            {/* Property Thumbnail & Title */}
                            {selectedEnquiry.prop && (
                                <div className="flex gap-3 items-center">
                                    <div
                                        className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-150 cursor-pointer"
                                        onClick={() => { setSelectedEnquiry(null); navigateToProperty(selectedEnquiry.prop); }}
                                    >
                                        {selectedEnquiry.prop.coverImage ? (
                                            <img src={selectedEnquiry.prop.coverImage} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50"><Building size={18} /></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-extrabold text-slate-900 text-sm truncate">{selectedEnquiry.prop.propertyName || 'Property'}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                            {selectedEnquiry.prop.propertyType || 'Property'}
                                        </p>
                                        <div className="mt-1">
                                            <EnquiryStatusBadge status={selectedEnquiry.status || selectedEnquiry.inquiryMetadata?.status} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Specs */}
                            {selectedEnquiry.prop && (
                                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider mb-1">Property Specs</p>
                                    <p className="text-xs font-bold text-slate-700">{getSpecs(selectedEnquiry.prop)}</p>
                                </div>
                            )}

                            {/* Timeline & Message */}
                            <div className="space-y-2.5">
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Enquiry Timeline & Details</p>
                                <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                        <FileText size={13} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold text-slate-800">Enquiry Received</p>
                                            <LeadTypeBadge type={selectedEnquiry.actionType || selectedEnquiry.enquiryType} />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{fmtDateTime(selectedEnquiry.createdAt)}</p>
                                    </div>
                                </div>

                                {(selectedEnquiry.message || selectedEnquiry.inquiryMetadata?.message) && (
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <MessageBlock message={selectedEnquiry.message || selectedEnquiry.inquiryMetadata?.message} />
                                    </div>
                                )}
                            </div>

                            {/* Status Update Control */}
                            <div className="space-y-1.5 pt-1">
                                <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest block">Update Status</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['new', 'contacted', 'scheduled', 'closed', 'dropped'].map(st => (
                                        <button
                                            key={st}
                                            onClick={() => handleUpdateStatus(selectedEnquiry._id, st)}
                                            className={`py-2 px-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                                (selectedEnquiry.status || 'new').toLowerCase() === st
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {st}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Respondent Contact Info */}
                            <div className="border border-slate-150 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                        {selectedEnquiry.buyerName?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">Respondent</p>
                                        <p className="text-xs font-bold text-slate-800">{selectedEnquiry.buyerName || selectedEnquiry.name || 'Inquirer'}</p>
                                        <p className="text-[10px] text-slate-500">{selectedEnquiry.phone || selectedEnquiry.email}</p>
                                    </div>
                                </div>

                                {selectedEnquiry.isContactAuthorized && selectedEnquiry.phone && (
                                    <div className="flex gap-1.5">
                                        <a
                                            href={`https://wa.me/${selectedEnquiry.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(selectedEnquiry.buyerName || '')},%20I%20am%20following%20up%20on%20your%20enquiry.`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-100 transition-colors"
                                        >
                                            <Send size={14} />
                                        </a>
                                        <a
                                            href={`tel:${selectedEnquiry.phone}`}
                                            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-sm"
                                        >
                                            <PhoneCall size={14} />
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2 pt-2">
                                <button
                                    onClick={() => {
                                        const current = selectedEnquiry;
                                        setSelectedEnquiry(null);
                                        setScheduleModalEnquiry(current);
                                    }}
                                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    <Calendar size={14} /> Schedule Site Visit
                                </button>

                                {selectedEnquiry.prop?._id && (
                                    <button
                                        onClick={() => { setSelectedEnquiry(null); navigateToProperty(selectedEnquiry.prop); }}
                                        className="w-full py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <ExternalLink size={13} /> View Property Listing
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* ─────────────────────────────────────────────────── */}
        {/* MODAL 2: RESPONDENT DETAIL MODAL (GROUPED VIEW) */}
        {/* ─────────────────────────────────────────────────── */}
        <AnimatePresence>
            {selectedRespondent && (
                <motion.div
                    className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedRespondent(null)} />

                    <motion.div
                        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <div className="flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-10 h-1 bg-slate-200 rounded-full" />
                        </div>

                        {/* Respondent Header */}
                        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-extrabold text-slate-900 text-base">Respondent Profile</h2>
                                <p className="text-[10px] text-slate-400 font-bold">
                                    {selectedRespondent.totalEnquiries} Enquiries across your properties
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedRespondent(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-black text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            {/* Profile Info Bar */}
                            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-base shrink-0">
                                        {selectedRespondent.avatar ? (
                                            <img src={selectedRespondent.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                                        ) : (
                                            selectedRespondent.name?.charAt(0)?.toUpperCase() || 'R'
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900">{selectedRespondent.name}</h3>
                                        <p className="text-[11px] font-bold text-slate-500">{selectedRespondent.phone || selectedRespondent.email}</p>
                                        <span className="inline-block mt-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 uppercase">
                                            {selectedRespondent.userType || 'Buyer'}
                                        </span>
                                    </div>
                                </div>

                                {selectedRespondent.isContactAuthorized && selectedRespondent.phone && (
                                    <div className="flex gap-1.5">
                                        <a
                                            href={`https://wa.me/${selectedRespondent.rawPhone ? selectedRespondent.rawPhone.replace(/[^0-9]/g, '') : selectedRespondent.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(selectedRespondent.name)},%20thank%20you%20for%20enquiring.`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-100"
                                        >
                                            <Send size={14} />
                                        </a>
                                        <a
                                            href={`tel:${selectedRespondent.rawPhone || selectedRespondent.phone}`}
                                            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-sm"
                                        >
                                            <PhoneCall size={14} />
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Grouped Enquiries List */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    Enquiry History ({selectedRespondent.enquiries?.length || 0})
                                </h4>

                                {selectedRespondent.enquiries?.map((enq, index) => {
                                    const prop = enq.propertyId || {};
                                    return (
                                        <div
                                            key={enq._id || index}
                                            className="border border-slate-200 rounded-2xl p-3.5 space-y-3 bg-white hover:border-blue-200 transition-all shadow-sm"
                                        >
                                            <div className="flex gap-3">
                                                <div
                                                    className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-150 cursor-pointer"
                                                    onClick={() => { setSelectedRespondent(null); navigateToProperty(prop); }}
                                                >
                                                    {prop.coverImage ? (
                                                        <img src={prop.coverImage} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50"><Building size={16} /></div>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h5 className="text-xs font-black text-slate-900 truncate">{prop.propertyName || 'Property'}</h5>
                                                        <span className="text-[9px] text-slate-400 font-bold shrink-0">{fmtDate(enq.createdAt)}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">{getSpecs(prop)}</p>
                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                        <EnquiryStatusBadge status={enq.status} />
                                                        <LeadTypeBadge type={enq.actionType || enq.enquiryType} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Message */}
                                            {(enq.message || enq.inquiryMetadata?.message) && (
                                                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                    <MessageBlock message={enq.message || enq.inquiryMetadata?.message} />
                                                </div>
                                            )}

                                            {/* Status Selector & Actions for this enquiry */}
                                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                                <select
                                                    value={(enq.status || 'new').toLowerCase()}
                                                    onChange={(e) => handleUpdateStatus(enq._id, e.target.value)}
                                                    className="text-[10px] font-bold rounded-lg border border-slate-200 px-2 py-1 bg-slate-50 text-slate-700 outline-none cursor-pointer uppercase"
                                                >
                                                    <option value="new">New</option>
                                                    <option value="contacted">Contacted</option>
                                                    <option value="scheduled">Scheduled</option>
                                                    <option value="closed">Closed</option>
                                                    <option value="dropped">Dropped</option>
                                                </select>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedRespondent(null);
                                                            setScheduleModalEnquiry(enq);
                                                        }}
                                                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                                                    >
                                                        <Calendar size={11} /> Schedule
                                                    </button>
                                                    {prop._id && (
                                                        <button
                                                            onClick={() => { setSelectedRespondent(null); navigateToProperty(prop); }}
                                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                                                        >
                                                            <ExternalLink size={11} /> Property
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* ─────────────────────────────────────────────────── */}
        {/* MODAL 3: SCHEDULE SITE VISIT MODAL */}
        {/* ─────────────────────────────────────────────────── */}
        <AnimatePresence>
            {scheduleModalEnquiry && (
                <motion.div
                    className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setScheduleModalEnquiry(null)} />

                    <motion.div
                        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <div className="flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-10 h-1 bg-slate-200 rounded-full" />
                        </div>

                        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-extrabold text-slate-900 text-base">Schedule Site Visit</h2>
                                <p className="text-[10px] text-slate-400 font-bold">
                                    Set date and time slot with {scheduleModalEnquiry.userId?.name || scheduleModalEnquiry.name || 'buyer'}
                                </p>
                            </div>
                            <button
                                onClick={() => setScheduleModalEnquiry(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-black text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleScheduleVisitSubmit} className="px-5 py-4 space-y-4">
                            {/* Property Target */}
                            {scheduleModalEnquiry.propertyId && (
                                <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                                        {scheduleModalEnquiry.propertyId.coverImage ? (
                                            <img src={scheduleModalEnquiry.propertyId.coverImage} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400"><Building size={14} /></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] text-slate-400 font-black uppercase">Property for Visit</p>
                                        <p className="text-xs font-bold text-slate-900 truncate">{scheduleModalEnquiry.propertyId.propertyName}</p>
                                    </div>
                                </div>
                            )}

                            {/* Preferred Date Input */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 block">Preferred Date *</label>
                                <input
                                    type="date"
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 bg-white"
                                />
                            </div>

                            {/* Time Slot Options */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 block">Time Slot</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        '10:00 AM - 12:00 PM',
                                        '12:00 PM - 03:00 PM',
                                        '03:00 PM - 06:00 PM',
                                        '06:00 PM - 08:00 PM'
                                    ].map(slot => (
                                        <button
                                            type="button"
                                            key={slot}
                                            onClick={() => setScheduleTimeSlot(slot)}
                                            className={`py-2 px-2.5 rounded-xl text-[10px] font-bold border transition-all text-center ${
                                                scheduleTimeSlot === slot
                                                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 block">Visit Notes (Optional)</label>
                                <textarea
                                    rows={2}
                                    value={scheduleNotes}
                                    onChange={(e) => setScheduleNotes(e.target.value)}
                                    placeholder="Add any instructions, gate entry details, or special notes..."
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-blue-600 bg-white resize-none"
                                />
                            </div>

                            {/* Confirm Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={submittingSchedule}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    {submittingSchedule ? (
                                        <Loader2 size={15} className="animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 size={15} /> Confirm & Schedule Visit
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        </>
    );
};

export default UserReceivedEnquiriesPage;
