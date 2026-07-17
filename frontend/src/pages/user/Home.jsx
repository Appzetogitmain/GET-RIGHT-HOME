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


// Category Theme Map - Professional light palettes inspired by modern premium designs
const THEME_MAP = {
    Hotel: {
        heroBg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', // Light Emerald
        pageBg: '#f8fafc',
        accent: '#10B981',
        text: 'text-emerald-600',
        bgLight: 'bg-emerald-500/10'
    },
    'PG/Co-Living': {
        heroBg: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)', // Light Fuchsia
        pageBg: '#faf5ff',
        accent: '#d946ef',
        text: 'text-fuchsia-600',
        bgLight: 'bg-fuchsia-500/10'
    },
    Rent: {
        heroBg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', // Light Violet
        pageBg: '#f8fafc',
        accent: '#8B5CF6',
        text: 'text-violet-600',
        bgLight: 'bg-violet-500/10'
    },
    Buy: {
        heroBg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', // Light Blue
        pageBg: '#f8fafc',
        accent: '#3B82F6',
        text: 'text-blue-600',
        bgLight: 'bg-blue-500/10'
    },
    Plot: {
        heroBg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', // Light Amber
        pageBg: '#f8fafc',
        accent: '#F59E0B',
        text: 'text-amber-600',
        bgLight: 'bg-amber-500/10'
    },
    'Home Service': {
        heroBg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', // Light Green
        pageBg: '#f8fafc',
        accent: '#22c55e',
        text: 'text-green-600',
        bgLight: 'bg-green-500/10'
    },
    default: {
        heroBg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', // Light Emerald
        pageBg: '#f8fafc',
        accent: '#10B981',
        text: 'text-emerald-600',
        bgLight: 'bg-emerald-500/10'
    }
};

const HomeSection = ({ title, typeId, subtitle, extraFilters, sectionIds, onTypeSelect }) => (
    <div id={`home-section-${title.replace(/[^a-zA-Z0-9]/g, '-')}`} className="py-4 border-b border-gray-100 last:border-0 relative">
        <div className="flex justify-between items-end px-5 md:px-0 mb-2">
            <div>
                <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                    <h2 className="text-xl md:text-2xl font-black text-gray-900">{title}</h2>
                </div>
                {subtitle && <p className="text-sm text-gray-500 mt-1 ml-3">{subtitle}</p>}
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

    const pageBg = activeTheme.pageBg;

    return (
        <main className="transition-colors duration-700 w-full overflow-x-hidden" style={{ backgroundColor: pageBg }}>
            {/* Hero: light premium background, changes per category */}
            {/* Hero section — no overflow-hidden so floating search box is not clipped */}
            <div className="relative min-h-[280px] md:min-h-[340px]">
                <div className="absolute inset-0 w-full h-full transition-all duration-700" style={{ background: activeTheme.heroBg }} />

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
                    <div className="pt-2 pb-6 border-b border-gray-100">
                        <PropertyTypeFilter
                            selectedType={selectedType.id}
                            selectedLabel={selectedType.label}
                            onSelectType={handleTypeSelect}
                            theme={activeTheme}
                        />
                    </div>
                </div>
            </div>



            {/* Property Videos */}
            <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-12 mx-auto mt-4 mb-6">
                 <PropertyVideoCurations pageType="home" />
            </div>

            {/* Admin Curated Properties - Location Based */}
            <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-12 mx-auto">
                <AdminPropertiesSection searchCity={homeSearchCity} />
            </div>



            <div className="mt-2 w-full px-4 md:px-6 lg:px-8 2xl:px-12 mx-auto flex flex-col gap-4">
                {(!selectedType.id || selectedType.label === 'All') ? (
                    // Show Categorized Sections when "All" is selected
                    <div className="flex flex-col gap-4">
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
                    <div className="flex flex-col gap-4">
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
            <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-12 py-8 flex justify-center">
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
