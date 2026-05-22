import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    MapPin, Building2, Star, Navigation,
    IndianRupee, ArrowRight, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { propertyService } from '../../services/propertyService';
import toast from 'react-hot-toast';
import PropertyQuickViewModal from './PropertyQuickViewModal';

const PROPERTY_TYPE_ICONS = {
    hotel: '🏨', villa: '🏡', pg: '🏠', hostel: '🛏️',
    resort: '🌴', homestay: '🏘️', rent: '🔑', buy: '🏢', plot: '🌿'
};

/* ─── Property Card ─── */
const AdminPropertyCard = ({ property, index }) => {
    const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
    const typeIcon = PROPERTY_TYPE_ICONS[property.propertyType] || '🏠';
    const rawPrice = property.rentDetails?.monthlyRent
        || property.buyDetails?.expectedPrice
        || property.plotDetails?.expectedPrice
        || property.dynamicData?.expectedPrice
        || property.dynamicData?.monthlyRent
        || property.dynamicData?.expectedRent
        || property.dynamicData?.price
        || null;
    const parsedPrice = rawPrice ? Number(rawPrice.toString().replace(/,/g, '')) : null;
    const price = parsedPrice && !isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.35, ease: 'easeOut' }}
        >
            <div onClick={() => setIsQuickViewOpen(true)} className="block group cursor-pointer">
                <div className="relative rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100/80 transition-all duration-300 hover:-translate-y-1">
                    {/* Image */}
                    <div className="relative h-44 overflow-hidden bg-gray-50">
                        {property.coverImage ? (
                            <img
                                src={property.coverImage}
                                alt={property.propertyName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Building2 size={36} className="text-gray-200" />
                            </div>
                        )}
                        <div className="absolute top-3 left-3">
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase shadow-sm">
                                <span>{typeIcon}</span>{property.propertyType}
                            </span>
                        </div>
                        <div className="absolute top-3 right-3">
                            <span className="px-2 py-1 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase tracking-wider shadow-lg">
                                ✓ Verified
                            </span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        <h3 className="font-black text-sm text-gray-900 truncate mb-1 group-hover:text-emerald-700 transition-colors">
                            {property.propertyName}
                        </h3>
                        <div className="flex items-center gap-1 text-gray-500 mb-3">
                            <MapPin size={11} className="shrink-0 text-emerald-500" />
                            <span className="text-[11px] font-medium truncate">
                                {property.address?.area ? `${property.address.area}, ` : ''}{property.address?.city}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            {price ? (
                                <div className="flex items-center gap-0.5">
                                    <IndianRupee size={12} className="text-emerald-600" />
                                    <span className="font-black text-gray-900 text-sm">{price.toLocaleString('en-IN')}</span>
                                    {property.propertyType === 'rent' && <span className="text-[10px] text-gray-400 ml-0.5">/mo</span>}
                                </div>
                            ) : (
                                <span className="text-[11px] text-emerald-600 font-bold">Contact for Price</span>
                            )}
                            {property.totalReviews > 0 ? (
                                <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                    <Star size={10} className="fill-amber-400 text-amber-400" />
                                    <span className="text-[10px] font-black text-amber-700">
                                        {property.avgRating?.toFixed(1)}
                                    </span>
                                </div>
                            ) : (
                                <div className="text-[10px] font-black text-gray-500 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                                    New
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <PropertyQuickViewModal
                isOpen={isQuickViewOpen}
                onClose={() => setIsQuickViewOpen(false)}
                property={property}
                initialShowEnquiry={false}
            />
        </motion.div>
    );
};

/* ─── Skeleton Loader ─── */
const SkeletonCard = () => (
    <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white animate-pulse">
        <div className="h-44 bg-gray-100" />
        <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-100 rounded-full w-3/4" />
            <div className="h-3 bg-gray-100 rounded-full w-1/2" />
            <div className="h-4 bg-gray-100 rounded-full w-1/3" />
        </div>
    </div>
);

/* ─── Main Component ─── */
const AdminPropertiesSection = ({ searchCity }) => {
    const [availableCities, setAvailableCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState(null); // null = no city selected yet
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [citiesLoading, setCitiesLoading] = useState(true);
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [localQuery, setLocalQuery] = useState("");
    const scrollRef = useRef(null);

    // Sync with external searchCity prop (from HeroSection)
    useEffect(() => {
        if (searchCity) {
            const lowerSearch = searchCity.toLowerCase();
            let matchedCity = null;
            let queryText = searchCity;

            const sortedCities = [...availableCities].sort((a, b) => b.city.length - a.city.length);
            
            for (const cityObj of sortedCities) {
                if (lowerSearch.includes(cityObj.city.toLowerCase())) {
                    matchedCity = cityObj.city;
                    queryText = searchCity
                        .replace(new RegExp(cityObj.city, 'gi'), '')
                        .trim();
                    break;
                }
            }

            if (!matchedCity) {
                matchedCity = selectedCity || (availableCities.length > 0 ? availableCities[0].city : 'Bengaluru');
            }

            setLocalQuery(queryText);
            selectCity(matchedCity);
        } else {
            setLocalQuery("");
        }
    }, [searchCity, availableCities]);

    // Step 1: Fetch all available cities on mount
    useEffect(() => {
        const fetchCities = async () => {
            setCitiesLoading(true);
            try {
                const res = await propertyService.getAdminPropertyCities();
                const cities = res?.cities || [];
                setAvailableCities(cities);

                if (cities.length > 0) {
                    selectCity(cities[0].city);
                }
            } catch (err) {
                console.error('Cities fetch failed:', err);
            } finally {
                setCitiesLoading(false);
            }
        };
        fetchCities();
    }, []);

    // Step 2: Try to auto-detect user location and match with available cities
    const autoDetectCity = async (cities) => {
        if (!navigator.geolocation) return;
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
                || '';

            // Try to match detected city with available cities (case-insensitive)
            const matched = cities.find(c =>
                c.city.toLowerCase() === detectedCity.toLowerCase()
            );

            if (matched) {
                selectCity(matched.city);
                if (matched.city !== 'Bengaluru') {
                    toast(`Currently, Get-Right-Home services are only live in Bengaluru. Launching in ${matched.city} soon! 🚀`, {
                        duration: 5000,
                        icon: 'ℹ️'
                    });
                }
            } else if (cities.length > 0) {
                // Fallback to first available city
                selectCity(cities[0].city);
            }
        } catch {
            // Geolocation failed — just select first city
            if (cities.length > 0) {
                selectCity(cities[0].city);
            }
        }
    };

    // Step 3: Fetch properties for selected city
    const selectCity = async (city) => {
        setSelectedCity(city);
        setLoading(true);
        try {
            const res = await propertyService.getAdminPropertiesByLocation({ city });
            setProperties(res?.properties || []);
        } catch {
            setProperties([]);
        } finally {
            setLoading(false);
        }
    };

    // Manual location detect button
    const handleDetectLocation = async () => {
        if (!navigator.geolocation) return;
        setDetectingLocation(true);
        try {
            const position = await new Promise((res, rej) =>
                navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
            );
            const { latitude, longitude } = position.coords;
            const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const geoData = await geoRes.json();
            const detectedCity = geoData.address?.city
                || geoData.address?.town
                || geoData.address?.village
                || '';

            const matched = availableCities.find(c =>
                c.city.toLowerCase() === detectedCity.toLowerCase()
            );

            if (matched) {
                selectCity(matched.city);
                if (matched.city !== 'Bengaluru') {
                    toast(`Currently, Get-Right-Home services are only live in Bengaluru. Launching in ${matched.city} soon! 🚀`, {
                        duration: 5000,
                        icon: 'ℹ️'
                    });
                }
            } else {
                // City not in admin list — fetch anyway
                setSelectedCity(detectedCity);
                toast(`Currently, Get-Right-Home services are only live in Bengaluru. Launching in ${detectedCity} soon! 🚀`, {
                    duration: 5000,
                    icon: 'ℹ️'
                });
                setLoading(true);
                try {
                    const res = await propertyService.getAdminPropertiesByLocation({ city: detectedCity });
                    setProperties(res?.properties || []);
                } catch {
                    setProperties([]);
                } finally {
                    setLoading(false);
                }
            }
        } catch {
            // silently fail
        } finally {
            setDetectingLocation(false);
        }
    };

    // Scroll city chips
    const scrollCities = (dir) => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
        }
    };

    const filteredProperties = properties.filter(property => {
        if (!localQuery) return true;
        const q = localQuery.toLowerCase();
        return (
            (property.propertyName || '').toLowerCase().includes(q) ||
            (property.propertyType || '').toLowerCase().includes(q) ||
            (property.address?.area || '').toLowerCase().includes(q) ||
            (property.address?.city || '').toLowerCase().includes(q) ||
            (property.description || '').toLowerCase().includes(q)
        );
    });

    // If no cities at all, don't render the section
    if (!citiesLoading && availableCities.length === 0) return null;

    return (
        <section id="admin-properties-section" className="py-8 border-b border-gray-100">

            {/* Header */}
            <div className="px-5 md:px-0 mb-5">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                            <h2 className="text-xl md:text-2xl font-black text-gray-900">
                                Properties in{' '}
                                {selectedCity ? (
                                    <span className="text-emerald-600">{selectedCity}</span>
                                ) : (
                                    <span className="text-gray-400">your city</span>
                                )}
                            </h2>
                        </div>
                        <p className="text-sm text-gray-400 ml-3">
                            Handpicked listings by the GRH team — Select your city below
                        </p>
                    </div>

                    {/* Detect Location Button */}
                    <button
                        onClick={handleDetectLocation}
                        disabled={detectingLocation}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl text-[11px] font-black text-emerald-700 transition-all shrink-0"
                        title="Auto-detect my city"
                    >
                        {detectingLocation
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Navigation size={14} />
                        }
                        <span className="hidden sm:inline">
                            {detectingLocation ? 'Detecting...' : 'My Location'}
                        </span>
                    </button>
                </div>
            </div>

            {/* City Chips — Horizontal Scroll */}
            <div className="relative mb-6 px-5 md:px-0">

                {citiesLoading ? (
                    <div className="flex gap-3 overflow-hidden">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-9 w-24 rounded-full bg-gray-100 animate-pulse shrink-0" />
                        ))}
                    </div>
                ) : (
                    <div
                        ref={scrollRef}
                        className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {availableCities.map((cityObj) => (
                            <motion.button
                                key={cityObj.city}
                                onClick={() => {
                                    selectCity(cityObj.city);
                                    if (cityObj.city !== 'Bengaluru') {
                                        toast(`Currently, Get-Right-Home services are only live in Bengaluru. Launching in ${cityObj.city} soon! 🚀`, {
                                            duration: 5000,
                                            icon: 'ℹ️'
                                        });
                                    }
                                }}
                                whileTap={{ scale: 0.95 }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[12px] font-bold shrink-0 transition-all duration-200 ${selectedCity === cityObj.city
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200'
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50'
                                    }`}
                            >
                                <MapPin size={11} className={selectedCity === cityObj.city ? 'text-white' : 'text-emerald-500'} />
                                {cityObj.city}
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${selectedCity === cityObj.city
                                        ? 'bg-white/20 text-white'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {cityObj.count}
                                </span>
                            </motion.button>
                        ))}
                    </div>
                )}

            </div>

            {/* Properties Grid */}
            <div className="px-5 md:px-0">
                {!selectedCity ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 border border-emerald-100">
                            <MapPin size={28} className="text-emerald-400" />
                        </div>
                        <p className="text-sm font-bold text-gray-500">Select a city above to see properties</p>
                    </div>
                ) : loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : (filteredProperties.length === 0 || (selectedCity !== 'Bengaluru' && !localQuery)) ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-14 text-center bg-gray-50/60 rounded-2xl border border-dashed border-gray-200 px-5"
                    >
                        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                            <Building2 size={26} className="text-gray-300" />
                        </div>
                        {selectedCity !== 'Bengaluru' && !localQuery ? (
                            <>
                                <h3 className="font-black text-gray-700 mb-1">Coming Soon to {selectedCity}! 🚀</h3>
                                <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                                    Currently, Get-Right-Home services are only live in <strong>Bengaluru</strong>. We will be launching in {selectedCity} soon!
                                </p>
                            </>
                        ) : localQuery ? (
                            <>
                                <h3 className="font-black text-gray-700 mb-1">No matching properties</h3>
                                <p className="text-sm text-gray-400 max-w-xs">
                                    We couldn't find any properties matching "{localQuery}" in {selectedCity}.
                                </p>
                            </>
                        ) : (
                            <>
                                <h3 className="font-black text-gray-700 mb-1">No Properties in {selectedCity}</h3>
                                <p className="text-sm text-gray-400 max-w-xs">
                                    Admin hasn't added any properties for this city yet. Try another city.
                                </p>
                            </>
                        )}
                    </motion.div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedCity}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                        >
                            {filteredProperties.slice(0, 8).map((property, index) => (
                                <AdminPropertyCard key={property._id} property={property} index={index} />
                            ))}
                        </motion.div>
                    </AnimatePresence>
                )}

                {/* View All */}
                {filteredProperties.length > 0 && (selectedCity === 'Bengaluru' || localQuery) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex justify-center mt-8"
                    >
                        <Link
                            to={`/search?search=${encodeURIComponent(selectedCity + (localQuery ? ' ' + localQuery : ''))}`}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full font-bold text-sm transition-all border border-emerald-100 hover:border-emerald-200 group"
                        >
                            View All in {selectedCity}
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </motion.div>
                )}
            </div>
        </section>
    );
};

export default AdminPropertiesSection;
