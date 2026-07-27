import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Star, User, Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LocalityReviewsPage = () => {
    const params = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const locality = params.locality || searchParams.get('locality') || 'Locality';
    
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ average: 0, total: 0 });

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const res = await axios.get(`${API_URL}/locality-reviews/stats?localityName=${encodeURIComponent(locality)}`);
                if (res.data.success && res.data.stats) {
                    const s = res.data.stats;
                    setStats({
                        average: s.avgRating ? s.avgRating.toFixed(1) : '0.0',
                        total: s.totalReviews || 0
                    });
                }
                const revRes = await axios.get(`${API_URL}/public/insights/${encodeURIComponent(locality)}`);
                if (revRes.data?.success && revRes.data?.automated?.reviews) {
                    setReviews(revRes.data.automated.reviews);
                }
            } catch (error) {
                console.error("Failed to fetch locality reviews", error);
            } finally {
                setLoading(false);
            }
        };
        if (locality) {
            fetchReviews();
        }
    }, [locality]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <ArrowLeft size={20} className="text-emerald-700" />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-slate-900">Ratings & Reviews</h1>
                    <p className="text-[10px] text-slate-500">{locality}</p>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-[50vh]">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
                    <p className="text-sm font-semibold text-slate-500">Loading reviews...</p>
                </div>
            ) : (
                <>
                    {/* Summary Card */}
                    <div className="p-5 pb-0">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-6">
                            <div className="flex flex-col items-center justify-center w-24 h-24 bg-emerald-50 rounded-2xl border border-emerald-100 shrink-0">
                                <span className="text-3xl font-black text-emerald-700 leading-none">{stats.average || '0.0'}</span>
                                <div className="flex items-center gap-1 mt-2">
                                    <Star size={12} fill="currentColor" className="text-emerald-600" />
                                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Average</span>
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-800 text-base mb-1">Resident Reviews</h3>
                                <p className="text-xs text-slate-500 mb-4">Based on {stats.total} verified ratings for {locality}.</p>
                                
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-0.5"><Star size={10} fill="currentColor" className="text-amber-400"/><Star size={10} fill="currentColor" className="text-amber-400"/><Star size={10} fill="currentColor" className="text-amber-400"/><Star size={10} fill="currentColor" className="text-amber-400"/><Star size={10} fill="currentColor" className="text-amber-400"/></div>
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: '80%' }}></div></div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-0.5"><Star size={10} fill="currentColor" className="text-amber-400"/><Star size={10} fill="currentColor" className="text-amber-400"/><Star size={10} fill="currentColor" className="text-amber-400"/><Star size={10} fill="currentColor" className="text-amber-400"/><Star size={10} fill="currentColor" className="text-slate-200"/></div>
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: '15%' }}></div></div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-0.5"><Star size={10} fill="currentColor" className="text-amber-400"/><Star size={10} fill="currentColor" className="text-amber-400"/><Star size={10} fill="currentColor" className="text-amber-400"/><Star size={10} fill="currentColor" className="text-slate-200"/><Star size={10} fill="currentColor" className="text-slate-200"/></div>
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: '5%' }}></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reviews List */}
                    <div className="p-5 space-y-4">
                        {reviews.length > 0 ? reviews.map((review, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <img src={review.userId?.profilePicture || "https://ui-avatars.com/api/?name=" + (review.userId?.name || 'U') + "&background=random"} className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-100" alt="" />
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-800">{review.userId?.name || "Resident"}</h4>
                                            {review.isVerifiedResident && <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5"><Check className="w-3 h-3" /> Verified Resident</p>}
                                        </div>
                                    </div>
                                    <div className="bg-emerald-50 px-2 py-1 rounded text-xs font-bold text-emerald-700 flex items-center gap-1">
                                        {review.rating || 5} <Star size={10} fill="currentColor" />
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed italic">
                                    "{review.reviewText || review.comment}"
                                </p>
                            </motion.div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                                <p className="text-sm font-medium text-slate-500">No reviews found for {locality}.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default LocalityReviewsPage;
