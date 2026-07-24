import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../services/apiService';
import { BadgeCheck, Phone, ChevronRight, User, Loader2, ArrowLeft } from 'lucide-react';

const RecommendedBrokersPage = () => {
    const [brokers, setBrokers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const navigate = useNavigate();

    const fetchBrokers = async (pageNum, isLoadMore = false) => {
        try {
            if (isLoadMore) setLoadingMore(true);
            else setLoading(true);
            
            const res = await api.get(`/users/recommended-brokers?limit=12&page=${pageNum}`);
            if (res.data.success) {
                if (isLoadMore) {
                    setBrokers(prev => [...prev, ...(res.data.brokers || [])]);
                } else {
                    setBrokers(res.data.brokers || []);
                }
                
                if (!res.data.brokers || res.data.brokers.length < 12 || res.data.page >= res.data.pages) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }
            }
        } catch (err) {
            console.error("Failed to fetch recommended brokers:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchBrokers(1);
    }, []);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchBrokers(nextPage, true);
    };

    const calculateExperience = (dateStr) => {
        if (!dateStr) return '0.5';
        const joinDate = new Date(dateStr);
        const diffYears = (new Date() - joinDate) / (1000 * 60 * 60 * 24 * 365);
        return diffYears > 0.5 ? diffYears.toFixed(1) : '0.5';
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="flex items-center px-4 py-4 md:py-5 max-w-7xl mx-auto">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 mr-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 leading-tight">Recommended Brokers</h1>
                        <p className="text-xs text-gray-500 font-medium">Top rated real estate partners</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                    </div>
                ) : brokers.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        No recommended brokers found.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {brokers.map((broker, index) => (
                            <motion.div
                                key={broker._id}
                                id={`broker-${broker._id}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => {
                                    sessionStorage.setItem('last-clicked-section-/recommended-brokers', `broker-${broker._id}`);
                                    navigate(`/broker/${broker._id}`);
                                }}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer"
                            >
                                <div className={`h-1.5 w-full ${
                                    broker.rankingWeight >= 80 ? 'bg-blue-600' :
                                    broker.rankingWeight >= 50 ? 'bg-indigo-600' :
                                    broker.rankingWeight >= 20 ? 'bg-yellow-500' : 'bg-gray-300'
                                }`} />

                                <div className="p-4 flex flex-col h-full">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                            {broker.profileImage ? (
                                                <img src={broker.profileImage} alt={broker.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xl uppercase">
                                                    {broker.name ? broker.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'B'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="font-bold text-gray-900 text-[15px] flex items-center gap-1 line-clamp-1">
                                                {broker.name}
                                                {broker.rankingWeight > 0 && (
                                                    <BadgeCheck size={16} className="text-blue-500 fill-blue-50" />
                                                )}
                                            </h3>
                                            <div className="flex items-center gap-0.5 text-xs text-emerald-600 font-bold uppercase tracking-tight mt-0.5">
                                                <ChevronRight size={12} className="-ml-0.5" />
                                                {broker.planName}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-50/50 rounded-xl border border-gray-100/50">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Experience</span>
                                            <span className="text-[14px] font-black text-gray-800 mt-0.5">
                                                {calculateExperience(broker.memberSince)}+ Yrs
                                            </span>
                                        </div>
                                        <div className="flex flex-col border-l border-gray-200 pl-3">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Listings</span>
                                            <span className="text-[14px] font-black text-gray-800 mt-0.5">
                                                {broker.totalListings || 0}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Location Tags */}
                                    <div className="flex flex-wrap gap-1.5 mb-5">
                                        {broker.expertLocalities && broker.expertLocalities.slice(0, 3).map((loc, idx) => (
                                            <span key={idx} className="text-[10px] font-bold px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded-md truncate max-w-[120px]">
                                                {loc}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Action */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            sessionStorage.setItem('last-clicked-section-/recommended-brokers', `broker-${broker._id}`);
                                            navigate(`/broker/${broker._id}`);
                                        }}
                                        className="w-full mt-auto bg-gray-50 hover:bg-indigo-600 text-gray-700 hover:text-white py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 group border border-gray-200 hover:border-indigo-600"
                                    >
                                        <User size={16} className="group-hover:text-white text-gray-400" />
                                        View Profile
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {hasMore && !loading && brokers.length > 0 && (
                    <div className="flex justify-center mt-10">
                        <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-full font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {loadingMore && <Loader2 className="animate-spin" size={16} />}
                            {loadingMore ? 'Loading...' : 'Load More Brokers'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecommendedBrokersPage;
