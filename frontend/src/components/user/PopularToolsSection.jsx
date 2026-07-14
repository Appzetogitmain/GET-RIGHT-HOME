import React, { useState } from 'react';
import { Lightbulb, Calculator, Map, Building, IndianRupee, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PopularToolsModals from './PopularToolsModals';

const PopularToolsSection = () => {
    const navigate = useNavigate();
    const [activeTool, setActiveTool] = useState(null);

    const tools = [
        {
            id: 'budget',
            title: 'Budget Calculator',
            subtitle: 'Check your affordability range for buying home',
            icon: <IndianRupee size={24} className="text-[#F97316]" strokeWidth={2.5} />,
            bgColor: 'bg-[#FFF7F0]',
            iconBg: 'bg-[#FFEDDF]'
        },
        {
            id: 'emi',
            title: 'EMI Calculator',
            subtitle: 'Calculate your home loan EMI',
            icon: <Calculator size={24} className="text-[#D97706]" strokeWidth={2.5} />,
            bgColor: 'bg-[#FFFBF0]',
            iconBg: 'bg-[#FFF5D6]'
        },
        {
            id: 'loan',
            title: 'Loan Eligibility',
            subtitle: 'Check your eligibility for home loan',
            icon: <Building size={24} className="text-[#0284C7]" strokeWidth={2.5} />,
            bgColor: 'bg-[#F0F9FF]',
            iconBg: 'bg-[#E0F2FE]'
        },
        {
            id: 'area',
            title: 'Area Converter',
            subtitle: 'Convert property area into different units',
            icon: <Map size={24} className="text-[#16A34A]" strokeWidth={2.5} />,
            bgColor: 'bg-[#F0FDF4]',
            iconBg: 'bg-[#DCFCE7]'
        }
    ];

    return (
        <section className="mb-6 w-full md:px-0">
            <div className="bg-[#F4F7F9] md:rounded-3xl py-6 pl-6 border border-slate-100">
                <div className="flex items-center justify-between mb-6 pr-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#1A65EB] rounded-[10px] flex items-center justify-center text-white shadow-sm">
                            <Lightbulb size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-[18px] font-bold text-[#0B1A3A] leading-tight">Use popular tools</h2>
                            <p className="text-[13px] text-slate-500 mt-0.5">Go from browsing to buying</p>
                        </div>
                    </div>
                    <button className="text-[#1A65EB] font-bold text-sm hover:underline">View All</button>
                </div>

                {/* Horizontally scrolling list on mobile, grid on desktop */}
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 md:grid md:grid-cols-2 lg:grid-cols-4 scrollbar-hide pr-6">
                    {tools.map(tool => (
                        <div 
                            key={tool.id} 
                        onClick={() => {
                            if (tool.id === 'emi') navigate('/home-loan-emi-calculator');
                            else if (tool.id === 'loan') navigate('/home-loan-eligibility-calculator');
                            else setActiveTool(tool.id);
                        }}
                            className="shrink-0 snap-center w-[200px] md:w-auto bg-white rounded-2xl p-5 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)] border border-slate-100 cursor-pointer hover:shadow-md transition-shadow group flex flex-col items-center text-center"
                        >
                            <div className={`w-[85px] h-[85px] rounded-full flex items-center justify-center mb-5 transition-transform group-hover:scale-105 ${tool.bgColor}`}>
                                <div className={`w-[45px] h-[45px] rounded-2xl flex items-center justify-center ${tool.iconBg}`}>
                                    {tool.icon}
                                </div>
                            </div>
                            <h3 className="font-bold text-[#0B1A3A] text-[15px] mb-2 flex items-center gap-1 group-hover:text-[#1A65EB] transition-colors">
                                {tool.title} <ArrowRight size={16} />
                            </h3>
                            <p className="text-[12px] text-slate-500 leading-relaxed px-1">
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
