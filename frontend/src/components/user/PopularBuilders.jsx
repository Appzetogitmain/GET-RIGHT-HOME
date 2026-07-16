import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Briefcase, Calendar, Star, Phone, Globe, MapPin } from 'lucide-react';
import api from '../../services/apiService';

const BUILDERS_DATA = [
    {
        id: 1,
        name: 'Prestige Group',
        logoText: 'Prestige',
        logoBg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        logoColor: '#d4af37',
        logoFont: 'serif font-bold italic',
        totalProjects: 181,
        cityProjects: 54,
        est: 1986,
        rating: 4.8,
        founder: 'Razack Sattar',
        headquarters: 'Bengaluru, Karnataka',
        description: 'Prestige Group is one of India\'s leading real estate developers with over three decades of experience in constructing premium residential estates, commercial offices, retail malls, and luxury hospitality projects.',
        notableProjects: ['Prestige Shantiniketan', 'Prestige Lakeside Habitat', 'Prestige Golfshire']
    },
    {
        id: 2,
        name: 'Sobha Limited',
        logoText: 'SOBHA',
        logoBg: '#ffffff',
        logoColor: '#000000',
        logoFont: 'font-serif tracking-widest font-black',
        totalProjects: 183,
        cityProjects: 42,
        est: 1995,
        rating: 4.7,
        founder: 'P.N.C. Menon',
        headquarters: 'Bengaluru, Karnataka',
        description: 'Sobha Limited is synonymous with quality construction and prompt delivery. As one of the only backward-integrated developers in India, Sobha manufactures its own concrete, glazing, and wooden fittings to maintain flawless quality standards.',
        notableProjects: ['Sobha Dream Acres', 'Sobha City', 'Sobha Indraprastha']
    },
    {
        id: 3,
        name: 'Godrej Properties',
        logoText: 'Godrej',
        logoBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        logoColor: '#ffffff',
        logoFont: 'font-sans italic font-bold tracking-wide',
        totalProjects: 197,
        cityProjects: 13,
        est: 1990,
        rating: 4.6,
        founder: 'Adi Godrej',
        headquarters: 'Mumbai, Maharashtra',
        description: 'Godrej Properties brings the Godrej Group philosophy of innovation, sustainability, and trust to the real estate sector. Every development combines a legacy of excellence with contemporary designs and eco-friendly features.',
        notableProjects: ['Godrej Eternity', 'Godrej Woods', 'Godrej Ananda']
    },
    {
        id: 4,
        name: 'Brigade Group',
        logoText: 'BRIGADE',
        logoBg: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
        logoColor: '#ffffff',
        logoFont: 'font-sans font-black tracking-widest',
        totalProjects: 154,
        cityProjects: 38,
        est: 1986,
        rating: 4.7,
        founder: 'M.R. Jaishankar',
        headquarters: 'Bengaluru, Karnataka',
        description: 'Brigade Group is a leading property developer in South India, having developed massive integrated townships, premium high-rises, commercial retail complexes, and state-of-the-art tech parks.',
        notableProjects: ['Brigade Gateway', 'Brigade Meadows', 'Brigade Golden Triangle']
    },
    {
        id: 5,
        name: 'Puravankara Limited',
        logoText: 'PURAVANKARA',
        logoBg: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)',
        logoColor: '#f1f5f9',
        logoFont: 'font-mono text-[10px] tracking-wider font-extrabold',
        totalProjects: 120,
        cityProjects: 29,
        est: 1975,
        rating: 4.5,
        founder: 'Ravi Puravankara',
        headquarters: 'Bengaluru, Karnataka',
        description: 'Puravankara is one of India\'s oldest and most trusted developers, offering high-quality homes across luxury and theme-based residential projects under the Puravankara and Provident housing brands.',
        notableProjects: ['Purva Palm Beach', 'Provident Welworth City', 'Purva Whitehall']
    },
    {
        id: 6,
        name: 'DLF Limited',
        logoText: 'DLF',
        logoBg: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        logoColor: '#ffffff',
        logoFont: 'font-sans font-black tracking-wider italic',
        totalProjects: 210,
        cityProjects: 8,
        est: 1946,
        rating: 4.6,
        founder: 'Chaudhary Raghvendra Singh',
        headquarters: 'New Delhi, Delhi',
        description: 'DLF is India\'s largest listed real estate company with a 75-year track record of building premium residential properties, world-class business centers, and luxury retail malls, most notably transforming the Gurugram skyline.',
        notableProjects: ['DLF The Aralias', 'DLF CyberCity', 'DLF Emporio Mall']
    },
    {
        id: 7,
        name: 'Salarpuria Sattva',
        logoText: 'SATTVA',
        logoBg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        logoColor: '#ffffff',
        logoFont: 'font-sans font-extrabold tracking-widest',
        totalProjects: 95,
        cityProjects: 31,
        est: 1993,
        rating: 4.5,
        founder: 'Bijay Agarwal',
        headquarters: 'Bengaluru, Karnataka',
        description: 'Salarpuria Sattva Group has grown into one of the country\'s most trusted developers. It has built futuristic corporate workspaces, high-end residential towers, and robust IT parks across major cities.',
        notableProjects: ['Sattva Magnificia', 'Sattva Greenage', 'Sattva Image']
    },
    {
        id: 8,
        name: 'Tata Housing',
        logoText: 'TATA',
        logoBg: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        logoColor: '#ffffff',
        logoFont: 'font-sans font-black tracking-wider',
        totalProjects: 84,
        cityProjects: 12,
        est: 1984,
        rating: 4.7,
        founder: 'J.R.D. Tata',
        headquarters: 'Mumbai, Maharashtra',
        description: 'Tata Housing Development Company is a subsidiary of Tata Sons. It focuses on residential property development across diverse segments, emphasizing eco-friendly building practices and trust.',
        notableProjects: ['Tata Promont', 'Tata Aquila Heights', 'Tata Sherwood']
    },
    {
        id: 9,
        name: 'L&T Realty',
        logoText: 'L&T',
        logoBg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        logoColor: '#1e293b',
        logoFont: 'font-sans font-black text-2xl tracking-tight',
        totalProjects: 62,
        cityProjects: 9,
        est: 2011,
        rating: 4.8,
        founder: 'Larsen & Toubro',
        headquarters: 'Mumbai, Maharashtra',
        description: 'L&T Realty leverages L&T\'s legendary engineering, construction, and planning capabilities to deliver futuristic residential, commercial, and retail developments defined by transparency.',
        notableProjects: ['L&T RainTree Boulevard', 'L&T Emerald Isle', 'L&T Seawoods Residences']
    },
    {
        id: 10,
        name: 'Mahindra Lifespaces',
        logoText: 'Mahindra',
        logoBg: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
        logoColor: '#ffffff',
        logoFont: 'font-sans font-bold tracking-tight',
        totalProjects: 78,
        cityProjects: 7,
        est: 1994,
        rating: 4.6,
        founder: 'Mahindra Group',
        headquarters: 'Mumbai, Maharashtra',
        description: 'Mahindra Lifespace Developers is the real estate arm of the Mahindra Group. The company is committed to sustainable urbanization through green homes and integrated industrial cities.',
        notableProjects: ['Mahindra Windchimes', 'Mahindra Aura', 'Mahindra Bloomdale']
    }
];


