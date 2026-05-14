import React, { useState, useEffect } from 'react';
import { Search, Menu, Bell, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../assets/rokologin-removebg-preview.png';
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
        "Search in Bucharest...",
        "Find luxury hotels...",
        "Book villas in Bali...",
        "Couple friendly stays...",
        "Search near Red Square..."
    ];



    // Placeholder Rotation
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [placeholders.length]);

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
            className={`relative w-full px-5 pt-4 pb-4 flex flex-col gap-4 md:gap-3 md:pt-8 md:pb-4 bg-transparent transition-all duration-300`}
        >
            {/* 1. Header Row (Hides on Scroll) */}
            <div className={`flex md:hidden items-center justify-between relative h-16 transition-all duration-300 ${isSticky ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100 mb-0'}`}>
                {/* Menu Button */}
                <button
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2.5 rounded-xl bg-emerald-100/20 hover:bg-emerald-100/35 backdrop-blur-md transition-all duration-300 border border-emerald-100/30 shadow-lg shadow-emerald-900/10 active:scale-90"
                >
                    <Menu size={18} className="text-emerald-50" />
                </button>

                {/* Logo */}
                <div className="flex flex-col items-start leading-none ml-3">
                    <span className="text-2xl font-black tracking-tight text-white flex items-center gap-0 drop-shadow-md">
                        HOOM<span style={{ color: accentColor }} className="drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">ZO</span>
                    </span>
                    <motion.div
                        className="h-[3px] w-8 rounded-full"
                        style={{ backgroundColor: accentColor }}
                        animate={{ width: [32, 24, 32] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>

                <div className="flex-1" />

                <div className="flex-1" />
            </div>


            {/* Tagline - project related (hidden on mobile) */}
            <div className="hidden md:block text-center text-white/95 text-sm md:text-lg font-medium drop-shadow-md px-2 max-w-xl mx-auto">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={displayContent}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                    >
                        {displayContent}
                    </motion.p>
                </AnimatePresence>
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

                <form
                    onSubmit={handleSearch}
                    target="_self"
                    className={`
                        w-full mx-auto max-w-7xl
                        ${isSticky
                            ? 'h-10 rounded-full shadow-inner bg-gray-50/50'
                            : 'h-12 md:h-14 rounded-2xl shadow-xl shadow-emerald-900/5 border border-white/40 bg-white/95 backdrop-blur-md'}
                        flex items-center 
                        px-3 md:px-4
                        gap-2 md:gap-3
                        relative
                        overflow-hidden
                        transition-all duration-300
                    `}
                >
                    <Search size={18} style={{ color: accentColor }} className="z-10 md:w-6 md:h-6 shrink-0" />

                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={placeholders[placeholderIndex]}
                        className="flex-1 h-full bg-transparent outline-none font-bold text-xs md:text-sm placeholder:text-gray-400 placeholder:font-medium z-20"
                        style={{ color: '#111827' }}
                    />

                    {/* Filter Icon / Search Button */}
                    <button 
                        type="submit"
                        className="p-2 md:px-5 md:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all z-10 flex items-center gap-2 shadow-lg shadow-emerald-900/10 active:scale-95"
                    >
                        <span className="hidden md:inline text-xs font-black uppercase tracking-wider">Search</span>
                        <Search size={16} className="md:hidden" />
                    </button>
                </form>
            </motion.div>
            </div>


            {/* Spacer for the absolute positioned search bar (non-sticky mode) */}
            {!isSticky && <div className="h-4" />}


            {/* Placeholder Spacer only when sticky to prevent content jump */}
            {isSticky && (
                <div className="h-16 w-full md:h-20"></div>
            )}

            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        </motion.section>
    );
};

export default HeroSection;
