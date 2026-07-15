import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ArrowLeft, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AreaConverterPage = () => {
    const navigate = useNavigate();
    
    // Area Conversion State
    const [inputValue, setInputValue] = useState(1);
    const [inputUnit, setInputUnit] = useState('Sq.feet (sq.ft)');
    const [outputValue, setOutputValue] = useState("");
    const [outputUnit, setOutputUnit] = useState('Sq.meter (sq.m)');
    
    // Dynamic Content State
    const [selectedPreset, setSelectedPreset] = useState(null);

    // FAQ State
    const [openFaq, setOpenFaq] = useState(null);

    const conversionRates = {
        'Sq.feet (sq.ft)': 1,
        'Sq.meter (sq.m)': 10.7639,
        'Sq.yard (sq.yd)': 9,
        'Gaj': 9,
        'Acre': 43560,
        'Hectare': 107639.1,
        'Bigha': 27000,
        'Biswa': 1350,
        'Guntha': 1089,
        'Ground': 2400,
        'Kanal': 5445,
        'Cent': 435.6,
        'Dismil': 435.6
    };

    const unitsList = Object.keys(conversionRates).sort();

    const indianStates = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
        "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
        "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
        "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
    ];

    const formatNumber = (num) => {
        if (isNaN(num)) return "";
        return parseFloat(num.toFixed(4));
    };

    const handleCalculate = (value, fromUnit, toUnit) => {
        if (value === "" || value === null || isNaN(value)) {
            setOutputValue("");
            return;
        }
        const inSqFt = Number(value) * conversionRates[fromUnit];
        const result = inSqFt / conversionRates[toUnit];
        setOutputValue(formatNumber(result));
    };

    useEffect(() => {
        handleCalculate(inputValue, inputUnit, outputUnit);
    }, [inputValue, inputUnit, outputUnit]);

    const handleSwap = () => {
        setInputUnit(outputUnit);
        setOutputUnit(inputUnit);
        if (selectedPreset) {
            setSelectedPreset({ from: outputUnit, to: inputUnit });
        }
    };

    const handlePresetClick = (from, to) => {
        setInputUnit(from);
        setOutputUnit(to);
        setInputValue(1);
        setSelectedPreset({ from, to });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleFaq = (index) => {
        if (openFaq === index) setOpenFaq(null);
        else setOpenFaq(index);
    };

    const genericFaqData = [
        {
            q: "Which land measurement units are used in North India?",
            a: "Some of the popular land measurement units used in North India are Bigha, Biswa, Biswansi, Killa, Ghumaon, Kanal, and Marla. These are primarily used in states like Haryana, Punjab, Delhi, Uttar Pradesh, and Rajasthan."
        },
        {
            q: "Which land measurement units are used in East India?",
            a: "In East India, particularly in states like Bihar, Assam, West Bengal, and Tripura, you will commonly find units like Chatak, Decimal, Dhur, Kattha, and Lecha used for both residential and agricultural land."
        },
        {
            q: "Which land measurement units are used in West India?",
            a: "In West Indian states, specifically Gujarat and Rajasthan, the most popular traditional land measurement units recorded in local land documents are Bigha, Biswa, and Guntha."
        },
        {
            q: "Which land measurement units are used in Central India?",
            a: "In Central India, particularly Madhya Pradesh and Chhattisgarh, Bigha is highly prevalent for rural lands, while Square Feet remains standard for urban real estate transactions."
        },
        {
            q: "Which land measurement units are used in South India?",
            a: "In South India (Bengaluru, Karnataka, Andhra Pradesh, Kerala, Tamil Nadu), units like Guntha, Cent, Ankanam, Ground, and Kuncham are popular. For example, Bengaluru properties frequently use Cents or Gunthas."
        }
    ];

    const getDynamicFaqs = (from, to) => {
        const fromName = from.split(' ')[0];
        const toName = to.split(' ')[0];
        const rate = formatNumber(conversionRates[from] / conversionRates[to]);
        const rate10 = formatNumber(10 * conversionRates[from] / conversionRates[to]);
        const rate50 = formatNumber(50 * conversionRates[from] / conversionRates[to]);
        
        return [
            {
                q: `How many ${toName}(s) is there in 1 ${fromName}(s)?`,
                a: `There is exactly ${rate} ${toName}(s) in 1 ${fromName}.`
            },
            {
                q: `How many ${fromName} in ${toName}?`,
                a: `1 ${toName} is equivalent to ${formatNumber(conversionRates[to] / conversionRates[from])} ${fromName}.`
            },
            {
                q: `How many ${toName} in 10 ${fromName}?`,
                a: `There are ${rate10} ${toName} in 10 ${fromName}.`
            },
            {
                q: `How many ${toName} in 50 ${fromName}?`,
                a: `There are ${rate50} ${toName} in 50 ${fromName}.`
            },
            {
                q: `What is ${fromName} and ${toName}?`,
                a: `${fromName} and ${toName} are both units of area measurement. While one might be an internationally recognized SI unit, the other could be a localized or imperial unit heavily used in specific regions like Bengaluru.`
            },
            {
                q: `How to convert ${fromName} to ${toName}?`,
                a: `To convert ${fromName} to ${toName}, simply multiply the value in ${fromName} by ${rate}.`
            },
            {
                q: `Which one is bigger, ${fromName} or ${toName}?`,
                a: conversionRates[from] > conversionRates[to] ? `${fromName} is larger than ${toName}.` : `${toName} is larger than ${fromName}.`
            }
        ];
    };

    const activeFaqData = selectedPreset ? getDynamicFaqs(selectedPreset.from, selectedPreset.to) : genericFaqData;

    const popularConversions = [
        { from: "Hectare", to: "Acre", label: "Hectare to Acre" },
        { from: "Acre", to: "Hectare", label: "Acre to Hectare" },
        { from: "Sq.feet (sq.ft)", to: "Cent", label: "Square Feet to Cent" },
        { from: "Sq.feet (sq.ft)", to: "Sq.meter (sq.m)", label: "Square Feet to Square Meter" },
        { from: "Sq.feet (sq.ft)", to: "Sq.yard (sq.yd)", label: "Square Feet to Square Yard" },
        { from: "Sq.feet (sq.ft)", to: "Gaj", label: "Square Feet to Gaj" }
    ];

    const renderDynamicContent = () => {
        if (!selectedPreset) return null;

        const { from, to } = selectedPreset;
        const fromBaseName = from.split(' ')[0];
        const toBaseName = to.split(' ')[0];
        const rate = formatNumber(conversionRates[from] / conversionRates[to]);

        return (
            <div className="animate-fadeIn mb-12 border-b border-gray-200 pb-12">
                <span className="text-[12px] font-bold text-[#7a869a] uppercase tracking-wider mb-2 block">Understanding Units</span>
                <h2 className="text-[24px] font-bold text-[#091e42] mb-6">About {fromBaseName} Units</h2>
                <p className="text-[14px] text-[#42526e] leading-[1.6] mb-6">
                    1 {fromBaseName} is equal to {rate} {toBaseName} and is commonly used to measure land. {fromBaseName} is a widely recognized unit of area measurement. It can be easily converted to other units using simple mathematical calculations or a reliable land measurement unit calculator.
                </p>

                <h3 className="text-[16px] font-bold text-[#091e42] mb-2 mt-8">{fromBaseName} to {toBaseName} calculation formula</h3>
                <p className="text-[14px] text-[#42526e] leading-[1.6] mb-6 bg-gray-50 p-3 border border-gray-100 rounded inline-block">
                    {toBaseName} = {fromBaseName} x {rate}
                </p>

                <h2 className="text-[24px] font-bold text-[#091e42] mb-6 mt-10">About {toBaseName} Units</h2>
                <p className="text-[14px] text-[#42526e] leading-[1.6] mb-6">
                    {toBaseName} is another highly crucial unit of land measurement. It is heavily utilized in property listings, agricultural land records, and real estate transactions across India. Understanding the precise value of {toBaseName} ensures accurate property valuations. 1 {toBaseName} is exactly equal to {formatNumber(conversionRates[to] / conversionRates[from])} {fromBaseName}.
                </p>

                <h3 className="text-[20px] font-bold text-[#091e42] mb-4 mt-10">Value of {fromBaseName} in other units</h3>
                <div className="border border-[#ebecf0] rounded overflow-hidden max-w-xl">
                    <table className="w-full text-left text-[14px]">
                        <thead className="bg-[#f4f5f7] border-b border-[#ebecf0]">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-[#091e42]">Unit of Area</th>
                                <th className="px-4 py-3 font-semibold text-[#091e42]">Conversion Unit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ebecf0]">
                            {['Acre', 'Bigha', 'Cent', 'Dismil', 'Biswa'].map(u => {
                                if (u === fromBaseName) return null;
                                return (
                                    <tr key={u} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 text-[#42526e]">1 {fromBaseName}</td>
                                        <td className="px-4 py-4 text-[#42526e]">{formatNumber(conversionRates[from] / conversionRates[u])} {u.toLowerCase()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderGenericContent = () => (
        <div id="about">
            <span className="text-[12px] font-bold text-[#7a869a] uppercase tracking-wider mb-2 block">Understanding Units</span>
            <h2 className="text-[24px] font-bold text-[#091e42] mb-6">About Land Measurement Units</h2>
            <p className="text-[14px] text-[#42526e] leading-[1.6] mb-6">
                Land measurement in India has always been done using various local and native measurement units such as Bigha, Ground, Kanal, etc, depending upon the state. These are locally set benchmarks, which have been in usage for a long time. These unit measurements vary greatly across regions, which is why converting them to international standard units, or globally accepted units, also known as SI units is of paramount importance. In addition, to understand the exact area of land as well as to calculate the value of land, converting local units into SI units, using a land area calculator, is advisable.
            </p>
            
            <p className="text-[14px] text-[#42526e] leading-[1.6] mb-10">
                Some of the common land measurement units across India are hectares, acres, square meters, square yards. Other than this, Bigha, Marla, Cent, Guntha, Ground are regional units and their size varies from state to state. For instance, in Bengaluru, buyers often encounter property dimensions quoted in Guntha or Cents.
            </p>

            <div className="space-y-6">
                <div>
                    <h3 className="text-[16px] font-bold text-[#091e42] mb-1">Land area measurement units used in North India</h3>
                    <p className="text-[14px] text-[#42526e] leading-[1.6]">
                        Bigha, Biswa, Biswansi, Killa, Ghumaon, Kanal are popular land measurement units used in North Indian States.
                    </p>
                </div>
                
                <div>
                    <h3 className="text-[16px] font-bold text-[#091e42] mb-1">Land area measurement units used in South India</h3>
                    <p className="text-[14px] text-[#42526e] leading-[1.6]">
                        Ankanam, Cent, Ground, Guntha, Kuncham are popular land measurement units used in South Indian States. In Bengaluru, Guntha and Cent are heavily used for plots and agricultural lands.
                    </p>
                </div>

                <div>
                    <h3 className="text-[16px] font-bold text-[#091e42] mb-1">Land area measurement units used in East India</h3>
                    <p className="text-[14px] text-[#42526e] leading-[1.6]">
                        Chatak, Decimal, Dhur, Kattha, Lecha are popular land measurement units used in East Indian States.
                    </p>
                </div>

                <div>
                    <h3 className="text-[16px] font-bold text-[#091e42] mb-1">Land area measurement units used in West India</h3>
                    <p className="text-[14px] text-[#42526e] leading-[1.6]">
                        Bigha, Biswa and Guntha are popular land measurement units used in West Indian States.
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white font-sans overflow-x-hidden">
            
            {/* Minimal Header for Back Button (Mobile optimized) */}
            <div className="border-b border-[#ebecf0] py-3 px-4 bg-white sticky top-0 z-50 flex items-center">
                <button 
                    onClick={() => {
                        if (selectedPreset) setSelectedPreset(null);
                        else navigate(-1);
                    }} 
                    className="text-[#091e42] hover:text-[#0052cc] flex items-center text-[14px] font-medium transition-colors"
                >
                    <ArrowLeft size={18} className="mr-1" />
                    Back
                </button>
            </div>

            {/* Hero Section */}
            <div className="w-full bg-[#fdfaf5] pt-10 md:pt-14 pb-16 md:pb-20 px-4 md:px-10 relative overflow-hidden flex flex-col items-center">
                
                {/* Cityscape Background Overlay */}
                <div 
                    className="absolute bottom-0 left-0 w-full h-[180px] opacity-10 pointer-events-none" 
                    style={{ 
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 20' preserveAspectRatio='none'%3E%3Cpath fill='%23e0a800' d='M0,20 L0,15 L5,15 L5,10 L10,10 L10,18 L15,18 L15,8 L20,8 L20,12 L25,12 L25,5 L30,5 L30,16 L35,16 L35,12 L40,12 L40,14 L45,14 L45,8 L50,8 L50,18 L55,18 L55,10 L60,10 L60,15 L65,15 L65,6 L70,6 L70,16 L75,16 L75,12 L80,12 L80,18 L85,18 L85,8 L90,8 L90,14 L95,14 L95,10 L100,10 L100,20 Z'/%3E%3C/svg%3E")`, 
                        backgroundSize: '100% 100%', 
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'bottom' 
                    }}
                ></div>
                
                <div className="max-w-[1200px] w-full flex flex-col lg:flex-row gap-10 items-center justify-center relative z-10 mx-auto">
                    
                    {/* Calculator Card */}
                    <div id="converter" className="bg-white shadow-[0_2px_15px_rgba(0,0,0,0.06)] border border-[#ebecf0] rounded p-6 md:p-8 w-full max-w-[550px] relative">
                        
                        {/* Title and Illustration wrapper (flexed for mobile) */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-[20px] md:text-[24px] font-bold text-[#091e42] mb-1">
                                    {selectedPreset ? `${selectedPreset.from.split(' ')[0]} to ${selectedPreset.to.split(' ')[0]} Calculator` : "Area Converter"}
                                </h1>
                                <p className="text-[13px] text-[#7a869a]">Enter the value and select desired unit</p>
                            </div>
                            
                            {/* Tiny Mobile-friendly Illustration placed right next to title */}
                            <div className="block lg:hidden relative shrink-0 flex items-end ml-4">
                                <div className="relative w-[100px] h-[70px]">
                                    {/* Blue House */}
                                    <div className="absolute bottom-0 left-0 w-12 h-10 bg-[#007aff] rounded-sm"></div>
                                    <div className="absolute bottom-10 left-0 w-12 h-6 bg-[#005bb5]" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                                    <div className="absolute bottom-4 left-2 w-3 h-4 bg-[#ccf0ff]"></div>
                                    
                                    {/* Yellow Calculator */}
                                    <div className="absolute bottom-2 right-0 w-8 h-10 bg-[#fbd594] border-2 border-[#fff] rounded flex flex-col items-center justify-center p-1 z-20 shadow-sm">
                                        <div className="w-full h-2 bg-white rounded-[1px] mb-1 opacity-50"></div>
                                        <div className="grid grid-cols-3 gap-0.5 w-full">
                                            {[...Array(9)].map((_, i) => (
                                                <div key={i} className="w-full h-1 bg-white rounded-[1px]"></div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 right-8 w-1 h-8 bg-[#e0a800]"></div>
                                    <div className="absolute bottom-8 right-6 w-4 h-4 rounded-full bg-[#fce6a8]"></div>
                                </div>
                            </div>
                        </div>
                        
                        {/* State Dropdown */}
                        <div className="mb-6 relative border border-[#dfe1e6] rounded">
                            <select className="w-full text-[14px] font-medium text-[#42526e] bg-transparent outline-none appearance-none cursor-pointer p-3 pr-8">
                                <option value="" disabled selected>Select state</option>
                                {indianStates.map(state => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-3.5 text-[#42526e] pointer-events-none" />
                        </div>
                        <p className="text-[11px] text-[#7a869a] mt-[-16px] mb-6 ml-1">States use different units of measurements like - bigha, cent, etc.</p>

                        {/* From / To Container */}
                        <div className="relative">
                            
                            {/* FROM Field */}
                            <div className="flex items-center border border-[#dfe1e6] rounded mb-3 bg-white">
                                <span className="text-[14px] text-[#42526e] w-[60px] md:w-[70px] shrink-0 font-medium pl-3">From</span>
                                <input 
                                    type="number" 
                                    placeholder=""
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    className="flex-1 text-[15px] text-[#091e42] outline-none text-right px-2 md:px-4 bg-transparent w-full min-w-0"
                                />
                                <div className="h-full w-px bg-[#dfe1e6] mx-0"></div>
                                <div className="relative w-[130px] md:w-[150px] shrink-0">
                                    <select 
                                        value={inputUnit}
                                        onChange={(e) => setInputUnit(e.target.value)}
                                        className="w-full text-[14px] font-medium text-[#42526e] bg-transparent outline-none appearance-none cursor-pointer truncate pl-4 py-3 pr-8"
                                    >
                                        <option value="" disabled>Select unit</option>
                                        {unitsList.map(unit => (
                                            <option key={`in-${unit}`} value={unit}>{unit}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-3.5 text-[#42526e] pointer-events-none" />
                                </div>
                            </div>

                            {/* Swap Button strictly matching the screenshot style */}
                            <div className="flex justify-center -my-3 z-10 relative">
                                <button 
                                    onClick={handleSwap}
                                    className="bg-white border border-[#dfe1e6] text-[#0052cc] rounded shadow-sm p-1.5 hover:bg-gray-50 transition-colors"
                                >
                                    <ArrowUpDown size={14} />
                                </button>
                            </div>

                            {/* TO Field */}
                            <div className="flex items-center border border-[#dfe1e6] rounded mt-0 bg-white">
                                <span className="text-[14px] text-[#42526e] w-[60px] md:w-[70px] shrink-0 font-medium pl-3">To</span>
                                <div className="flex-1 text-[15px] text-[#091e42] outline-none text-right px-2 md:px-4 truncate h-full flex items-center justify-end py-3">
                                    {outputValue}
                                </div>
                                <div className="h-full w-px bg-[#dfe1e6] mx-0"></div>
                                <div className="relative w-[130px] md:w-[150px] shrink-0">
                                    <select 
                                        value={outputUnit}
                                        onChange={(e) => setOutputUnit(e.target.value)}
                                        className="w-full text-[14px] font-medium text-[#42526e] bg-transparent outline-none appearance-none cursor-pointer truncate pl-4 py-3 pr-8"
                                    >
                                        <option value="" disabled>Select unit</option>
                                        {unitsList.map(unit => (
                                            <option key={`out-${unit}`} value={unit}>{unit}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-3.5 text-[#42526e] pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 text-[11px] text-[#7a869a] italic">
                            *This tool is for informational puproses only
                        </div>
                    </div>

                    {/* Hero Illustration (Desktop only, right side) */}
                    <div className="hidden lg:block relative shrink-0 ml-10">
                        {/* Custom House & Calculator Illustration mimicking the screenshot */}
                        <div className="relative w-[280px] h-[200px]">
                            {/* Blue House */}
                            <div className="absolute bottom-0 left-4 w-32 h-24 bg-[#007aff] rounded-sm"></div>
                            <div className="absolute bottom-24 left-4 w-32 h-16 bg-[#005bb5]" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                            <div className="absolute bottom-10 left-8 w-6 h-8 bg-[#ccf0ff]"></div>
                            
                            {/* Trees */}
                            <div className="absolute bottom-0 left-[-20px] w-2 h-10 bg-[#e0a800]"></div>
                            <div className="absolute bottom-10 left-[-30px] w-6 h-6 rounded-full bg-[#fce6a8]"></div>
                            
                            {/* Yellow Calculator */}
                            <div className="absolute bottom-[-10px] right-10 w-16 h-20 bg-[#fbd594] border-4 border-[#fff] rounded-lg shadow-sm flex flex-col items-center justify-center p-2 z-20">
                                <div className="w-full h-4 bg-white rounded-sm mb-2 opacity-50"></div>
                                <div className="grid grid-cols-3 gap-1 w-full">
                                    <div className="w-full h-2 bg-white rounded-sm"></div>
                                    <div className="w-full h-2 bg-white rounded-sm"></div>
                                    <div className="w-full h-2 bg-white rounded-sm"></div>
                                    <div className="w-full h-2 bg-white rounded-sm"></div>
                                    <div className="w-full h-2 bg-white rounded-sm"></div>
                                    <div className="w-full h-2 bg-white rounded-sm"></div>
                                    <div className="w-full h-2 bg-white rounded-sm"></div>
                                    <div className="w-full h-2 bg-white rounded-sm"></div>
                                    <div className="w-full h-2 bg-white rounded-sm"></div>
                                </div>
                            </div>
                            
                            {/* Circular arrow graphic */}
                            <svg className="absolute bottom-[-20px] right-8 w-24 h-24 text-[#f0ad4e] z-10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
                                <path d="M 20 80 Q 50 100 80 80" />
                                <polygon points="75,70 85,85 95,70" fill="currentColor" />
                            </svg>
                        </div>
                    </div>

                </div>
            </div>

            {/* Main Content Area */}
            <div className="border-t border-[#ebecf0] w-full">
                <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-12 flex flex-col lg:flex-row gap-12">
                    
                    {/* Left Column (Content) */}
                    <div className="w-full lg:w-[70%] order-2 lg:order-1">
                        
                        {/* Dynamic Content First */}
                        {renderDynamicContent()}
                        
                        {/* Generic Content ALWAYS renders below it */}
                        {renderGenericContent()}

                        {/* FAQ Section - Dynamic */}
                        <div id="faq" className="w-full bg-white pt-16 pb-16 scroll-mt-20">
                            <h2 className="text-[22px] font-bold text-[#091e42] mb-6 uppercase">FAQS ON AREA MEASUREMENT UNITS</h2>
                            
                            <div className="border border-gray-200 rounded divide-y divide-gray-200">
                                {activeFaqData.map((faq, index) => (
                                    <div key={index} className="bg-white">
                                        <button 
                                            onClick={() => toggleFaq(index)}
                                            className="w-full flex justify-between items-center py-4 px-5 hover:bg-gray-50 transition-colors text-left"
                                        >
                                            <span className="text-[14px] font-medium text-[#091e42] pr-4">{faq.q}</span>
                                            <div className="shrink-0 text-[#42526e]">
                                                {openFaq === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </div>
                                        </button>
                                        {openFaq === index && (
                                            <div className="px-5 pb-5 text-[14px] text-[#42526e] leading-[1.6]">
                                                {faq.a}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="w-full lg:w-[30%] order-1 lg:order-2">
                        
                        {/* 1. Dynamic Conversions (If selectedPreset exists) */}
                        {selectedPreset && (
                            <div className="border border-[#ebecf0] rounded bg-white overflow-hidden mb-8 p-5 shadow-sm">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-5 h-5 shrink-0 bg-[#f4f5f7] rounded flex items-center justify-center mt-0.5">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0052cc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="3" y1="9" x2="21" y2="9"></line>
                                            <line x1="3" y1="15" x2="21" y2="15"></line>
                                            <line x1="9" y1="3" x2="9" y2="21"></line>
                                            <line x1="15" y1="3" x2="15" y2="21"></line>
                                        </svg>
                                    </div>
                                    <h3 className="font-bold text-[#091e42] text-[15px] leading-[1.3]">
                                        Convert {selectedPreset.from.split(' ')[0]} to other area units
                                    </h3>
                                </div>
                                <div className="border-t border-[#ebecf0] pt-4 flex flex-col gap-4">
                                    {unitsList.map((unit, idx) => {
                                        if (unit === selectedPreset.from) return null;
                                        return (
                                            <button 
                                                key={idx}
                                                onClick={() => handlePresetClick(selectedPreset.from, unit)}
                                                className="w-full text-left text-[#0052cc] text-[14px] hover:underline"
                                            >
                                                {selectedPreset.from.split(' ')[0]} to {unit.split(' ')[0]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 2. Popular Area Conversions (ALWAYS VISIBLE) */}
                        <div className="border border-[#ebecf0] rounded bg-white overflow-hidden mb-8 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-5 h-5 bg-[#f4f5f7] rounded flex items-center justify-center">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0052cc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="3" y1="9" x2="21" y2="9"></line>
                                        <line x1="3" y1="15" x2="21" y2="15"></line>
                                        <line x1="9" y1="3" x2="9" y2="21"></line>
                                        <line x1="15" y1="3" x2="15" y2="21"></line>
                                    </svg>
                                </div>
                                <h3 className="font-bold text-[#091e42] text-[15px]">Popular Area Conversions</h3>
                            </div>
                            <div className="border-t border-[#ebecf0] pt-4 flex flex-col gap-4">
                                {popularConversions.map((conv, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => handlePresetClick(conv.from, conv.to)}
                                        className="w-full text-left text-[#0052cc] text-[14px] hover:underline"
                                    >
                                        {conv.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
};

export default AreaConverterPage;
