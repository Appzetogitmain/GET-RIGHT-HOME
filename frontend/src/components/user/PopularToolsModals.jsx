import React, { useState, useEffect } from 'react';
import { ArrowLeft, X, RefreshCw, Home, Activity, Building } from 'lucide-react';

const PopularToolsModals = ({ activeTool, onClose }) => {
    useEffect(() => {
        if (activeTool) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        };
    }, [activeTool]);

    if (!activeTool) return null;

    return (
        <div data-lenis-prevent="true" className="fixed inset-0 z-[9999] bg-white md:bg-black/60 md:backdrop-blur-sm md:p-4 md:flex md:items-center md:justify-center overflow-hidden overscroll-none touch-none">
            <div data-lenis-prevent="true" className={`bg-white w-full h-full md:h-auto md:max-h-[95vh] overflow-y-auto overscroll-contain md:rounded-2xl p-6 md:shadow-2xl flex flex-col touch-auto ${activeTool === 'budget' ? 'md:max-w-[800px] md:w-full' : 'md:max-w-md'}`}>
                {/* Mobile Header */}
                <div className="flex justify-between items-center mb-4 shrink-0 md:hidden">
                    <button onClick={onClose} className="p-2 -ml-2 text-slate-800 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" strokeWidth={2} />
                    </button>
                </div>
                {/* Desktop Header */}
                <div className="hidden md:flex justify-end items-center shrink-0 -mt-2 -mr-2">
                    <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {activeTool === 'emi' && (
                    <>
                        <h2 className="text-2xl font-bold text-[#0B1A3A] mb-6">EMI Calculator</h2>
                        <EmiCalculator />
                    </>
                )}
                {activeTool === 'budget' && (
                    <>
                        <h2 className="text-[20px] md:text-[26px] font-bold text-[#0B1A3A] leading-tight mb-5 md:mb-8">Check your home buying budget</h2>
                        <BudgetCalculator />
                    </>
                )}
                {activeTool === 'area' && (
                    <>
                        <h2 className="text-2xl font-bold text-[#0B1A3A] mb-6">Area Converter</h2>
                        <AreaConverter />
                    </>
                )}
                {activeTool === 'loan' && (
                    <>
                        <h2 className="text-2xl font-bold text-[#0B1A3A] mb-6">Loan Eligibility</h2>
                        <LoanEligibility />
                    </>
                )}
            </div>
        </div>
    );
};