const PopularBuilders = ({ locality }) => {
    const navigate = useNavigate();
    const scrollContainerRef = useRef(null);
    const autoScrollTimer = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const [builders, setBuilders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch popular builders dynamically from API
    useEffect(() => {
        const fetchBuilders = async () => {
            try {
                const queryParam = locality ? `?locality=${encodeURIComponent(locality)}` : '';
                const res = await api.get(`/public/builders${queryParam}`);
                if (res.data.success && res.data.builders && res.data.builders.length > 0) {
                    setBuilders(res.data.builders);
                } else {
                    setBuilders(BUILDERS_DATA);
                }
            } catch (err) {
                console.error("Error fetching popular builders:", err);
                setBuilders(BUILDERS_DATA);
            } finally {
                setLoading(false);
            }
        };
        fetchBuilders();
    }, []);

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

    return (
        <section 
            className="py-4 border-b border-gray-100 last:border-0 relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex flex-col mb-4 px-5 md:px-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                    <h2 className="text-xl md:text-2xl font-black text-gray-900">
                        Popular builders
                    </h2>
                </div>
                <p className="text-sm text-gray-500 mt-1 ml-3 normal-case tracking-normal font-normal">
                    {locality ? `In ${locality}` : 'In Bangalore East & major hubs'}
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
                                {builder.name}
                            </h3>
                            <p className="text-[11px] text-gray-400 font-bold leading-tight">
                                {builder.stats?.totalProjects !== undefined ? builder.stats.totalProjects : builder.totalProjects} Total Projects
                            </p>
                            <p className="text-[10px] text-indigo-500 font-black mt-0.5 uppercase tracking-wide">
                                {builder.stats?.cities !== undefined 
                                    ? `${builder.stats.cities} Cities` 
                                    : `${builder.cityProjects} in this city`
                                }
                            </p>
                        </div>
                    ))}
                </div>
        </section>
    );
};

export default PopularBuilders;
