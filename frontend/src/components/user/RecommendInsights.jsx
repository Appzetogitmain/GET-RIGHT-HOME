import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Map, ArrowRight, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/apiService';

const RecommendInsights = ({ transactionType }) => {
    const navigate = useNavigate();
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = React.useRef(null);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                // Fetch dynamic insights based on transaction type (buy/rent/all)
                const res = await api.get(`/public/insights`, {
                    params: { transactionType: transactionType || 'all', limit: 10 }
                });
                
                if (res.data.success && res.data.insights.length > 0) {
                    setInsights(res.data.insights);
                } else {
                    // Fallback Dummy Data for UI demonstration
                    setInsights([
                        { _id: '1', locality: 'Andheri East', city: 'Mumbai', coverImage: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=200&q=80' },
                        { _id: '2', locality: 'Borivali West', city: 'Mumbai', coverImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=200&q=80' },
                        { _id: '3', locality: 'Kandivali West', city: 'Mumbai', coverImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=200&q=80' },
                        { _id: '4', locality: 'Whitefield', city: 'Bengaluru', coverImage: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=200&q=80' },
                    ]);
                }
            } catch (error) {
                console.error("Failed to fetch insights", error);
                setInsights([
                    { _id: '1', locality: 'Andheri East', city: 'Mumbai', coverImage: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=200&q=80' },
                    { _id: '2', locality: 'Borivali West', city: 'Mumbai', coverImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=200&q=80' },
                    { _id: '3', locality: 'Kandivali West', city: 'Mumbai', coverImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=200&q=80' },
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, [transactionType]);

    // Restore Horizontal Scroll
    useEffect(() => {
        if (!loading && insights.length > 0 && scrollContainerRef.current) {
            const savedScroll = sessionStorage.getItem('buy_recommended_insights_scroll');
            if (savedScroll) {
                scrollContainerRef.current.scrollLeft = parseInt(savedScroll, 10);
            }
        }
    }, [loading, insights]);

    const handleScroll = (e) => {
        sessionStorage.setItem('buy_recommended_insights_scroll', e.target.scrollLeft);
    };

    if (loading) {
        return (
            <div id="buy-recommended-insights-section" className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mt-2 min-h-[340px] animate-pulse">
                 <div className="mb-6">
                    <div className="h-7 bg-slate-200 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                </div>
                <div className="flex gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="min-w-[160px] md:min-w-[200px] aspect-[4/5] bg-slate-100 rounded-xl shrink-0"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div id="buy-recommended-insights-section" className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mt-2 scroll-mt-24">
            {/* Header section matching 99acres style */}
            <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-black text-[#0B1A3A] tracking-tight">
                    Recommended Insights
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    based on your search results & history
                </p>
            </div>

            {/* Slider */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 snap-x snap-mandatory"
            >
                {insights.map((insight) => (
                    <motion.div
                        key={insight._id}
                        whileHover={{ y: -2 }}
                        onClick={() => navigate(`/insights/${insight.locality}`)}
                        className="min-w-[160px] md:min-w-[200px] snap-center shrink-0 cursor-pointer group flex flex-col"
                    >
                        {/* Map Background Card */}
                        <div className="w-full aspect-square bg-[#E9EDE9] rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-4 border border-transparent group-hover:border-blue-100 transition-colors">
                            {/* Subtle map pattern background (CSS radial gradient for texture) */}
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                            
                            {/* Map Icon Top Right */}
                            <div className="absolute top-3 right-3 text-slate-400">
                                <Map size={16} />
                            </div>

                            {/* Circular Image */}
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] border-white shadow-md overflow-hidden relative z-10 mb-3 group-hover:scale-105 transition-transform duration-300">
                                <img 
                                    src={insight.coverImage} 
                                    alt={insight.locality}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Locality Text Inside Card */}
                            <h3 className="font-bold text-gray-900 text-center text-[15px] relative z-10 leading-tight">
                                {insight.locality}
                            </h3>
                            <p className="text-xs text-gray-500 text-center relative z-10 mt-0.5">
                                {insight.city}
                            </p>
                        </div>

                        {/* Text Below Card */}
                        <div className="mt-3">
                            <h4 className="text-sm font-bold text-gray-900 truncate">
                                {insight.locality} Insights
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Locality Insight
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <button 
                    className="text-[15px] font-bold text-[#0B1A3A] hover:text-blue-600 flex items-center gap-2 transition-colors"
                    onClick={() => insights.length > 0 ? navigate(`/insights/${insights[0].locality}`) : null}
                >
                    View Insights <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default RecommendInsights;
