import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, User, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { reviewService } from '../../services/apiService';

const ReviewsPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ average: 0, total: 0 });

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const data = await reviewService.getPropertyReviews(id);
                setReviews(data || []);
                
                if (data && data.length > 0) {
                    const totalRating = data.reduce((acc, r) => acc + (r.rating || 5), 0);
                    setStats({
                        average: (totalRating / data.length).toFixed(1),
                        total: data.length
                    });
                }
            } catch (error) {
                console.error("Failed to fetch property reviews", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReviews();
    }, [id]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <ArrowLeft size={20} className="text-surface" />
                </button>
                <h1 className="text-lg font-bold text-surface">Ratings & Reviews</h1>
            </div>

            {/* Summary Card */}
            <div className="p-5 pb-0">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-6">
                    <div className="flex flex-col items-center justify-center w-20 h-20 bg-surface/5 rounded-2xl border border-surface/10">
                        <span className="text-3xl font-black text-surface leading-none">{stats.average || '0.0'}</span>
                        <div className="flex items-center gap-1 mt-1">
                            <Star size={10} fill="currentColor" className="text-surface" />
                            <span className="text-[10px] font-bold text-surface">{stats.total} Reviews</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-surface text-base mb-1">Property Reviews</h3>
                        <p className="text-xs text-gray-500">Based on {stats.total} verified ratings for this property.</p>
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            <div className="p-5 space-y-4 pb-20">
                <h3 className="font-bold text-surface text-base">User Reviews</h3>
                
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin mb-2" />
                        <p className="text-sm text-slate-500">Loading reviews...</p>
                    </div>
                ) : reviews.length > 0 ? (
                    reviews.map((review, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                {review.userId?.profilePicture ? (
                                    <img src={review.userId.profilePicture} alt="User" className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                        <User size={20} />
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold text-sm text-surface">{review.userId?.name || review.name || review.reviewerName || "Anonymous"}</h4>
                                    <p className="text-[10px] text-gray-400">
                                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recent'} 
                                        {review.reviewerType ? ` • ${review.reviewerType}` : ''}
                                    </p>
                                </div>
                                <div className="ml-auto bg-green-50 px-2 py-1 rounded text-xs font-bold text-green-700 flex items-center gap-1">
                                    {review.rating || 5.0} <Star size={10} fill="currentColor" />
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                {review.comment || review.reviewText || "No comment provided."}
                            </p>
                        </motion.div>
                    ))
                ) : (
                    <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                        <p className="text-sm font-medium text-gray-500">No reviews found for this property.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReviewsPage;
