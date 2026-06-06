import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, ChevronRight, Loader2, MapPin,
    MessageSquare, Send, Crown, Sparkles, PhoneCall,
    Calendar, Clock, FileText, User, Building
} from 'lucide-react';
import { enquiryService, propertyService } from '../../services/apiService';
import subscriptionService from '../../services/subscriptionService';
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
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1 text-slate-700">
            <p className="text-[8px] font-black uppercase tracking-wider text-indigo-600 mb-1">{parsed.type}</p>
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
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${styles[rawStatus] || styles.new}`}>
            <span className="w-1 h-1 rounded-full mr-1 bg-current opacity-75"></span>
            {labelMap[rawStatus] || rawStatus}
        </span>
    );
};

const UserReceivedEnquiriesPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('sent');
    const [properties, setProperties] = useState([]);
    const [receivedEnquiries, setReceivedEnquiries] = useState([]);
    const [sentEnquiries, setSentEnquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPropertyId, setSelectedPropertyId] = useState('All');
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [currentSub, setCurrentSub] = useState(null);
    const [sentFilter, setSentFilter] = useState('ALL');  // 'ALL' | 'new' | 'scheduled' | 'contacted' | 'closed' | 'dropped'
    const [selectedEnquiry, setSelectedEnquiry] = useState(null); // for detail modal

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [propRes, receivedRes, sentRes, subRes] = await Promise.all([
                propertyService.getMy().catch(() => ({ properties: [] })),
                enquiryService.getReceived().catch(() => ({ enquiries: [] })),
                enquiryService.getMy().catch(() => ({ enquiries: [] })),
                subscriptionService.getCurrentSubscription().catch(() => ({ success: false }))
            ]);

            const myProps = propRes.properties || [];
            setProperties(myProps);
            setReceivedEnquiries(receivedRes.enquiries || []);
            setSentEnquiries(sentRes.enquiries || []);
            if (subRes.success) setCurrentSub(subRes.subscription);

            if (myProps.length > 0) {
                setActiveTab('received');
            } else {
                setActiveTab('sent');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load enquiries data');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            const res = await enquiryService.updateStatus(id, newStatus);
            if (res.success) {
                toast.success(`Status updated to ${newStatus}`);
                const r = await enquiryService.getReceived();
                setReceivedEnquiries(r.enquiries || []);
            }
        } catch (err) {
            toast.error(err.message || 'Failed to update status');
        }
    };

    // Filter logic for received enquiries
    const filterFn = (item) => {
        if (selectedPropertyId !== 'All' && item.propertyId?._id !== selectedPropertyId) return false;
        const st = (item.status || item.inquiryMetadata?.status || 'new').toLowerCase();
        if (activeFilter === 'CONTACTED') return st === 'contacted';
        if (activeFilter === 'MATCHING BUYERS') return ['scheduled', 'closed', 'sold', 'rented'].includes(st);
        return true;
    };

    const filteredReceived = receivedEnquiries.filter(filterFn);

    const getCount = (f) => receivedEnquiries.filter(item => {
        if (selectedPropertyId !== 'All' && item.propertyId?._id !== selectedPropertyId) return false;
        const st = (item.status || item.inquiryMetadata?.status || 'new').toLowerCase();
        if (f === 'CONTACTED') return st === 'contacted';
        if (f === 'MATCHING BUYERS') return ['scheduled', 'closed', 'sold', 'rented'].includes(st);
        return true;
    }).length;

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

    const getSpecs = (prop) => {
        if (!prop) return 'N/A';
        const pType = (prop.propertyType || '').toLowerCase();

        // Price
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

        // Area
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

        // Unit
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
        const loc = prop.address?.city || prop.city || prop.address?.fullAddress || '';
        
        const specsList = [];
        if (areaStr) specsList.push(areaStr);
        specsList.push(priceStr);
        if (loc) specsList.push(loc);
        return specsList.join(' • ');
    };

    return (
        <>
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-8 text-slate-800">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-150 shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3.5">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
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

                {/* Tab Switcher */}
                <div className="flex border-t border-slate-100">
                    <button
                        onClick={() => setActiveTab('sent')}
                        className={`flex-1 py-3 text-center text-xs font-bold transition-all relative ${
                            activeTab === 'sent' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Sent Enquiries
                        {activeTab === 'sent' && (
                            <motion.div
                                layoutId="activeTabUnderline"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('received')}
                        className={`flex-1 py-3 text-center text-xs font-bold transition-all relative ${
                            activeTab === 'received' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Received Enquiries ({receivedEnquiries.length})
                        {activeTab === 'received' && (
                            <motion.div
                                layoutId="activeTabUnderline"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                            />
                        )}
                    </button>
                </div>

                {/* Properties Carousel (Only for Received Tab & if properties exist) */}
                {activeTab === 'received' && properties.length > 0 && (
                    <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none border-t border-slate-100 bg-slate-50/50">
                        <button
                            onClick={() => setSelectedPropertyId('All')}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold ${
                                selectedPropertyId === 'All'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200'
                            }`}
                        >
                            All Properties
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                selectedPropertyId === 'All' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>{properties.length}</span>
                        </button>

                        {properties.map(p => (
                            <button
                                key={p._id}
                                onClick={() => setSelectedPropertyId(p._id)}
                                className={`flex-shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-bold max-w-[200px] ${
                                    selectedPropertyId === p._id
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                        : 'bg-white text-slate-700 border-slate-200'
                                }`}
                            >
                                <div className="w-6 h-6 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                    {p.coverImage
                                        ? <img src={p.coverImage} className="w-full h-full object-cover" alt="" />
                                        : <div className="w-full h-full flex items-center justify-center text-slate-400"><MapPin size={10} /></div>
                                    }
                                </div>
                                <span className="truncate max-w-[100px]">{p.propertyName}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
                {/* Upgrade Promo for received tab */}
                {activeTab === 'received' && (
                    <div
                        onClick={() => navigate('/my-subscriptions')}
                        className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                                <Crown size={16} />
                            </div>
                            <div>
                                <h4 className="text-[12px] font-extrabold text-indigo-950 leading-tight">Want to sell faster?</h4>
                                <p className="text-[10px] text-indigo-500 font-medium mt-0.5">
                                    Stand out with our owner packages. Upgrade now
                                </p>
                            </div>
                        </div>
                        <ChevronRight size={15} className="text-indigo-400 shrink-0" />
                    </div>
                )}

                {/* Loading Indicator */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {/* SENT TAB CONTENT */}
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
                                        { key: 'dropped', label: 'Dropped' },
                                    ].map(f => {
                                        const count = f.key === 'ALL'
                                            ? sentEnquiries.length
                                            : sentEnquiries.filter(e => (e.status || 'new').toLowerCase() === f.key).length;
                                        return (
                                            <button
                                                key={f.key}
                                                onClick={() => setSentFilter(f.key)}
                                                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-all ${
                                                    sentFilter === f.key
                                                        ? 'bg-slate-900 text-white border-slate-900'
                                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                {f.label}
                                                <span className={`text-[8px] px-1 py-0.5 rounded-full font-black ${
                                                    sentFilter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                                }`}>{count}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {sentEnquiries.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                                        <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-500">
                                            <Building size={24} />
                                        </div>
                                        <h4 className="font-extrabold text-slate-800 text-sm">No enquiries sent yet</h4>
                                        <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                                            Explore properties and get in touch with owners or brokers to see your send history here.
                                        </p>
                                        <button
                                            onClick={() => navigate('/search')}
                                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
                                        >
                                            Browse Properties
                                        </button>
                                    </div>
                                ) : (
                                    (() => {
                                        const filtered = sentEnquiries.filter(item => sentFilter === 'ALL' || (item.status || 'new').toLowerCase() === sentFilter);
                                        if (filtered.length === 0) return (
                                            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
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
                                                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all"
                                                onClick={() => setSelectedEnquiry({ ...item, prop, hostName, hostPhone })}
                                            >
                                                {/* Property Horizontal Header */}
                                                <div className="flex gap-3 items-center">
                                                    <div 
                                                        className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-150 cursor-pointer" 
                                                        onClick={() => prop._id && navigate(`/property/${prop._id}`)}
                                                    >
                                                        {prop.coverImage ? (
                                                            <img src={prop.coverImage} className="w-full h-full object-cover" alt="" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50">
                                                                <Building size={16} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <h3 
                                                                className="font-extrabold text-slate-900 text-sm leading-snug hover:text-indigo-650 cursor-pointer truncate" 
                                                                onClick={() => prop._id && navigate(`/property/${prop._id}`)}
                                                            >
                                                                {prop.propertyName || 'Deleted Property'}
                                                            </h3>
                                                            <EnquiryStatusBadge status={item.status || item.inquiryMetadata?.status} />
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                                            {prop.propertyType || 'Property'} • {fmtDate(item.createdAt)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Specs */}
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs">
                                                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Property Specs</p>
                                                    <p className="font-bold text-slate-700">{getSpecs(prop)}</p>
                                                </div>

                                                {/* Message */}
                                                {(item.message || item.inquiryMetadata?.message) && (
                                                    <MessageBlock message={item.message || item.inquiryMetadata?.message} />
                                                )}

                                                {/* Owner / Broker details */}
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
                                                                href={`https://wa.me/${hostPhone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(hostName)},%20I%20enquired%2520about%20your%20property%20"${encodeURIComponent(prop.propertyName || '')}"%20on%20Get-Right-Home.`}
                                                                target="_blank" rel="noopener noreferrer"
                                                                className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors border border-emerald-100"
                                                                title="WhatsApp Owner"
                                                            >
                                                                <Send size={13} />
                                                            </a>
                                                            <a
                                                                href={`tel:${hostPhone}`}
                                                                className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors border border-indigo-100"
                                                                title="Call Owner"
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

                        {/* RECEIVED TAB CONTENT */}
                        {activeTab === 'received' && (
                            <motion.div
                                key="received-tab"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                {/* Filter sub-tabs */}
                                <div className="flex gap-2">
                                    {['ALL', 'CONTACTED', 'MATCHING BUYERS'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setActiveFilter(f)}
                                            className={`flex-1 py-2.5 text-center rounded-xl text-[9px] font-black uppercase tracking-wide transition-all border ${
                                                activeFilter === f
                                                    ? 'bg-slate-900 text-white border-slate-900'
                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            {f} ({getCount(f)})
                                        </button>
                                    ))}
                                </div>

                                {filteredReceived.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                                        <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <MessageSquare className="text-slate-350" size={22} />
                                        </div>
                                        <h4 className="font-extrabold text-slate-800 text-sm">No enquiries received</h4>
                                        <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                                            No user queries match the selected filters or property.
                                        </p>
                                    </div>
                                ) : (
                                    filteredReceived.map(item => {
                                        const buyerName = item.userId?.name || 'Inquirer';
                                        const initial = buyerName.charAt(0).toUpperCase();
                                        const phone = item.userId?.phone || '';
                                        const status = (item.status || item.inquiryMetadata?.status || 'new').toLowerCase();
                                        const rawMsg = item.message || item.inquiryMetadata?.message || '';
                                        const recvProp = item.propertyId || {};

                                        return (
                                            <div key={item._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                                                {/* Header: thumbnail + buyer avatar */}
                                                <div className="flex items-center gap-3">
                                                    {/* Property thumbnail */}
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-150">
                                                        {recvProp.coverImage
                                                            ? <img src={recvProp.coverImage} className="w-full h-full object-cover" alt="" />
                                                            : <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50"><Building size={14} /></div>
                                                        }
                                                    </div>
                                                    {/* Buyer info + status select */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <h3 className="font-extrabold text-slate-900 text-xs leading-none truncate">{buyerName}</h3>
                                                                <span className="text-[9px] text-slate-400 font-semibold">{fmtDate(item.createdAt)}</span>
                                                            </div>
                                                            <select
                                                                value={status}
                                                                onChange={(e) => handleUpdateStatus(item._id, e.target.value)}
                                                                className={`text-[9px] font-black py-0.5 px-2 rounded-lg border outline-none cursor-pointer uppercase shrink-0 ${
                                                                    status === 'contacted' ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                    : status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                    : status === 'scheduled' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                    : status === 'dropped' ? 'bg-red-50 text-red-700 border-red-200'
                                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                }`}
                                                                style={{ height: '22px' }}
                                                            >
                                                                <option value="new">New</option>
                                                                <option value="contacted">Contacted</option>
                                                                <option value="scheduled">Scheduled</option>
                                                                <option value="closed">Closed</option>
                                                                <option value="dropped">Dropped</option>
                                                            </select>
                                                        </div>
                                                        {recvProp.propertyName && (
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 truncate">{recvProp.propertyName}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Specs */}
                                                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs">
                                                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider mb-0.5">Property Specs</p>
                                                    <p className="font-bold text-slate-700">{getSpecs(item.propertyId)}</p>
                                                </div>

                                                {/* Structured message */}
                                                {rawMsg && <MessageBlock message={rawMsg} />}

                                                {/* Action buttons */}
                                                {phone && (
                                                    <div className="flex gap-2 pt-1">
                                                        <a
                                                            href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(buyerName)},%20thank%20you%20for%20enquiring.`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-bold border border-emerald-100"
                                                        >
                                                            <Send size={12} /> WhatsApp
                                                        </a>
                                                        <a
                                                            href={`tel:${phone}`}
                                                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-bold shadow-sm"
                                                        >
                                                            <PhoneCall size={12} /> Call Buyer
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}

                                {/* Dynamic Subscription Banner */}
                                {(() => {
                                    const tier = currentSub?.planId?.tier;
                                    const isActive = currentSub?.status === 'active' && new Date(currentSub?.expiryDate) > new Date();
                                    const isDiamond = isActive && tier === 'diamond';
                                    const isGoldOrPlatinum = isActive && ['gold', 'platinum'].includes(tier);
                                    const isSilverOrBasic = isActive && ['silver', 'gold_basic'].includes(tier);

                                    if (isDiamond) return null; // Premium users see nothing

                                    if (isGoldOrPlatinum) return (
                                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-3">
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
                                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3">
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

                                    // No subscription at all
                                    return (
                                        <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl text-center space-y-2">
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

        {/* Enquiry Detail Modal */}
        <AnimatePresence>
            {selectedEnquiry && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedEnquiry(null)} />

                    {/* Sheet */}
                    <motion.div
                        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-10 h-1 bg-slate-200 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-extrabold text-slate-900 text-base">Enquiry Details</h2>
                            <button
                                onClick={() => setSelectedEnquiry(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-black text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            {/* Property thumbnail + name */}
                            <div className="flex gap-3 items-center">
                                <div
                                    className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-150 cursor-pointer"
                                    onClick={() => { setSelectedEnquiry(null); navigate(`/property/${selectedEnquiry.prop._id}`); }}
                                >
                                    {selectedEnquiry.prop.coverImage
                                        ? <img src={selectedEnquiry.prop.coverImage} className="w-full h-full object-cover" alt="" />
                                        : <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50"><Building size={18} /></div>
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-extrabold text-slate-900 text-sm truncate">{selectedEnquiry.prop.propertyName || 'Property'}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                        {selectedEnquiry.prop.propertyType || 'Property'}
                                    </p>
                                    <EnquiryStatusBadge status={selectedEnquiry.status || selectedEnquiry.inquiryMetadata?.status} />
                                </div>
                            </div>

                            {/* Specs */}
                            <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                                <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider mb-1">Property Specs</p>
                                <p className="text-xs font-bold text-slate-700">{getSpecs(selectedEnquiry.prop)}</p>
                            </div>

                            {/* Timeline */}
                            <div className="space-y-2.5">
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Enquiry Timeline</p>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                                        <FileText size={11} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-800">Enquiry Sent</p>
                                        <p className="text-[10px] text-slate-400">{fmtDate(selectedEnquiry.createdAt)}</p>
                                    </div>
                                </div>
                                {(selectedEnquiry.message || selectedEnquiry.inquiryMetadata?.message) && (
                                    <MessageBlock message={selectedEnquiry.message || selectedEnquiry.inquiryMetadata?.message} />
                                )}
                            </div>

                            {/* Contact info */}
                            <div className="border border-slate-100 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                        <User size={15} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">Listing Contact</p>
                                        <p className="text-xs font-bold text-slate-800">{selectedEnquiry.hostName}</p>
                                    </div>
                                </div>
                                {selectedEnquiry.hostPhone && (
                                    <div className="flex gap-1.5">
                                        <a
                                            href={`https://wa.me/${selectedEnquiry.hostPhone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(selectedEnquiry.hostName)},%20I%20enquired%20about%20your%20property%20on%20Get-Right-Home.`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-100 transition-colors"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <Send size={14} />
                                        </a>
                                        <a
                                            href={`tel:${selectedEnquiry.hostPhone}`}
                                            className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors shadow-sm"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <PhoneCall size={14} />
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* View property button */}
                            {selectedEnquiry.prop._id && (
                                <button
                                    onClick={() => { setSelectedEnquiry(null); navigate(`/property/${selectedEnquiry.prop._id}`); }}
                                    className="w-full py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-black transition-colors"
                                >
                                    View Property Listing →
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        </>
    );
};

export default UserReceivedEnquiriesPage;
