import React, { useState, useEffect } from 'react';
import { Search, Menu, Bell, Wallet } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import navLogo from '../../assets/grh-logo.png';
import MobileMenu from '../../components/ui/MobileMenu';
import { useNavigate } from 'react-router-dom';
import walletService from '../../services/walletService';
import BannerCarousel from './BannerCarousel';


const HeroSection = ({ theme, selectedType, onSearch }) => {
    const accentColor = theme?.accent || '#10B981';
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [isSticky, setIsSticky] = useState(false);


    const categoryContent = {
        'All': "Find your space — PG/Co-Living, Rent, Buy & Plots. Your home, your way.",
        'PG/Co-Living': "Scholar & Professional Stays. Premium PGs and Co-living spaces designed for comfort.",
        'Rent': "Premium Homes for Rent. Find your ideal match from chic apartments to spacious villas.",
        'Buy': "Invest in your Future. Discover exclusive properties and luxury estates for sale.",
        'Plot': "Premium Plots in Prime Locations. Build your vision on the perfect foundation.",
        'Home Service': "Professional Home Services. From cleaning to painting, we've got you covered."
    };

    const displayContent = categoryContent[selectedType?.label] || categoryContent['All'];

    const placeholders = [
        `"Sector 150 Noida"`,
        `"3BHK Flats in Noida"`,
        `"Noida"`,
        `"Sector 62 Noida"`,
        `"Indirapuram"`
    ];



    // Placeholder Rotation - Fix: ensure placeholders are in dependency if needed
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []); // Empty dependency to run once on mount

    // Scroll Listener for Sticky & Header Logic
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            setIsSticky(scrollY > 120);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        if (searchQuery.trim()) {
            if (onSearch) {
                onSearch(searchQuery.trim());
                // Scroll to property section if it exists
                const section = document.getElementById('admin-properties-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                navigate(`/search?search=${encodeURIComponent(searchQuery.trim())}`);
            }
        }
    };

    return (
        <motion.section
            className={`relative w-full pt-4 pb-2 flex flex-col bg-transparent transition-all duration-300`}
        >
            <div className="px-4 flex md:hidden items-center justify-between h-14 mb-2">
                {/* Left: Menu & Brand Side-by-Side */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="p-1 text-gray-900 hover:bg-gray-100 rounded-full transition-all active:scale-90"
                    >
                        <Menu size={26} strokeWidth={1.5} />
                    </button>

                    <div className="flex flex-col cursor-pointer" onClick={() => navigate('/')}>
                        <span className="text-[14px] md:text-lg font-black tracking-tighter text-gray-900 uppercase leading-none">
                            GET RIGHT <span className="text-blue-600">HOME</span>
                        </span>
                        <div className="h-0.5 w-4 bg-blue-600/30 rounded-full mt-0.5"></div>
                    </div>
                </div>

                {/* Right: Post Property Button */}
                <div
                    onClick={() => navigate('/list-property')}
                    className="flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                >
                    <span className="text-[#005B9F] font-semibold text-[13px] md:text-sm">Post property</span>
                    <span className="bg-[#10B981] text-white text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Free</span>
                </div>
            </div>

            {/* Banner Carousel as the main visual */}
            <div className="relative w-full">
                <BannerCarousel />

                {/* 2. Search Bar - Overlay Logic */}
                <motion.div
                    layout
                    className={`
                        w-full z-50 px-4 md:px-8
                        ${isSticky
                            ? 'fixed top-0 md:top-24 left-0 right-0 p-3 bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-100/50'
                            : 'absolute -bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-[80%]'}
                    `}
                >

                    <div
                        onClick={handleSearch}
                        className={`
                        w-full mx-auto max-w-7xl
                        ${isSticky
                                ? 'h-12 rounded-lg shadow-md bg-white border border-gray-100'
                                : 'h-14 md:h-[60px] rounded-xl shadow-lg border border-gray-100 bg-white'}
                        flex items-center 
                        px-4
                        relative
                        overflow-hidden
                        transition-all duration-300
                        cursor-text
                    `}
                    >
                        <Search size={22} strokeWidth={2} className="text-gray-500 mr-2 shrink-0" />
                        <span className="text-gray-800 text-[16px] font-normal mr-2">Search</span>

                        <div className="flex-1 relative h-full flex flex-col justify-center overflow-hidden">
                            <AnimatePresence mode="popLayout">
                                <motion.span
                                    key={placeholderIndex}
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -20, opacity: 0 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                    className="absolute text-gray-800 font-medium text-[15px] truncate w-full"
                                >
                                    {placeholders[placeholderIndex]}
                                </motion.span>
                            </AnimatePresence>
                        </div>

                        <LucideIcons.Mic size={22} className="text-[#005B9F] ml-auto shrink-0" />
                    </div>
                </motion.div>
            </div>

            {/* Spacer to prevent layout jump when search bar becomes sticky */}
            <div className="h-6" />

            {/* Main Title & Subtitle - 99acres style (Moved below Search Bar) */}
            <div className="text-left text-[#0B1A3A] mt-2 px-4">
                <motion.div
                    key={selectedType?.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <h1 className="text-[22px] md:text-3xl font-bold tracking-tight mb-0.5">Get started with</h1>
                    <p className="text-[13px] md:text-base text-gray-500 font-normal">Explore real estate options in top cities</p>
                </motion.div>
            </div>


            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        </motion.section>
    );
};

export default HeroSection;
