import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { propertyService } from '../../services/propertyService';

const PostedByChoice = ({ transactionType = 'buy' }) => {
    const navigate = useNavigate();
    const scrollContainerRef = useRef(null);
    const [titleOpacity, setTitleOpacity] = useState(1);
    const [postedByCounts, setPostedByCounts] = useState({
        'builder': 0,
        'owner': 0,
        'broker': 0
    });

    // Handle scroll to fade out the title when sliding left
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const scrollLeft = scrollContainerRef.current.scrollLeft;
        // Fade out completely when scrolled 100px
        const newOpacity = Math.max(0, 1 - (scrollLeft / 80));
        setTitleOpacity(newOpacity);
    };

    // Fetch dynamic counts
    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const res = await propertyService.getPublicProperties({ limit: 1000 });
                if (res?.success && res?.properties) {
                    const properties = res.properties;
                    
                    const counts = { 'builder': 0, 'owner': 0, 'broker': 0 };
                    
                    properties.forEach(p => {
                        // Filter to transaction type if required
                        if (transactionType && (p.transactionType || '').toLowerCase() !== transactionType.toLowerCase() && !p.dynamicCategory?.name?.toLowerCase().includes(transactionType.toLowerCase())) {
                            return;
                        }

                        // Determine posted by
                        let role = (p.postedBy?.role || p.postedBy?.userType || p.postedByRole || '').toLowerCase();
                        if (!role) {
                            role = (p.dynamicData?.postedBy || p.postedBy || '').toString().toLowerCase();
                        }
                        
                        if (role.includes('builder') || role.includes('developer')) {
                            counts['builder']++;
                        } else if (role.includes('owner')) {
                            counts['owner']++;
                        } else if (role.includes('broker') || role.includes('agent') || role.includes('dealer')) {
                            counts['broker']++;
                        }
                    });

                    setPostedByCounts(counts);
                }
            } catch (err) {
                console.error("Failed to fetch properties for Posted By counts", err);
            }
        };
        fetchCounts();
    }, [transactionType]);



    const options = [
        { label: 'Builder', countKey: 'builder', filters: ['Builder'], image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500&q=80' },
        { label: 'Owner', countKey: 'owner', filters: ['Owner'], image: 'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=500&q=80' },
        { label: 'Broker', countKey: 'broker', filters: ['Broker', 'Agent', 'Dealer'], image: 'https://images.unsplash.com/photo-1560520031-3a4dc4e9de0c?w=500&q=80' },
    ];

    // Always show all options regardless of count
    const visibleOptions = options;

    const handleSelect = (filters) => {
        const params = new URLSearchParams();
        if (transactionType) {
            params.set('transactionType', transactionType.toLowerCase());
        }
        params.set('postedBy', filters.join(','));
        navigate(`/search?${params.toString()}`);
        window.scrollTo(0, 0);
    };

    return (
        <section className="mb-6 w-full md:px-0">
            {/* Edge-to-edge on mobile, identical background to BHKChoice */}
            <div className="relative bg-[#FFF7EB] md:rounded-3xl overflow-hidden h-[240px] md:h-[260px] flex items-center w-full">
                
                {/* 1. Static Title on the Left */}
                <div 
                    className="absolute left-4 top-0 bottom-0 flex flex-col justify-center w-[120px] md:w-[150px] z-10 pointer-events-none"
                    style={{ opacity: titleOpacity, transition: 'opacity 0.1s ease-out' }}
                >
                    <div className="relative w-16 h-14 mb-3">
                        {/* Custom SVG for "Properties posted by" matching the screenshot */}
                        <svg viewBox="0 0 64 64" width="60" height="60" xmlns="http://www.w3.org/2000/svg">
                            {/* Yellow block/house on left */}
                            <path d="M10 36h12v16H10z" fill="#FDE68A" />
                            <path d="M10 36l6-8 6 8z" fill="#F59E0B" />
                            <path d="M14 42h4v4h-4z" fill="#FCD34D" />
                            {/* Blue building on right */}
                            <path d="M22 28h28v24H22z" fill="#3B82F6" />
                            <path d="M22 28l14-10 14 10z" fill="#1D4ED8" />
                            {/* Windows */}
                            <rect x="28" y="34" width="4" height="4" fill="#BFDBFE" />
                            <rect x="36" y="34" width="4" height="4" fill="#BFDBFE" />
                            <rect x="44" y="34" width="4" height="4" fill="#BFDBFE" />
                            <rect x="28" y="42" width="4" height="4" fill="#BFDBFE" />
                            <rect x="36" y="42" width="4" height="4" fill="#BFDBFE" />
                            <rect x="44" y="42" width="4" height="4" fill="#BFDBFE" />
                        </svg>
                    </div>
                    <h2 className="text-[16px] md:text-[18px] font-extrabold text-slate-800 leading-tight tracking-tight">
                        Properties<br/>posted by
                    </h2>
                </div>

                {/* 2. Scrolling Container */}
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="absolute inset-0 z-20 flex overflow-x-auto scrollbar-hide snap-x snap-mandatory items-center h-full"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {/* The Transparent Spacer */}
                    <div className="w-[140px] md:w-[180px] shrink-0 snap-start h-full"></div>

                    {/* Sliding Cards */}
                    <div className="flex gap-4 pr-6 items-center h-full">
                        {visibleOptions.map((opt, idx) => (
                            <motion.div
                                key={idx}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSelect(opt.filters)}
                                className="shrink-0 snap-center w-[160px] md:w-[180px] h-[190px] md:h-[210px] bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                            >
                                <div className="w-full h-[120px] md:h-[135px] bg-gray-100 overflow-hidden relative">
                                    <img 
                                        src={opt.image} 
                                        alt={opt.label} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                    />
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                                </div>
                                <div className="p-3 flex-1 flex flex-col justify-center">
                                    <h3 className="font-bold text-slate-800 text-[14px] md:text-[15px] mb-0.5">
                                        {opt.label}
                                    </h3>
                                    <p className="text-[11px] md:text-[12px] text-gray-500 font-medium truncate">
                                        {postedByCounts[opt.countKey] > 0 ? `${postedByCounts[opt.countKey]} Properties` : 'Explore Options'}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
};

export default PostedByChoice;
