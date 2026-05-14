import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import HeroSection from '../../components/user/HeroSection';
import ExclusiveOffers from '../../components/user/ExclusiveOffers';
import PropertyTypeFilter from '../../components/user/PropertyTypeFilter';
import PropertyFeed from '../../components/user/PropertyFeed';
import CollectionSection from '../../components/user/CollectionSection';
import ReelSection from '../../components/user/ReelSection';
import LatestProjectsBanner from '../../components/user/LatestProjectsBanner';
import RecommendedSellers from '../../components/user/RecommendedSellers';
import AdminPropertiesSection from '../../components/user/AdminPropertiesSection';
import { categoryService } from '../../services/categoryService';


// Category Theme Map - Professional palettes inspired by Housing.com
const THEME_MAP = {
    Hotel: {
        darkBg: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)', // Emerald
        pageBg: '#F8FAFC',
        accent: '#10B981'
    },
    'PG/Co-Living': {
        darkBg: 'linear-gradient(135deg, #881337 0%, #9F1239 100%)', // Rose
        pageBg: '#FFF1F2',
        accent: '#E11D48'
    },
    Rent: {
        darkBg: 'linear-gradient(135deg, #4C1D95 0%, #5B21B6 100%)', // Violet
        pageBg: '#F5F3FF',
        accent: '#8B5CF6'
    },
    Buy: {
        darkBg: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', // Blue
        pageBg: '#EFF6FF',
        accent: '#3B82F6'
    },
    Plot: {
        darkBg: 'linear-gradient(135deg, #78350F 0%, #92400E 100%)', // Amber
        pageBg: '#FFFBEB',
        accent: '#F59E0B'
    },
    'Home Service': {
        darkBg: 'linear-gradient(135deg, #065F46 0%, #047857 100%)', // Dark Emerald
        pageBg: '#F0FDF4',
        accent: '#10B981'
    },
    default: {
        darkBg: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)', // Emerald
        pageBg: '#F8FAFC',
        accent: '#10B981'
    }
};

