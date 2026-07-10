import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    MapPin, ThumbsUp, ThumbsDown, Check, Minus, 
    ChevronRight, ArrowRight, Building, Hammer, Home, Activity, Info
} from 'lucide-react';
import AdminPropertiesSection from '../../components/user/AdminPropertiesSection';
import PopularBuilders from '../../components/user/PopularBuilders';
import PopularToolsModals from '../../components/user/PopularToolsModals';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LocalityDetail = () => {
    const { city: routeCity, locality } = useParams();
    const navigate = useNavigate();
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reviewData, setReviewData] = useState({ rating: 5, comment: '', userType: 'Resident' });

    // Disclaimer Modal State
    const [showDisclaimer, setShowDisclaimer] = useState({ visible: false, type: '' });

    // Toggles State
    const [propTypeTab, setPropTypeTab] = useState('Buy');
    const [projectTab, setProjectTab] = useState('Buy');

    // Tools Modal State
    const [activeTool, setActiveTool] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchData();
    }, [locality]);

    // Bullet-proof background scrolling disable for mobile (iOS/Android)
    useEffect(() => {
        if (showDisclaimer.visible || showReviewModal || activeTool) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflowY = 'scroll'; // Prevents horizontal jump on desktop
        } else {
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflowY = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflowY = '';
        };
    }, [showDisclaimer.visible, showReviewModal, activeTool]);

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
    const city = routeCity || insight.city || "Explore";
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

                    {/* 6. SCAN POPULAR PROJECTS */}
                    {(automated.popularProjects?.Buy?.length > 0 || automated.popularProjects?.Rent?.length > 0) && (
                        <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-lg font-bold text-[#0B1A3A]">Scan popular projects</h2>
                                    <p className="text-[12px] text-slate-500 mt-0.5">in {locality}</p>
                                </div>
                                <div className="flex border border-slate-200 p-0.5 rounded-full bg-slate-50">
                                    <button onClick={() => setProjectTab('Buy')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${projectTab === 'Buy' ? 'bg-white shadow border border-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>Buy</button>
                                    <button onClick={() => setProjectTab('Rent')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${projectTab === 'Rent' ? 'bg-white shadow border border-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>Rent</button>
                                </div>
                            </div>
                            
                            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 snap-x snap-mandatory">
                                {(automated.popularProjects[projectTab] || []).map((proj, i) => (
                                    <div key={i} onClick={() => navigate(`/handpicked/${proj._id}`)} className="min-w-[260px] sm:min-w-[280px] snap-center shrink-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-lg hover:-translate-y-1 hover:border-blue-200 cursor-pointer transition-all group overflow-hidden">
                                        <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                                            <img src={proj.coverImage || coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={proj.propertyName} />
                                            {/* Top badges */}
                                            <div className="absolute top-3 left-3 flex gap-1">
                                                {proj.rera && (
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold rounded-lg border border-white/20">
                                                        <div className="w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-black" /></div> RERA
                                                    </span>
                                                )}
                                            </div>
                                            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-black/70 transition-colors">
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                            </div>
                                            {/* Bottom completion text */}
                                            <div className="absolute bottom-3 left-3 text-white text-[12px] font-bold drop-shadow-md">
                                                {proj.possessionStatus === 'Under Construction' ? 'Completion in ' + (proj.possessionDate || 'N/A') : 'Ready to Move'}
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h4 className="text-[16px] font-bold text-[#0B1A3A] truncate group-hover:text-blue-600 transition-colors">{proj.propertyName}</h4>
                                            <p className="text-[13px] text-[#7A869A] truncate mt-0.5">{proj.propertyType || 'Apartment'} in {proj.address?.area || locality}, {proj.address?.city || city}</p>
                                            <p className="text-[15px] font-black text-[#0B1A3A] mt-3">₹{(proj.price || proj.dynamicData?.expectedPrice || proj.dynamicData?.monthlyRent || 0).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!automated.popularProjects[projectTab] || automated.popularProjects[projectTab].length === 0) && (
                                    <div className="w-full text-center py-6 text-sm text-slate-500 font-medium">No projects found for {projectTab}.</div>
                                )}
                            </div>
                            <div onClick={() => setShowDisclaimer({ visible: true, type: 'project' })} className="mt-2 flex items-center gap-1.5 text-[12px] text-slate-500 font-medium cursor-pointer hover:text-slate-800 transition-colors w-fit">
                                <Info className="w-4 h-4" /> Disclaimer
                            </div>
                        </div>
                    )}

                    {/* 7. TOP BUILDERS */}
                    <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200 overflow-hidden">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-[#0B1A3A]">Know the top builders</h2>
                                <p className="text-[12px] text-[#7A869A] mt-0.5">in {locality}</p>
                            </div>
                            <button onClick={() => setShowDisclaimer({ visible: true, type: 'builder' })} className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                                <Info className="w-4 h-4" />
                            </button>
                        </div>

                        {automated.topBuilders?.length > 0 ? (
                            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 snap-x snap-mandatory">
                                {automated.topBuilders.map((builder, i) => (
                                    <div key={i} className="min-w-[280px] sm:min-w-[320px] snap-center shrink-0 bg-white rounded-2xl border border-slate-200 shadow-[0_2px_10px_rgb(0,0,0,0.01)] hover:shadow-md hover:border-blue-200 transition-all flex flex-col">
                                        <div className="p-4 flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                                                <span className="text-lg font-black text-slate-400">{builder.name ? builder.name.charAt(0) : 'B'}</span>
                                            </div>
                                            <div>
                                                <h4 className="text-[15px] font-bold text-slate-900 leading-tight">{builder.name || 'Unknown Builder'}</h4>
                                                <p className="text-[13px] text-slate-500 mt-1">{builder.years} years • {builder.propertyCount} projects • {builder.cityCount} cities</p>
                                            </div>
                                        </div>
                                        <div className="border-t border-slate-100 p-3 flex justify-center">
                                            <button onClick={() => navigate(`/search?builderName=${encodeURIComponent(builder.name || 'Unknown Builder')}&areas=${locality}`)} className="text-[14px] font-bold text-[#0052CC] flex items-center gap-1 hover:underline">
                                                View properties <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full text-center py-6 text-sm text-slate-500 font-medium">No top builders identified yet for {locality}.</div>
                        )}
                    </div>

                    {/* 8. SCAN ALL PROPERTY TYPES */}
                    {automated.propertyTypes && (
                        <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200 overflow-hidden relative">
                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <div>
                                    <h2 className="text-lg font-bold text-[#0B1A3A]">Scan all property types</h2>
                                    <p className="text-[12px] text-slate-500 mt-0.5">in {locality}</p>
                                </div>
                                <div className="flex border border-slate-200 p-0.5 rounded-full bg-slate-50">
                                    <button onClick={() => setPropTypeTab('Buy')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${propTypeTab === 'Buy' ? 'bg-white shadow border border-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>Buy</button>
                                    <button onClick={() => setPropTypeTab('Rent')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${propTypeTab === 'Rent' ? 'bg-white shadow border border-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>Rent</button>
                                </div>
                            </div>
                            
                            <div className="flex gap-6 overflow-x-auto pb-4 pt-2 no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 snap-x snap-mandatory">
                                {(automated.propertyTypes[propTypeTab] || []).map((pt, i) => {
                                    // Total for percentage calculation
                                    const total = automated.propertyTypes[propTypeTab]?.reduce((sum, item) => sum + item.count, 0) || 1;
                                    const percentage = total > 0 ? Math.round((pt.count / total) * 100) : 0;
                                    
                                    return (
                                        <div key={i} className="relative min-w-[240px] h-[300px] snap-center shrink-0 overflow-visible group">
                                            {/* Giant Background Number */}
                                            <div 
                                                className="absolute -left-3 top-[50%] -translate-y-[40%] text-[180px] font-black z-0 pointer-events-none select-none transition-transform group-hover:-translate-y-[45%] duration-700"
                                                style={{ 
                                                    WebkitTextStroke: '3px #E2E8F0',
                                                    color: 'transparent',
                                                    lineHeight: '1',
                                                    letterSpacing: '-10px'
                                                }}
                                            >
                                                {i + 1}
                                            </div>
                                            
                                            {/* The Card */}
                                            <div className="absolute inset-0 ml-12 rounded-[32px] overflow-hidden bg-[#0B1A3A] cursor-pointer shadow-xl border border-slate-100/20">
                                                <img src={coverImage} className="w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-80 transition-all duration-700" alt={pt.type} />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#010817] via-[#010817]/60 to-transparent"></div>
                                                
                                                <div className="absolute bottom-0 left-0 w-full p-5 text-white">
                                                    <h3 className="text-[22px] font-extrabold tracking-tight">{pt.type}s</h3>
                                                    <p className="text-[12px] font-medium text-slate-300">in {locality}</p>
                                                    <p className="text-[14px] font-bold text-white mt-1.5 mb-5">{percentage}% Searches</p>
                                                    
                                                    <button onClick={() => navigate(`/search?subType=${encodeURIComponent(pt.type)}&areas=${locality}`)} className="w-fit py-2.5 bg-white/10 hover:bg-white/25 border border-white/20 backdrop-blur-lg rounded-xl text-xs font-bold text-white flex items-center justify-between px-5 transition-all gap-2 group-hover:pr-4">
                                                        {pt.count}+ Properties <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!automated.propertyTypes[propTypeTab] || automated.propertyTypes[propTypeTab].length === 0) && (
                                    <div className="w-full text-center py-6 text-sm text-slate-500 font-medium">No property types found for {propTypeTab}.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 9. TOP SELLERS */}
                    <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                        <h2 className="text-lg font-bold text-[#0B1A3A] mb-1">View properties by top sellers</h2>
                        <p className="text-[12px] text-[#7A869A] mb-6">in {locality}</p>
                        
                        {automated.topSellers?.length > 0 ? (
                            <div className="space-y-6">
                                {automated.topSellers.map((seller, i) => (
                                    <div key={i} className="flex gap-4 items-start group">
                                        <div className="w-[54px] h-[54px] rounded-2xl border border-slate-200 p-0.5 shrink-0 overflow-hidden bg-white shadow-sm group-hover:border-blue-300 transition-colors">
                                            <img src={seller.profilePicture || "https://ui-avatars.com/api/?name=" + seller.name + "&background=random&color=0B1A3A&bold=true"} className="w-full h-full rounded-[14px] object-cover" alt="" />
                                        </div>
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <h4 className="text-[15px] font-black text-[#0B1A3A] leading-tight uppercase truncate">{seller.name}</h4>
                                            <p className="text-[13px] text-[#7A869A] mt-1">{seller.propertyCount} Properties • Member Since {seller.createdAt ? new Date(seller.createdAt).getFullYear() : '2024'}</p>
                                            <button onClick={() => navigate(`/search?builder=${seller._id}&areas=${locality}`)} className="text-[14px] font-bold text-[#0052CC] hover:underline mt-2 flex items-center gap-0.5">
                                                View Properties <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                
                                <div className="pt-2">
                                    <button onClick={() => navigate(`/search?areas=${locality}`)} className="w-full py-3 rounded-full border border-slate-200 text-sm font-bold text-[#0052CC] hover:bg-blue-50 hover:border-blue-100 transition-colors flex items-center justify-center gap-1">
                                        View all <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500 font-medium pb-4">No top sellers identified yet.</div>
                        )}
                    </div>

                    {/* 10. RESIDENT REVIEWS & RATINGS */}
                    <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h2 className="text-xl font-black text-[#0B1A3A] mb-1">Locality Reviews</h2>
                                <p className="text-sm text-slate-500">For {locality}</p>
                            </div>
                            {automated.reviews?.length > 0 && (
                                <button onClick={() => navigate(`/insights/${locality}/reviews`)} className="text-sm font-bold text-[#0d6efd] hover:text-blue-800 transition-colors flex items-center gap-1">
                                    View all
                                </button>
                            )}
                        </div>
                        
                        {/* Summary Block */}
                        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5 mb-6 flex flex-col md:flex-row items-center gap-6">
                            <div className="text-center shrink-0">
                                <div className="flex items-baseline justify-center mb-1">
                                    <span className="text-4xl font-black text-slate-900">{automated.averageRating || '4.3'}</span>
                                    <span className="text-xl font-bold text-slate-400">/5</span>
                                </div>
                                <div className="flex justify-center gap-0.5 text-amber-400 mb-2">
                                    {[...Array(5)].map((_, i) => (
                                        <span key={i} className={i < Math.round(Number(automated.averageRating || 4.3)) ? "" : "text-slate-300"}>★</span>
                                    ))}
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Average Rating</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">({automated.ratingBreakdown?.total || automated.reviews?.length || 0} Total Reviews)</p>
                            </div>
                            
                            <div className="flex-1 w-full space-y-2.5">
                                {[5, 4, 3, 2, 1].map(s => {
                                    const count = automated.ratingBreakdown?.[s] || 0;
                                    const total = automated.ratingBreakdown?.total || 1;
                                    const percentage = total > 0 ? (count / total) * 100 : (s >= 4 ? 40 : 5); // Fallback visuals
                                    
                                    return (
                                        <div key={s} className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 w-6">
                                                {s} ★
                                            </div>
                                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-[#0d6efd] rounded-full" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 w-6 justify-end">
                                                {s}★
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <button className="text-sm font-bold text-[#0d6efd] hover:underline mb-8">
                            See how ratings are calculated
                        </button>

                        {/* Ratings by features */}
                        <div className="mb-8">
                            <h3 className="font-bold text-slate-900 mb-6 text-[15px]">Ratings by features</h3>
                            <div className="flex justify-between md:justify-start md:gap-12 px-2 md:px-0">
                                {[
                                    { label: 'Connectivity', val: automated.featureRatings?.connectivity || '4.3' },
                                    { label: 'Lifestyle', val: automated.featureRatings?.lifestyle || '4.3' },
                                    { label: 'Safety', val: automated.featureRatings?.safety || '4.2' },
                                    { label: 'Green Area', val: automated.featureRatings?.greenArea || '4.2' }
                                ].map(f => (
                                    <div key={f.label} className="flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-full border-[3px] border-[#0d6efd] flex items-center justify-center mb-2 relative overflow-hidden">
                                            <span className="text-xs font-black text-slate-900 z-10">{f.val}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 text-center leading-tight max-w-[60px]">{f.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Positives & Negatives */}
                        <div className="mb-8 space-y-5">
                            <div>
                                <h3 className="font-bold text-slate-900 mb-3 text-[15px]">What are the positives</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(automated.allPositives || ["Good Public Transport", "Easy Cab Availability", "Safe at Night"]).map((pos, idx) => (
                                        <span key={idx} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded border border-emerald-100">{pos}</span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 mb-3 text-[15px]">What are the negatives</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(automated.allNegatives || ["Frequent Traffic Jams"]).map((neg, idx) => (
                                        <span key={idx} className="px-3 py-1.5 bg-red-50 text-red-700 font-semibold text-xs rounded border border-red-100">{neg}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Resident Reviews List */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-900 text-[15px]">Reviews by Residents</h3>
                                {automated.reviews?.length > 0 && (
                                    <button onClick={() => navigate(`/insights/${locality}/reviews`)} className="text-xs font-bold text-[#0d6efd] hover:underline">
                                        View all
                                    </button>
                                )}
                            </div>
                            
                            {automated.reviews?.length > 0 ? (
                                <div className="space-y-4 mb-6">
                                    {automated.reviews.slice(0, 2).map((review, i) => (
                                        <div key={i} className="p-4 rounded-xl border border-slate-100 bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                                            <div className="flex items-center gap-1 mb-2">
                                                {[...Array(5)].map((_, idx) => (
                                                    <span key={idx} className={`text-sm ${idx < (review.rating || 5) ? 'text-[#0d6efd]' : 'text-slate-200'}`}>★</span>
                                                ))}
                                            </div>
                                            <p className="text-sm text-slate-700 mb-3">"{review.reviewText || review.comment}"</p>
                                            <div className="flex items-center gap-2">
                                                <img src={review.userId?.profilePicture || "https://ui-avatars.com/api/?name=" + (review.userId?.name || 'U') + "&background=random"} className="w-6 h-6 rounded-full object-cover" alt="" />
                                                <span className="text-xs font-bold text-slate-800">{review.userId?.name || "Resident"}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center mb-6">
                                    <p className="text-sm font-bold text-slate-400">No reviews yet for this locality. Be the first to share your experience!</p>
                                </div>
                            )}

                            <button onClick={() => setShowReviewModal(true)} className="w-full py-3.5 bg-[#0d6efd] hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-sm">
                                Review your Society / Locality
                            </button>
                        </div>
                    </div>

                    {/* EXPLORE SIMILAR LOCALITIES */}
                    {automated.similarLocalities?.length > 0 && (
                        <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                            <h2 className="text-lg font-bold text-[#0B1A3A] mb-4">Explore Similar Localities</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {automated.similarLocalities.map((sim, i) => (
                                    <div key={i} onClick={() => navigate(`/locality-insights/${encodeURIComponent(city.toLowerCase())}/${encodeURIComponent(sim.locality)}`)} className="flex flex-col justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-lg hover:-translate-y-1 hover:border-blue-200 cursor-pointer transition-all group">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">{sim.locality}</h4>
                                            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1"><Home className="w-3 h-3" /> {sim.propertyCount} properties</p>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-slate-200/60">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Avg Price</p>
                                            <p className="text-sm font-black text-slate-900 mt-0.5">₹{(sim.averagePropertyRate).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 11. RESIDENTIAL ZONES */}
                    {insight.residentialZones?.length > 0 && (
                        <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                            <h2 className="text-lg font-bold text-[#0B1A3A] mb-4">Explore Residential Zones</h2>
                            <div className="flex flex-wrap gap-2">
                                {insight.residentialZones.map((zone, i) => (
                                    <span 
                                        key={i} 
                                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(zone + ', ' + locality + ', Bengaluru')}`, '_blank')}
                                        className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-bold rounded-xl border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                                    >
                                        <MapPin className="w-3 h-3" />
                                        {zone}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* FAQS */}
                    {insight.faqs?.length > 0 && (
                        <div className="bg-white sm:rounded-2xl p-5 sm:shadow-sm sm:border sm:border-slate-200">
                            <h2 className="text-lg font-bold text-[#0B1A3A] mb-5">Frequently Asked Questions</h2>
                            <div className="space-y-4">
                                {insight.faqs.map((faq, i) => (
                                    <div key={i} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                                        <h4 className="text-sm font-bold text-slate-800 mb-2 flex gap-2">
                                            <span className="text-blue-600">Q.</span>
                                            <span className="group-hover:text-blue-700 transition-colors">{faq.question}</span>
                                        </h4>
                                        <p className="text-sm text-slate-600 pl-6 border-l-2 border-slate-200 ml-1 leading-relaxed">
                                            {faq.answer}
                                        </p>
                                    </div>
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
                    <div>
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
            
            {/* POPULAR TOOLS MODALS */}
            <PopularToolsModals activeTool={activeTool} onClose={() => setActiveTool(null)} />

            {/* DISCLAIMER MODAL */}
            {showDisclaimer.visible && (
                <div 
                    className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 transition-opacity duration-300"
                    style={{ touchAction: 'none' }}
                >
                    <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transform transition-transform duration-300 translate-y-0 sm:scale-100">
                        <div className="p-6 relative">
                            <button onClick={() => setShowDisclaimer({ visible: false, type: '' })} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
                                <span className="text-slate-500 text-sm font-black">✕</span>
                            </button>
                            <h3 className="text-xl font-bold text-[#0B1A3A] mb-4 pr-6">How is popularity calculated?</h3>
                            <p className="text-[15px] text-slate-700 leading-relaxed mb-6">
                                {showDisclaimer.type === 'project' 
                                    ? "Search Popularity of a project is calculated based on aggregate searches & views of a project on GET RIGHT HOME during the last 6 months."
                                    : "Search Popularity of a Builder is calculated based on aggregate searches & views of a Builder Projects on GET RIGHT HOME during the last 6 months."}
                            </p>
                            <button onClick={() => setShowDisclaimer({ visible: false, type: '' })} className="w-full py-3.5 bg-[#0052CC] hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                                Okay, understood
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocalityDetail;
