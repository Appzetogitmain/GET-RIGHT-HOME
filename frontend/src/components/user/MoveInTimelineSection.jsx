import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import { propertyService } from '../../services/propertyService';

const MoveInTimelineSection = ({ transactionType = 'buy', theme }) => {
    const navigate = useNavigate();
    const scrollContainerRef = useRef(null);
    const [titleOpacity, setTitleOpacity] = useState(1);
    const [timelineCounts, setTimelineCounts] = useState({
        'ready': 0,
        '2026': 0,
        '2027': 0,
        '2028': 0,
        '2029': 0,
        '2030': 0,
        '2030plus': 0
    });

    // Handle scroll to fade out the title when sliding left
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const scrollLeft = scrollContainerRef.current.scrollLeft;
        // Fade out completely when scrolled 80px
        const newOpacity = Math.max(0, 1 - (scrollLeft / 80));
        setTitleOpacity(newOpacity);
    };

    // Fetch dynamic counts
    useEffect(() => {
        const fetchCounts = async () => {
            try {
                // Fetch active properties to count
                const res = await propertyService.getPublicProperties({ limit: 1000 });
                // /properties responds with a bare array; older code checked res.success
                // (which is never present on an array) and silently discarded every result.
                const properties = Array.isArray(res) ? res : (res?.properties || []);
                if (properties.length) {
                    const counts = { 'ready': 0, '2026': 0, '2027': 0, '2028': 0, '2029': 0, '2030': 0, '2030plus': 0 };
                    
                    properties.forEach(p => {
                        // Filter to transaction type if required
                        if (transactionType && (p.transactionType || '').toLowerCase() !== transactionType.toLowerCase() && !p.dynamicCategory?.name?.toLowerCase().includes(transactionType.toLowerCase())) {
                            return;
                        }

                        const status = (p.dynamicData?.availability || p.dynamicData?.availabilityStatus || '').toLowerCase();
                        const year = parseInt(p.dynamicData?.possessionYear, 10);
                        
                        if (status.includes('ready')) {
                            counts['ready']++;
                        } else if (year) {
                            if (year === 2026) counts['2026']++;
                            else if (year === 2027) counts['2027']++;
                            else if (year === 2028) counts['2028']++;
                            else if (year === 2029) counts['2029']++;
                            else if (year === 2030) counts['2030']++;
                            else if (year > 2030) counts['2030plus']++;
                        } else if (status.includes('under construction')) {
                            // If it's under construction but no year, we can just randomly bucket or ignore it.
                        }
                    });

                    setTimelineCounts(counts);
                }
            } catch (err) {
                console.error("Failed to fetch properties for Timeline counts", err);
            }
        };
        fetchCounts();
    }, [transactionType]);

    const options = [
        { label: 'Ready to move', countKey: 'ready', filters: { availability: 'Ready to Move' }, image: 'https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?auto=compress&cs=tinysrgb&w=400' },
        { label: 'Possession in 2026', countKey: '2026', filters: { availability: 'Under Construction', possessionYear: '2026' }, image: 'https://images.pexels.com/photos/159306/construction-site-build-construction-work-159306.jpeg?auto=compress&cs=tinysrgb&w=400' },
        { label: 'Possession in 2027', countKey: '2027', filters: { availability: 'Under Construction', possessionYear: '2027' }, image: 'https://images.pexels.com/photos/585418/pexels-photo-585418.jpeg?auto=compress&cs=tinysrgb&w=400' },
        { label: 'Possession in 2028', countKey: '2028', filters: { availability: 'Under Construction', possessionYear: '2028' }, image: 'https://images.pexels.com/photos/176342/pexels-photo-176342.jpeg?auto=compress&cs=tinysrgb&w=400' },
        { label: 'Possession in 2029', countKey: '2029', filters: { availability: 'Under Construction', possessionYear: '2029' }, image: 'https://images.pexels.com/photos/110813/pexels-photo-110813.jpeg?auto=compress&cs=tinysrgb&w=400' },
        { label: 'Possession in 2030', countKey: '2030', filters: { availability: 'Under Construction', possessionYear: '2030' }, image: 'https://images.pexels.com/photos/224924/pexels-photo-224924.jpeg?auto=compress&cs=tinysrgb&w=400' },
        { label: 'Possession after 2030', countKey: '2030plus', filters: { availability: 'Under Construction', possessionYear: '2030+' }, image: 'https://images.pexels.com/photos/416405/pexels-photo-416405.jpeg?auto=compress&cs=tinysrgb&w=400' },
    ];

    const handleSelect = (filters) => {
        const params = new URLSearchParams();
        if (transactionType) {
            params.set('transactionType', transactionType.toLowerCase());
        }
        if (filters.availability) params.set('availability', filters.availability);
        if (filters.possessionYear) params.set('possessionYear', filters.possessionYear);
        if (filters.propertyCategory) params.set('propertyCategory', filters.propertyCategory);
        
        navigate(`/search?${params.toString()}`);
        window.scrollTo(0, 0);
    };

    return (
        <section className="mb-6 w-full md:px-0">
            {/* Edge-to-edge on mobile, larger height matching 99acres style */}
            <div className="relative bg-[#F8FAFC] md:rounded-3xl overflow-hidden h-[250px] md:h-[300px] lg:h-[340px] xl:h-[380px] flex items-center w-full border border-slate-100">
                
                {/* 1. Static Title on the Left (Fades out when scrolling) */}
                <div 
                    className="absolute left-4 top-0 bottom-0 flex flex-col justify-center w-[130px] md:w-[160px] lg:w-[190px] xl:w-[230px] z-10 pointer-events-none"
                    style={{ opacity: titleOpacity, transition: 'opacity 0.1s ease-out' }}
                >
                    <div className="relative w-14 h-14 mb-3 text-blue-600">
                        <CalendarDays size={48} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-[17px] md:text-[20px] lg:text-[24px] xl:text-[28px] font-extrabold text-slate-800 leading-tight tracking-tight">
                        Move in now, <br/>next year or<br/>later
                    </h2>
                    <p className="text-[11px] md:text-[12px] lg:text-[14px] xl:text-[15px] text-slate-500 mt-2 leading-snug">
                        Projects based on your preferred possession date
                    </p>
                </div>

                {/* 2. Scrolling Container */}
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="absolute inset-0 z-20 flex overflow-x-auto scrollbar-hide snap-x snap-mandatory items-center h-full"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {/* The Transparent Spacer to allow the static title space */}
                    <div className="w-[150px] md:w-[190px] lg:w-[230px] xl:w-[270px] shrink-0 snap-start h-full"></div>

                    {/* Sliding Cards */}
                    <div className="flex gap-4 pr-6 items-center h-full pt-4 pb-4">
                        {options.map((opt, idx) => (
                            <motion.div
                                key={idx}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSelect(opt.filters)}
                                className="shrink-0 snap-center w-[140px] md:w-[180px] lg:w-[220px] xl:w-[260px] h-[180px] md:h-[220px] lg:h-[260px] xl:h-[300px] rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden cursor-pointer hover:shadow-md transition-shadow group relative"
                                style={{
                                    background: idx === 0 ? '#FFF7EB' : '#F0F9FF'
                                }}
                            >
                                <div className="p-3 lg:p-4 z-20 relative bg-transparent">
                                    <h3 className="font-bold text-slate-800 text-[15px] md:text-[16px] lg:text-[18px] xl:text-[20px] mb-0.5 leading-tight w-full">
                                        {opt.label}
                                    </h3>
                                    <p className={`text-[11px] md:text-[12px] lg:text-[13px] text-slate-500 font-medium mt-1 transition-colors duration-300 ${theme?.hoverText ? theme.hoverText.replace('hover:', 'group-hover:') : 'group-hover:text-blue-600'} group-hover:underline`}>
                                        {timelineCounts[opt.countKey] > 0 ? `${timelineCounts[opt.countKey]}+ Properties` : 'Explore Options'}
                                    </p>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-[110px] md:h-[135px] lg:h-[160px] xl:h-[200px] mt-auto overflow-hidden rounded-b-2xl">
                                    {/* Gradient covering the top part of the image to blend it with the card background */}
                                    <div className={`absolute top-0 left-0 right-0 h-10 bg-gradient-to-b ${idx === 0 ? 'from-[#FFF7EB] via-[#FFF7EB]/80' : 'from-[#F0F9FF] via-[#F0F9FF]/80'} to-transparent z-10 pointer-events-none`}></div>
                                    <img 
                                        src={opt.image} 
                                        alt={opt.label} 
                                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" 
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
};

export default MoveInTimelineSection;