const Home = () => {
    const navigate = useNavigate();
    const [selectedType, setSelectedType] = useState({ id: null, label: 'All' });
    const [pgFilters, setPgFilters] = useState({ gender: undefined, occupancy: undefined, foodIncluded: undefined });
    const [sectionIds, setSectionIds] = useState({ pg: null, rent: null, buy: null, plot: null });
    const [homeSearchCity, setHomeSearchCity] = useState("");

    // Fetch Category IDs for the homepage sections
    useEffect(() => {
        const fetchIds = async () => {
            try {
                const categories = await categoryService.getActiveCategories();
                const findCategoryIds = (names) => {
                    const searchNames = Array.isArray(names) ? names : [names];
                    const found = categories.filter(c =>
                        searchNames.some(n =>
                            (c.displayName || '').toLowerCase() === n.toLowerCase() ||
                            (c.name || '').toLowerCase() === n.toLowerCase()
                        )
                    );
                    return found.map(c => c._id).length > 0 ? found.map(c => c._id).join(',') : null;
                };

                setSectionIds({
                    pg: findCategoryIds(['hostel', 'pg', 'pg/co-living', 'co-living', 'pg/co-livinig']),
                    rent: findCategoryIds('Rent'),
                    buy: findCategoryIds('Buy'),
                    plot: findCategoryIds(['Plot', 'Plots'])
                });
            } catch (err) {
                console.error("Failed to fetch section IDs", err);
            }
        };
        fetchIds();
    }, []);

    const activeTheme = useMemo(() => {
        if (!selectedType.label || selectedType.label === 'All' || !selectedType.id) return THEME_MAP.default;
        return THEME_MAP[selectedType.label] || THEME_MAP.default;
    }, [selectedType]);

    const handleTypeSelect = (id, label) => {
        if (id === 'homeservice') {
            navigate('/home-services');
            return;
        }
        setSelectedType({ id, label });
        // Reset PG filters when switching tabs
        setPgFilters({ gender: undefined, occupancy: undefined, foodIncluded: undefined });
    };

    const pageBg = activeTheme.pageBg || '#f8fafc';

    // Section Component
    const HomeSection = ({ title, typeId, subtitle }) => (
        <div className="py-4 border-b border-gray-100 last:border-0 relative">
            <div className="flex justify-between items-end px-5 md:px-0 mb-2">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
                    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <button
                    onClick={() => {
                        const labelMap = {
                            [sectionIds.pg]: 'PG/Co-Living',
                            [sectionIds.rent]: 'Rent',
                            [sectionIds.buy]: 'Buy',
                            [sectionIds.plot]: 'Plot'
                        };
                        handleTypeSelect(typeId, labelMap[typeId] || 'All');
                        // Scroll to top or handle navigation if needed, 
                        // dependent on standard behavior (here state update triggers re-render to grid view)
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                    View All
                </button>
            </div>
            <PropertyFeed selectedType={typeId} viewMode="carousel" limit={8} />
        </div>
    );

    return (
        <main className="min-h-screen pb-24 transition-colors duration-700" style={{ backgroundColor: pageBg }}>
            {/* Hero: dark background only (no images), changes per category */}
            <div className="relative overflow-hidden min-h-[280px] md:min-h-[340px]">
                <motion.div
                    className="absolute inset-0 w-full h-full"
                    animate={{ background: activeTheme.darkBg || THEME_MAP.default.darkBg }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                />

                {/* Bottom fade to theme page background (web + mobile) */}
                <div className="absolute bottom-0 left-0 right-0 h-24 z-[1]" style={{ background: `linear-gradient(to top, ${pageBg}, transparent)` }} />

                {/* Content on top */}
                <div className="relative z-[2] flex flex-col min-h-[280px] md:min-h-[340px]">
                    <HeroSection 
                        theme={activeTheme} 
                        selectedType={selectedType} 
                        onSearch={(city) => setHomeSearchCity(city)}
                    />

                    {/* Small gap between search bar and category (mobile); minimal on desktop */}
                    <div className="pt-0 flex-shrink-0 md:pt-1 md:min-h-0" />

                    {/* Filter Bar at bottom of hero */}
                    <div className="backdrop-blur-md bg-black/10 pt-1">
                        <PropertyTypeFilter
                            selectedType={selectedType.id}
                            onSelectType={handleTypeSelect}
                            theme={activeTheme}
                        />
                    </div>
                </div>
            </div>

            <ExclusiveOffers />

            {/* Admin Curated Properties - Location Based */}
            <div className="max-w-7xl mx-auto">
                <AdminPropertiesSection searchCity={homeSearchCity} />
            </div>



            <div className="mt-2 max-w-7xl mx-auto">
                {(!selectedType.id || selectedType.label === 'All') ? (
                    // Show Categorized Sections when "All" is selected
                    <div className="flex flex-col gap-2">
                        {sectionIds.pg && (
                            <HomeSection
                                title="Scholar & Professional Stays"
                                subtitle="Top rated PGs and Hostels near you"
                                typeId={sectionIds.pg}
                            />
                        )}

                        {/* Recommendation for All view */}
                        <RecommendedSellers />

                        {/* YouTube style Reels Section */}
                        <ReelSection category={selectedType.label} />

                        {sectionIds.rent && (
                            <HomeSection
                                title="Properties for Rent"
                                subtitle="Apartments, Homes, and Villas for Rent"
                                typeId={sectionIds.rent}
                            />
                        )}
                        {sectionIds.buy && (
                            <HomeSection
                                title="Dream Homes for Sale"
                                subtitle="Buy your perfect home today"
                                typeId={sectionIds.buy}
                            />
                        )}
                        {sectionIds.plot && (
                            <HomeSection
                                title="Premium Plots & Land"
                                subtitle="Invest in the best locations"
                                typeId={sectionIds.plot}
                            />
                        )}
                    </div>
                ) : (
                    // Show Filtered Grid when a specific property category is selected
                    <div className="flex flex-col gap-1">
                        {/* 1. Latest Projects Banner for the category */}
                        <LatestProjectsBanner
                            categoryId={selectedType.id}
                            categoryName={selectedType.label}
                            theme={activeTheme}
                        />

                        {selectedType.label === 'PG/Co-Living' && (
                            <CollectionSection onFilter={(filters) => setPgFilters(filters)} activeFilters={pgFilters} />
                        )}

                        {/* 2. Reels for specific Category */}
                        <ReelSection category={selectedType.label} />

                        {/* 3. Recommended Sellers for the category */}
                        <RecommendedSellers />

                        {/* 4. Main Property Feed */}
                        <PropertyFeed selectedType={selectedType.id} viewMode="grid" extraFilters={pgFilters} />
                    </div>
                )}
            </div>
        </main>
    );
};

export default Home;
