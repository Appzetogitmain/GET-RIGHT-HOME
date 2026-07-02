import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '../../components/user/HeroSection';
import PropertyTypeFilter from '../../components/user/PropertyTypeFilter';
import ExclusiveOffers from '../../components/user/ExclusiveOffers';
import AdminPropertiesSection from '../../components/user/AdminPropertiesSection';
import ReelSection from '../../components/user/ReelSection';
import PopularBuilders from '../../components/user/PopularBuilders';
import SupportSection from '../../components/user/SupportSection';
import { categoryService } from '../../services/categoryService';
import BHKChoice from '../../components/user/BHKChoice';
import RecommendInsights from '../../components/user/RecommendInsights';

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
        else if (label === 'Rent') navigate('/rent');
        else if (label === 'PG/Co-Living' || label === 'PG') navigate('/pg-coliving');
        else if (label === 'Plot') navigate('/plot');
        else if (label === 'Home Service') navigate('/home-services');
    };

    return (
        <main className="min-h-screen pb-24 transition-colors duration-700" style={{ backgroundColor: THEME.pageBg }}>
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
            <div className="bg-white px-4 py-6 border-b border-blue-100 mb-6 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <ExclusiveOffers />

            {/* 2. Handpicked Projects (Buy Context) */}
            <div className="max-w-7xl mx-auto">
                <AdminPropertiesSection searchCity={searchCity} transactionType="buy" />
            </div>

            <div className="mt-2 max-w-7xl mx-auto flex flex-col gap-4 px-4 md:px-0">
                {/* 3. Recommend Insights */}
                <RecommendInsights transactionType="Buy" />

                {/* 4. Reels (Buy Context) */}
                <ReelSection category="Buy" />

                {/* 5. Demand in [City] Placeholder */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold mb-2">Demand in {searchCity || 'Bengaluru'}</h2>
                    <p className="text-sm text-slate-500">[To be implemented: Dynamic grid of top localities]</p>
                </div>

                {/* 6. Pre-launch Projects Placeholder */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold mb-2">Pre Launch Projects</h2>
                    <p className="text-sm text-slate-500">[To be implemented: Carousel of pre-launch projects]</p>
                </div>

                {/* 7. BHK Choice */}
                <BHKChoice transactionType="Buy" />

                {/* 8. Move In Timeline Placeholder */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold mb-2">Move in Timeline</h2>
                    <p className="text-sm text-slate-500">[To be implemented: Filters for Ready to move, Under construction]</p>
                </div>

                {/* 9. Properties Posted By Placeholder */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold mb-2">Properties Posted By</h2>
                    <p className="text-sm text-slate-500">[To be implemented: Quick filters for Owner, Builder, Dealer]</p>
                </div>

                {/* 10. Future Dealers Placeholder */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold mb-2">Future Dealers</h2>
                    <p className="text-sm text-slate-500">[To be implemented: Avatar carousel of top rated dealers]</p>
                </div>

                {/* 11. Popular Builders (Existing) */}
                <PopularBuilders />

                {/* 12. Popular Tools Placeholder */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold mb-2">Use Popular Tools</h2>
                    <p className="text-sm text-slate-500">[To be implemented: Icons for EMI calculator, etc.]</p>
                </div>

                {/* 13. Top Articles Placeholder */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h2 className="text-xl font-bold mb-2">Top Articles</h2>
                    <p className="text-sm text-slate-500">[To be implemented: Grid of blog/news posts]</p>
                </div>
            </div>

            <SupportSection />
        </main>
    );
};

export default BuyPage;
