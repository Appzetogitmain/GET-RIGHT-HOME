import React, { useState, useEffect, useMemo } from 'react';
import { Star, MessageCircle, ArrowLeft, CheckCircle2, Building2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/apiService';
import toast from 'react-hot-toast';

const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Rating tier -> left border accent color
const tierBorder = (rating) => {
    if (rating >= 5) return 'border-l-emerald-500';
    if (rating >= 4) return 'border-l-emerald-400';
    if (rating >= 3) return 'border-l-amber-400';
    if (rating >= 2) return 'border-l-orange-400';
    return 'border-l-red-400';
};

const StarRow = ({ rating, size = 11 }) => (
    <div className="flex text-amber-400 shrink-0">
        {[...Array(5)].map((_, i) => (
            <Star key={i} size={size} fill={i < rating ? "currentColor" : "none"} className={i < rating ? "" : "text-gray-200"} strokeWidth={i < rating ? 0 : 1.5} />
        ))}
    </div>
);

const ReviewCard = ({ review, onReplySubmit }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const hasReply = !!review.reply;
    const reviewerName = review.userId?.name || 'Guest User';

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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${tierBorder(review.rating)} shadow-sm shadow-gray-100/60 px-5 py-4`}
        >
            {/* Compact single-line meta row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
                <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                    {reviewerName[0]}
                </div>
                <h4 className="font-bold text-gray-900 text-[13px]">{reviewerName}</h4>
                <StarRow rating={review.rating} />
                <span className="text-[11px] text-gray-400">· {timeAgo(review.createdAt)}</span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-gray-400 font-medium mb-2.5 ml-8">
                <Building2 size={10} className="shrink-0" />
                <span className="truncate">{review.propertyId?.propertyName || 'Your Property'}</span>
            </div>

            <p className="text-[13.5px] text-gray-600 leading-relaxed ml-8">
                {review.comment}
            </p>

            {hasReply && (
                <div className="mt-3 ml-8 pl-3 border-l-2 border-emerald-200">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-0.5">Your Response</p>
                    <p className="text-[13px] text-gray-600 leading-relaxed">{review.reply}</p>
                </div>
            )}

            <div className="ml-8 mt-2.5">
                {!hasReply ? (
                    <button
                        onClick={() => setIsReplying(!isReplying)}
                        className={`flex items-center gap-1 text-[11px] font-bold transition-colors ${isReplying ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-600'}`}
                    >
                        <MessageCircle size={12} /> {isReplying ? 'Cancel' : 'Reply to guest'}
                    </button>
                ) : (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <CheckCircle2 size={12} /> Replied
                    </span>
                )}
            </div>

            <AnimatePresence>
                {isReplying && !hasReply && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="ml-8 mt-3">
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write a professional reply..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-400 resize-none h-20 mb-2 transition-colors"
                                autoFocus
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || !replyText.trim()}
                                    className="bg-gray-900 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors disabled:opacity-40"
                                >
                                    {submitting ? 'Posting...' : 'Post Reply'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const ReviewCardSkeleton = () => (
    <div className="bg-white rounded-2xl border border-gray-100 border-l-4 border-l-gray-100 px-5 py-4 animate-pulse">
        <div className="flex items-center gap-2 mb-2.5">
            <div className="w-6 h-6 rounded-full bg-gray-100 shrink-0" />
            <div className="h-3 w-24 bg-gray-100 rounded-full" />
            <div className="h-3 w-16 bg-gray-100 rounded-full" />
        </div>
        <div className="ml-8 space-y-2">
            <div className="h-2.5 w-full bg-gray-100 rounded-full" />
            <div className="h-2.5 w-2/3 bg-gray-100 rounded-full" />
        </div>
    </div>
);

const StatItem = ({ label, value, icon: Icon }) => (
    <div className="flex-1 flex flex-col items-center py-3.5">
        <div className="flex items-center gap-1.5 mb-1">
            {Icon && <Icon size={13} className="text-emerald-600" />}
            <span className="text-xl font-black text-gray-900 leading-none">{value}</span>
        </div>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
    </div>
);

const UserMyReviewsPage = () => {
    const navigate = useNavigate();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

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
            }
        } catch (error) {
            console.error("Failed to fetch reviews", error);
            // Fallback to partner reviews if needed
            try {
                const res2 = await api.get('/reviews/partner');
                if (res2.data.success) setReviews(res2.data.reviews || []);
            } catch (e) { /* no fallback available */ }
        } finally {
            setLoading(false);
        }
    };

    const handleReplyUpdate = (reviewId, replyText) => {
        setReviews(prev => prev.map(r =>
            r._id === reviewId ? { ...r, reply: replyText, replyAt: new Date().toISOString() } : r
        ));
    };

    const stats = useMemo(() => {
        const total = reviews.length;
        const avgRating = total > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / total) : 0;
        const replyRate = total > 0 ? Math.round((reviews.filter(r => !!r.reply).length / total) * 100) : 0;
        return { total, avgRating: avgRating.toFixed(1), replyRate };
    }, [reviews]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-28">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-30 pt-safe-top">
                <div className="px-5 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors shrink-0"
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

            <div className="px-5 pt-5 max-w-2xl mx-auto">
                {/* Minimal stat strip */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/60 flex items-stretch divide-x divide-gray-100 mb-6">
                    <StatItem label="Avg Rating" value={stats.avgRating} icon={Star} />
                    <StatItem label="Reviews" value={stats.total} />
                    <StatItem label="Reply Rate" value={`${stats.replyRate}%`} icon={TrendingUp} />
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => <ReviewCardSkeleton key={i} />)}
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Star size={32} className="text-gray-200" />
                        </div>
                        <h3 className="text-base font-black text-gray-900 mb-1">No reviews yet</h3>
                        <p className="text-xs text-gray-400 max-w-[200px] mx-auto leading-relaxed">
                            Once guests start reviewing your properties, they'll appear here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
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
