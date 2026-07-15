import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PopularToolsSection from '../../components/user/PopularToolsSection';
import RecommendInsights from '../../components/user/RecommendInsights';
import DemandInCitySection from '../../components/user/DemandInCitySection';

const ToolsAndInsightsPage = () => {
    const navigate = useNavigate();

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-[#F4F7F9] font-sans pb-12">
            
            {/* Header */}
            <div className="bg-white border-b border-slate-200 py-4 px-4 sticky top-0 z-50 flex items-center shadow-sm">
                <button 
                    onClick={() => navigate(-1)} 
                    className="text-[#0B1A3A] hover:text-[#1A65EB] flex items-center text-sm font-bold transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back
                </button>
                <h1 className="ml-6 text-lg font-bold text-[#0B1A3A]">Tools & Insights</h1>
            </div>

            {/* Main Content Container */}
            <div className="w-full">
                <div className="max-w-7xl mx-auto px-4 md:px-6 mt-6 flex flex-col gap-6">
                    
                    {/* 1. Demands in Bengaluru */}
                    <div id="demand-city-section" className="w-full">
                        <DemandInCitySection city="Bengaluru" />
                    </div>

                    {/* 2. Recommended Insights */}
                    <div id="recommended-insights-section" className="w-full">
                        <RecommendInsights transactionType="Buy" />
                    </div>

                    {/* 3. Popular Tools (Without View All button) */}
                    <div id="popular-tools-section" className="w-full">
                        <PopularToolsSection hideViewAll={true} />
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ToolsAndInsightsPage;
