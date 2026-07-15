import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '../../components/user/HeroSection';
import PropertyTypeFilter from '../../components/user/PropertyTypeFilter';
import ReelSection from '../../components/user/ReelSection';
import PopularBuilders from '../../components/user/PopularBuilders';
import SupportSection from '../../components/user/SupportSection';
import { categoryService } from '../../services/categoryService';
import PostedByChoice from '../../components/user/PostedByChoice';
import RecommendInsights from '../../components/user/RecommendInsights';
import PropertyVideoCurations from '../../components/user/PropertyVideoCurations';
import DemandInCitySection from '../../components/user/DemandInCitySection';
import PopularToolsSection from '../../components/user/PopularToolsSection';

// Theme for Plot Page (Amber style from Home.jsx)
const THEME = {
    darkBg: 'linear-gradient(135deg, #78350F 0%, #92400E 100%)', // Amber
    pageBg: '#FFFBEB',
    accent: '#F59E0B'
};

const PlotPage = () => {
    const navigate = useNavigate();
    const [searchCity, setSearchCity] = useState("");
    const [plotCategoryId, setPlotCategoryId] = useState(null);

    // Initial state to match the Plot tab
    const selectedType = { id: plotCategoryId, label: 'Plot' };

    useEffect(() => {
        const fetchIds = async () => {
            try {
                const categories = await categoryService.getActiveCategories();
                const plotCat = categories.find(c => 
                    (c.displayName || '').toLowerCase() === 'plot' || 
                    (c.name || '').toLowerCase() === 'plot' ||
                    (c.displayName || '').toLowerCase() === 'plots' || 
                    (c.name || '').toLowerCase() === 'plots'
                );
                if (plotCat) setPlotCategoryId(plotCat._id);
            } catch (err) {
                console.error("Failed to fetch Plot category ID", err);
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
            <div className="bg-white px-4 py-6 border-b border-amber-100 mb-6 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                            Explore Premium <span className="text-amber-600">Plots & Land</span>
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Find the perfect land for your dream project in {searchCity || 'Bengaluru'}.
                        </p>
                    </div>
                </div>
            </div>

            {/* 1. Offers Section */}
            <div id="video-curations-section" className="max-w-7xl mx-auto -mt-8 mb-6">
                 <PropertyVideoCurations pageType="plot" />
            </div>

            <div className="mt-2 max-w-7xl mx-auto flex flex-col gap-4 px-4 md:px-0">
                {/* 3. Recommend Insights */}
                <div id="recommended-insights-section">
                    <RecommendInsights transactionType="Plot" />
                </div>

                {/* 4. Reels (Plot Context) */}
                <div id="plot-reels-section">
                    <ReelSection category="Plot" />
                </div>

                {/* 5. Demand in [City] Section */}
                <div id="demand-city-section">
                    <DemandInCitySection city={searchCity || 'Bengaluru'} />
                </div>

                {/* 6. Posted By */}
                <div id="posted-by-section">
                    <PostedByChoice transactionType="Plot" />
                </div>

                {/* 7. Popular Builders */}
                <div id="popular-builders-section">
                    <PopularBuilders />
                </div>

                {/* 8. Popular Tools */}
                <div id="popular-tools-section">
                    <PopularToolsSection />
                </div>
            </div>

            <SupportSection />
        </main>
    );
};

export default PlotPage;
