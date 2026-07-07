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

    const getCardIcon = (iconType) => {
        return (
            <div className="mb-auto mt-1 relative w-[32px] h-[32px]">
                {/* Base Icon */}
                {iconType === 'builder' && (
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="#3B82F6" opacity="0.9" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 10h14v12H4z" />
                        <path d="M4 10l7-6 7 6z" />
                        <rect x="8" y="13" width="2" height="2" fill="#BFDBFE" />
                        <rect x="12" y="13" width="2" height="2" fill="#BFDBFE" />
                        <rect x="8" y="17" width="2" height="2" fill="#BFDBFE" />
                        <rect x="12" y="17" width="2" height="2" fill="#BFDBFE" />
                    </svg>
                )}
                {iconType === 'owner' && (
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="#3B82F6" opacity="0.9" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                )}
                {iconType === 'dealer' && (
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="#3B82F6" opacity="0.9" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        {/* White collar and blue tie */}
                        <path d="M12 15l-3 4h6l-3-4z" fill="#BFDBFE" />
                        <path d="M12 17l-1 5h2l-1-5z" fill="#1D4ED8" />
                    </svg>
                )}
                
                {/* Small Yellow/Orange Badge with House Outline */}
                <div className="absolute -bottom-1 -right-1 w-[14px] h-[14px] bg-[#FDE68A] rounded-full flex items-center justify-center border-[1.5px] border-white">
                    <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="#D97706" strokeWidth="3" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 3l10 9h-3v9H5v-9H2z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>
        );
    };

    const options = [
        { label: 'Builder', countKey: 'builder', filters: ['Builder'], iconType: 'builder' },
        { label: 'Owner', countKey: 'owner', filters: ['Owner'], iconType: 'owner' },
        { label: 'Broker', countKey: 'broker', filters: ['Broker', 'Agent', 'Dealer'], iconType: 'dealer' },
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
            <div className="relative bg-[#FFF7EB] md:rounded-3xl overflow-hidden h-[200px] md:h-[220px] flex items-center w-full">
                
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
                                className="shrink-0 snap-center w-[150px] md:w-[170px] h-[140px] md:h-[150px] bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-start justify-center p-4 cursor-pointer hover:shadow-md transition-shadow"
                            >
                                {getCardIcon(opt.iconType)}
                                <div>
                                    <h3 className="font-bold text-slate-800 text-[15px] md:text-[16px] mb-0.5">
                                        {opt.label}
                                    </h3>
                                    <p className="text-[12px] md:text-[13px] text-gray-500 font-medium">
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
