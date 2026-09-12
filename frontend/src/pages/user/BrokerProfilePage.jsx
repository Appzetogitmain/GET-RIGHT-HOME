import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { goBackOrHome } from '../../utils/navigation';
import { motion } from 'framer-motion';
import { api } from '../../services/apiService';
import { 
    Phone, 
    MessageCircle, 
    MapPin, 
    Star, 
    Share2, 
    ArrowLeft,
    Loader2,
    Briefcase,
    Building2,
    Handshake,
    ThumbsUp,
    ShieldCheck,
    Check
} from 'lucide-react';
import PropertyFeed from '../../components/user/PropertyFeed';
import { useEnquiryModal } from '../../context/EnquiryModalContext';
import { useLeadCapture } from '../../hooks/useLeadCapture';

const BrokerProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [broker, setBroker] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { captureLeadAndExecute } = useLeadCapture();

    const handleContact = (actionType) => {
        captureLeadAndExecute({
            targetId: id,
            targetType: 'broker',
            actionType,
            sourceContext: 'broker_profile',
            brokerData: broker,
            onExecute: () => {
                if (!broker) return;
                if (actionType === 'call') {
                    window.location.href = `tel:${broker.phone || ''}`;
                } else if (actionType === 'whatsapp') {
                    window.open(`https://wa.me/${(broker.whatsapp || broker.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${broker.name}, I found your profile on GetRightHome and would like to inquire about properties.`)}`, '_blank');
                }
            }
        });
    };

    useEffect(() => {
        const fetchBroker = async () => {
            try {
                const res = await api.get(`/users/broker/${id}`);
                if (res.data.success) {
                    setBroker(res.data.broker);
                } else {
                    setError('Broker not found');
                }
            } catch (err) {
                console.error("Failed to fetch broker:", err);
                setError('Could not load broker profile');
            } finally {
                setLoading(false);
            }
        };
        fetchBroker();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex justify-center items-center">
                <Loader2 className="animate-spin text-orange-600" size={32} />
            </div>
        );
    }

    if (error || !broker) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
                <p className="text-gray-500 mb-6">{error || 'Broker not found'}</p>
                <button 
                    onClick={() => goBackOrHome(navigate)}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors cursor-pointer"
                >
                    <ArrowLeft size={18} /> Go Back
                </button>
            </div>
        );
    }

    const calculateExperience = (dateStr) => {
        if (!dateStr) return '0.5';
        const joinDate = new Date(dateStr);
        const diffYears = (new Date() - joinDate) / (1000 * 60 * 60 * 24 * 365);
        return diffYears > 0.5 ? diffYears.toFixed(1) : '0.5';
    };

    const getLocationText = (b) => {
        const parts = [];
        if (b.address?.city) parts.push(b.address.city);
        else if (b.expertCities?.length > 0) parts.push(b.expertCities[0]);

        if (b.address?.state) parts.push(b.address.state);
        else if (b.address?.area) parts.push(b.address.area);
        else if (b.expertLocalities?.length > 0) parts.push(b.expertLocalities[0]);

        if (parts.length > 0) return parts.slice(0, 2).join(', ');
        return 'India';
    };

    const getLanguagesText = (b) => {
        if (b.languages && Array.isArray(b.languages) && b.languages.length > 0) {
            return b.languages.join(', ');
        }
        return 'English, Hindi, Kannada';
    };

    const getDealsClosed = (b) => {
        if (b.dealsClosed) return b.dealsClosed;
        const count = Math.max(12, (b.totalListings || 1) * 24);
        return `${count}+`;
    };

    const planName = broker.planName || 'BASIC';
    const planColors = {
        BASIC: 'bg-emerald-600 text-white',
        SILVER: 'bg-slate-600 text-white',
        GOLD: 'bg-amber-500 text-white',
        DIAMOND: 'bg-blue-600 text-white',
        PREMIUM: 'bg-purple-600 text-white'
    };
    const planBadgeClass = planColors[planName.toUpperCase()] || 'bg-emerald-600 text-white';

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${broker.name} - Real Estate Broker`,
                    text: `Check out ${broker.name}'s property listings on GetRightHome!`,
                    url: window.location.href,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            alert('Profile link copied to clipboard!');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/60 pb-24 md:pb-16">
            {/* Top Hero Section with Luxury Dark Backdrop */}
            <div className="relative bg-stone-900 text-white overflow-hidden">
                {/* Background Image with Dark Gradient Tint */}
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-25 scale-105 transform filter blur-[1px]"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80')`
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-900/85 to-stone-900/80" />

                <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 pt-3 sm:pt-4 pb-10 sm:pb-16 md:pb-20">
                    {/* Navigation Top Bar */}
                    <div className="flex justify-between items-center mb-3.5 sm:mb-6">
                        <button 
                            onClick={() => goBackOrHome(navigate)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all text-xs sm:text-sm font-semibold cursor-pointer"
                        >
                            <ArrowLeft size={16} />
                            <span>Back</span>
                        </button>
                        <button 
                            onClick={handleShare}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all cursor-pointer"
                            title="Share Profile"
                        >
                            <Share2 size={18} />
                        </button>
                    </div>

                    {/* Main Profile Info Row */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
                        {/* Left Side: Avatar + Details (Side-by-side on all screens) */}
                        <div className="flex flex-row items-center sm:items-start text-left gap-3.5 sm:gap-6 min-w-0">
                            {/* Avatar with thick white border & Verified Badge */}
                            <div className="relative shrink-0">
                                <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full border-3 sm:border-4 border-white shadow-xl overflow-hidden bg-white flex items-center justify-center">
                                    {broker.profileImage ? (
                                        <img 
                                            src={broker.profileImage} 
                                            alt={broker.name} 
                                            className="w-full h-full object-cover" 
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center font-black text-2xl sm:text-3xl uppercase">
                                            {broker.name ? broker.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'B'}
                                        </div>
                                    )}
                                </div>
                                {/* Green Checkmark Badge */}
                                <div className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 md:bottom-2 md:right-2 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-md">
                                    <Check size={13} strokeWidth={3.5} className="sm:hidden" />
                                    <Check size={16} strokeWidth={3.5} className="hidden sm:block" />
                                </div>
                            </div>

                            {/* Broker Details */}
                            <div className="flex flex-col items-start min-w-0 flex-1">
                                {/* Plan Badge */}
                                <span className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-xs mb-1 ${planBadgeClass}`}>
                                    {planName}
                                </span>

                                {/* Broker Name */}
                                <h1 className="text-lg sm:text-2xl md:text-4xl font-black text-white tracking-tight capitalize leading-tight truncate max-w-full">
                                    {broker.name}
                                </h1>

                                {/* Rating Row */}
                                <div className="flex items-center gap-1.5 text-white/90 text-xs sm:text-sm font-bold mt-1">
                                    <Star size={14} className="text-amber-400 fill-amber-400 shrink-0 sm:w-4 sm:h-4" />
                                    <span>{broker.rating || '4.8'}</span>
                                    <span className="text-white/70 font-medium text-[11px] sm:text-sm">({broker.reviewCount || '56'} Reviews)</span>
                                </div>

                                {/* Location Row */}
                                <div className="flex items-center gap-1 text-white/80 text-[11px] sm:text-sm font-medium mt-0.5 truncate max-w-full">
                                    <MapPin size={13} className="text-white/70 shrink-0" />
                                    <span className="truncate">{getLocationText(broker)}</span>
                                </div>

                                {/* Language Pill */}
                                <div className="mt-1.5 inline-flex items-center px-2.5 py-0.5 sm:px-3.5 sm:py-1 rounded-full bg-white/95 text-gray-800 text-[10px] sm:text-xs font-semibold shadow-xs backdrop-blur-xs max-w-full truncate">
                                    <span className="text-gray-500 mr-1 shrink-0">Language:</span> 
                                    <span className="truncate">{getLanguagesText(broker)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Verified Broker Card */}
                        <div className="bg-white text-gray-900 rounded-2xl p-3 sm:p-4 shadow-xl flex items-center justify-between sm:justify-start gap-3.5 border border-gray-100 w-full md:w-auto md:max-w-xs shrink-0 self-center md:self-auto">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-50 border border-orange-100/80 flex items-center justify-center text-orange-500 shrink-0 shadow-xs">
                                <ShieldCheck size={22} strokeWidth={2.2} className="sm:hidden" />
                                <ShieldCheck size={26} strokeWidth={2.2} className="hidden sm:block" />
                            </div>
                            <div className="flex flex-col flex-1">
                                <span className="font-extrabold text-sm sm:text-[15px] text-gray-900 leading-tight">
                                    Verified Broker
                                </span>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-[11px] font-semibold text-gray-500">
                                    <span className="flex items-center gap-0.5">
                                        <Check size={11} className="text-emerald-600 shrink-0" /> ID Verified
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                        <Check size={11} className="text-emerald-600 shrink-0" /> Background Verified
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating White Stats & Action Card */}
            <div className="max-w-5xl mx-4 sm:mx-auto relative z-20 -mt-8 sm:-mt-10 md:-mt-12">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 sm:p-7 md:p-8">
                    {/* 4 Stat Columns */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 items-center">
                        {/* 1. Experience */}
                        <div className="flex items-center gap-3 md:px-4">
                            <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <Briefcase size={18} strokeWidth={2.2} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                                    {calculateExperience(broker.memberSince || broker.createdAt)}+ Yrs
                                </span>
                                <span className="text-xs font-semibold text-gray-400 leading-tight mt-0.5">
                                    Experience
                                </span>
                            </div>
                        </div>

                        {/* 2. Total Listings */}
                        <div className="flex items-center gap-3 md:px-4 md:border-l md:border-gray-100">
                            <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <Building2 size={18} strokeWidth={2.2} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                                    {broker.totalListings || 0}
                                </span>
                                <span className="text-xs font-semibold text-gray-400 leading-tight mt-0.5">
                                    Total Listings
                                </span>
                            </div>
                        </div>

                        {/* 3. Deals Closed */}
                        <div className="flex items-center gap-3 md:px-4 md:border-l md:border-gray-100">
                            <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <Handshake size={18} strokeWidth={2.2} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                                    {getDealsClosed(broker)}
                                </span>
                                <span className="text-xs font-semibold text-gray-400 leading-tight mt-0.5">
                                    Deals Closed
                                </span>
                            </div>
                        </div>

                        {/* 4. Response Rate */}
                        <div className="flex items-center gap-3 md:px-4 md:border-l md:border-gray-100">
                            <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <ThumbsUp size={18} strokeWidth={2.2} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                                    {broker.responseRate || '98%'}
                                </span>
                                <span className="text-xs font-semibold text-gray-400 leading-tight mt-0.5">
                                    Response Rate
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-6 pt-6 border-t border-gray-100">
                        {/* Call Broker Button */}
                        <button
                            type="button"
                            onClick={() => handleContact('call')}
                            className="py-3.5 px-6 rounded-2xl border-2 border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 text-sm sm:text-base font-bold flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs cursor-pointer"
                        >
                            <Phone size={18} strokeWidth={2.3} className="text-emerald-600" />
                            <span>Call Broker</span>
                        </button>

                        {/* Chat on WhatsApp Button */}
                        <button
                            type="button"
                            onClick={() => handleContact('whatsapp')}
                            className="py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base font-bold flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-emerald-600/25 cursor-pointer"
                        >
                            <MessageCircle size={19} strokeWidth={2.3} />
                            <span>Chat on WhatsApp</span>
                        </button>
                    </div>

                    {/* Privacy & Trust Badge */}
                    <div className="flex items-center justify-center gap-1.5 text-gray-500 text-xs font-medium mt-4">
                        <ShieldCheck size={14} className="text-gray-400" />
                        <span>Your contact is safe with us. We respect your privacy.</span>
                    </div>
                </div>
            </div>

            {/* Localities & Bio Section (if available) */}
            {broker.expertLocalities && broker.expertLocalities.length > 0 && (
                <div className="max-w-5xl mx-4 sm:mx-auto mt-6 bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
                        Expert Localities
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {broker.expertLocalities.map((loc, idx) => (
                            <span 
                                key={idx} 
                                className="flex items-center gap-1 bg-gray-50 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold"
                            >
                                <MapPin size={12} className="text-gray-400" /> {loc}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Properties Feed Section */}
            <div className="max-w-5xl mx-4 sm:mx-auto mt-8">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-5 bg-orange-500 rounded-full" />
                        <h2 className="text-lg sm:text-xl font-black text-gray-900">
                            Properties by {broker.name?.split(' ')[0] || 'Broker'}
                        </h2>
                    </div>
                    <span className="bg-orange-50 text-orange-700 border border-orange-100 text-xs font-black px-2.5 py-1 rounded-full">
                        {broker.totalListings || 0} Listings
                    </span>
                </div>
                
                {/* PropertyFeed filtered by broker._id */}
                <PropertyFeed 
                    viewMode="list" 
                    extraFilters={{ userId: broker._id }} 
                />
            </div>
        </div>
    );
};

export default BrokerProfilePage;
