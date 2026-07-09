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
import PopularBuilders from '../../components/user/PopularBuilders';
import AdminPropertiesSection from '../../components/user/AdminPropertiesSection';
import { categoryService } from '../../services/categoryService';
import GRHHomeSection from '../../components/user/GRHHomeSection';
import SupportSection from '../../components/user/SupportSection';
import PropertyVideoCurations from '../../components/user/PropertyVideoCurations';


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

const HomeSection = ({ title, typeId, subtitle, extraFilters, sectionIds, onTypeSelect }) => (
    <div id={`home-section-${title.replace(/[^a-zA-Z0-9]/g, '-')}`} className="py-4 border-b border-gray-100 last:border-0 relative">
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
                    onTypeSelect(typeId, labelMap[typeId] || 'All');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
                View All
            </button>
        </div>
        <PropertyFeed selectedType={typeId} viewMode="carousel" limit={8} extraFilters={extraFilters} />
    </div>
);

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
                    pg: findCategoryIds(['hostel', 'pg', 'pg/co-living', 'co-living', 'pg/co-livinig', 'paying guest']),
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
        if (label === 'PG/Co-Living' || label === 'PG' || label === 'Rent/PG' || label === 'Rent') {
            navigate('/rent-pg');
            return;
        }
        if (label === 'Buy') {
            navigate('/buy');
            return;
        }
        if (label === 'Plot') {
            navigate('/plot');
            return;
        }
        setSelectedType({ id, label });
        // Reset PG filters when switching tabs
        setPgFilters({ gender: undefined, occupancy: undefined, foodIncluded: undefined });
    };

    const pageBg = '#FFFFFF';


    return (
        <main className="transition-colors duration-700 w-full overflow-x-hidden" style={{ backgroundColor: pageBg }}>
            {/* Hero: dark background only (no images), changes per category */}
            {/* Hero section — no overflow-hidden so floating search box is not clipped */}
            <div className="relative min-h-[280px] md:min-h-[340px] bg-gray-50/50">
                <div className="absolute inset-0 w-full h-full bg-white" />

                {/* Bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-24 z-[1]" style={{ background: `linear-gradient(to top, ${pageBg}, transparent)` }} />

                {/* Content on top */}
                <div className="relative z-40 flex flex-col min-h-[280px] md:min-h-[340px]">
                    <HeroSection 
                        theme={activeTheme} 
                        selectedType={selectedType} 
                        onSearch={(city) => setHomeSearchCity(city)}
                    />

                    {/* Small gap between search bar and category (mobile); minimal on desktop */}
                    <div className="pt-0 flex-shrink-0 md:pt-1 md:min-h-0" />

                    {/* Filter Bar at bottom of hero */}
                    <div className="bg-white pt-2">
                        <PropertyTypeFilter
                            selectedType={selectedType.id}
                            onSelectType={handleTypeSelect}
                            theme={activeTheme}
                        />
                    </div>
                </div>
            </div>



            {/* Property Videos */}
            <div className="max-w-7xl mx-auto -mt-8 mb-6">
                 <PropertyVideoCurations pageType="home" />
            </div>

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
                                sectionIds={sectionIds}
                                onTypeSelect={handleTypeSelect}
                            />
                        )}

                        {/* Recommendation for All view */}
                        <RecommendedSellers />

                        {/* Popular Builders Carousel */}
                        <PopularBuilders />

                        {/* YouTube style Reels Section */}
                        <ReelSection category={selectedType.label} />

                        {sectionIds.rent && (
                            <HomeSection
                                title="Properties for Rent"
                                subtitle="Apartments, Homes, and Villas for Rent"
                                typeId={sectionIds.rent}
                                extraFilters={{ excludeAvailability: 'Pre Launch,Under construction', excludePropertyType: 'plot,land' }}
                                sectionIds={sectionIds}
                                onTypeSelect={handleTypeSelect}
                            />
                        )}
                        {sectionIds.buy && (
                            <HomeSection
                                title="Dream Homes for Sale"
                                subtitle="Buy your perfect home today"
                                typeId={sectionIds.buy}
                                extraFilters={{ excludeAvailability: 'Pre Launch,Under construction', excludePropertyType: 'plot,land' }}
                                sectionIds={sectionIds}
                                onTypeSelect={handleTypeSelect}
                            />
                        )}
                        {sectionIds.plot && (
                            <HomeSection
                                title="Premium Plots & Land"
                                subtitle="Invest in the best locations"
                                typeId={sectionIds.plot}
                                sectionIds={sectionIds}
                                onTypeSelect={handleTypeSelect}
                            />
                        )}

                        <GRHHomeSection
                            title="Under Construction Properties"
                            subtitle="Competitive Pricing • Adaptive Payment Schedules • High Value Growth"
                            availabilityFilter="Under construction"
                        />
                        <GRHHomeSection
                            title="Pre Launch Properties"
                            subtitle="Early-Stage Rates • Exclusive Launch Offers • Select Premium Units"
                            availabilityFilter="Pre Launch"
                        />
                        <GRHHomeSection
                            title="Ready to Move Properties"
                            subtitle="Immediate Occupancy • Verified Clear Titles • Ready-to-Move Residences"
                            availabilityFilter="Ready to move"
                        />
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
            
            {/* Test Push Notification Button */}
            <div className="max-w-7xl mx-auto px-5 md:px-0 py-8 flex justify-center">
                <button
                    onClick={async () => {
                        try {
                            const { api } = await import('../../services/apiService');
                            await api.post('/fcm-tokens/test');
                            alert('Test notification sent! Check your device.');
                        } catch (err) {
                            console.error(err);
                            alert('Failed to send test notification. Please login first.');
                        }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95"
                >
                    Test Push Notification
                </button>
            </div>

            <SupportSection />
        </main>
    );
};

export default Home;
