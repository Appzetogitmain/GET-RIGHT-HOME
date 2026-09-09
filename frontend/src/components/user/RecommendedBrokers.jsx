import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/apiService';
import { Sparkles, Building2, Eye, Phone, MapPin, Check, ChevronRight, Loader2, X, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLeadCapture } from '../../hooks/useLeadCapture';

export const BrokerCard = ({ broker, index = 0, onContact }) => {
    const navigate = useNavigate();
    const { captureLeadAndExecute } = useLeadCapture();

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

    const getSpecializationText = (b) => {
        if (b.bio?.trim()) return b.bio;
        if (b.description?.trim()) return b.description;
        
        const categories = b.propertyCategories || [];
        if (categories.includes('Residential') && categories.includes('Commercial')) {
            return 'Specialized in residential & commercial properties. Helping you find the right space.';
        }
        if (categories.includes('Commercial')) {
            return 'Specialized in commercial spaces, offices & retail. Helping you find the right space.';
        }
        if (categories.includes('Plot') || categories.includes('Plots')) {
            return 'Specialized in premium plots, lands & investments. Helping you find the right space.';
        }
        if (categories.includes('Residential')) {
            return 'Specialized in residential homes, apartments & villas. Helping you find the right space.';
        }
        return 'Specialized in residential & commercial properties. Helping you find the right space.';
    };

    const planName = broker.planName || 'BASIC';
    const planColors = {
        BASIC: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        SILVER: 'bg-slate-100 text-slate-700 border-slate-200',
        GOLD: 'bg-amber-50 text-amber-700 border-amber-200',
        DIAMOND: 'bg-blue-50 text-blue-700 border-blue-200',
        PREMIUM: 'bg-purple-50 text-purple-700 border-purple-200'
    };
    const planStyle = planColors[planName.toUpperCase()] || 'bg-emerald-50 text-emerald-700 border-emerald-100';

    const handleCardClick = () => {
        sessionStorage.setItem('last-clicked-section-/', 'recommended-brokers-section');
        navigate(`/broker/${broker._id}`);
    };

    return (
        <motion.div
            id={`broker-${broker._id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            onClick={handleCardClick}
            className="bg-white rounded-3xl border border-gray-100/90 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col min-w-[290px] max-w-[310px] sm:min-w-[310px] sm:max-w-[330px] flex-shrink-0 cursor-pointer group"
        >
            {/* Top Header section with soft peach/orange gradient */}
            <div className="bg-gradient-to-br from-orange-50/60 via-amber-50/30 to-transparent p-4 pb-2 relative">
                {/* Plan Badge on Top Right */}
                <div className="flex justify-end mb-1">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${planStyle}`}>
                        {planName}
                    </span>
                </div>

                {/* Profile info: Avatar + Name + Location */}
                <div className="flex items-center gap-3">
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-4 border-white shadow-md overflow-hidden bg-white shrink-0 flex items-center justify-center">
                        {broker.profileImage ? (
                            <img
                                src={broker.profileImage}
                                alt={broker.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center font-black text-lg uppercase">
                                {broker.name ? broker.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'B'}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-gray-900 text-[16px] sm:text-[17px] capitalize truncate">
                                {broker.name}
                            </h3>
                            {/* Orange Verified Checkmark Badge */}
                            <div className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs" title="Verified Broker">
                                <Check size={10} strokeWidth={4} />
                            </div>
                        </div>

                        <div className="flex items-center gap-1 text-[12px] font-medium text-gray-500 mt-1 truncate">
                            <MapPin size={13} className="text-gray-400 shrink-0" />
                            <span className="truncate">{getLocationText(broker)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Body Content */}
            <div className="p-4 pt-2 flex flex-col flex-1 justify-between">
                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50/70 border border-gray-100 rounded-2xl items-center mt-1">
                    {/* Experience */}
                    <div className="flex items-center gap-2 pr-1">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0">
                            <Sparkles size={16} strokeWidth={2.2} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[14px] font-black text-gray-900 leading-tight">
                                {calculateExperience(broker.memberSince || broker.createdAt)}+ Yrs
                            </span>
                            <span className="text-[11px] font-semibold text-gray-400 leading-tight">
                                Experience
                            </span>
                        </div>
                    </div>

                    {/* Divider & Listings */}
                    <div className="flex items-center gap-2 pl-2.5 border-l border-gray-200/80">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0">
                            <Building2 size={16} strokeWidth={2.2} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[14px] font-black text-gray-900 leading-tight">
                                {broker.totalListings || 0}
                            </span>
                            <span className="text-[11px] font-semibold text-gray-400 leading-tight">
                                Listings
                            </span>
                        </div>
                    </div>
                </div>

                {/* Specialization / Bio */}
                <p className="text-[12px] font-medium text-gray-600 leading-relaxed mt-3 px-0.5 line-clamp-2 min-h-[36px]">
                    {getSpecializationText(broker)}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            sessionStorage.setItem('last-clicked-section-/', 'recommended-brokers-section');
                            navigate(`/broker/${broker._id}`);
                        }}
                        className="flex-1 py-2.5 px-3 border-2 border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer touch-manipulation shadow-xs"
                    >
                        <Eye size={15} strokeWidth={2.3} className="text-emerald-600 shrink-0" />
                        <span>View Profile</span>
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            captureLeadAndExecute({
                                targetId: broker._id,
                                targetType: 'broker',
                                actionType: 'call',
                                sourceContext: 'broker_profile',
                                brokerData: broker,
                                onExecute: () => {
                                    if (onContact) {
                                        onContact(broker);
                                    } else if (broker.phone) {
                                        window.location.href = `tel:${broker.phone}`;
                                    } else {
                                        navigate(`/broker/${broker._id}`);
                                    }
                                }
                            });
                        }}
                        className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer touch-manipulation"
                    >
                        <Phone size={14} strokeWidth={2.5} className="shrink-0" />
                        <span>Contact</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const RecommendedBrokers = () => {
    const [brokers, setBrokers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [contactModalBroker, setContactModalBroker] = useState(null);
    const { captureLeadAndExecute } = useLeadCapture();
    const navigate = useNavigate();
    const carouselRef = React.useRef(null);

    useEffect(() => {
        const fetchBrokers = async () => {
            try {
                const res = await api.get('/users/recommended-brokers?limit=10');
                if (res.data.success) {
                    setBrokers(res.data.brokers || []);
                }
            } catch (err) {
                console.error("Failed to fetch recommended brokers:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBrokers();
    }, []);

    useEffect(() => {
        if (!loading && brokers.length > 0 && carouselRef.current) {
            const savedScroll = sessionStorage.getItem('scroll-left-recommended-brokers');
            if (savedScroll) {
                setTimeout(() => {
                    if (carouselRef.current) {
                        carouselRef.current.scrollLeft = parseInt(savedScroll, 10);
                    }
                }, 100);
            }
        }
    }, [loading, brokers]);

    const handleScroll = () => {
        if (carouselRef.current) {
            sessionStorage.setItem('scroll-left-recommended-brokers', carouselRef.current.scrollLeft.toString());
        }
    };

    if (loading) {
        return (
            <div className="py-8 flex justify-center items-center">
                <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
        );
    }

    if (brokers.length === 0) return null;

    return (
        <div id="recommended-brokers-section" className="py-4 border-b border-gray-100 last:border-0 relative">
            <div className="flex justify-between items-start md:items-end px-3 md:px-2 mb-3">
                <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-start gap-1.5 md:gap-2 mb-0.5">
                        <div className="w-1 h-4 md:h-5 bg-orange-500 rounded-full mt-1 md:mt-0 shrink-0" />
                        <h2 className="text-[17px] md:text-[22px] font-black text-gray-900 leading-tight">Recommended Brokers</h2>
                    </div>
                    <p className="text-[11px] md:text-[13px] text-gray-500 mt-0.5 ml-2.5 md:ml-3 truncate">Trusted local property experts</p>
                </div>
                <button
                    onClick={() => navigate('/recommended-brokers')}
                    className="text-[12px] md:text-[14px] font-bold text-orange-600 hover:text-orange-700 hover:underline shrink-0 whitespace-nowrap mt-1 md:mt-0 cursor-pointer"
                >
                    View All
                </button>
            </div>

            <div 
                ref={carouselRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto gap-4 no-scrollbar pb-4 px-5 md:px-0 -mx-5 md:mx-0"
            >
                {brokers.map((broker, index) => (
                    <BrokerCard
                        key={broker._id}
                        broker={broker}
                        index={index}
                        onContact={(b) => setContactModalBroker(b)}
                    />
                ))}
                {/* Spacer */}
                <div className="min-w-[5px] shrink-0" />
            </div>

            {/* Quick Contact Modal */}
            <AnimatePresence>
                {contactModalBroker && (
                    <div 
                        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
                        onClick={() => setContactModalBroker(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative flex flex-col items-center text-center"
                        >
                            <button
                                onClick={() => setContactModalBroker(null)}
                                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                            >
                                <X size={18} />
                            </button>

                            <div className="w-20 h-20 rounded-full border-4 border-orange-100 shadow-md overflow-hidden mb-3">
                                {contactModalBroker.profileImage ? (
                                    <img src={contactModalBroker.profileImage} alt={contactModalBroker.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-orange-500 text-white flex items-center justify-center font-bold text-xl uppercase">
                                        {contactModalBroker.name ? contactModalBroker.name[0] : 'B'}
                                    </div>
                                )}
                            </div>

                            <h3 className="text-lg font-black text-gray-900 capitalize">{contactModalBroker.name}</h3>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">Verified Real Estate Broker</p>

                            {contactModalBroker.phone && (
                                <p className="text-base font-black text-gray-800 tracking-wider bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 mt-4 w-full">
                                    +91 {contactModalBroker.phone}
                                </p>
                            )}

                            <div className="grid grid-cols-2 gap-2.5 w-full mt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        captureLeadAndExecute({
                                            targetId: contactModalBroker._id,
                                            targetType: 'broker',
                                            actionType: 'call',
                                            sourceContext: 'broker_profile',
                                            brokerData: contactModalBroker,
                                            onExecute: () => {
                                                window.location.href = `tel:${contactModalBroker.phone}`;
                                            }
                                        });
                                    }}
                                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                                >
                                    <Phone size={14} />
                                    <span>Call Now</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        captureLeadAndExecute({
                                            targetId: contactModalBroker._id,
                                            targetType: 'broker',
                                            actionType: 'whatsapp',
                                            sourceContext: 'broker_profile',
                                            brokerData: contactModalBroker,
                                            onExecute: () => {
                                                window.open(`https://wa.me/91${contactModalBroker.phone}?text=${encodeURIComponent(`Hi ${contactModalBroker.name}, I found your profile on GetRightHome and would like to inquire about properties.`)}`, '_blank');
                                            }
                                        });
                                    }}
                                    className="py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-green-500/20 active:scale-95 transition-all cursor-pointer"
                                >
                                    <MessageCircle size={14} />
                                    <span>WhatsApp</span>
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    const id = contactModalBroker._id;
                                    setContactModalBroker(null);
                                    navigate(`/broker/${id}`);
                                }}
                                className="mt-3 text-xs font-bold text-gray-500 hover:text-orange-600 transition-colors"
                            >
                                View full broker profile & listings ›
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RecommendedBrokers;

