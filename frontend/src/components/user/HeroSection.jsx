import React, { useState, useEffect, useRef } from 'react';
import { Search, Menu } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MobileMenu from '../../components/ui/MobileMenu';
import { useNavigate } from 'react-router-dom';
import BannerCarousel from './BannerCarousel';
import CityDropdown from './CityDropdown';
import toast from 'react-hot-toast';
import DesktopSearchFilterBar from './DesktopSearchFilterBar';
import GuidedSearchFlowModal from './GuidedSearchFlowModal';
import { getPreferredCity, setPreferredCity, onPreferredCityChange } from '../../utils/locationPreference';
import { addRecentSearch } from '../../utils/recentActivity';


const HeroSection = ({ theme, selectedType, onSearch, hideGetStarted = false }) => {
    const accentColor = theme?.accent || '#10B981';
    const textClass = theme?.text || 'text-emerald-600';
    const bgLightClass = theme?.bgLight || 'bg-emerald-500/10';
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState(getPreferredCity());
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

    // The city pill shows "Bengaluru" by default — actually filter the page
    // to Bengaluru from the first render too, instead of leaving it
    // unfiltered until the user explicitly opens the dropdown. Without this
    // the pill and the property list disagreed on what was "selected".
    useEffect(() => {
        if (onSearch) {
            onSearch(selectedCity);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Desktop's own city picker was removed (the top nav is the single
    // source of truth now) — stay in sync when it's changed from there.
    useEffect(() => {
        return onPreferredCityChange((city) => {
            if (!city || city === selectedCity) return;
            setSelectedCity(city);
            setSelectedDistrict(null);
            if (onSearch) onSearch(city);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCity]);


    const handleSearch = () => {
        const queryParams = new URLSearchParams();
        if (selectedType?.label) queryParams.set('categoryTab', selectedType.label);
        queryParams.set('propertyCategory', 'Residential');
        if (searchQuery.trim()) {
            queryParams.set('search', searchQuery.trim());
        } else if (selectedCity) {
            queryParams.set('areas', selectedCity);
        }
        const url = `/search?${queryParams.toString()}`;
        const label = searchQuery.trim() || (selectedType?.label
            ? `${selectedType.label} in ${selectedCity || 'your city'}`
            : `Search in ${selectedCity || 'your city'}`);
        addRecentSearch({ label, url });
        navigate(url);
    };

    const handleCitySelect = ({ city, district }) => {
        setSelectedCity(city);
        setSelectedDistrict(district);
        if (city) setPreferredCity(city); // persists across pages — read by TopNavbar

        // If the page gave us an onSearch handler, filter the sections on
        // this page in place instead of navigating away — that's what lets
        // "Bengaluru" vs "Mumbai" actually change what's shown below.
        if (onSearch) {
            onSearch(city);
            const section = document.getElementById('admin-properties-section');
            if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            const combined = [district || city].filter(Boolean).join(' ');
            navigate(`/search?search=${encodeURIComponent(combined)}`);
        }
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

            // Listings now exist across many cities (Indore, Pune, Bhopal,
            // Noida, ...), not just Bengaluru — see admin-cities. Detecting a
            // city outside Bengaluru used to refuse to set it and show a
            // "coming soon" message instead, hiding real inventory from
            // anyone not physically in Bengaluru. Accept whatever was
            // detected; only fall back to Bengaluru when nothing usable
            // came back from the reverse-geocode.
            const cityToSet = detectedCity || state;

            if (cityToSet) {
                setSelectedCity(cityToSet);
                setSelectedDistrict(null);
                setPreferredCity(cityToSet);
                if (onSearch) {
                    onSearch(cityToSet);
                    const section = document.getElementById('admin-properties-section');
                    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                toast.success(`Location set to ${cityToSet}!`);
            } else {
                toast.error("Couldn't determine your city. Please select it manually.");
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



            {/* ─── Banner Carousel ─── */}
            <div className="relative w-full">
                <BannerCarousel />

                {/* ─── DESKTOP SEARCH + FILTER BAR (overlaps banner bottom) ─── */}
                {/* Location is set from the top nav pill now (single source,
                    no duplicate picker down here) — this bar just reads it. */}
                <div className="hidden lg:flex absolute -bottom-[172px] left-0 right-0 z-40 justify-center">
                    <DesktopSearchFilterBar theme={theme} selectedType={selectedType} selectedCity={selectedCity} />
                </div>

                {/* ─── FLOATING SEARCH BOX (overlaps banner bottom, mobile/tablet only) ─── */}
                {/* This is the ref element — its position triggers sticky */}
                <div
                    ref={searchBoxRef}
                    className="lg:hidden absolute -bottom-[72px] left-1/2 -translate-x-1/2 w-[92%] md:w-[78%] z-40"
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
                        <div className="flex-1 relative h-6 overflow-hidden cursor-text">
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
                        {/* <button
                            type="button"
                            onClick={() => setIsSearchModalOpen(true)}
                            className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
                            title="Guided Search Flow"
                        >
                            <LucideIcons.Sparkles size={17} />
                        </button> */}
                        <button
                            type="button"
                            onClick={handleSearch}
                            className="px-3 py-1 rounded-lg text-white font-semibold text-xs transition-transform active:scale-95 shrink-0"
                            style={{ backgroundColor: accentColor }}
                        >
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Spacer — accounts for the floating search box height */}
            <div className="h-[88px] lg:h-[188px]" />


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
            {/* <GuidedSearchFlowModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                initialCity={selectedCity}
                initialTab={selectedType?.label?.toLowerCase() || 'buy'}
            /> */}
        </motion.section>
    );
};

export default HeroSection;
