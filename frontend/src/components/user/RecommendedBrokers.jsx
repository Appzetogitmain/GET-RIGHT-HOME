import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/apiService';
import { BadgeCheck, Phone, ChevronRight, User, Loader2 } from 'lucide-react';

const RecommendedBrokers = () => {
    const [brokers, setBrokers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const carouselRef = React.useRef(null);

    useEffect(() => {
        const fetchBrokers = async () => {
            try {
                // Using generic api instance since we added it to userRoutes.js
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
                // Use setTimeout to ensure DOM is fully rendered before scrolling
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

    const calculateExperience = (dateStr) => {
        if (!dateStr) return '0.5';
        const joinDate = new Date(dateStr);
        const diffYears = (new Date() - joinDate) / (1000 * 60 * 60 * 24 * 365);
        return diffYears > 0.5 ? diffYears.toFixed(1) : '0.5';
    };

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
                    className="text-[12px] md:text-[14px] font-bold text-orange-600 hover:text-orange-700 hover:underline shrink-0 whitespace-nowrap mt-1 md:mt-0"
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
                    <motion.div
                        key={broker._id}
                        id={`broker-${broker._id}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                            sessionStorage.setItem('last-clicked-section-/', 'recommended-brokers-section');
                            navigate(`/broker/${broker._id}`);
                        }}
                        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer min-w-[280px] max-w-[280px] flex-shrink-0"
                    >
                        {/* Header with Plan Color Indicator - Assuming higher weight is diamond etc for visual */ }
                        <div className={`h-1 w-full ${
                            broker.rankingWeight >= 80 ? 'bg-blue-600' :
                            broker.rankingWeight >= 50 ? 'bg-indigo-600' :
                            broker.rankingWeight >= 20 ? 'bg-yellow-500' : 'bg-gray-300'
                        }`} />

                        <div className="p-3.5 flex flex-col h-full">
                            <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-11 h-11 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                                            {broker.profileImage ? (
                                                <img src={broker.profileImage} alt={broker.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-indigo-600 font-black text-sm uppercase">
                                                    {broker.name ? broker.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'B'}
                                                </span>
                                            )}
                                        </div>
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-gray-900 text-[13px] flex items-center gap-1 line-clamp-1">
                                        {broker.name}
                                        {broker.rankingWeight > 0 && (
                                            <BadgeCheck size={14} className="text-blue-500 fill-blue-50" />
                                        )}
                                    </h3>
                                    <div className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold uppercase tracking-tight mt-0.5">
                                        <ChevronRight size={10} className="-ml-0.5" />
                                        {broker.planName}
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2 mb-3 p-2.5 bg-gray-50/50 rounded-lg border border-gray-100/50">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Experience</span>
                                    <span className="text-[12px] font-black text-gray-800 mt-0.5">
                                        {calculateExperience(broker.memberSince)}+ Yrs
                                    </span>
                                </div>
                                <div className="flex flex-col border-l border-gray-200 pl-3">
                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Listings</span>
                                    <span className="text-[12px] font-black text-gray-800 mt-0.5">
                                        {broker.totalListings || 0}
                                    </span>
                                </div>
                            </div>

                            {/* Location Tags */}
                            <div className="flex flex-wrap gap-1 mb-4">
                                {broker.expertLocalities && broker.expertLocalities.slice(0, 2).map((loc, idx) => (
                                    <span key={idx} className="text-[9px] font-bold px-1.5 py-0.5 bg-white border border-gray-200 text-gray-500 rounded truncate max-w-[100px]">
                                        {loc}
                                    </span>
                                ))}
                                {broker.rankingWeight > 50 && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white border border-gray-200 text-gray-500 rounded">
                                        Top Rated
                                    </span>
                                )}
                            </div>

                            {/* Action */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    sessionStorage.setItem('last-clicked-section-/', 'recommended-brokers-section');
                                    navigate(`/broker/${broker._id}`);
                                }}
                                className="w-full mt-auto bg-gray-50 hover:bg-indigo-600 text-gray-700 hover:text-white py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 group border border-gray-200 hover:border-indigo-600"
                            >
                                <Phone size={14} className="group-hover:animate-bounce" />
                                Show Profile
                            </button>
                        </div>
                    </motion.div>
                ))}
                {/* Spacer */}
                <div className="min-w-[5px] shrink-0" />
            </div>
        </div>
    );
};

export default RecommendedBrokers;
