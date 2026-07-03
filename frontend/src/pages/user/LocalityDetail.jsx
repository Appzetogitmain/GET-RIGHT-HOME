import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    MapPin, ThumbsUp, ThumbsDown, Check, Minus, 
    ChevronRight, ArrowRight, Building, Hammer, Home, Activity
} from 'lucide-react';
import AdminPropertiesSection from '../../components/user/AdminPropertiesSection';
import PopularBuilders from '../../components/user/PopularBuilders';
import PopularToolsModals from '../../components/user/PopularToolsModals';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LocalityDetail = () => {
    const { locality } = useParams();
    const navigate = useNavigate();
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reviewData, setReviewData] = useState({ rating: 5, comment: '', userType: 'Resident' });

    // Tools Modal State
    const [activeTool, setActiveTool] = useState(null);

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

            <div className="max-w-4xl mx-auto sm:px-6 lg:px-8 mt-4 sm:mt-6">
                
                <div className="flex flex-col gap-[6px] sm:gap-6 bg-slate-100 sm:bg-transparent pb-10">
                    
                    {/* 2. PROS */}
                    {pros.length > 0 && (
                        <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                            <h2 className="text-lg font-bold text-[#0B1A3A] mb-4">What's great about {locality}</h2>
                            <ul className="space-y-3 text-sm text-slate-700">
                                {pros.map((pro, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <div className="mt-0.5 p-1 bg-emerald-100 rounded-full"><Check className="w-3.5 h-3.5 text-emerald-600" /></div>
                                        <span className="font-medium leading-relaxed">{pro}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* 2.5 CONS */}
                    {cons.length > 0 && (
                        <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                            <h2 className="text-lg font-bold text-[#0B1A3A] mb-4">What needs attention</h2>
                            <ul className="space-y-3 text-sm text-slate-700">
                                {cons.map((con, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <div className="mt-0.5 p-1 bg-rose-100 rounded-full"><Minus className="w-3.5 h-3.5 text-rose-600" /></div>
                                        <span className="font-medium leading-relaxed">{con}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-5 flex items-center gap-3 text-xs text-slate-500 font-medium pt-4 border-t border-slate-100">
                                <span>Is this helpful?</span>
                                <button className="flex items-center gap-1 hover:text-blue-600"><ThumbsUp className="w-4 h-4" /> Yes</button>
                                <button className="flex items-center gap-1 hover:text-red-500"><ThumbsDown className="w-4 h-4" /> No</button>
                            </div>
                        </div>
                    )}

                    {/* 3. PRICE CONFIGURATIONS (BHK Slider) */}
                    <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200 pt-6">
                        <h2 className="text-lg font-bold text-[#0B1A3A] mb-1">Showing for Apartments</h2>
                        <p className="text-xs text-slate-500 mb-4">Avg property prices based on configuration</p>
                        
                        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0">
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

                    {/* 4. UPCOMING DEVELOPMENTS */}
                    {upcomingDevelopments.length > 0 && (
                        <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                            <h2 className="text-lg font-bold text-[#0B1A3A] mb-4">Upcoming Developments</h2>
                            <div className="space-y-4">
                                {upcomingDevelopments.map((dev, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                            <Hammer className="w-5 h-5 text-slate-600" />
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

                    {/* 5. NEARBY LANDMARKS */}
                    {landmarks.length > 0 && (
                        <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                            <h2 className="text-lg font-bold text-[#0B1A3A] mb-4">Explore Nearby Landmarks</h2>
                            <div className="space-y-3">
                                {landmarks.map((lm, i) => (
                                    <div key={i} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                                <MapPin className="w-4 h-4 text-blue-500" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">{lm.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md">{lm.distance}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 6. POPULAR & NEWLY LAUNCHED PROJECTS */}
                    {(automated.popularProjects?.length > 0 || automated.newlyLaunched?.length > 0) && (
                        <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                            <h2 className="text-lg font-bold text-[#0B1A3A] mb-4">Scan Popular & Newly Launched Projects</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Popular */}
                                {automated.popularProjects?.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Popular Projects</h3>
                                        <div className="space-y-3">
                                            {automated.popularProjects.slice(0,3).map((proj, i) => (
                                                <div key={i} onClick={() => navigate(`/handpicked/${proj._id}`)} className="flex gap-3 items-center group cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-100 hover:border-blue-200">
                                                    <img src={proj.coverImage || coverImage} className="w-14 h-14 rounded-lg object-cover" alt="" />
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-bold text-slate-800 truncate">{proj.propertyName}</h4>
                                                        <p className="text-[11px] text-slate-500 truncate">{proj.address?.locality || locality}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Newly Launched */}
                                {automated.newlyLaunched?.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Newly Launched</h3>
                                        <div className="space-y-3">
                                            {automated.newlyLaunched.slice(0,3).map((proj, i) => (
                                                <div key={i} onClick={() => navigate(`/handpicked/${proj._id}`)} className="flex gap-3 items-center group cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-100 hover:border-blue-200">
                                                    <img src={proj.coverImage || coverImage} className="w-14 h-14 rounded-lg object-cover" alt="" />
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-bold text-slate-800 truncate">{proj.propertyName}</h4>
                                                        <p className="text-[11px] text-slate-500 truncate">{proj.address?.locality || locality}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 7. TOP BUILDERS */}
                    <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200 overflow-hidden">
                        <div className="transform sm:scale-95 origin-top-left sm:w-[105%] sm:-mt-4 sm:-mb-4">
                            <PopularBuilders locality={locality} />
                        </div>
                    </div>

                    {/* 8. SCAN ALL PROPERTY TYPES */}
                    {automated.propertyTypes && (
                        <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-[#0B1A3A]">Scan all property types</h2>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button className="px-4 py-1.5 rounded-md text-xs font-bold bg-white shadow-sm text-slate-800 transition-all">Buy</button>
                                    <button className="px-4 py-1.5 rounded-md text-xs font-bold text-slate-500 hover:text-slate-800 transition-all">Rent</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {automated.propertyTypes.Buy?.length > 0 ? automated.propertyTypes.Buy.map((pt, i) => (
                                    <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center hover:border-blue-300 cursor-pointer transition-colors">
                                        <p className="text-sm font-bold text-slate-700">{pt.type}</p>
                                        <p className="text-xs text-slate-500 mt-1">{pt.count} properties</p>
                                    </div>
                                )) : (
                                    <p className="text-xs text-slate-400 col-span-4 text-center py-4">No properties available for buy.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 9. TOP SELLERS */}
                    <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                        <h2 className="text-lg font-bold text-[#0B1A3A] mb-4">View Properties by Top Sellers</h2>
                        {automated.topSellers?.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {automated.topSellers.map((seller, i) => (
                                    <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 cursor-pointer transition-colors">
                                        <img src={seller.profilePicture || "https://ui-avatars.com/api/?name=" + seller.name + "&background=random"} className="w-12 h-12 rounded-full border border-slate-200 object-cover" alt="" />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-slate-800 truncate">{seller.name}</h4>
                                            <p className="text-[11px] text-slate-500 mt-1">{seller.propertyCount} active properties</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500 font-medium">No top sellers identified yet.</div>
                        )}
                    </div>

                    {/* 10. RESIDENT REVIEWS & RATINGS */}
                    <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                        <h2 className="text-lg font-bold text-[#0B1A3A] mb-1">Check {locality} Ratings & Reviews</h2>
                        <p className="text-xs text-slate-500 mb-4">What residents say about {locality}</p>
                        
                        {automated.reviews?.length > 0 ? (
                            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 snap-x snap-mandatory">
                                {automated.reviews.map((review, i) => (
                                    <div key={i} className="min-w-[280px] snap-center shrink-0 p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-1 mb-3">
                                                {[...Array(5)].map((_, idx) => (
                                                    <span key={idx} className={`text-base ${idx < (review.rating || 5) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                                                ))}
                                            </div>
                                            <p className="text-sm text-slate-700 line-clamp-4 leading-relaxed italic">"{review.reviewText || review.comment}"</p>
                                        </div>
                                        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-200/60">
                                            <img src={review.userId?.profilePicture || "https://ui-avatars.com/api/?name=" + (review.userId?.name || 'U') + "&background=random"} className="w-8 h-8 rounded-full object-cover shadow-sm" alt="" />
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">{review.userId?.name || "Resident"}</p>
                                                {review.isVerifiedResident && <p className="text-[10px] text-blue-600 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Verified Resident</p>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-24 bg-slate-50 rounded-xl border border-slate-200 border-dashed flex items-center justify-center">
                                <span className="text-[11px] text-slate-400 font-medium">No reviews for this locality yet.</span>
                            </div>
                        )}

                        <button onClick={() => setShowReviewModal(true)} className="mt-4 w-full sm:w-auto sm:px-8 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-bold hover:bg-emerald-100 transition-colors">
                            Write a Review
                        </button>
                    </div>

                    {/* 11. RESIDENTIAL ZONES */}
                    {insight.residentialZones?.length > 0 && (
                        <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                            <h2 className="text-lg font-bold text-[#0B1A3A] mb-4">Explore Residential Zones</h2>
                            <div className="flex flex-wrap gap-2">
                                {insight.residentialZones.map((zone, i) => (
                                    <span key={i} className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-bold rounded-xl border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors">
                                        {zone}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 12. POPULAR TOOLS */}
                    <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                        <h2 className="text-lg font-bold text-[#0B1A3A] mb-5">Use Popular Tools</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <button onClick={() => setActiveTool('budget')} className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-purple-50 rounded-2xl border border-slate-100 hover:border-purple-200 transition-colors group text-center">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-purple-600 mb-3 group-hover:scale-110 transition-transform">
                                    <span className="font-bold text-lg">₹</span>
                                </div>
                                <span className="text-xs font-bold text-slate-700">Budget Calculator</span>
                            </button>
                            <button onClick={() => setActiveTool('emi')} className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-blue-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors group text-center">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 mb-3 group-hover:scale-110 transition-transform">
                                    <Home className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-bold text-slate-700">EMI Calculator</span>
                            </button>
                            <button onClick={() => setActiveTool('area')} className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-emerald-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-colors group text-center">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-bold text-slate-700">Area Convertor</span>
                            </button>
                            <button onClick={() => setActiveTool('loan')} className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-amber-50 rounded-2xl border border-slate-100 hover:border-amber-200 transition-colors group text-center">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-amber-600 mb-3 group-hover:scale-110 transition-transform">
                                    <Building className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-bold text-slate-700">Loan Eligibility</span>
                            </button>
                        </div>
                    </div>

                    {/* LIVE PROPERTIES FEED */}
                    <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                        <h2 className="text-xl font-bold text-[#0B1A3A] mb-4 border-b border-slate-100 pb-4">
                            All Properties in {locality}
                        </h2>
                        <div className="-mt-4">
                            <AdminPropertiesSection searchCity={locality} />
                        </div>
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
            
            {/* POPULAR TOOLS MODALS */}
            <PopularToolsModals activeTool={activeTool} onClose={() => setActiveTool(null)} />
        </div>
    );
};

export default LocalityDetail;
