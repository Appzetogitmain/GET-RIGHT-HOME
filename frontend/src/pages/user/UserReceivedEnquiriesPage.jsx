import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, ChevronRight, Loader2, MapPin,
    MessageSquare, Send, Crown, Sparkles, PhoneCall,
    Calendar, Clock, FileText
} from 'lucide-react';
import { enquiryService, propertyService } from '../../services/apiService';
import toast from 'react-hot-toast';

// ─── Helper: parse raw message string into structured sections ────────────────
const parseEnquiryMessage = (raw = '') => {
    const result = { type: 'General', date: null, timeSlot: null, notes: '' };
    if (!raw) return result;

    // Detect type from tag at start
    if (/schedule visit/i.test(raw)) result.type = 'Schedule Visit';
    else if (/contact owner/i.test(raw)) result.type = 'Contact Owner';
    else if (/callback/i.test(raw)) result.type = 'Callback Request';

    // Helper to extract a field by key patterns, ignoring brackets and case
    const cleanRaw = raw.replace(/[`'"\[\]]/g, '').trim();

    // Extract Date
    const dateMatch = cleanRaw.match(/date[:\s]+([^\n\r]+)/i);
    if (dateMatch) {
        let dateVal = dateMatch[1].trim();
        dateVal = dateVal.split(/(?:time slot|notes|message|preferred)/i)[0].trim();
        result.date = dateVal;
    }

    // Extract Time Slot
    const timeMatch = cleanRaw.match(/time slot[:\s]+([^\n\r]+)/i);
    if (timeMatch) {
        let timeVal = timeMatch[1].trim();
        timeVal = timeVal.split(/(?:notes|message|preferred)/i)[0].trim();
        result.timeSlot = timeVal;
    }

    // Extract Notes / Message
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

// ─── Structured message display block ────────────────────────────────────────
const MessageBlock = ({ message }) => {
    const parsed = parseEnquiryMessage(message);
    const cls = 'bg-slate-50 border-slate-100 text-slate-700';

    return (
        <div className={`rounded-xl border p-2.5 space-y-1 ${cls}`}>
            <p className="text-[8px] font-black uppercase tracking-wider text-indigo-600 mb-0.5">{parsed.type}</p>
            {parsed.date && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5 py-0.5 border-b border-slate-100/50">
                    <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[8px] shrink-0">Date:</span>
                    <span className="font-bold text-slate-700 text-[10px]">{parsed.date}</span>
                </div>
            )}
            {parsed.timeSlot && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5 py-0.5 border-b border-slate-100/50">
                    <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[8px] shrink-0">Time Slot:</span>
                    <span className="font-bold text-slate-700 text-[10px]">{parsed.timeSlot}</span>
                </div>
            )}
            {parsed.notes && (
                <div className="flex flex-col gap-0.5 py-0.5">
                    <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[8px]">Notes:</span>
                    <span className="font-bold text-slate-700 text-[10px] leading-snug whitespace-pre-wrap">{parsed.notes}</span>
                </div>
            )}
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const UserReceivedEnquiriesPage = () => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [enquiries, setEnquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPropertyId, setSelectedPropertyId] = useState('All');
    const [activeFilter, setActiveFilter] = useState('ALL');

    useEffect(() => { fetchInitialData(); }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [propRes, enquiryRes] = await Promise.all([
                propertyService.getMy(),
                enquiryService.getReceived()
            ]);
            setProperties(propRes.properties || []);
            setEnquiries(enquiryRes.enquiries || []);
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
                toast.success(`Status → ${newStatus}`);
                const r = await enquiryService.getReceived();
                setEnquiries(r.enquiries || []);
            }
        } catch (err) {
            toast.error(err.message || 'Failed to update status');
        }
    };

    const filterFn = (item) => {
        if (selectedPropertyId !== 'All' && item.propertyId?._id !== selectedPropertyId) return false;
        const st = (item.status || item.inquiryMetadata?.status || 'new').toLowerCase();
        if (activeFilter === 'CONTACTED') return st === 'contacted';
        if (activeFilter === 'MATCHING BUYERS') return ['scheduled', 'closed', 'sold', 'rented'].includes(st);
        return true;
    };

    const filteredEnquiries = enquiries.filter(filterFn);
    const getCount = (f) => enquiries.filter(item => {
        if (selectedPropertyId !== 'All' && item.propertyId?._id !== selectedPropertyId) return false;
        const st = (item.status || item.inquiryMetadata?.status || 'new').toLowerCase();
        if (f === 'CONTACTED') return st === 'contacted';
        if (f === 'MATCHING BUYERS') return ['scheduled', 'closed', 'sold', 'rented'].includes(st);
        return true;
    }).length;

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '';

    const getSpecs = (prop) => {
        if (!prop) return 'N/A';
        const pType = (prop.propertyType || '').toLowerCase();
        
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
                    const possibleAreaKeys = ['value', 'amount', 'size', 'carpet', 'super'];
                    let found = false;
                    for (const key of possibleAreaKeys) {
                        if (val[key] !== undefined && val[key] !== null) {
                            area = val[key];
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                } else {
                    area = val;
                    break;
                }
            }
        }
        if (!area) area = '–';

        // 3. Resolve Unit
        let unit = '';
        const possibleUnitValues = [
            prop.carpetAreaUnit,
            prop.areaUnit,
            prop.dynamicData?.carpetAreaUnit,
            prop.dynamicData?.areaUnit,
            prop.dynamicData?.superAreaUnit,
            prop.buyDetails?.area?.unit,
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

        const isRent = ['rent', 'lease', 'pg', 'hostel'].includes(pType) || (prop.transactionType || '').toLowerCase().includes('rent');
        const priceStr = price > 0 ? (formatPriceLakhCrore(price) + (isRent ? '/mo' : '')) : 'Price on Request';
        const areaStr = `${area} ${unit}`;
        
        const loc = prop.address?.city || prop.city || prop.address?.fullAddress || '';
        return `${areaStr} • ${priceStr}${loc ? ` • ${loc}` : ''}`;
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24 md:pb-8">

            {/* ── HEADER ── */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3.5">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                        <ArrowLeft size={17} className="text-slate-700" />
                    </button>
                    <div>
                        <h1 className="text-[15px] font-black text-slate-900 leading-none">Enquiries</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Your listed properties
                        </p>
                    </div>
                </div>

                {/* ── Properties Carousel ── */}
                <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
                    {/* ALL button */}
                    <button
                        onClick={() => setSelectedPropertyId('All')}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all text-[11px] font-bold ${
                            selectedPropertyId === 'All'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200'
                        }`}
                    >
                        All Listings
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                            selectedPropertyId === 'All' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>{properties.length}</span>
                    </button>

                    {properties.map(p => (
                        <button
                            key={p._id}
                            onClick={() => setSelectedPropertyId(p._id)}
                            className={`flex-shrink-0 flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all text-[11px] font-bold max-w-[200px] ${
                                selectedPropertyId === p._id
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-slate-700 border-slate-200'
                            }`}
                        >
                            <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                {p.coverImage
                                    ? <img src={p.coverImage} className="w-full h-full object-cover" alt="" />
                                    : <div className="w-full h-full flex items-center justify-center text-slate-400"><MapPin size={12} /></div>
                                }
                            </div>
                            <div className="text-left min-w-0">
                                <p className="truncate font-black text-[11px] leading-tight">{p.propertyName}</p>
                                <span className={`text-[9px] uppercase font-bold ${
                                    selectedPropertyId === p._id ? 'text-indigo-200' : 'text-slate-400'
                                }`}>{p.propertyType}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 py-4 max-w-lg mx-auto space-y-3">

                {/* ── Upgrade Banner ── */}
                <div
                    onClick={() => navigate('/my-subscriptions')}
                    className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
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

                {/* ── Filter Tabs ── */}
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

                {/* ── Lead Cards ── */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-7 h-7 animate-spin text-slate-300" />
                    </div>
                ) : filteredEnquiries.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm">
                        <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <MessageSquare className="text-slate-300" size={22} />
                        </div>
                        <h4 className="font-extrabold text-slate-800 text-sm">No enquiries found</h4>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto leading-relaxed">
                            No queries match the selected filters or property.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {filteredEnquiries.map(item => {
                                const buyerName = item.userId?.name || 'Inquirer';
                                const initial = buyerName.charAt(0).toUpperCase();
                                const phone = item.userId?.phone || '';
                                const status = (item.status || item.inquiryMetadata?.status || 'new').toLowerCase();
                                const rawMsg = item.message || item.inquiryMetadata?.message || '';

                                return (
                                    <motion.div
                                        key={item._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.97 }}
                                        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"
                                    >
                                        {/* Row 1: Avatar + Name + Status selector */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-black text-[13px] flex items-center justify-center uppercase shrink-0">
                                                    {initial}
                                                </div>
                                                <div>
                                                    <h3 className="font-extrabold text-slate-900 text-[13px] leading-tight">{buyerName}</h3>
                                                    <span className="text-[10px] text-slate-400 font-medium">{fmtDate(item.createdAt)}</span>
                                                </div>
                                            </div>

                                            <select
                                                value={status}
                                                onChange={(e) => handleUpdateStatus(item._id, e.target.value)}
                                                className={`text-[9px] font-black px-2 py-1 rounded-lg border outline-none cursor-pointer uppercase shrink-0 ${
                                                    status === 'contacted' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                    : status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}
                                            >
                                                <option value="new">New</option>
                                                <option value="contacted">Contacted</option>
                                                <option value="scheduled">Scheduled</option>
                                                <option value="closed">Closed</option>
                                                <option value="dropped">Dropped</option>
                                            </select>
                                        </div>

                                        {/* Property Specs */}
                                        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 mb-3">
                                            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Property Specs</p>
                                            <p className="text-[11px] font-bold text-slate-700 leading-snug">{getSpecs(item.propertyId)}</p>
                                        </div>

                                        {/* Structured message */}
                                        {rawMsg && <MessageBlock message={rawMsg} />}

                                        {/* Action buttons */}
                                        <div className="flex gap-2 mt-3">
                                            {phone && (
                                                <a
                                                    href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(buyerName)},%20thank%20you%20for%20enquiring.`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center gap-1 transition-all text-[11px] font-black"
                                                >
                                                    <Send size={12} /> WhatsApp
                                                </a>
                                            )}

                                            {phone && (
                                                <a
                                                    href={`tel:${phone}`}
                                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center gap-1 transition-all text-[11px] font-black"
                                                >
                                                    <PhoneCall size={12} /> Call
                                                </a>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}

                {/* ── Low Visibility Banner ── */}
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl text-center space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center mx-auto">
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <h4 className="text-[12px] font-extrabold text-orange-950">Your listing's visibility is very low.</h4>
                        <p className="text-[10px] text-orange-500 font-medium max-w-[240px] mx-auto leading-relaxed mt-0.5">
                            Boost your property to 1st rank &amp; get up to 10 leads for just ₹499.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/my-subscriptions')}
                        className="w-full py-2.5 bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl active:scale-[0.98] transition-all"
                    >
                        Boost Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserReceivedEnquiriesPage;
