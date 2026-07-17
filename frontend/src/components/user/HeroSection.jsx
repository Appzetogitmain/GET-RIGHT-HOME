import React, { useState, useEffect, useRef } from 'react';
import { Search, Menu } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MobileMenu from '../../components/ui/MobileMenu';
import { useNavigate } from 'react-router-dom';
import BannerCarousel from './BannerCarousel';
import CityDropdown from './CityDropdown';
import toast from 'react-hot-toast';


const HeroSection = ({ theme, selectedType, onSearch, hideGetStarted = false }) => {
    const accentColor = theme?.accent || '#10B981';
    const textClass = theme?.text || 'text-emerald-600';
    const bgLightClass = theme?.bgLight || 'bg-emerald-500/10';
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [isSticky, setIsSticky] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState(null);
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [detectingLocation, setDetectingLocation] = useState(false);
    const searchInputRef = useRef(null);
    // Track the Y position where the search box sits to trigger sticky correctly
    const searchBoxRef = useRef(null);

    const placeholders = [
        `"Farm house in Bengaluru"`,
        `"3BHK Flats in Bengaluru South"`,
        `"PG for Girls in Yelahanka"`,
        `"Plot in Devanahalli"`,
        `"2BHK Apartment for Rent"`
    ];

    // Placeholder Rotation
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Scroll Listener — becomes sticky when search box scrolls past top
    useEffect(() => {
        const handleScroll = () => {
            if (searchBoxRef.current) {
                const rect = searchBoxRef.current.getBoundingClientRect();
                setIsSticky(rect.bottom <= 0);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSearch = () => {
        const q = searchQuery.trim();
        const cityQ = selectedDistrict || selectedCity;
        const combined = [cityQ, q].filter(Boolean).join(' ');

        navigate(`/search?search=${encodeURIComponent(combined)}`);
    };

    const handleCitySelect = ({ city, district }) => {
        setSelectedCity(city);
        setSelectedDistrict(district);
        const combined = [district || city].filter(Boolean).join(' ');
        navigate(`/search?search=${encodeURIComponent(combined)}`);
    };

    const handleLiveLocationDetect = async () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }
        setDetectingLocation(true);
        const toastId = toast.loading("Detecting your live location...");
        try {
            const position = await new Promise((res, rej) =>
                navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 })
            );
            const { latitude, longitude } = position.coords;

            const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const geoData = await geoRes.json();

            const detectedCity = geoData.address?.city
                || geoData.address?.town
                || geoData.address?.village
                || geoData.address?.state_district
                || '';
            
            const state = geoData.address?.state || '';

            toast.dismiss(toastId);

            const isBangalore = 
                detectedCity.toLowerCase().includes('bangalore') || 
                detectedCity.toLowerCase().includes('bengaluru') ||
                state.toLowerCase().includes('karnataka');

            if (isBangalore) {
                setSelectedCity('Bengaluru');
                setSelectedDistrict(null);
                if (onSearch) {
                    onSearch('Bengaluru');
                    const section = document.getElementById('admin-properties-section');
                    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                toast.success("Location set to Bengaluru!");
            } else {
                const cityToShow = detectedCity || state || 'your city';
                toast(
                    (t) => (
                        <div className="flex flex-col gap-1.5 p-1">
                            <span className="font-bold text-gray-900 text-sm flex items-center gap-1">
                                📍 Detected: {cityToShow}
                            </span>
                            <span className="text-xs text-gray-600 leading-normal">
                                Currently, Get-Right-Home services are only live in <strong>Bengaluru (Karnataka)</strong>. 🌆
                            </span>
                            <span className="text-[11px] text-emerald-600 font-bold leading-normal">
                                We are expanding rapidly and will launch in your city soon! Stay tuned! 🚀
                            </span>
                        </div>
                    ),
                    {
                        duration: 6000,
                        icon: '🗺️',
                    }
                );
            }
        } catch (err) {
            console.error("Geolocation error:", err);
            toast.dismiss(toastId);
            toast.error("Failed to detect live location. Please select your city manually.");
        } finally {
            setDetectingLocation(false);
        }
    };

    return (
        <motion.section className="relative w-full pt-0 pb-2 flex flex-col bg-transparent">

            {/* ─── Mobile Top Bar (Menu + Brand + Post Property) ─── */}
            <div className="px-2 flex lg:hidden items-center justify-between h-12 mb-0">
                <div className="flex items-center gap-0">
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="p-1 text-gray-900 hover:bg-gray-100 rounded-full transition-all active:scale-90"
                    >
                        <Menu size={26} strokeWidth={1.5} />
                    </button>
                    <div className="flex flex-col cursor-pointer" onClick={() => navigate('/')}>
                        <span className="text-[14px] font-black tracking-tighter text-[#111827] uppercase leading-none">
                            GET RIGHT <span className={textClass}>HOME</span>
                        </span>
                        <div className={`h-0.5 w-6 rounded-full mt-0.5`} style={{ backgroundColor: accentColor }} />
                    </div>
                </div>
                
                <div className="flex items-center gap-1.5">
                    <div
                        onClick={() => navigate('/list-property')}
                        className="flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                    >
                        <span className="text-[#005B9F] font-semibold text-[13px]">Post property</span>
                        <span className="bg-[#10B981] text-white text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Free</span>
                    </div>

                    <button 
                        onClick={() => navigate('/notifications')}
                        className="relative p-1.5 text-gray-600 hover:bg-gray-100 rounded-full transition-all active:scale-90"
                    >
                        <LucideIcons.Bell size={20} strokeWidth={1.5} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </button>
                </div>
            </div>

            {/* ─── Banner Carousel ─── */}
            <div className="relative w-full">
                <BannerCarousel />

                {/* ─── FLOATING SEARCH BOX (overlaps banner bottom) ─── */}
                {/* This is the ref element — its position triggers sticky */}
                <div
                    ref={searchBoxRef}
                    className="absolute -bottom-[72px] left-1/2 -translate-x-1/2 w-[92%] md:w-[78%] z-40"
                >
                    {/* ROW 1: City Dropdown — full width pill */}
                    <div className="w-full bg-white rounded-t-2xl border border-b-0 border-gray-200 shadow-md px-3 py-2.5 flex items-center gap-2">
                        <CityDropdown
                            selectedCity={selectedCity}
                            selectedDistrict={selectedDistrict}
                            onSelect={handleCitySelect}
                            theme={theme}
                            fullWidth
                        />
                    </div>

                    {/* ROW 2: Search bar */}
                    <div className="w-full bg-white rounded-b-2xl border border-gray-200 shadow-lg px-3 py-2.5 flex items-center gap-2">
                        <Search size={19} strokeWidth={2} className="text-gray-400 shrink-0" />

                        {/* Animated placeholder / real input */}
                        <div className="flex-1 relative h-6 overflow-hidden cursor-text" onClick={() => searchInputRef.current?.focus()}>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="absolute inset-0 w-full text-[14px] text-gray-800 outline-none bg-transparent z-10"
                                style={{ caretColor: accentColor }}
                            />
                            {/* Animated placeholder — hidden when typing */}
                            {!searchQuery && (
                                <AnimatePresence mode="popLayout">
                                    <motion.span
                                        key={placeholderIndex}
                                        initial={{ y: 18, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: -18, opacity: 0 }}
                                        transition={{ duration: 0.35, ease: 'easeOut' }}
                                        className="absolute inset-0 flex items-center text-gray-400 text-[14px] font-normal pointer-events-none select-none truncate"
                                    >
                                        {placeholders[placeholderIndex]}
                                    </motion.span>
                                </AnimatePresence>
                            )}
                        </div>

                        <LucideIcons.MapPin 
                            size={19} 
                            className={`text-gray-400 shrink-0 cursor-pointer hover:text-blue-600 transition-colors ${detectingLocation ? 'animate-bounce text-blue-500' : ''}`} 
                            onClick={handleLiveLocationDetect}
                            title="Detect live location"
                        />
                        <LucideIcons.Mic size={19} className="text-[#005B9F] shrink-0" />
                    </div>
                </div>
            </div>

            {/* Spacer — accounts for the floating search box height */}
            <div className="h-[88px]" />

            {/* ─── STICKY SEARCH BAR (appears when scrolled past search box) ─── */}
            <AnimatePresence>
                {isSticky && (
                    <motion.div
                        initial={{ y: -60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -60, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="fixed top-0 left-0 right-0 z-[100] bg-white shadow-md border-b border-gray-200"
                    >
                        <div className="w-full flex items-center gap-2 h-11 bg-white px-4 rounded-none">
                            <CityDropdown
                                selectedCity={selectedCity}
                                selectedDistrict={selectedDistrict}
                                onSelect={handleCitySelect}
                                theme={theme}
                                rounded="rounded-none"
                                textClass="text-[11px]"
                                iconSize={13}
                                chevronSize={11}
                                paddingClass="px-2.5 py-1"
                            />
                            <div className="h-4 w-px bg-gray-200 shrink-0" />
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                                <Search size={13} className="text-gray-400 shrink-0" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Search properties..."
                                    className="flex-1 min-w-0 text-[11px] text-gray-800 outline-none placeholder-gray-400 bg-transparent"
                                />
                                <LucideIcons.MapPin 
                                    size={13} 
                                    className={`text-gray-400 shrink-0 cursor-pointer hover:text-blue-600 transition-colors ${detectingLocation ? 'animate-bounce text-blue-500' : ''}`}
                                    onClick={handleLiveLocationDetect}
                                    title="Detect live location"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSearch}
                                className="px-3.5 py-1.5 rounded-none text-[10px] font-black uppercase tracking-wider text-white shrink-0 transition-colors hover:opacity-90"
                                style={{ background: accentColor }}
                            >
                                Search
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Hero Title & Subtitle ─── */}
            {!hideGetStarted && (
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
            )}

            <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        </motion.section>
    );
};

export default HeroSection;
