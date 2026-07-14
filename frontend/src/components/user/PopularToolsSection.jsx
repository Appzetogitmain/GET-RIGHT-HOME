import React, { useState } from 'react';
import { Lightbulb, Calculator, Map, Building, IndianRupee, ArrowRight } from 'lucide-react';
import PopularToolsModals from './PopularToolsModals';

const PopularToolsSection = () => {
    const [activeTool, setActiveTool] = useState(null);

    const tools = [
        {
            id: 'budget',
            title: 'Budget Calculator',
            subtitle: 'Check your affordability range for buying home',
            icon: <IndianRupee size={24} className="text-orange-600" />,
            bgColor: 'bg-orange-50',
            iconBg: 'bg-orange-100'
        },
        {
            id: 'emi',
            title: 'EMI Calculator',
            subtitle: 'Calculate your home loan EMI',
            icon: <Calculator size={24} className="text-amber-600" />,
            bgColor: 'bg-amber-50',
            iconBg: 'bg-amber-100'
        },
        {
            id: 'loan',
            title: 'Loan Eligibility',
            subtitle: 'Check your eligibility for home loan',
            icon: <Building size={24} className="text-blue-600" />,
            bgColor: 'bg-blue-50',
            iconBg: 'bg-blue-100'
        },
        {
            id: 'area',
            title: 'Area Converter',
            subtitle: 'Convert property area into different units',
            icon: <Map size={24} className="text-emerald-600" />,
            bgColor: 'bg-emerald-50',
            iconBg: 'bg-emerald-100'
        }
    ];

    return (
        <section className="mb-6 w-full md:px-0">
            <div className="bg-[#F4F7F9] md:rounded-3xl p-6 border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg text-white">
                            <Lightbulb size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Use popular tools</h2>
                            <p className="text-sm text-slate-500">Go from browsing to buying</p>
                        </div>
                    </div>
                    <button className="text-blue-600 font-bold text-sm hover:underline">View All</button>
                </div>

                {/* Horizontally scrolling list on mobile, grid on desktop */}
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 scrollbar-hide">
                    {tools.map(tool => (
                        <div 
                            key={tool.id} 
                            onClick={() => setActiveTool(tool.id)}
                            className="shrink-0 snap-center w-[220px] md:w-auto bg-white rounded-xl p-5 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow group flex flex-col items-center text-center"
                        >
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-105 ${tool.bgColor}`}>
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${tool.iconBg}`}>
                                    {tool.icon}
                                </div>
                            </div>
                            <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                                {tool.title} <ArrowRight size={16} />
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                {tool.subtitle}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <PopularToolsModals activeTool={activeTool} onClose={() => setActiveTool(null)} />
        </section>
    );
};

export default PopularToolsSection;
