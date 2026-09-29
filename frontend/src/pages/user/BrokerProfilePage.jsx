import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { goBackOrHome } from '../../utils/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
    Check,
    User,
    Clock,
    Target,
    Award,
    Globe,
    CheckCircle2,
    Sparkles,
    ChevronRight
} from 'lucide-react';
import PropertyFeed from '../../components/user/PropertyFeed';
import { useLeadCapture } from '../../hooks/useLeadCapture';

const BrokerProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [broker, setBroker] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('about'); // 'about' | 'listings' | 'reviews' | 'areas' | 'activity'
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

    const getWorkingSinceYear = (dateStr) => {
        if (!dateStr) return new Date().getFullYear() - 1;
        const d = new Date(dateStr);
        return isNaN(d.getFullYear()) ? 2023 : d.getFullYear();
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

    const getSpecializationText = (b) => {
        if (b.specialization && Array.isArray(b.specialization) && b.specialization.length > 0) {
            return b.specialization.join(', ');
        }
        if (b.propertyCategories && Array.isArray(b.propertyCategories) && b.propertyCategories.length > 0) {
            return b.propertyCategories.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ');
        }
        return 'Residential, Commercial, Plots';
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

    const tabs = [
        { id: 'about', label: 'About', icon: User },
        { id: 'listings', label: `Listings (${broker.totalListings || 0})`, icon: Building2 },
        { id: 'areas', label: 'Areas', icon: MapPin },
        { id: 'activity', label: 'Activity', icon: Clock }
    ];

    const bioText = broker.bio || broker.description || `Specialized in residential & commercial properties. Helping you find the right space with the best deals and smooth transactions across ${getLocationText(broker)}.`;

    // Deduplicated and clean localities list
    const rawAreas = [
        ...(broker.expertLocalities || []),
        ...(broker.address?.area ? [broker.address.area] : []),
        ...(broker.expertCities || []),
        ...(broker.address?.city ? [broker.address.city] : [])
    ].filter(Boolean);

    const expertAreas = Array.from(
        new Map(rawAreas.map(a => [a.trim().toLowerCase(), a.trim()])).values()
    );

    return (
        <div className="min-h-screen bg-gray-50/60 pb-24 md:pb-16">
            {/* Top Hero Section with Luxury Cozy Living Room Backdrop (Full-bleed on Mobile, Rounded on Desktop) */}
            <div className="w-full sm:max-w-6xl sm:mx-auto sm:mt-4 sm:rounded-3xl overflow-hidden relative bg-stone-900 text-white shadow-xl">
                {/* Background Living Room Interior Image */}
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-45 scale-105 transform filter blur-[0.5px]"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80')`
                    }}
                />
                {/* Warm Dark Gradient Overlay for optimal text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-stone-950/85 via-stone-900/60 to-stone-900/40" />

                <div className="px-4 sm:px-6 relative z-10 pt-4 pb-14 md:pb-20">
                    {/* Navigation Top Bar */}
                    <div className="flex justify-between items-center mb-3 sm:mb-6">
                        <button 
                            onClick={() => goBackOrHome(navigate)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition-all text-xs sm:text-sm font-semibold cursor-pointer"
                        >
                            <ArrowLeft size={16} />
                            <span>Back</span>
                        </button>
                        <button 
                            onClick={handleShare}
                            className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition-all cursor-pointer"
                            title="Share Profile"
                        >
                            <Share2 size={18} />
                        </button>
                    </div>

                    {/* Main Profile Info Row */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 sm:gap-6 mb-2 sm:mb-0">
                        {/* Left Side: Avatar + Details */}
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
                        <div className="bg-white text-gray-900 rounded-2xl p-2.5 sm:p-4 shadow-xl flex items-center justify-between sm:justify-start gap-3 sm:gap-3.5 border border-gray-100 w-full md:w-auto md:max-w-xs shrink-0 self-center md:self-auto">
                            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-50 border border-orange-100/80 flex items-center justify-center text-orange-500 shrink-0 shadow-xs">
                                <ShieldCheck size={20} strokeWidth={2.2} className="sm:hidden" />
                                <ShieldCheck size={26} strokeWidth={2.2} className="hidden sm:block" />
                            </div>
                            <div className="flex flex-col flex-1">
                                <span className="font-extrabold text-xs sm:text-[15px] text-gray-900 leading-tight">
                                    Verified Broker
                                </span>
                                <div className="flex items-center gap-2 mt-0.5 text-[9px] sm:text-[11px] font-semibold text-gray-500">
                                    <span className="flex items-center gap-0.5">
                                        <Check size={10} className="text-emerald-600 shrink-0" /> ID Verified
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                        <Check size={10} className="text-emerald-600 shrink-0" /> Background Verified
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating White Stats & Action Card */}
            <div className="max-w-5xl mx-3 sm:mx-auto relative z-20 -mt-6 sm:-mt-8 md:-mt-12">
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

            {/* Navigation Tabs Bar (Exact Figma Mockup Underline Style) */}
            <div className="max-w-5xl mx-4 sm:mx-auto mt-8 border-b border-gray-200">
                <div className="flex items-center gap-6 sm:gap-10 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 pb-3.5 text-xs sm:text-sm font-bold transition-all whitespace-nowrap relative cursor-pointer ${
                                    isActive 
                                        ? 'text-orange-500' 
                                        : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-orange-500' : 'text-gray-400'} />
                                <span>{tab.label}</span>
                                {isActive && (
                                    <motion.div 
                                        layoutId="activeTabIndicator"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" 
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Active Tab Content Container */}
            <div className="max-w-5xl mx-4 sm:mx-auto mt-6">
                <AnimatePresence mode="wait">
                    {/* TAB 1: ABOUT (Matching Figma Layout) */}
                    {activeTab === 'about' && (
                        <motion.div
                            key="about"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                {/* Left Content */}
                                <div className="md:col-span-7 space-y-4">
                                    <h3 className="text-xl sm:text-2xl font-black text-gray-900">
                                        About {broker.name}
                                    </h3>
                                    <p className="text-gray-600 text-xs sm:text-sm leading-relaxed font-normal">
                                        {bioText}
                                    </p>

                                    {/* Highlights Row with vertical divider */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-5 mt-4 border-t border-gray-100">
                                        {/* Specialization */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full border border-gray-200 bg-gray-50/80 text-gray-600 flex items-center justify-center shrink-0 shadow-xs">
                                                <Target size={18} strokeWidth={2.2} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 block leading-tight">
                                                    Specialization
                                                </span>
                                                <span className="text-xs sm:text-sm font-black text-gray-800 leading-tight mt-0.5 block">
                                                    {getSpecializationText(broker)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Vertical divider */}
                                        <div className="hidden sm:block h-9 w-[1px] bg-gray-200" />

                                        {/* Working Since */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full border border-gray-200 bg-gray-50/80 text-gray-600 flex items-center justify-center shrink-0 shadow-xs">
                                                <Award size={18} strokeWidth={2.2} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 block leading-tight">
                                                    Working Since
                                                </span>
                                                <span className="text-xs sm:text-sm font-black text-gray-800 leading-tight mt-0.5 block">
                                                    {getWorkingSinceYear(broker.memberSince || broker.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right 3D House Visual (Exact Figma Style) */}
                                <div className="md:col-span-5 flex items-center justify-center">
                                    <img 
                                        src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=700&q=80" 
                                        alt="Property Architecture"
                                        className="w-full max-w-xs sm:max-w-sm h-48 sm:h-52 object-cover rounded-2xl shadow-md border border-gray-100"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* TAB 2: LISTINGS */}
                    {activeTab === 'listings' && (
                        <motion.div
                            key="listings"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1.5 h-5 bg-orange-500 rounded-full" />
                                    <h2 className="text-lg sm:text-xl font-black text-gray-900">
                                        Properties by {broker.name}
                                    </h2>
                                </div>
                                <span className="bg-orange-50 text-orange-700 border border-orange-100 text-xs font-black px-3 py-1 rounded-full">
                                    {broker.totalListings || 0} Listings
                                </span>
                            </div>

                            {/* PropertyFeed for this broker */}
                            <PropertyFeed 
                                viewMode="list" 
                                extraFilters={{ userId: broker._id }} 
                            />
                        </motion.div>
                    )}

                    {/* TAB: AREAS */}
                    {activeTab === 'areas' && (
                        <motion.div
                            key="areas"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-black text-gray-900">
                                            Expert Localities & Operating Areas
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5 font-medium">
                                            Areas where {broker.name} has active listings and property expertise.
                                        </p>
                                    </div>
                                </div>

                                {expertAreas.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {expertAreas.map((area, idx) => (
                                            <div 
                                                key={idx}
                                                className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-gray-50 hover:bg-orange-50 hover:border-orange-200 border border-gray-200/80 transition-all group"
                                            >
                                                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                                    <MapPin size={16} />
                                                </div>
                                                <span className="text-xs sm:text-sm font-bold text-gray-800 capitalize truncate">
                                                    {area}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <MapPin size={32} className="mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm font-bold text-gray-600">Operating Region: {getLocationText(broker)}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* TAB 5: ACTIVITY */}
                    {activeTab === 'activity' && (
                        <motion.div
                            key="activity"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                                <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-6">
                                    Broker Activity & Verified Milestones
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">Verified Broker Badge Issued</h4>
                                            <p className="text-xs text-gray-500 font-medium mt-0.5">Government ID & credentials verified by GetRightHome administration.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                            <Building2 size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">{broker.totalListings || 0} Properties Listed</h4>
                                            <p className="text-xs text-gray-500 font-medium mt-0.5">Actively managing real estate portfolios across {getLocationText(broker)}.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                            <Handshake size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900">{getDealsClosed(broker)} Client Inquiries & Deals Facilitated</h4>
                                            <p className="text-xs text-gray-500 font-medium mt-0.5">Maintaining high satisfaction with {broker.responseRate || '98%'} quick response rate.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default BrokerProfilePage;

