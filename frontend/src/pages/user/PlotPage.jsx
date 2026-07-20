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
import PropertyFeed from '../../components/user/PropertyFeed';
import { ArrowRight } from 'lucide-react';

// Theme for Plot Page (Amber style from Home.jsx)
const THEME = {
    heroBg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', // Light Amber
    pageBg: '#fffbeb', // Amber theme background
    accent: '#F59E0B',
    text: 'text-amber-600',
    hoverText: 'hover:text-amber-700',
    groupHoverText: 'group-hover:text-amber-700',
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-500/10'
};

const PlotSection = ({ title, subtitle, extraFilters, plotCategoryId }) => {
    const navigate = useNavigate();
    
    return (
    <div id={`plot-section-${title.replace(/[^a-zA-Z0-9]/g, '-')}`} className="py-4 border-b border-gray-100 last:border-0 relative">
        <div className="flex justify-between items-start md:items-end px-3 md:px-2 mb-3">
            <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-start gap-1.5 md:gap-2 mb-0.5">
                    <div className="w-1 h-4 md:h-5 bg-amber-500 rounded-full mt-1 md:mt-0 shrink-0" />
                    <h2 className="text-[17px] md:text-[22px] font-black text-gray-900 leading-tight">{title}</h2>
                </div>
                {subtitle && <p className="text-[11px] md:text-[13px] text-gray-500 mt-0.5 ml-2.5 md:ml-3 truncate">{subtitle}</p>}
            </div>
            <button
                onClick={() => {
                    const params = new URLSearchParams();
                    params.set('transactionType', 'plot');
                    if (extraFilters) {
                        Object.entries(extraFilters).forEach(([key, value]) => {
                            params.set(key, value);
                        });
                    }
                    navigate(`/search?${params.toString()}`);
                    window.scrollTo(0, 0);
                }}
                className="text-[12px] md:text-[14px] font-bold text-amber-600 hover:text-amber-700 hover:underline shrink-0 whitespace-nowrap mt-1 md:mt-0"
            >
                View All
            </button>
        </div>
            {plotCategoryId && (
                <PropertyFeed selectedType={plotCategoryId} viewMode="carousel" limit={8} extraFilters={extraFilters} />
            )}
        </div>
    );
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
                            onSelectType={handleTypeSelect}
                            theme={THEME}
                        />
                    </div>
                </div>
            </div>

            {/* 1. Offers Section */}
            <div id="video-curations-section" className="w-full px-4 md:px-6 lg:px-8 2xl:px-12 mx-auto mt-4 mb-6">
                 <PropertyVideoCurations pageType="plot" themeColor="amber" />
            </div>

            <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-12 mx-auto flex flex-col gap-6">
                {/* 3. Recommend Insights */}
                <div id="recommended-insights-section">
                    <RecommendInsights transactionType="Plot" themeColor="amber" />
                </div>

                {/* Plot Feeds */}
                <PlotSection
                    title="Premium Plots & Land"
                    subtitle="Exclusive and high-end plots in prime locations"
                    extraFilters={{ propertyCategory: 'Premium' }}
                    plotCategoryId={plotCategoryId}
                />

                <PlotSection
                    title="Plots Under 50 Lacs"
                    subtitle="Budget-friendly investment options"
                    extraFilters={{ maxPrice: '5000000' }}
                    plotCategoryId={plotCategoryId}
                />

                <PlotSection
                    title="Plots Under 1 Cr"
                    subtitle="Mid-range residential and commercial plots"
                    extraFilters={{ maxPrice: '10000000' }}
                    plotCategoryId={plotCategoryId}
                />

                <PlotSection
                    title="Residential Plots"
                    subtitle="Build your dream home"
                    extraFilters={{ propertyCategory: 'Residential' }}
                    plotCategoryId={plotCategoryId}
                />

                <PlotSection
                    title="Commercial Plots"
                    subtitle="Strategic locations for your business"
                    extraFilters={{ propertyCategory: 'Commercial' }}
                    plotCategoryId={plotCategoryId}
                />

                {/* 4. Reels (Plot Context) */}
                <div id="plot-reels-section">
                    <ReelSection category="Plot" theme={THEME} />
                </div>

                {/* 5. Demand in [City] Section */}
                <div id="demand-city-section">
                    <DemandInCitySection city={searchCity || 'Bengaluru'} themeColor="amber" />
                </div>

                {/* 6. Posted By */}
                <div id="posted-by-section">
                    <PostedByChoice transactionType="Plot" />
                </div>

                {/* 7. Popular Builders */}
                <div id="popular-builders-section">
                    <PopularBuilders themeColor="amber" />
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
