import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { goBackOrHome } from '../../utils/navigation';
import { motion } from 'framer-motion';
import { api } from '../../services/apiService';
import { 
    Phone, 
    MessageCircle, 
    MapPin, 
    BadgeCheck, 
    Star, 
    Share2, 
    User, 
    Home, 
    CheckCircle2, 
    ArrowLeft,
    Loader2
} from 'lucide-react';
import PropertyFeed from '../../components/user/PropertyFeed';
import { useEnquiryModal } from '../../context/EnquiryModalContext';

const BrokerProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [broker, setBroker] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { openEnquiryModal } = useEnquiryModal();

    const handleContact = (actionType) => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            openEnquiryModal({
                targetId: id,
                targetType: 'Broker',
                actionType,
                onSuccess: () => {
                    executeAction(actionType);
                }
            });
            return;
        }
        executeAction(actionType);
    };

    const executeAction = (actionType) => {
        if (!broker) return;
        if (actionType === 'call') {
            window.location.href = `tel:${broker.phone || ''}`;
        } else if (actionType === 'whatsapp') {
            window.open(`https://wa.me/${(broker.whatsapp || broker.phone || '').replace(/\D/g, '')}`, '_blank');
        }
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
                <Loader2 className="animate-spin text-indigo-600" size={32} />
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
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
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

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${broker.name} - Real Estate Broker`,
                    text: `Check out ${broker.name}'s property listings!`,
                    url: window.location.href,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-10">
            {/* Header & Banner */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto">
                    {/* Top Nav */}
                    <div className="flex justify-between items-center px-4 py-4 md:py-6">
                        <button 
                            onClick={() => goBackOrHome(navigate)}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
                        >
                            <ArrowLeft size={20} />
                            <span className="hidden md:inline">Back</span>
                        </button>
                        <button 
                            onClick={handleShare}
                            className="p-2 bg-gray-50 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        >
                            <Share2 size={20} />
                        </button>
                    </div>

                    {/* Profile Header */}
                    <div className="px-4 pb-4 md:pb-10 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start text-center md:text-left">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white border-4 border-gray-50 shadow-lg flex items-center justify-center overflow-hidden z-10 relative">
                                {broker.profileImage ? (
                                    <img src={broker.profileImage} alt={broker.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-indigo-600 font-black text-4xl uppercase">
                                        {broker.name ? broker.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'B'}
                                    </span>
                                )}
                            </div>
                            {broker.planName && broker.planName.toLowerCase() !== 'basic' && (
                                <div className="absolute -bottom-2 right-4 md:right-8 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border-2 border-white shadow-sm z-20">
                                    {broker.planName}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 space-y-4">
                            <div>
                                <h1 className="text-2xl md:text-4xl font-black text-gray-900 flex items-center justify-center md:justify-start gap-2">
                                    {broker.name}
                                    {broker.planName && broker.planName.toLowerCase() !== 'basic' && (
                                        <BadgeCheck className="text-blue-500 fill-blue-50" size={24} />
                                    )}
                                </h1>
                                <p className="text-gray-500 font-medium mt-1">Real Estate Broker & Consultant</p>
                            </div>

                            {/* Stats */}
                            <div className="-mx-4 md:mx-0 grid grid-cols-3 py-4 border-y border-gray-100 w-[calc(100%+2rem)] md:w-auto">
                                <div className="flex flex-col items-center md:items-start justify-center">
                                    <span className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider">Experience</span>
                                    <span className="text-sm md:text-lg font-black text-gray-900 flex items-center gap-1.5 mt-1 md:mt-0">
                                        <Star size={14} className="text-yellow-500 fill-yellow-500 shrink-0 md:w-4 md:h-4" />
                                        <span className="whitespace-nowrap">{calculateExperience(broker.memberSince)}+ Yrs</span>
                                    </span>
                                </div>
                                <div className="flex flex-col items-center md:items-start justify-center border-x border-gray-100 md:border-x-0">
                                    <span className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider">Listings</span>
                                    <span className="text-sm md:text-lg font-black text-gray-900 flex items-center gap-1.5 mt-1 md:mt-0">
                                        <Home size={14} className="text-indigo-500 md:w-4 md:h-4" />
                                        {broker.totalListings || 0}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center md:items-start justify-center">
                                    <span className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider">Verified</span>
                                    <span className="text-sm md:text-lg font-black text-gray-900 flex items-center gap-1.5 mt-1 md:mt-0">
                                        <CheckCircle2 size={14} className="text-emerald-500 md:w-4 md:h-4" />
                                        {broker.verifiedListings || 0}
                                    </span>
                                </div>
                            </div>

                            {/* Expert In */}
                            {broker.expertLocalities && broker.expertLocalities.length > 0 && (
                                <div className="pt-2">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Expert In Localities</p>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                        {broker.expertLocalities.map((loc, idx) => (
                                            <span key={idx} className="flex items-center gap-1 bg-gray-50 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                                                <MapPin size={12} className="text-gray-400" /> {loc}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions (Desktop only, Mobile is fixed bottom) */}
                            <div className="hidden md:flex gap-3 pt-4">
                                <button 
                                    onClick={() => handleContact('call')}
                                    className="flex-1 bg-black hover:bg-gray-900 text-white py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
                                >
                                    <Phone size={18} /> Call Now
                                </button>
                                <button 
                                    onClick={() => handleContact('whatsapp')}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
                                >
                                    <MessageCircle size={18} /> WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Properties Section */}
            <div className="max-w-7xl mx-auto px-4 py-4 md:py-12">
                <div className="mb-6 flex items-center gap-3">
                    <h2 className="text-xl md:text-2xl font-black text-gray-900">Properties by {broker.name.split(' ')[0]}</h2>
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded-full">
                        {broker.totalListings}
                    </span>
                </div>
                
                {/* We pass userId={broker._id} via extraFilters to PropertyFeed */}
                <PropertyFeed 
                    viewMode="list" 
                    extraFilters={{ userId: broker._id }} 
                />
            </div>

            {/* Mobile Fixed Action Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe flex gap-3 z-[60] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
                <button 
                    onClick={() => handleContact('call')}
                    className="flex-1 bg-blue-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-blue-500/20"
                >
                    <Phone size={18} /> Call Now
                </button>
                <button 
                    onClick={() => handleContact('whatsapp')}
                    className="flex-1 bg-emerald-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-emerald-500/20"
                >
                    <MessageCircle size={18} /> WhatsApp
                </button>
            </div>
        </div>
    );
};

export default BrokerProfilePage;
