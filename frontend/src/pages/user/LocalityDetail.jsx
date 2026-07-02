import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    MapPin, ThumbsUp, ThumbsDown, Check, Minus, 
    ChevronRight, ArrowRight, Building, Hammer, Home, Activity
} from 'lucide-react';
import AdminPropertiesSection from '../../components/user/AdminPropertiesSection';
import PopularBuilders from '../../components/user/PopularBuilders';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LocalityDetail = () => {
    const { locality } = useParams();
    const navigate = useNavigate();
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Review Modal State
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reviewData, setReviewData] = useState({ rating: 5, comment: '', userType: 'Resident' });

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchData();
    }, [locality]);

    const fetchData = async () => {
        try {
            const res = await axios.get(`${API_URL}/public/insights/${locality}`);
            if (res.data.success) {
                setData(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch locality details", error);
        } finally {
            setLoading(false);
        }
    };

    const submitReview = async () => {
        if (!reviewData.comment) {
            alert('Please write a feedback comment.');
            return;
        }
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Please login to submit a review.');
                setIsSubmitting(false);
                return;
            }
            
            const res = await axios.post(`${API_URL}/public/insights/${locality}/review`, reviewData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setShowReviewModal(false);
                setReviewData({ rating: 5, comment: '', userType: 'Resident' });
                fetchData(); // Refresh reviews
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to submit review');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Loading Locality Insights...</div>;
    }

    if (!data) {
        return <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">Locality not found.</div>;
    }

    const { insight, automated } = data;
    const isPlaceholder = insight.notFoundCurated;

    // Derived values
    const coverImage = insight.coverImage || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80";
    const city = insight.city || "Explore";
    const pros = insight.pros || ["Well connected via roads", "Good infrastructure"];
    const cons = insight.cons || ["Heavy traffic during peak hours", "High cost of living"];
    const landmarks = insight.landmarks || [];
    const upcomingDevelopments = insight.upcomingDevelopments || [];
    
    return (
        <div className="bg-[#F8F9FA] min-h-screen pb-24 font-sans">
            {/* HERO SECTION - Tighter mobile-first hero */}
            <div className="relative w-full h-[32vh] md:h-[40vh]">
                <img src={coverImage} alt={locality} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                
                {/* Back button */}
                <button onClick={() => navigate(-1)} className="absolute top-5 left-5 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors z-10">
                    <ChevronRight className="w-5 h-5 rotate-180" />
                </button>

                <div className="absolute bottom-6 left-5 md:left-8 text-white max-w-[90%]">
                    <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">{locality}, {city}</h1>
                    {insight.midSegmentLocality && (
                        <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600/90 backdrop-blur-sm border border-purple-400 rounded-full text-[11px] font-bold shadow-sm">
                            ✨ Mid Segment Locality
                        </span>
                    )}
                </div>
            </div>

            {/* QUICK METRICS BAR */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-10">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 grid grid-cols-2 gap-4 text-center divide-x divide-slate-100 md:grid-cols-4">
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Avg Price</p>
                        <p className="text-base font-black text-slate-900 mt-0.5">
                            {automated.averagePropertyRate > 0 ? `₹${(automated.averagePropertyRate).toLocaleString()}` : "N/A"}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Properties</p>
                        <p className="text-base font-black text-slate-900 mt-0.5">{automated.totalProperties}+ Active</p>
                    </div>
                    <div className="hidden md:block">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rating</p>
                        <p className="text-base font-black text-emerald-500 mt-0.5">★ {automated.averageRating || 4.2} / 5</p>
                    </div>
                    <div className="hidden md:block">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Views</p>
                        <p className="text-base font-black text-slate-900 mt-0.5">{insight.views || 0}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
                
                {/* TWO COLUMN LAYOUT FOR DESKTOP, STACKED ON MOBILE */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* LEFT COLUMN - MAIN CONTENT */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* 1. PRICE CONFIGURATIONS (BHK Slider) */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-[#0B1A3A] mb-1">Showing for Apartments</h2>
                            <p className="text-xs text-slate-500 mb-4">Avg property prices based on configuration</p>
                            
                            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-2 px-2">
                                {automated.propertyPrices.length > 0 ? automated.propertyPrices.map((bhkData, i) => (
                                    <div key={i} className="min-w-[180px] p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors cursor-pointer group flex flex-col justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{bhkData.bhk} APARTMENTS</p>
                                            <h3 className="text-base font-black text-slate-900 mt-1">
                                                ₹{(bhkData.minPrice / 10000000).toFixed(2)} - {(bhkData.maxPrice / 10000000).toFixed(2)} Cr
                                            </h3>
                                            <p className="text-[10px] text-slate-400 mt-0.5">Price Range</p>
                                        </div>
                                        <button className="mt-4 w-full py-2 rounded-lg border border-blue-100 bg-blue-50/50 text-blue-600 text-[11px] font-bold group-hover:bg-blue-50 transition-colors flex items-center justify-center gap-1">
                                            {bhkData.count}+ properties <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                )) : (
                                    <div className="text-xs text-slate-500 font-medium p-2">No pricing data available yet.</div>
                                )}
                            </div>
                        </div>

                        {/* 2. PROS & CONS */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-[#0B1A3A] mb-4">Pros & Cons of {locality}</h2>
                            <div className="grid grid-cols-1 gap-5">
                                <div className="space-y-3">
                                    <ul className="space-y-2.5 text-xs text-slate-700">
                                        {pros.map((pro, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <div className="mt-0.5 p-0.5 bg-emerald-100 rounded-full"><Check className="w-3 h-3 text-emerald-600" /></div>
                                                <span className="font-medium leading-relaxed">{pro}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-3 border-t border-slate-100 pt-4">
                                    <ul className="space-y-2.5 text-xs text-slate-700">
                                        {cons.map((con, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <div className="mt-0.5 p-0.5 bg-slate-100 rounded-full"><Minus className="w-3 h-3 text-slate-500" /></div>
                                                <span className="font-medium leading-relaxed">{con}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="pt-2">
                                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <span>Is this helpful?</span>
                                        <button className="flex items-center gap-1 hover:text-blue-600"><ThumbsUp className="w-3.5 h-3.5" /> Yes</button>
                                        <button className="flex items-center gap-1 hover:text-red-500"><ThumbsDown className="w-3.5 h-3.5" /> No</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. UPCOMING DEVELOPMENTS & LANDMARKS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {upcomingDevelopments.length > 0 && (
                                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                                    <h2 className="text-lg font-bold text-[#0B1A3A] mb-4">Upcoming Developments</h2>
                                    <div className="space-y-4">
                                        {upcomingDevelopments.map((dev, i) => (
                                            <div key={i} className="flex gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                    <Hammer className="w-4 h-4 text-slate-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800 leading-tight">{dev.title}</p>
                                                    {dev.badge && <span className="inline-flex mt-1.5 px-2 py-0.5 bg-purple-50 text-purple-700 text-[9px] font-bold rounded uppercase tracking-wider border border-purple-100">{dev.badge}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {landmarks.length > 0 && (
                                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                                    <h2 className="text-lg font-bold text-[#0B1A3A] mb-4">Nearby Landmarks</h2>
                                    <div className="space-y-2">
                                        {landmarks.map((lm, i) => (
                                            <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-700">{lm.name}</span>
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-500">{lm.distance}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PHASE 3: Resident Reviews & Ratings Slider */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-[#0B1A3A] mb-1">Locality Reviews</h2>
                            <p className="text-xs text-slate-500 mb-4">What residents say about {locality}</p>
                            
                            {automated.reviews?.length > 0 ? (
                                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 snap-x snap-mandatory">
                                    {automated.reviews.map((review, i) => (
                                        <div key={i} className="min-w-[260px] snap-center shrink-0 p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-1 mb-2">
                                                    {[...Array(5)].map((_, idx) => (
                                                        <span key={idx} className={`text-sm ${idx < (review.rating || 5) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed italic">"{review.reviewText || review.comment}"</p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/60">
                                                <img src={review.userId?.profilePicture || "https://ui-avatars.com/api/?name=" + (review.userId?.name || 'U') + "&background=random"} className="w-6 h-6 rounded-full object-cover" alt="" />
                                                <span className="text-[10px] font-bold text-slate-700">{review.userId?.name || "Resident"}</span>
                                                {review.isVerifiedResident && <Check className="w-3 h-3 text-blue-500 ml-auto" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-24 bg-slate-50 rounded-xl border border-slate-200 border-dashed flex items-center justify-center">
                                    <span className="text-[11px] text-slate-400 font-medium">No reviews for this locality yet.</span>
                                </div>
                            )}

                            <button onClick={() => setShowReviewModal(true)} className="mt-4 w-full py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors">
                                Write a Review
                            </button>
                        </div>

                    </div>

                    {/* RIGHT COLUMN - SIDEBAR */}
                    <div className="space-y-6">
                        
                        {/* NEWLY LAUNCHED PROJECTS (Mobile optimized) */}
                        {automated.newlyLaunched?.length > 0 && (
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                                <h2 className="text-lg font-bold text-[#0B1A3A] mb-4">Newly Launched Projects</h2>
                                <div className="space-y-3">
                                    {automated.newlyLaunched.slice(0,3).map((proj, i) => (
                                        <div key={i} onClick={() => navigate(`/handpicked/${proj._id}`)} className="flex gap-3 items-center group cursor-pointer">
                                            <img src={proj.coverImage || coverImage} className="w-14 h-14 rounded-xl object-cover border border-slate-100" alt="" />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{proj.projectName}</h4>
                                                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{proj.address?.locality || locality}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TOP BUILDERS IN LOCALITY */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                            <div className="transform scale-95 origin-top-left w-[105%] -mt-6 -mb-6">
                                <PopularBuilders locality={locality} />
                            </div>
                        </div>

                        {/* PHASE 3: Top Sellers / Agents */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-[#0B1A3A] mb-4">Top Sellers in Locality</h2>
                            {automated.topSellers?.length > 0 ? (
                                <div className="space-y-3">
                                    {automated.topSellers.map((seller, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 cursor-pointer transition-colors">
                                            <img src={seller.profilePicture || "https://ui-avatars.com/api/?name=" + seller.name + "&background=random"} className="w-10 h-10 rounded-full border border-slate-200 object-cover" alt="" />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-slate-800 truncate">{seller.name}</h4>
                                                <p className="text-[11px] text-slate-500 mt-0.5">{seller.propertyCount} active properties</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-slate-500 font-medium">No top sellers identified yet.</div>
                            )}
                        </div>

                        {/* PHASE 3: Residential Zones */}
                        {insight.residentialZones?.length > 0 && (
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                                <h2 className="text-lg font-bold text-[#0B1A3A] mb-3">Explore Residential Zones</h2>
                                <div className="flex flex-wrap gap-2">
                                    {insight.residentialZones.map((zone, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors">
                                            {zone}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PHASE 3: Popular Tools */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-[#0B1A3A] mb-4">Popular Tools</h2>
                            <div className="grid grid-cols-2 gap-3">
                                <button className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-purple-50 rounded-xl border border-slate-100 hover:border-purple-200 transition-colors group">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-purple-600 mb-2 group-hover:scale-110 transition-transform">
                                        ₹
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-700">EMI Calculator</span>
                                </button>
                                <button className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors group">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 mb-2 group-hover:scale-110 transition-transform">
                                        <Home className="w-4 h-4" />
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-700">Affordability</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 4. LIVE PROPERTIES FEED */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold text-[#0B1A3A] mb-4 border-b border-slate-100 pb-3">
                        Properties in {locality}
                    </h2>
                    <div className="-mt-6">
                        <AdminPropertiesSection searchCity={locality} />
                    </div>
                </div>
            </div>

            {/* REVIEW MODAL */}
            {showReviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Review {locality}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">Overall Rating</label>
                                <div className="flex gap-2">
                                    {[1,2,3,4,5].map(star => (
                                        <button key={star} onClick={() => setReviewData({...reviewData, rating: star})} className={`text-2xl ${reviewData.rating >= star ? 'text-amber-400' : 'text-slate-200'} hover:scale-110 transition-transform`}>★</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">Are you a resident?</label>
                                <select value={reviewData.userType} onChange={e => setReviewData({...reviewData, userType: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="Resident">Yes, I live here</option>
                                    <option value="Visitor">No, I just visited</option>
                                    <option value="Owner">I am an Owner/Investor</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">Your Feedback</label>
                                <textarea rows="3" value={reviewData.comment} onChange={e => setReviewData({...reviewData, comment: e.target.value})} placeholder="What do you like or dislike about this locality?" className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowReviewModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors">Cancel</button>
                            <button onClick={submitReview} disabled={isSubmitting} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                                {isSubmitting ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocalityDetail;
