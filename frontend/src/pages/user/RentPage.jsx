import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '../../components/user/HeroSection';
import PropertyTypeFilter from '../../components/user/PropertyTypeFilter';
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
    heroBg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', // Light Violet
    pageBg: '#f5f3ff', // Violet theme background
    accent: '#8B5CF6',
    text: 'text-violet-600',
    bgLight: 'bg-violet-500/10'
};

const RentPGSection = ({ title, typeId, subtitle, extraFilters, onTypeSelect, typeLabel }) => (
    <div className="py-4 border-b border-gray-100 last:border-0 relative">
        <div className="flex justify-between items-start md:items-end px-3 md:px-2 mb-3">
            <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-start gap-1.5 md:gap-2 mb-0.5">
                    <div className="w-1 h-4 md:h-5 bg-violet-500 rounded-full mt-1 md:mt-0 shrink-0" />
                    <h2 className="text-[17px] md:text-[22px] font-black text-gray-900 leading-tight">{title}</h2>
                </div>
                {subtitle && <p className="text-[11px] md:text-[13px] text-gray-500 mt-0.5 ml-2.5 md:ml-3 truncate">{subtitle}</p>}
            </div>
            <button
                onClick={() => {
                    onTypeSelect(typeId, typeLabel, extraFilters);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-[12px] md:text-[14px] font-bold text-violet-600 hover:text-violet-700 hover:underline shrink-0 whitespace-nowrap mt-1 md:mt-0"
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

    const handleCategoryTabSelect = (id, label) => {
        if (label === 'All') navigate('/');
        else if (label === 'Rent' || label === 'Rent/PG' || label === 'PG/Co-Living' || label === 'PG') navigate('/rent-pg');
        else if (label === 'Plot') navigate('/plot');
        else if (label === 'Home Service') navigate('/home-services');
        else if (label === 'Buy') navigate('/buy');
    };

    return (
        <main className="transition-colors duration-700 w-full overflow-x-hidden min-h-screen" style={{ backgroundColor: THEME.pageBg }}>
            {/* Hero Section */}
            <div className="relative min-h-[280px] md:min-h-[340px]">
                <div className="absolute inset-0 w-full h-full transition-all duration-700" style={{ background: THEME.heroBg }} />
                <div className="absolute bottom-0 left-0 right-0 h-24 z-[1]" style={{ background: `linear-gradient(to top, ${THEME.pageBg}, transparent)` }} />
                
                <div className="relative z-40 flex flex-col min-h-[280px] md:min-h-[340px]">
                    <HeroSection 
                        theme={THEME} 
                        selectedType={selectedType} 
                        onSearch={(city) => setSearchCity(city)}
                    />

                    <div className="pt-2 pb-6 border-b border-gray-100">
                        <PropertyTypeFilter
                            selectedType={selectedType.id}
                            selectedLabel={selectedType.label}
                            onSelectType={handleCategoryTabSelect}
                            theme={THEME}
                        />
                    </div>
                </div>
            </div>

            {/* 1. Offers Section */}
            <ExclusiveOffers themeColor="violet" />

            {/* Property Videos */}
            <div id="video-curations-section" className="w-full px-4 md:px-6 lg:px-8 2xl:px-12 mx-auto mt-4 mb-6">
                <PropertyVideoCurations pageType="rent" themeColor="violet" />
            </div>

            {/* 2. Handpicked Projects */}
            <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-12 mx-auto">
                <AdminPropertiesSection searchCity={searchCity} transactionType="rent,pg" themeColor="violet" />
            </div>

            <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-12 mx-auto flex flex-col gap-6">
                
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
                <PopularBuilders themeColor="violet" />

            </div>

            <SupportSection />
        </main>
    );
};

export default RentPage;
