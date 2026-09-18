import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Briefcase, Calendar, Star, Phone, Globe, MapPin } from 'lucide-react';
import api from '../../services/apiService';

const PopularBuilders = ({ locality, themeColor = 'emerald' }) => {
    const navigate = useNavigate();
    const scrollContainerRef = useRef(null);
    const autoScrollTimer = useRef(null);

    const themeMap = {
        emerald: { bg: 'bg-emerald-500' },
        violet: { bg: 'bg-violet-500' },
        blue: { bg: 'bg-blue-500' },
        amber: { bg: 'bg-amber-500' },
    };
    const t = themeMap[themeColor] || themeMap.emerald;
    const [isHovered, setIsHovered] = useState(false);
    const [builders, setBuilders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch popular builders dynamically from API with real data
    useEffect(() => {
        let isMounted = true;
        const fetchBuilders = async () => {
            try {
                setLoading(true);
                const queryParam = (locality && locality !== 'All') ? `?locality=${encodeURIComponent(locality)}` : '';
                const res = await api.get(`/public/builders${queryParam}`);
                if (isMounted) {
                    if (res.data.success && res.data.builders) {
                        setBuilders(res.data.builders);
                    } else {
                        setBuilders([]);
                    }
                }
            } catch (err) {
                console.error("Error fetching popular builders:", err);
                if (isMounted) setBuilders([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchBuilders();
        return () => { isMounted = false; };
    }, [locality]);

    // Auto-scroll loop
    useEffect(() => {
        if (isHovered || loading || builders.length === 0) {
            if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
            return;
        }

        autoScrollTimer.current = setInterval(() => {
            if (scrollContainerRef.current) {
                const container = scrollContainerRef.current;
                const cardWidth = 190; // Average card width + gap
                const maxScrollLeft = container.scrollWidth - container.clientWidth;
                
                if (container.scrollLeft >= maxScrollLeft - 5) {
                    container.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    container.scrollBy({ left: cardWidth, behavior: 'smooth' });
                }
            }
        }, 3000);

        return () => {
            if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
        };
    }, [isHovered, loading, builders]);

    // Restore Horizontal Scroll
    React.useLayoutEffect(() => {
        if (!loading && builders.length > 0 && scrollContainerRef.current) {
            const savedScroll = sessionStorage.getItem(`scroll-left-builders-${locality || 'default'}`);
            if (savedScroll) {
                scrollContainerRef.current.scrollLeft = parseInt(savedScroll, 10);
            }
        }
    }, [loading, builders, locality]);

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            sessionStorage.setItem(`scroll-left-builders-${locality || 'default'}`, scrollContainerRef.current.scrollLeft.toString());
        }
    };

    if (loading) {
        return (
            <div className="py-10 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="animate-pulse space-y-4">
                        <div className="h-6 w-48 bg-gray-200 rounded"></div>
                        <div className="flex gap-6 overflow-x-auto py-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex-shrink-0 w-[160px] flex flex-col items-center">
                                    <div className="w-28 h-28 rounded-full bg-gray-200 mb-4"></div>
                                    <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                                    <div className="h-3 w-16 bg-gray-200 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!loading && builders.length === 0) {
        return null;
    }

    return (
        <section 
            id="home-popular-builders-section"
            className="py-4 border-b border-gray-100 last:border-0 relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex flex-col mb-4 px-5 md:px-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <div className={`w-1 h-5 ${t.bg} rounded-full`} />
                    <h2 className="text-xl md:text-2xl font-black text-gray-900">
                        Popular builders
                    </h2>
                </div>
                <p className="text-sm text-gray-500 mt-1 ml-3 normal-case tracking-normal font-normal">
                    {locality && locality !== 'All' ? `In ${locality} & major hubs` : 'In major hubs'}
                </p>
            </div>

                {/* Auto sliding Carousel */}
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex gap-6 overflow-x-auto scrollbar-hide py-2 px-5 md:px-0 scroll-smooth snap-x"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {builders.map((builder) => (
                        <div
                            key={builder._id || builder.id}
                            id={`builder-${builder._id || builder.id}`}
                            onClick={() => navigate(`/builder/${builder._id || builder.id}`)}
                            className="flex-shrink-0 w-[160px] flex flex-col items-center text-center cursor-pointer group snap-center"
                        >
                            {/* Circular Logo Card */}
                            <div className="relative w-28 h-28 rounded-full border border-gray-100 bg-white shadow-sm flex items-center justify-center p-3 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:border-indigo-100 mb-4 overflow-hidden">
                                {builder.profile?.brandLogo ? (
                                    <img 
                                        src={builder.profile.brandLogo} 
                                        alt={builder.name} 
                                        className="w-full h-full rounded-full object-cover" 
                                    />
                                ) : builder.brandLogo ? (
                                    <img 
                                        src={builder.brandLogo} 
                                        alt={builder.name} 
                                        className="w-full h-full rounded-full object-cover" 
                                    />
                                ) : (
                                    <div 
                                        className={`w-full h-full rounded-full flex items-center justify-center text-[13px] text-center select-none shadow-inner border border-black/5 ${builder.logoFont || 'font-sans font-black uppercase tracking-wider'}`}
                                        style={{ 
                                            background: builder.logoBg || 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                            color: builder.logoColor || '#ffffff'
                                        }}
                                    >
                                        {builder.logoText || builder.name?.slice(0, 2)}
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <h3 className="font-extrabold text-[13px] text-gray-900 group-hover:text-indigo-600 transition-colors mb-1 truncate w-full">
                                {builder.companyName || builder.name}
                            </h3>
                            <p className="text-[11px] text-gray-400 font-bold leading-tight">
                                {builder.stats?.totalProjects ?? builder.totalProjects ?? 0} {(builder.stats?.totalProjects ?? builder.totalProjects) === 1 ? 'Total Project' : 'Total Projects'}
                            </p>
                            <p className="text-[10px] text-indigo-500 font-black mt-0.5 uppercase tracking-wide">
                                {builder.stats?.cities !== undefined 
                                    ? `${builder.stats.cities} ${builder.stats.cities === 1 ? 'City' : 'Cities'}` 
                                    : `${builder.cityProjects || 0} in this city`
                                }
                            </p>
                        </div>
                    ))}
                </div>
        </section>
    );
};

export default PopularBuilders;
