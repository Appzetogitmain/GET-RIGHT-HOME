import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '../../components/user/HeroSection';
import PropertyTypeFilter from '../../components/user/PropertyTypeFilter';
import ExclusiveOffers from '../../components/user/ExclusiveOffers';
import ReelSection from '../../components/user/ReelSection';
import PopularBuilders from '../../components/user/PopularBuilders';
import MoveInTimelineSection from '../../components/user/MoveInTimelineSection';
import SupportSection from '../../components/user/SupportSection';
import { categoryService } from '../../services/categoryService';
import BHKChoice from '../../components/user/BHKChoice';
import PostedByChoice from '../../components/user/PostedByChoice';
import RecommendInsights from '../../components/user/RecommendInsights';
import PropertyVideoCurations from '../../components/user/PropertyVideoCurations';
import DemandInCitySection from '../../components/user/DemandInCitySection';
import PopularToolsSection from '../../components/user/PopularToolsSection';

// Theme for Buy Page
const THEME = {
    darkBg: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', // Blue
    pageBg: '#EFF6FF',
    accent: '#3B82F6'
};

const BuyPage = () => {
    const navigate = useNavigate();
    const [searchCity, setSearchCity] = useState("");
    const [buyCategoryId, setBuyCategoryId] = useState(null);

    // Initial state to match the Buy tab
    const selectedType = { id: buyCategoryId, label: 'Buy' };

    useEffect(() => {
        const fetchIds = async () => {
            try {
                const categories = await categoryService.getActiveCategories();
                const buyCat = categories.find(c => 
                    (c.displayName || '').toLowerCase() === 'buy' || 
                    (c.name || '').toLowerCase() === 'buy'
                );
                if (buyCat) setBuyCategoryId(buyCat._id);
            } catch (err) {
                console.error("Failed to fetch Buy category ID", err);
            }
        };
        fetchIds();
    }, []);

    const handleTypeSelect = (id, label) => {
        if (label === 'All') navigate('/');
        else if (label === 'Rent' || label === 'Rent/PG' || label === 'PG/Co-Living' || label === 'PG') navigate('/rent-pg');
        else if (label === 'Plot') navigate('/plot');
        else if (label === 'Home Service') navigate('/home-services');
        else if (label === 'Buy') navigate('/buy');
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
                    />

                    {/* Filter Bar at bottom of hero */}
                    <div className="bg-white pt-2">
                        <PropertyTypeFilter
                            selectedType={selectedType.id}
                            onSelectType={handleTypeSelect}
                            theme={THEME}
                        />
                    </div>
                </div>
            </div>

            {/* Clear Navigation Header */}
            <div className="bg-white px-4 md:px-6 lg:px-8 2xl:px-12 py-6 border-b border-blue-100 mb-6 shadow-sm">
                <div className="w-full mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                            Explore Properties for <span className="text-blue-600">Buy</span>
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Find your dream home in {searchCity || 'Bengaluru'} with zero hassle.
                        </p>
                    </div>
                </div>
            </div>

            {/* 1. Offers Section */}
            <div id="video-curations-section" className="w-full px-4 md:px-6 lg:px-8 2xl:px-12 mx-auto -mt-8 mb-6">
                 <PropertyVideoCurations pageType="buy" />
            </div>

            <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-12 mx-auto flex flex-col gap-6">
                {/* 3. Recommend Insights */}
                <div id="recommended-insights-section">
                    <RecommendInsights transactionType="Buy" />
                </div>

                {/* 4. Reels (Buy Context) */}
                <div id="buy-reels-section">
                    <ReelSection category="Buy" />
                </div>

                {/* 5. Demand in [City] Section */}
                <div id="demand-city-section">
                    <DemandInCitySection city={searchCity || 'Bengaluru'} />
                </div>



                {/* 7. BHK Choice */}
                <div id="bhk-choice-section">
                    <BHKChoice transactionType="Buy" />
                </div>
                <div id="posted-by-section">
                    <PostedByChoice transactionType="Buy" />
                </div>

                {/* 8. Move In Timeline */}
                <div id="timeline-section">
                    <MoveInTimelineSection transactionType="Buy" />
                </div>

                {/* 10. Future Dealers Placeholder */}
                {/* <div id="dealers-section" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold mb-2">Future Dealers</h2>
                    <p className="text-sm text-slate-500">[To be implemented: Avatar carousel of top rated dealers]</p>
                </div> */}

                {/* 11. Popular Builders (Existing) */}
                <div id="popular-builders-section">
                    <PopularBuilders />
                </div>

                {/* 12. Popular Tools Placeholder */}
                <div id="popular-tools-section">
                    <PopularToolsSection />
                </div>

            </div>

            <SupportSection />
        </main>
    );
};

export default BuyPage;
