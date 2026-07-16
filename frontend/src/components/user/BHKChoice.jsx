import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import { propertyService } from '../../services/propertyService';

const BHKChoice = ({ transactionType = 'buy' }) => {
    const navigate = useNavigate();
    const scrollContainerRef = useRef(null);
    const [titleOpacity, setTitleOpacity] = useState(1);
    const [bhkCounts, setBhkCounts] = useState({
        '1bhk': 0,
        '2bhk': 0,
        '3bhk': 0,
        '4bhk': 0,
        '4plus': 0
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
                // Fetch active properties to count (can optimize by adding a backend count endpoint later)
                const res = await propertyService.getPublicProperties({ limit: 1000 });
                if (res?.success && res?.properties) {
                    const properties = res.properties;
                    
                    const counts = { '1bhk': 0, '2bhk': 0, '3bhk': 0, '4bhk': 0, '4plus': 0 };
                    
                    properties.forEach(p => {
                        // Filter to buy transaction if required
                        if (transactionType && (p.transactionType || '').toLowerCase() !== transactionType.toLowerCase() && !p.dynamicCategory?.name?.toLowerCase().includes(transactionType.toLowerCase())) {
                            return;
                        }

                        const bhkStr = (p.bhk || p.dynamicData?.bedrooms || p.dynamicData?.bhk || p.buyDetails?.type || '').toString().toLowerCase();
                        
                        if (bhkStr.includes('1 bhk') || bhkStr.includes('1 rk')) counts['1bhk']++;
                        else if (bhkStr.includes('2 bhk')) counts['2bhk']++;
                        else if (bhkStr.includes('3 bhk')) counts['3bhk']++;
                        else if (bhkStr.includes('4 bhk')) counts['4bhk']++;
                        else if (bhkStr.includes('5') || bhkStr.includes('6') || bhkStr.includes('4+')) counts['4plus']++;
                    });

                    setBhkCounts(counts);
                }
            } catch (err) {
                console.error("Failed to fetch properties for BHK counts", err);
            }
        };
        fetchCounts();
    }, [transactionType]);



    const options = [
        { label: '1 RK/1 BHK', countKey: '1bhk', filters: ['1BHK'], image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&q=80' },
        { label: '2 BHK', countKey: '2bhk', filters: ['2BHK'], image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500&q=80' },
        { label: '3 BHK', countKey: '3bhk', filters: ['3BHK'], image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&q=80' },
        { label: '4 BHK', countKey: '4bhk', filters: ['4BHK'], image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500&q=80' },
        { label: '4+ BHK', countKey: '4plus', filters: ['4+BHK'], image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=500&q=80' },
    ];

    const handleSelect = (filters) => {
        const params = new URLSearchParams();
        if (transactionType) {
            params.set('transactionType', transactionType.toLowerCase());
        }
        params.set('bhkType', filters.join(','));
        navigate(`/search?${params.toString()}`);
        window.scrollTo(0, 0);
    };

    return (
        <section className="mb-6 w-full md:px-0">
            {/* Edge-to-edge on mobile, larger height */}
            <div className="relative bg-[#FFF7EB] md:rounded-3xl overflow-hidden h-[240px] md:h-[280px] lg:h-[320px] xl:h-[360px] flex items-center w-full">
                
                {/* 1. Static Title on the Left (Fades out when scrolling) */}
                <div 
                    className="absolute left-4 top-0 bottom-0 flex flex-col justify-center w-[120px] md:w-[150px] lg:w-[180px] xl:w-[220px] z-10 pointer-events-none"
                    style={{ opacity: titleOpacity, transition: 'opacity 0.1s ease-out' }}
                >
                    <div className="relative w-14 h-14 mb-3">
                        <div className="absolute left-0 bottom-0 w-10 h-12 bg-orange-300 rounded-sm opacity-80 rounded-tl-full"></div>
                        <div className="absolute right-0 bottom-0 w-12 h-12 text-blue-500">
                            <Building2 size={46} fill="currentColor" strokeWidth={1} />
                        </div>
                    </div>
                    <h2 className="text-[16px] md:text-[18px] lg:text-[22px] xl:text-[26px] font-extrabold text-slate-800 leading-tight tracking-tight">
                        BHK choice<br/>in mind?
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
                    <div className="w-[140px] md:w-[180px] lg:w-[220px] xl:w-[260px] shrink-0 snap-start h-full"></div>

                    {/* Sliding Cards (Increased size) */}
                    <div className="flex gap-4 pr-6 items-center h-full">
                        {options.map((opt, idx) => (
                            <motion.div
                                key={idx}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSelect(opt.filters)}
                                className="shrink-0 snap-center w-[160px] md:w-[200px] lg:w-[240px] xl:w-[280px] h-[190px] md:h-[230px] lg:h-[270px] xl:h-[310px] bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                            >
                                <div className="w-full h-[120px] md:h-[150px] lg:h-[180px] xl:h-[220px] bg-gray-100 overflow-hidden relative">
                                    <img 
                                        src={opt.image} 
                                        alt={opt.label} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                    />
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                                </div>
                                <div className="p-3 lg:p-4 flex-1 flex flex-col justify-center">
                                    <h3 className="font-bold text-slate-800 text-[14px] md:text-[15px] lg:text-[17px] xl:text-[18px] mb-0.5">
                                        {opt.label}
                                    </h3>
                                    <p className="text-[11px] md:text-[12px] lg:text-[13px] text-gray-500 font-medium truncate">
                                        {bhkCounts[opt.countKey] > 0 ? `${bhkCounts[opt.countKey]}+ Properties` : 'Explore Options'}
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

export default BHKChoice;
