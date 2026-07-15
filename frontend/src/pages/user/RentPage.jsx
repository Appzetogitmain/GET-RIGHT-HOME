import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '../../components/user/HeroSection';
import ExclusiveOffers from '../../components/user/ExclusiveOffers';
import AdminPropertiesSection from '../../components/user/AdminPropertiesSection';
import ReelSection from '../../components/user/ReelSection';
import PopularBuilders from '../../components/user/PopularBuilders';
import SupportSection from '../../components/user/SupportSection';
import { categoryService } from '../../services/categoryService';
import PropertyFeed from '../../components/user/PropertyFeed';
import PropertyVideoCurations from '../../components/user/PropertyVideoCurations';

// Theme for Rent Page
const THEME = {
    darkBg: 'linear-gradient(135deg, #4C1D95 0%, #5B21B6 100%)', // Violet
    pageBg: '#F5F3FF',
    accent: '#8B5CF6'
};

const RentPGSection = ({ title, typeId, subtitle, extraFilters, onTypeSelect, typeLabel }) => (
    <div className="py-4 border-b border-gray-100 last:border-0 relative">
        <div className="flex justify-between items-end px-5 md:px-0 mb-2">
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
                {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
            <button
                onClick={() => {
                    onTypeSelect(typeId, typeLabel, extraFilters);
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

const RentPage = () => {
    const navigate = useNavigate();
    const [searchCity, setSearchCity] = useState("");
    const [sectionIds, setSectionIds] = useState({ rent: null, pg: null });

    const selectedType = { id: sectionIds.rent, label: 'Rent/PG' };

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
                    rent: findCategoryIds('Rent'),
                    pg: findCategoryIds(['hostel', 'pg', 'pg/co-living', 'co-living', 'pg/co-livinig', 'paying guest'])
                });
            } catch (err) {
                console.error("Failed to fetch Category IDs", err);
            }
        };
        fetchIds();
    }, []);

    const handleTypeSelect = (id, label, extraFilters = {}) => {
        const queryParams = new URLSearchParams();
        
        // Add all extra filters to the query params
        Object.entries(extraFilters).forEach(([key, value]) => {
            queryParams.append(key, value);
        });

        // Set the transactionType based on the label so SearchPage can apply the global filter
        if (label === 'PG/Co-Living') {
            queryParams.append('transactionType', 'PG');
        } else if (label === 'Rent') {
            queryParams.append('transactionType', 'Rent');
        }

        const queryString = queryParams.toString();
        
        navigate(`/search${queryString ? `?${queryString}` : ''}`);
    };

    return (
        <main className="transition-colors duration-700 w-full overflow-x-hidden min-h-screen" style={{ backgroundColor: THEME.pageBg }}>
            {/* Hero Section */}
            <div className="relative min-h-[280px] md:min-h-[340px] bg-gray-50/50">
                <div className="absolute inset-0 w-full h-full bg-white" />
                <div className="absolute bottom-0 left-0 right-0 h-24 z-[1]" style={{ background: `linear-gradient(to top, ${THEME.pageBg}, transparent)` }} />
                
                <div className="relative z-40 flex flex-col min-h-[280px] md:min-h-[340px]">
                    <HeroSection 
                        theme={THEME} 
                        selectedType={selectedType} 
                        onSearch={(city) => setSearchCity(city)}
                        hideGetStarted={true}
                    />
                </div>
            </div>

            {/* Clear Navigation Header */}
            <div className="bg-white px-4 py-6 border-b border-violet-100 mb-6 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                            Explore Properties for <span className="text-violet-600">Rent & PG</span>
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Find your perfect rental or co-living space in {searchCity || 'Bengaluru'} with zero hassle.
                        </p>
                    </div>
                </div>
            </div>

            {/* 1. Offers Section */}
            <ExclusiveOffers />

            {/* Property Videos */}
            <div className="max-w-7xl mx-auto -mt-4 mb-6">
                 <PropertyVideoCurations pageType="rent" />
            </div>

            {/* 2. Handpicked Projects */}
            <div className="max-w-7xl mx-auto">
                <AdminPropertiesSection searchCity={searchCity} transactionType="rent,pg" />
            </div>

            <div className="mt-2 max-w-7xl mx-auto flex flex-col gap-4 px-4 md:px-0">
                
                {sectionIds.pg && (
                    <RentPGSection
                        title="Scholar & Professional Stays"
                        subtitle="Top rated PGs and Hostels near you"
                        typeId={sectionIds.pg}
                        typeLabel="PG/Co-Living"
                        onTypeSelect={handleTypeSelect}
                    />
                )}

                {sectionIds.rent && (
                    <RentPGSection
                        title="Properties for Rent"
                        subtitle="Apartments, Homes, and Villas for Rent"
                        typeId={sectionIds.rent}
                        extraFilters={{ excludeAvailability: 'Pre Launch,Under construction', excludePropertyType: 'plot,land' }}
                        typeLabel="Rent"
                        onTypeSelect={handleTypeSelect}
                    />
                )}

                {sectionIds.pg && (
                    <RentPGSection
                        title="PGs for boys"
                        subtitle="Top rated Boys PGs and Hostels near you"
                        typeId={sectionIds.pg}
                        extraFilters={{ gender: 'Boys' }}
                        typeLabel="PG/Co-Living"
                        onTypeSelect={handleTypeSelect}
                    />
                )}

                {sectionIds.pg && (
                    <RentPGSection
                        title="PGs for Girls"
                        subtitle="Top rated Girls PGs and Hostels near you"
                        typeId={sectionIds.pg}
                        extraFilters={{ gender: 'Girls' }}
                        typeLabel="PG/Co-Living"
                        onTypeSelect={handleTypeSelect}
                    />
                )}

                {/* 4. Reels (Rent Context) */}
                <ReelSection category="Rent" />

                {/* 11. Popular Builders (Existing) */}
                <PopularBuilders />

            </div>

            <SupportSection />
        </main>
    );
};

export default RentPage;
