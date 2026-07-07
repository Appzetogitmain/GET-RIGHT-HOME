import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Building, Building2, Key, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const BHK_OPTIONS = [
    { id: '1bhk', title: '1 RK / 1 BHK', filters: ['1 BHK', '1 RK'], icon: Home, bg: 'bg-blue-50', color: 'text-blue-600' },
    { id: '2bhk', title: '2 BHK', filters: ['2 BHK'], icon: Building, bg: 'bg-emerald-50', color: 'text-emerald-600' },
    { id: '3bhk', title: '3 BHK', filters: ['3 BHK'], icon: Building2, bg: 'bg-orange-50', color: 'text-orange-600' },
    { id: '4bhk', title: '4 BHK', filters: ['4 BHK'], icon: Key, bg: 'bg-purple-50', color: 'text-purple-600' },
    { id: '4plus', title: '4+ BHK', filters: ['> 4 BHK', '5 BHK', '6 BHK'], icon: Star, bg: 'bg-rose-50', color: 'text-rose-600' }
];

const BhkChoiceSection = ({ transactionType = 'buy' }) => {
    const navigate = useNavigate();

    const handleCardClick = (option) => {
        // Build the query string for the search page
        // We will pass the selected BHK filters as a comma-separated string
        const bhkQuery = option.filters.join(',');
        navigate(`/search?transactionType=${transactionType}&bhk=${encodeURIComponent(bhkQuery)}`);
        window.scrollTo(0, 0);
    };

    return (
        <section className="py-6 px-4 md:px-8 mb-4">
            <div className="relative bg-[#FDF8F5] rounded-3xl overflow-hidden shadow-sm border border-orange-50 h-[180px] md:h-[200px] flex items-center">
                
                {/* 1. Static Title on the Left */}
                <div className="absolute left-5 top-0 bottom-0 flex flex-col justify-center w-[120px] md:w-[150px] z-10 pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                        <Building2 size={20} className="text-orange-500" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">
                        BHK<br/>Choice<br/>in mind?
                    </h2>
                </div>

                {/* 2. Scrolling Container (Z-index higher than title) */}
                <div 
                    className="absolute inset-0 z-20 flex overflow-x-auto scrollbar-hide snap-x snap-mandatory items-center h-full"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {/* The Transparent Spacer - Exact width of the title section to push cards to the right initially */}
                    <div className="w-[140px] md:w-[180px] shrink-0 snap-start h-full"></div>

                    {/* Cards */}
                    <div className="flex gap-4 pr-6 items-center h-full">
                        {BHK_OPTIONS.map((option, idx) => (
                            <motion.div
                                key={option.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleCardClick(option)}
                                className="shrink-0 snap-center w-[130px] md:w-[150px] h-[130px] md:h-[140px] bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-shadow"
                            >
                                <div className={`w-12 h-12 rounded-full ${option.bg} flex items-center justify-center mb-3`}>
                                    <option.icon size={22} className={option.color} />
                                </div>
                                <h3 className="font-bold text-gray-800 text-[13px] md:text-sm text-center">
                                    {option.title}
                                </h3>
                                <p className="text-[10px] md:text-xs text-gray-400 font-medium mt-1">
                                    Explore Options
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
};

export default BhkChoiceSection;
