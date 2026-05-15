import React, { useState, useEffect, useRef } from 'react';
import { Star, MessageCircle, ThumbsUp, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/apiService';
import toast from 'react-hot-toast';

const ReviewCard = ({ review, onReplySubmit }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const hasReply = !!review.reply;

    const handleSubmit = async () => {
        if (!replyText.trim()) return;
        setSubmitting(true);
        try {
            const res = await api.post(`/reviews/${review._id}/reply`, { reply: replyText });
            if (res.data.success) {
                onReplySubmit(review._id, replyText);
                setReplyText('');
                setIsReplying(false);
                toast.success('Reply posted!');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to post reply');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-4"
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs uppercase">
                        {review.userId?.name?.[0] || 'G'}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">{review.userId?.name || 'Guest User'}</h4>
                        <span className='text-[10px] text-gray-400 font-bold uppercase tracking-wider block'>
                            {review.propertyId?.propertyName || 'Your Property'}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                            <div className="flex text-amber-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={10} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-200"} />
                                ))}
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">• {new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-4 italic">
                "{review.comment}"
            </p>

            {hasReply && (
                <div className="mt-3 mb-4 pl-4 border-l-2 border-emerald-500/20 bg-emerald-50/30 rounded-r-xl p-3">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Your Response</p>
                    <p className="text-sm text-gray-700">{review.reply}</p>
                </div>
            )}

            <div className="flex items-center gap-4 pt-3 border-t border-gray-50">
                {!hasReply ? (
                    <button
                        onClick={() => setIsReplying(!isReplying)}
                        className={`flex items-center gap-1.5 text-xs font-bold transition-all ${isReplying ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-600'}`}
                    >
                        <MessageCircle size={14} /> {isReplying ? 'Cancel' : 'Reply to Guest'}
                    </button>
                ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                        <CheckCircle2 size={14} /> Replied
                    </span>
                )}
            </div>

            <AnimatePresence>
                {isReplying && !hasReply && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 overflow-hidden"
                    >
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write a professional reply..."
                                className="w-full bg-white border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 ring-emerald-500/20 resize-none h-24 mb-3"
                                autoFocus
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || !replyText.trim()}
                                    className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-100 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Posting...' : 'Send Reply'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const UserMyReviewsPage = () => {
    const navigate = useNavigate();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ avgRating: 0, total: 0 });

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            // Fetch reviews for properties OWNED by this user
            const res = await api.get('/reviews/owner');
            if (res.data.success) {
                setReviews(res.data.reviews || []);
                
                // Stats
                const r = res.data.reviews || [];
                if (r.length > 0) {
                    const avg = r.reduce((acc, curr) => acc + curr.rating, 0) / r.length;
                    setStats({ avgRating: avg.toFixed(1), total: r.length });
                }
            }
        } catch (error) {
            console.error("Failed to fetch reviews", error);
            // Fallback to partner reviews if needed
            try {
                const res2 = await api.get('/reviews/partner');
                if (res2.data.success) setReviews(res2.data.reviews || []);
            } catch(e) {}
        } finally {
            setLoading(false);
        }
    };

    const handleReplyUpdate = (reviewId, replyText) => {
        setReviews(prev => prev.map(r => 
            r._id === reviewId ? { ...r, reply: replyText, replyAt: new Date().toISOString() } : r
        ));
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-28">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-30 pt-safe-top">
                <div className="px-5 py-4 flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft size={18} className="text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 tracking-tight">My Reviews</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Guest feedback on your listings
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-5 pt-6 max-w-2xl mx-auto">
                {/* Scorecard */}
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm mb-8 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Average Rating</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-gray-900">{stats.avgRating}</span>
                            <div className="flex text-amber-400">
                                <Star size={16} fill="currentColor" />
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Reviews</p>
                        <p className="text-2xl font-black text-gray-900">{stats.total}</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
                        <p className="text-xs font-bold text-gray-400 uppercase">Loading reviews...</p>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Star size={32} className="text-gray-200" />
                        </div>
                        <h3 className="text-base font-black text-gray-900 mb-1">No reviews yet</h3>
                        <p className="text-xs text-gray-400 max-w-[200px] mx-auto leading-relaxed">
                            Once guests start reviewing your properties, they'll appear here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reviews.map(review => (
                            <ReviewCard 
                                key={review._id} 
                                review={review} 
                                onReplySubmit={handleReplyUpdate} 
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserMyReviewsPage;
