import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/apiService';
import { Loader2, ArrowLeft, X, Phone, MessageCircle } from 'lucide-react';
import { BrokerCard } from '../../components/user/RecommendedBrokers';

const RecommendedBrokersPage = () => {
    const [brokers, setBrokers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [contactModalBroker, setContactModalBroker] = useState(null);
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

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="flex items-center px-4 py-4 md:py-5 max-w-7xl mx-auto">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 mr-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 leading-tight">Recommended Brokers</h1>
                        <p className="text-xs text-gray-500 font-medium">Top rated verified real estate partners</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="animate-spin text-orange-600" size={32} />
                    </div>
                ) : brokers.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        No recommended brokers found.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 justify-items-center sm:justify-items-stretch">
                        {brokers.map((broker, index) => (
                            <BrokerCard
                                key={broker._id}
                                broker={broker}
                                index={index}
                                onContact={(b) => setContactModalBroker(b)}
                            />
                        ))}
                    </div>
                )}

                {hasMore && !loading && brokers.length > 0 && (
                    <div className="flex justify-center mt-10">
                        <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-full font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            {loadingMore && <Loader2 className="animate-spin" size={16} />}
                            {loadingMore ? 'Loading...' : 'Load More Brokers'}
                        </button>
                    </div>
                )}
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
                                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full cursor-pointer"
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
                                <a
                                    href={`tel:${contactModalBroker.phone}`}
                                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                                >
                                    <Phone size={14} />
                                    <span>Call Now</span>
                                </a>

                                <a
                                    href={`https://wa.me/91${contactModalBroker.phone}?text=${encodeURIComponent(`Hi ${contactModalBroker.name}, I found your profile on GetRightHome and would like to inquire about properties.`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-green-500/20 active:scale-95 transition-all"
                                >
                                    <MessageCircle size={14} />
                                    <span>WhatsApp</span>
                                </a>
                            </div>

                            <button
                                onClick={() => {
                                    const id = contactModalBroker._id;
                                    setContactModalBroker(null);
                                    navigate(`/broker/${id}`);
                                }}
                                className="mt-3 text-xs font-bold text-gray-500 hover:text-orange-600 transition-colors cursor-pointer"
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

export default RecommendedBrokersPage;

