import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ArrowLeft, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AreaConverterPage = () => {
    const navigate = useNavigate();
    
    // Area Conversion State
    const [inputValue, setInputValue] = useState(1);
    const [inputUnit, setInputUnit] = useState('Square Feet');
    const [outputValue, setOutputValue] = useState(0.092903);
    const [outputUnit, setOutputUnit] = useState('Square Meter');
    const [activeFaqIndex, setActiveFaqIndex] = useState(null);

    // Standard Multipliers to Square Feet
    const conversionRates = {
        'Square Feet': 1,
        'Square Meter': 10.7639,
        'Square Yard': 9,
        'Acre': 43560,
        'Hectare': 107639.1,
        'Bigha': 27000,
        'Biswa': 1350,
        'Guntha': 1089,
        'Ground': 2400,
        'Kanal': 5445
    };

    const unitsList = Object.keys(conversionRates);

    // Format numbers cleanly
    const formatNumber = (num) => {
        if (isNaN(num)) return 0;
        // Show up to 4 decimal places without trailing zeros
        return parseFloat(num.toFixed(4));
    };

    const handleCalculate = (value, fromUnit, toUnit) => {
        if (!value || isNaN(value)) {
            setOutputValue(0);
            return;
        }
        
        // Convert input to Square Feet first
        const inSqFt = Number(value) * conversionRates[fromUnit];
        // Convert Square Feet to output unit
        const result = inSqFt / conversionRates[toUnit];
        
        setOutputValue(formatNumber(result));
    };

    // Listeners for changes
    useEffect(() => {
        handleCalculate(inputValue, inputUnit, outputUnit);
    }, [inputValue, inputUnit, outputUnit]);

    const handleSwap = () => {
        setInputUnit(outputUnit);
        setOutputUnit(inputUnit);
        setInputValue(outputValue);
    };

    const faqData = [
        {
            q: "What is the standard unit of measuring land in India?",
            a: "While Square Feet, Square Yards, and Square Meters are globally accepted and commonly used across Indian real estate, agricultural lands in India are typically measured in traditional units like Bigha, Biswa, Kanal, and Guntha depending on the state."
        },
        {
            q: "How to use the GetRightHome Area Converter tool?",
            a: "Using the GetRightHome Area Converter is very simple. Enter the property area in the first box, select the unit you have (e.g., Square Feet), and then select the unit you want to convert it to (e.g., Acres) in the second box. The tool instantly displays the converted value."
        },
        {
            q: "Are local measurement units legally recognized?",
            a: "Yes, local units like Bigha and Biswa are widely used and recognized in land records (Jamabandi or Khatauni) by local authorities. However, during official registrations, they are often documented alongside standard units like Hectares or Acres to ensure uniformity."
        },
        {
            q: "What is the difference between built-up area and carpet area?",
            a: "Carpet area is the actual usable floor area inside your property where you can lay a carpet. Built-up area includes the carpet area plus the space occupied by the inner and outer walls. Super built-up area additionally includes common areas like lobbies, lifts, and staircases."
        }
    ];

    const popularConversions = [
        { from: "1 Square Yard", to: "9 Square Feet" },
        { from: "1 Square Meter", to: "10.76 Square Feet" },
        { from: "1 Acre", to: "43,560 Square Feet" },
        { from: "1 Hectare", to: "2.47 Acres" },
        { from: "1 Bigha", to: "27,000 Sq.Ft (Varies by State)" },
        { from: "1 Guntha", to: "1,089 Square Feet" }
    ];

    return (
        <div className="min-h-screen bg-[#f3f4f6] font-sans pb-24">
            
            {/* Hero Section */}
            <div className="bg-[#090936] w-full pt-16 md:pt-6 pb-20 md:pb-24 px-4 md:px-10 relative">
                
                {/* Back Button */}
                <button 
                    onClick={() => navigate(-1)} 
                    className="absolute top-6 left-4 md:top-6 md:left-6 text-white hover:text-[#00a699] flex items-center text-sm font-medium transition-colors z-20"
                >
                    <ArrowLeft size={20} className="mr-1" />
                    Back
                </button>

                {/* Desktop Top Links */}
                <div className="hidden md:flex justify-end gap-10 text-white text-xs font-bold tracking-wider mb-8 relative z-10">
                    <button onClick={() => document.getElementById('converter')?.scrollIntoView({behavior: 'smooth'})} className="cursor-pointer hover:text-[#00a699] transition-colors">AREA CONVERTER</button>
                    <button onClick={() => document.getElementById('about')?.scrollIntoView({behavior: 'smooth'})} className="cursor-pointer hover:text-[#00a699] transition-colors">ABOUT UNITS</button>
                    <button onClick={() => document.getElementById('popular')?.scrollIntoView({behavior: 'smooth'})} className="cursor-pointer hover:text-[#00a699] transition-colors">POPULAR CONVERSIONS</button>
                    <button onClick={() => document.getElementById('faqs')?.scrollIntoView({behavior: 'smooth'})} className="cursor-pointer hover:text-[#00a699] transition-colors">FAQS</button>
                </div>

                <div className="max-w-[1100px] mx-auto flex flex-col items-center text-center pb-4 md:pb-8 relative z-10">
                    <h1 className="text-3xl md:text-[42px] leading-tight font-bold text-white mb-3">
                        Property Area <span className="text-[#00a699]">Converter</span>
                    </h1>
                    <p className="text-gray-300 text-sm md:text-base max-w-2xl mx-auto">
                        Quickly convert property areas into Square Feet, Acres, Hectares, Bigha, and more using GetRightHome's accurate area calculator.
                    </p>
                </div>
            </div>

            {/* Main Content Area (Pulled up into the hero) */}
            <div className="max-w-[1100px] mx-auto px-4 md:px-6 -mt-16 md:-mt-20 relative z-20 space-y-8">

                {/* 1. Converter Calculator Card */}
                <div id="converter" className="bg-white shadow-xl border border-gray-100 rounded-lg overflow-hidden scroll-mt-24 p-6 md:p-10">
                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
                        
                        {/* Input Side */}
                        <div className="w-full flex-1 border border-gray-300 rounded-md p-4 bg-gray-50 focus-within:border-[#00a699] focus-within:bg-white transition-colors relative">
                            <label className="text-[12px] font-bold text-gray-500 uppercase tracking-wider block mb-3">Value To Convert</label>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <input 
                                    type="number" 
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    className="w-full sm:w-1/2 text-2xl font-bold text-gray-900 bg-transparent outline-none border-b border-gray-300 pb-2 focus:border-[#00a699]"
                                />
                                <select 
                                    value={inputUnit}
                                    onChange={(e) => setInputUnit(e.target.value)}
                                    className="w-full sm:w-1/2 text-lg font-medium text-gray-700 bg-transparent outline-none border-b border-gray-300 pb-2 cursor-pointer focus:border-[#00a699]"
                                >
                                    {unitsList.map(unit => (
                                        <option key={`in-${unit}`} value={unit}>{unit}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Swap Button */}
                        <button 
                            onClick={handleSwap}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-3 rounded-full transition-colors shadow-sm transform hover:scale-105 active:scale-95"
                            title="Swap Units"
                        >
                            <ArrowRightLeft size={24} />
                        </button>

                        {/* Output Side */}
                        <div className="w-full flex-1 border border-gray-300 rounded-md p-4 bg-[#f8fffe] focus-within:border-[#00a699] transition-colors relative">
                            <label className="text-[12px] font-bold text-[#00a699] uppercase tracking-wider block mb-3">Converted Value</label>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="w-full sm:w-1/2 text-2xl font-bold text-gray-900 border-b border-gray-300 pb-2 truncate overflow-hidden">
                                    {outputValue}
                                </div>
                                <select 
                                    value={outputUnit}
                                    onChange={(e) => setOutputUnit(e.target.value)}
                                    className="w-full sm:w-1/2 text-lg font-medium text-gray-700 bg-transparent outline-none border-b border-gray-300 pb-2 cursor-pointer focus:border-[#00a699]"
                                >
                                    {unitsList.map(unit => (
                                        <option key={`out-${unit}`} value={unit}>{unit}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 2. Popular Conversions Grid */}
                <div id="popular" className="bg-white shadow-md border border-gray-200 rounded-lg overflow-hidden scroll-mt-24">
                    <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                        <h2 className="text-xl font-bold text-gray-800">Popular Area Conversions</h2>
                    </div>
                    <div className="p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {popularConversions.map((conv, idx) => (
                            <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex items-center justify-between shadow-sm">
                                <span className="font-semibold text-gray-800 text-[15px]">{conv.from}</span>
                                <ArrowRightLeft size={14} className="text-gray-400" />
                                <span className="font-bold text-[#00a699] text-[15px]">{conv.to}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. About Land Measurement Units */}
                <div id="about" className="bg-white shadow-md border border-gray-200 rounded-lg overflow-hidden scroll-mt-24 p-6 md:p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">About Land Measurement Units in India</h2>
                    <div className="text-gray-600 space-y-4 leading-relaxed text-[15px]">
                        <p>
                            India has a highly diversified system of land measurement. While urban areas and formal real estate markets predominantly rely on standard units like <strong>Square Feet, Square Yards, Square Meters, Acres, and Hectares</strong>, agricultural lands and rural areas often use local terminology that dates back centuries.
                        </p>
                        <p>
                            Units such as <strong>Bigha, Biswa, Marla, Kanal, and Guntha</strong> are heavily used across different Indian states. For instance, a 'Bigha' in Punjab varies significantly in square feet compared to a 'Bigha' in West Bengal or Rajasthan. GetRightHome's Area Converter helps you bridge this gap by offering a standardized, instant conversion to globally recognized metrics.
                        </p>
                        <div className="bg-[#f8fffe] border-l-4 border-[#00a699] p-4 rounded-r-md mt-6">
                            <h4 className="font-bold text-gray-800 mb-1">GetRightHome Tip:</h4>
                            <p className="text-sm">Always ensure that your property documents (Title Deeds, Sale Agreements) specify the exact area in globally recognized units (Sq.ft or Sq.m) alongside the local units to prevent any legal ambiguities in the future.</p>
                        </div>
                    </div>
                </div>

                {/* 4. FAQs Section */}
                <div id="faqs" className="bg-white shadow-md border border-gray-200 rounded-lg overflow-hidden scroll-mt-24 mb-16">
                    <div className="px-6 py-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800">FAQs on Area Measurement Units</h2>
                    </div>
                    <div className="p-2 md:p-6 divide-y divide-gray-100">
                        {faqData.map((faq, idx) => (
                            <div key={idx}>
                                <button 
                                    onClick={() => setActiveFaqIndex(activeFaqIndex === idx ? null : idx)}
                                    className="w-full flex justify-between items-center py-4 px-4 hover:bg-gray-50 text-left"
                                >
                                    <span className="font-medium text-gray-800 text-[15px] pr-4">{faq.q}</span>
                                    {activeFaqIndex === idx ? <ChevronUp className="text-[#00a699] shrink-0" size={20} /> : <ChevronDown className="text-gray-400 shrink-0" size={20} />}
                                </button>
                                {activeFaqIndex === idx && (
                                    <div className="px-4 pb-5 text-gray-600 text-[14px] leading-relaxed">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AreaConverterPage;
