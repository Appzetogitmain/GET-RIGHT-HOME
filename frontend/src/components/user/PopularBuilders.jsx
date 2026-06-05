import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Briefcase, Calendar, Star, Phone, Globe, MapPin } from 'lucide-react';

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

const PopularBuilders = () => {
    const [selectedBuilder, setSelectedBuilder] = useState(null);
    const scrollContainerRef = useRef(null);
    const autoScrollTimer = useRef(null);
    const [isHovered, setIsHovered] = useState(false);

    // Auto-scroll loop
    useEffect(() => {
        if (isHovered) {
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
    }, [isHovered]);

    return (
        <section 
            className="py-10 border-b border-gray-50 bg-white"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="max-w-7xl mx-auto px-4">
                
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                        <h2 className="text-xl md:text-2xl font-black text-gray-900">
                            Popular builders
                        </h2>
                    </div>
                    <p className="text-xs md:text-sm text-gray-400 font-bold uppercase tracking-wider ml-3">
                        In Bangalore East & major hubs
                    </p>
                </div>

                {/* Auto sliding Carousel */}
                <div 
                    ref={scrollContainerRef}
                    className="flex gap-6 overflow-x-auto scrollbar-hide py-2 px-1 scroll-smooth snap-x"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {BUILDERS_DATA.map((builder) => (
                        <div
                            key={builder.id}
                            onClick={() => setSelectedBuilder(builder)}
                            className="flex-shrink-0 w-[160px] flex flex-col items-center text-center cursor-pointer group snap-center"
                        >
                            {/* Circular Logo Card */}
                            <div className="relative w-28 h-28 rounded-full border border-gray-100 bg-white shadow-sm flex items-center justify-center p-3 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:border-indigo-100 mb-4 overflow-hidden">
                                <div 
                                    className={`w-full h-full rounded-full flex items-center justify-center text-[13px] text-center select-none shadow-inner border border-black/5 ${builder.logoFont}`}
                                    style={{ 
                                        background: builder.logoBg,
                                        color: builder.logoColor
                                    }}
                                >
                                    {builder.logoText}
                                </div>
                            </div>

                            {/* Details */}
                            <h3 className="font-extrabold text-[13px] text-gray-900 group-hover:text-indigo-600 transition-colors mb-1 truncate w-full">
                                {builder.name}
                            </h3>
                            <p className="text-[11px] text-gray-400 font-bold leading-tight">
                                {builder.totalProjects} Total Projects
                            </p>
                            <p className="text-[10px] text-indigo-500 font-black mt-0.5 uppercase tracking-wide">
                                {builder.cityProjects} in this city
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Popup Modal */}
            <AnimatePresence>
                {selectedBuilder && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        {/* Backdrop overlay clickable to close */}
                        <div className="absolute inset-0" onClick={() => setSelectedBuilder(null)} />
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col"
                        >
                            {/* Top Hero Banner */}
                            <div className="h-28 bg-gradient-to-r from-indigo-600 to-indigo-900 p-6 flex items-end relative shrink-0">
                                <button
                                    onClick={() => setSelectedBuilder(null)}
                                    className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                                
                                <div className="absolute -bottom-10 left-6">
                                    <div className="w-20 h-20 rounded-2xl border-4 border-white bg-white shadow-md flex items-center justify-center p-2 overflow-hidden">
                                        <div 
                                            className={`w-full h-full rounded-xl flex items-center justify-center text-[10px] text-center select-none ${selectedBuilder.logoFont}`}
                                            style={{ 
                                                background: selectedBuilder.logoBg,
                                                color: selectedBuilder.logoColor
                                            }}
                                        >
                                            {selectedBuilder.logoText}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="pt-14 p-6 overflow-y-auto max-h-[70vh] space-y-5">
                                {/* Title and Stats */}
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                        {selectedBuilder.name}
                                        <span className="flex items-center gap-0.5 px-2 py-0.5 bg-amber-50 border border-amber-100 rounded-full text-[10px] font-black text-amber-700">
                                            <Star size={10} className="fill-amber-400 text-amber-400" />
                                            {selectedBuilder.rating}
                                        </span>
                                    </h3>
                                    <div className="flex items-center gap-1 text-[11px] text-gray-400 font-bold mt-1">
                                        <MapPin size={11} className="text-indigo-500" />
                                        <span>HQ: {selectedBuilder.headquarters}</span>
                                    </div>
                                </div>

                                {/* Main Description */}
                                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                                    {selectedBuilder.description}
                                </p>

                                {/* Key Metrics Grid */}
                                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="text-center">
                                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-1.5">
                                            <Briefcase size={14} />
                                        </div>
                                        <p className="text-[16px] font-black text-indigo-950 leading-tight">
                                            {selectedBuilder.totalProjects}
                                        </p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                            Total Projects
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-1.5">
                                            <Award size={14} />
                                        </div>
                                        <p className="text-[16px] font-black text-emerald-950 leading-tight">
                                            {selectedBuilder.cityProjects}
                                        </p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                            Active here
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-1.5">
                                            <Calendar size={14} />
                                        </div>
                                        <p className="text-[16px] font-black text-amber-950 leading-tight">
                                            {selectedBuilder.est}
                                        </p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                            Established
                                        </p>
                                    </div>
                                </div>

                                {/* Notable Projects */}
                                <div>
                                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
                                        Notable Projects
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedBuilder.notableProjects.map((proj, idx) => (
                                            <span 
                                                key={idx}
                                                className="px-3 py-1.5 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-700 shadow-sm"
                                            >
                                                {proj}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Quick Details Info list */}
                                <div className="space-y-2.5 pt-2 border-t border-gray-100 text-xs">
                                    <div className="flex justify-between font-medium">
                                        <span className="text-gray-400">Founder / Promoter:</span>
                                        <span className="text-gray-900 font-bold">{selectedBuilder.founder}</span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                        <span className="text-gray-400">Builder Website:</span>
                                        <span className="text-indigo-600 font-black cursor-pointer flex items-center gap-1 hover:underline">
                                            <Globe size={11} /> Visit Website
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default PopularBuilders;
