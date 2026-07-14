import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Home, Activity, Building } from 'lucide-react';

const PopularToolsModals = ({ activeTool, onClose }) => {
    useEffect(() => {
        if (activeTool) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [activeTool]);

    if (!activeTool) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl my-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900">
                        {activeTool === 'budget' && 'Budget Calculator'}
                        {activeTool === 'emi' && 'EMI Calculator'}
                        {activeTool === 'area' && 'Area Converter'}
                        {activeTool === 'loan' && 'Loan Eligibility'}
                    </h3>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {activeTool === 'emi' && <EmiCalculator />}
                {activeTool === 'budget' && <BudgetCalculator />}
                {activeTool === 'area' && <AreaConverter />}
                {activeTool === 'loan' && <LoanEligibility />}
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
    const [income, setIncome] = useState(100000);
    const [existingEmi, setExistingEmi] = useState(0);
    const [rate, setRate] = useState(8.5);
    const [tenure, setTenure] = useState(20);

    // Affordable EMI is max 50% of income minus existing EMIs
    const affordableEmi = Math.max(0, (income * 0.5) - existingEmi);
    
    // Reverse EMI formula to find Principal
    const r = rate / (12 * 100);
    const n = tenure * 12;
    const maxLoan = r > 0 ? affordableEmi / (r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)) : 0;
    
    // Assuming 20% down payment is required
    const maxPropertyBudget = maxLoan / 0.8;

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Net Monthly Income (₹)</label>
                <input type="number" value={income} onChange={e => setIncome(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Existing Monthly EMIs (₹)</label>
                <input type="number" value={existingEmi} onChange={e => setExistingEmi(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Interest Rate (%)</label>
                    <input type="number" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Tenure (Years)</label>
                    <input type="number" value={tenure} onChange={e => setTenure(Number(e.target.value))} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 mt-6 text-center">
                <p className="text-xs text-purple-600 font-bold mb-1">Max Affordable Property Budget</p>
                <p className="text-3xl font-black text-purple-900">₹{Math.round(maxPropertyBudget || 0).toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 mt-2">*Assuming 20% down payment and 50% max EMI ratio</p>
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
                    In India, especially in cities like Bengaluru, real estate transactions involve various measurement units. 
                    While Sq. Ft. is the standard for apartments, independent plots often use units like Sq. Yards, Acres, or local measurements.
                    The GetRightHome Area Converter makes these complex conversions instant and simple.
                </p>

                <h4 className="font-bold text-slate-800 text-lg mb-4">Popular Area Conversions</h4>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-500 block mb-1">1 Sq. Yard</span>
                        <span className="text-sm font-bold text-slate-800">9 Sq. Feet</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-500 block mb-1">1 Acre</span>
                        <span className="text-sm font-bold text-slate-800">43,560 Sq. Feet</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-500 block mb-1">1 Hectare</span>
                        <span className="text-sm font-bold text-slate-800">2.47 Acres</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-500 block mb-1">1 Sq. Meter</span>
                        <span className="text-sm font-bold text-slate-800">10.76 Sq. Feet</span>
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
