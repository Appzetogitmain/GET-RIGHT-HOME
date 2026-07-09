import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Info } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DemandInCitySection = ({ city }) => {
    const navigate = useNavigate();
    const [demandData, setDemandData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDemandData = async () => {
            if (!city) return;
            setLoading(true);
            try {
                const res = await axios.get(`${API_URL}/api/public/insights/demand/${city}`);
                if (res.data.success) {
                    setDemandData(res.data.demandData);
                }
            } catch (error) {
                console.error("Failed to fetch demand data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDemandData();
    }, [city]);

    if (loading) {
        return (
            <div className="py-6 animate-pulse">
                <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="min-w-[300px] h-64 bg-slate-100 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!demandData || demandData.length === 0) {
        return null; // Don't show section if no data
    }

    const handleLocalityClick = (name) => {
        navigate(`/locality-insights/${encodeURIComponent(city.toLowerCase())}/${encodeURIComponent(name)}`);
    };

    const handleViewMore = (propertyType) => {
        // Navigates to search page with the correct city and property type filter
        navigate(`/search?city=${encodeURIComponent(city)}&subType=${encodeURIComponent(propertyType)}`);
    };

    return (
        <div className="py-2 mb-6">
            <div className="mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-[22px] md:text-2xl font-bold text-[#091E42]">
                        Demand in {city}
                    </h2>
                    <Info className="w-5 h-5 text-slate-400 cursor-pointer" />
                </div>
                <p className="text-[14px] text-[#42526E] mt-1">
                    Where are buyers searching in {city}
                </p>
            </div>

            <div className="bg-[#F4F7FB] rounded-2xl p-4 sm:p-5">
                <div className="flex overflow-x-auto gap-4 pb-2 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {demandData.map((typeData, idx) => (
                        <div 
                            key={idx} 
                            className="w-[280px] sm:w-[320px] flex-shrink-0 bg-white border border-[#DFE1E6] rounded-xl p-5 snap-center shadow-sm flex flex-col justify-between"
                        >
                            <div>
                                <h3 className="text-[16px] font-bold text-[#091E42]">{typeData.propertyType}</h3>
                                <p className="text-[12px] text-[#7A869A] mb-5">{typeData.subtitle}</p>

                                <div className="space-y-4">
                                    {typeData.localities.map((loc, i) => (
                                        <div 
                                            key={i} 
                                            className="cursor-pointer group flex gap-2"
                                            onClick={() => handleLocalityClick(loc.name)}
                                        >
                                            <span className="text-[#A5ADBA] font-bold text-[14px] w-5 pt-0.5">#{loc.rank}</span>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <span className="text-[#091E42] font-bold text-[14px] border-b border-dashed border-slate-400 leading-tight pb-[1px] group-hover:text-[#0052CC] transition-colors truncate">
                                                        {loc.name}
                                                    </span>
                                                    <span className="text-[#42526E] text-[12px] font-medium whitespace-nowrap pt-0.5">
                                                        {loc.percentage}% Searches
                                                    </span>
                                                </div>
                                                <div className="mt-2 h-[5px] bg-[#90C8FF] rounded-full" style={{ width: `${Math.max(loc.percentage, 5)}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-[#DFE1E6]">
                                <button 
                                    onClick={() => handleViewMore(typeData.propertyType)}
                                    className="text-[#0052CC] text-[14px] font-bold hover:underline transition-all"
                                >
                                    View more localities
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};

export default DemandInCitySection;