// --- EMI Calculator ---
const EmiCalculator = () => {
    const [principal, setPrincipal] = useState(5000000);
    const [rate, setRate] = useState(8.5);
    const [tenure, setTenure] = useState(20);

    const r = rate / (12 * 100);
    const n = tenure * 12;
    const emi = principal * r * (Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalAmount = emi * n;
    const totalInterest = totalAmount - principal;

    return (
        <div className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Loan Amount (₹)</label>
                <input type="number" value={principal} onChange={e => setPrincipal(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Interest Rate (% p.a.)</label>
                <input type="number" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Loan Tenure (Years)</label>
                <input type="number" value={tenure} onChange={e => setTenure(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mt-6">
                <p className="text-xs text-blue-600 font-bold mb-1">Your Monthly EMI</p>
                <p className="text-3xl font-black text-blue-900">₹{Math.round(emi || 0).toLocaleString()}</p>
                
                <div className="flex justify-between mt-4 pt-4 border-t border-blue-100/50">
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Total Interest</p>
                        <p className="text-sm font-bold text-slate-800">₹{Math.round(totalInterest || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Total Amount</p>
                        <p className="text-sm font-bold text-slate-800">₹{Math.round(totalAmount || 0).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Added Content for EMI Calculator */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-left">
                <h4 className="font-bold text-slate-800 text-lg mb-3">About GetRightHome EMI Calculator</h4>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    Planning to buy a home? The GetRightHome EMI Calculator helps you estimate your monthly home loan EMIs in seconds. 
                    By simply inputting the loan amount, interest rate, and tenure, you can accurately plan your budget and make 
                    informed real estate decisions.
                </p>

                <h4 className="font-bold text-slate-800 text-lg mb-4">Frequently Asked Questions</h4>
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <h5 className="font-bold text-slate-800 text-sm mb-2">What is an EMI?</h5>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Equated Monthly Installment (EMI) is a fixed payment amount made by a borrower to a lender at a specified date each calendar month. EMIs are used to pay off both interest and principal each month.
                        </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <h5 className="font-bold text-slate-800 text-sm mb-2">How is the GetRightHome EMI calculated?</h5>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            We use the standard formula: P x R x (1+R)^N / [(1+R)^N-1], where P is Principal, R is monthly interest rate, and N is loan tenure in months.
                        </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <h5 className="font-bold text-slate-800 text-sm mb-2">Can I prepay my home loan?</h5>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Yes, most banks allow you to prepay your home loan. Prepaying can significantly reduce your interest burden and overall loan tenure.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Budget Calculator ---
const BudgetCalculator = () => {
    const [savings, setSavings] = useState(2000000);
    const [emi, setEmi] = useState(20000);
    const [tenure, setTenure] = useState(20);

    const formatCurrency = (val) => {
        if (val >= 10000000) return `₹ ${(val / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
        if (val >= 100000) return `₹ ${(val / 100000).toFixed(2).replace(/\.00$/, '')} Lacs`;
        return `₹ ${val.toLocaleString('en-IN')}`;
    };

    // Calculate budget
    const r = 8.75 / (12 * 100);
    const n = tenure * 12;
    const maxLoan = emi / (r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
    const totalBudget = savings + maxLoan;

    // Budget range (e.g., 40 - 45 lacs)
    const lowerBudget = Math.floor(totalBudget * 0.95 / 100000);
    const upperBudget = Math.ceil(totalBudget * 1.05 / 100000);
    let rangeText = `${lowerBudget} - ${upperBudget} lacs`;
    if (totalBudget >= 10000000) {
        rangeText = `${(totalBudget * 0.95 / 10000000).toFixed(2)} - ${(totalBudget * 1.05 / 10000000).toFixed(2)} Cr`;
    }

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-16">
                <div className="space-y-5 md:space-y-8">
                    {/* Savings Slider */}
                    <div>
                        <div className="flex justify-between items-center mb-3 md:mb-4">
                            <label className="text-[13px] md:text-[15px] text-[#0B1A3A]">Savings for buying home</label>
                            <span className="font-bold text-[13px] md:text-[15px] text-[#0B1A3A]">{formatCurrency(savings)}</span>
                        </div>
                        <input 
                            type="range" 
                            min={0} max={200000000} step={100000} 
                            value={savings} 
                            onChange={e => setSavings(Number(e.target.value))} 
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1A65EB]"
                        />
                        <div className="flex justify-between mt-2">
                            <span className="text-[11px] md:text-[12px] text-[#7B8B9B] font-medium">₹ 0</span>
                            <span className="text-[11px] md:text-[12px] text-[#7B8B9B] font-medium">₹ 20 Cr</span>
                        </div>
                    </div>

                    {/* EMI Slider */}
                    <div>
                        <div className="flex justify-between items-center mb-3 md:mb-4">
                            <label className="text-[13px] md:text-[15px] text-[#0B1A3A]">EMI you can afford</label>
                            <span className="font-bold text-[13px] md:text-[15px] text-[#0B1A3A]">{formatCurrency(emi)}</span>
                        </div>
                        <input 
                            type="range" 
                            min={1000} max={1000000} step={1000} 
                            value={emi} 
                            onChange={e => setEmi(Number(e.target.value))} 
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1A65EB]"
                        />
                        <div className="flex justify-between mt-2">
                            <span className="text-[11px] md:text-[12px] text-[#7B8B9B] font-medium">₹ 1,000</span>
                            <span className="text-[11px] md:text-[12px] text-[#7B8B9B] font-medium">₹ 10 Lacs</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-5 md:space-y-8">
                    {/* Tenure Slider */}
                    <div>
                        <div className="flex justify-between items-center mb-3 md:mb-4">
                            <label className="text-[13px] md:text-[15px] text-[#0B1A3A]">Preffered loan tenure</label>
                            <span className="font-bold text-[13px] md:text-[15px] text-[#0B1A3A]">{tenure} Years</span>
                        </div>
                        <input 
                            type="range" 
                            min={1} max={30} step={1} 
                            value={tenure} 
                            onChange={e => setTenure(Number(e.target.value))} 
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1A65EB]"
                        />
                        <div className="flex justify-between mt-2">
                            <span className="text-[11px] md:text-[12px] text-[#7B8B9B] font-medium">1 yr</span>
                            <span className="text-[11px] md:text-[12px] text-[#7B8B9B] font-medium">30 yrs</span>
                        </div>
                    </div>

                    {/* Desktop Result View */}
                    <div className="hidden md:flex items-center gap-6 pt-6">
                        <span className="text-[15px] text-[#0B1A3A]">Your home budget</span>
                        <span className="text-[20px] font-bold text-[#0B1A3A]">{rangeText}</span>
                    </div>
                </div>
            </div>

            {/* Mobile Result View */}
            <div className="md:hidden mt-5 text-center">
                <p className="text-[14px] text-[#0B1A3A] mb-2">Budget range you may consider*</p>
                <div className="flex justify-center items-center gap-2 mb-4">
                    <p className="text-[22px] font-bold text-[#0B1A3A]">₹ {rangeText}</p>
                    <div className="w-4 h-4 rounded-full bg-slate-400 text-white flex items-center justify-center text-[10px] font-bold font-serif cursor-pointer">i</div>
                </div>
                
                <button 
                    onClick={() => window.location.href = `/search?transactionType=buy&maxPrice=${upperBudget * 100000}`}
                    className="w-full py-3 bg-[#0078DB] hover:bg-[#0066BA] text-white font-bold rounded-lg transition-colors text-[14px] mb-2"
                >
                    View properties in this budget
                </button>
            </div>
            
            {/* Disclaimer */}
            <div className="mt-4 md:mt-16 text-center md:text-left">
                <p className="text-[10px] md:text-[12px] text-[#7B8B9B]">*Estimated budget is calculated at an average interest rate of 8.75%</p>
            </div>
        </div>
    );
};

// --- Area Converter ---
const AreaConverter = () => {
    const [value, setValue] = useState(1000);
    const [fromUnit, setFromUnit] = useState('sqft');
    const [toUnit, setToUnit] = useState('sqm');

    const conversionRatesToSqft = {
        sqft: 1,
        sqm: 10.7639,
        sqyrd: 9,
        acre: 43560,
        hectare: 107639,
        bigha: 27000 // Varies by region, using average
    };

    const valueInSqft = value * conversionRatesToSqft[fromUnit];
    const convertedValue = valueInSqft / conversionRatesToSqft[toUnit];

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Enter Area</label>
                <input type="number" value={value} onChange={e => setValue(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">From Unit</label>
                    <select value={fromUnit} onChange={e => setFromUnit(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none">
                        <option value="sqft">Sq. Ft.</option>
                        <option value="sqm">Sq. Meters</option>
                        <option value="sqyrd">Sq. Yards</option>
                        <option value="acre">Acres</option>
                        <option value="hectare">Hectares</option>
                        <option value="bigha">Bigha</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">To Unit</label>
                    <select value={toUnit} onChange={e => setToUnit(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none">
                        <option value="sqft">Sq. Ft.</option>
                        <option value="sqm">Sq. Meters</option>
                        <option value="sqyrd">Sq. Yards</option>
                        <option value="acre">Acres</option>
                        <option value="hectare">Hectares</option>
                        <option value="bigha">Bigha</option>
                    </select>
                </div>
            </div>

            <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100 mt-6 text-center">
                <p className="text-3xl font-black text-emerald-900">{convertedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-emerald-600 font-bold mt-1 uppercase">
                    {toUnit === 'sqft' ? 'Sq. Ft.' : toUnit === 'sqm' ? 'Sq. Meters' : toUnit === 'sqyrd' ? 'Sq. Yards' : toUnit}
                </p>
            </div>

            {/* Added Content for Area Converter */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-left">
                <h4 className="font-bold text-slate-800 text-lg mb-3">About Land Measurement Units</h4>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    Land measurement in India involves a variety of local and regional units, which can vary significantly from state to state. To ensure accuracy in property transactions, it is standard practice to convert these regional units into internationally accepted SI units (such as square meters or square feet).
                </p>

                <div className="mb-6 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <h5 className="font-bold text-slate-800 text-sm mb-1">Units used in North India</h5>
                        <p className="text-xs text-slate-600">Commonly used units include Bigha, Biswa, Biswansi, Killa, Ghumaon, and Kanal, prevalent in states like Haryana, Punjab, Uttar Pradesh, and Uttarakhand.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <h5 className="font-bold text-slate-800 text-sm mb-1">Units used in South India</h5>
                        <p className="text-xs text-slate-600">Units such as Cent, Ground, Ankanam, Guntha, and Kuncham are widely used in Tamil Nadu, Andhra Pradesh, Kerala, and Karnataka.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <h5 className="font-bold text-slate-800 text-sm mb-1">Units used in East India</h5>
                        <p className="text-xs text-slate-600">States like West Bengal, Assam, Bihar, and Jharkhand often utilize Chatak, Decimal, Dhur, Kattha, and Lecha.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <h5 className="font-bold text-slate-800 text-sm mb-1">Units used in West India</h5>
                        <p className="text-xs text-slate-600">In parts of Rajasthan and Gujarat, Bigha, Biswa, and Biswansi are popular.</p>
                    </div>
                </div>

                <h4 className="font-bold text-slate-800 text-lg mb-4">Popular Area Conversions</h4>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Hectare to Acre</span>
                        <span className="text-sm font-bold text-slate-800">2.47</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Acre to Hectare</span>
                        <span className="text-sm font-bold text-slate-800">0.404</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Sq Ft to Cent</span>
                        <span className="text-sm font-bold text-slate-800">0.002</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Sq Ft to Sq Meter</span>
                        <span className="text-sm font-bold text-slate-800">0.092</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Sq Ft to Sq Yard</span>
                        <span className="text-sm font-bold text-slate-800">0.111</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Sq Ft to Gaj</span>
                        <span className="text-sm font-bold text-slate-800">0.111</span>
                    </div>
                </div>

                <h4 className="font-bold text-slate-800 text-lg mb-4">FAQs on Area Measurement (Bengaluru based)</h4>
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <h5 className="font-bold text-slate-800 text-sm mb-2">What is the standard unit for buying flats in Bengaluru?</h5>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Square Feet (Sq. Ft.) is the standard and most legally recognized unit for buying and selling apartments and flats across Bengaluru.
                        </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <h5 className="font-bold text-slate-800 text-sm mb-2">How is carpet area different from super built-up area?</h5>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Carpet area is the actual usable floor area inside your flat. Super built-up area includes common spaces like corridors, lifts, and lobbies, which is usually 20-30% more than the carpet area.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Loan Eligibility ---
const LoanEligibility = () => {
    const [income, setIncome] = useState(80000);
    const [existingEmi, setExistingEmi] = useState(0);
    const [age, setAge] = useState(30);

    // Max age for loan is usually 60, so tenure is (60 - age) up to 30 years max
    const maxTenure = Math.min(30, Math.max(1, 60 - age));
    
    // Affordable EMI is 50% of income minus existing EMI
    const affordableEmi = Math.max(0, (income * 0.5) - existingEmi);
    
    // Average rate 8.5%
    const rate = 8.5;
    const r = rate / (12 * 100);
    const n = maxTenure * 12;
    
    const maxLoan = r > 0 && maxTenure > 0 ? affordableEmi / (r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)) : 0;

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Net Monthly Income (₹)</label>
                <input type="number" value={income} onChange={e => setIncome(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 outline-none" />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Existing Monthly EMIs (₹)</label>
                <input type="number" value={existingEmi} onChange={e => setExistingEmi(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 outline-none" />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Your Age (Years)</label>
                <input type="number" value={age} onChange={e => setAge(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-amber-500 outline-none" />
            </div>
            
            <div className={`p-4 rounded-xl border mt-6 text-center ${maxLoan > 0 ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100'}`}>
                {maxLoan > 0 ? (
                    <>
                        <p className="text-xs text-amber-700 font-bold mb-1">Eligible Loan Amount (Up to {maxTenure} years)</p>
                        <p className="text-3xl font-black text-amber-900">₹{Math.round(maxLoan).toLocaleString()}</p>
                    </>
                ) : (
                    <>
                        <p className="text-xs text-rose-700 font-bold mb-1">Eligibility Status</p>
                        <p className="text-xl font-black text-rose-900">Not Eligible</p>
                        <p className="text-[10px] text-rose-600 mt-1">Existing EMIs exceed affordable limits or age requirement not met.</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default PopularToolsModals;
