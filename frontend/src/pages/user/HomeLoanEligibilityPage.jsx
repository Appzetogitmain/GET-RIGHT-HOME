import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HomeLoanEligibilityPage = () => {
    const navigate = useNavigate();
    
    // Eligibility State
    const [borrowers, setBorrowers] = useState('One');
    const [age, setAge] = useState(35);
    const [occupation, setOccupation] = useState('Salaried');
    const [netIncome, setNetIncome] = useState(100000);
    const [existingEmi, setExistingEmi] = useState(10000);
    const [rate, setRate] = useState(8.9);
    const [tenure, setTenure] = useState(20);

    // Co-Borrower State
    const [coIncome, setCoIncome] = useState(50000);
    const [coEmi, setCoEmi] = useState(0);

    // EMI Calculator State
    const [emiAmount, setEmiAmount] = useState(3000000);
    const [emiTenure, setEmiTenure] = useState(20);
    const [emiRate, setEmiRate] = useState(8.9);
    const [activePieIndex, setActivePieIndex] = useState(null);

    // FAQ State
    const [activeFaqTab, setActiveFaqTab] = useState('Home Loan');
    const [openFaqIndex, setOpenFaqIndex] = useState(null);

    const formatNumber = (num) => new Intl.NumberFormat('en-IN').format(num);

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
        if (percent < 0.05) return null;
        
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.65;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        const isHovered = activePieIndex === index;
        const isOtherHovered = activePieIndex !== null && activePieIndex !== index;

        return (
            <text 
                x={x} 
                y={y} 
                fill={index === 0 ? "white" : "black"} 
                textAnchor="middle" 
                dominantBaseline="central" 
                fontSize="12" 
                fontWeight="bold"
                style={{ opacity: isOtherHovered ? 0.2 : 1, transition: 'opacity 300ms ease' }}
                className="pointer-events-none"
            >
                {`${(percent * 100).toFixed(2)} %`}
            </text>
        );
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white rounded-lg shadow-xl p-3 px-4 border border-gray-100">
                    <p className="text-[12px] text-gray-500 mb-1 font-medium">{payload[0].name === 'Principal' ? 'Principal Amount' : 'Interest Amount'}</p>
                    <p className="text-[15px] font-bold text-gray-900">₹ {formatNumber(Math.round(payload[0].value))}</p>
                </div>
            );
        }
        return null;
    };

    // Eligibility Calculation Logic
    const calculateEligibility = () => {
        let totalIncome = netIncome;
        let totalExistingEmi = existingEmi;
        
        if (borrowers === 'Two') {
            totalIncome += coIncome;
            totalExistingEmi += coEmi;
        }

        const maxEmiCapacity = (totalIncome * 0.5) - totalExistingEmi;
        if (maxEmiCapacity <= 0) return { maxLoan: 0, payable: 0, emi: 0 };
        
        const r = rate / 1200;
        const n = tenure * 12;
        const maxLoan = maxEmiCapacity / ((r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
        const totalPayable = maxEmiCapacity * n;
        
        return {
            maxLoan: Math.round(maxLoan),
            payable: Math.round(totalPayable),
            emi: Math.round(maxEmiCapacity)
        };
    };

    const eligibilityResult = calculateEligibility();

    // Generate Chart Data for Eligibility (Loan Amortization rough estimate over time)
    const generateAreaChartData = () => {
        const data = [];
        let remaining = eligibilityResult.maxLoan;
        const yearlyEmi = eligibilityResult.emi * 12;
        
        for (let i = 0; i <= tenure; i += Math.max(1, Math.floor(tenure / 5))) {
            data.push({
                year: `Year ${i}`,
                amount: Math.max(0, Math.round(remaining / 100000)) // in Lakhs
            });
            remaining -= (yearlyEmi - (remaining * (rate/100))); // Rough principal reduction
        }
        return data;
    };

    // Standard EMI Calculation
    const calculateStandardEmi = () => {
        const r = emiRate / 1200;
        const n = emiTenure * 12;
        const emi = (emiAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const total = emi * n;
        const interest = total - emiAmount;
        return { emi: Math.round(emi), total: Math.round(total), interest: Math.round(interest) };
    };
    const stdEmiResult = calculateStandardEmi();
    const pieData = [
        { name: 'Principal', value: emiAmount },
        { name: 'Interest', value: stdEmiResult.interest }
    ];
    const COLORS = ['#0a113c', '#5dd9b6'];

    // FAQ Data
    const faqData = {
        'Home Loan': [
            { q: "What are the types of home loan available?", a: "<span class='font-semibold'>Home purchase loan</span> – It is the most common type of home loan. All banks and housing finance companies offer loan for residential properties at different rates coupled with discounts and rebates. It can be availed for both resale properties and builder allocated units.<br/><br/><span class='font-semibold'>Land/Plot loan</span> - Banks offer such type of loan to buyers intending to purchase land parcels for constructing their residential units. About 70 percent of the total cost of the land can be availed.<br/><br/><span class='font-semibold'>Construction loan</span> - Most common type of home loan availed by a major share of semi-urban population to build a home meeting their requirements on a land parcel you already own. All housing finance companies and banks provide home construction loan.<br/><br/><span class='font-semibold'>Home extension/improvement loan</span> - You can also avail loan for any sort of extension or improvement in your house, be it a new room or a new floor. The housing finance companies and banks offer loan for home improvement/renovation purposes such as painting, plumbing, electrical system, interior designing and waterproofing.<br/><br/><span class='font-semibold'>Home conversion loan</span> - Such home loan is taken by people who have bought a house on a home loan but would now intend to buy and move to new house. With these loans, applicants can fund the purchase of the new house by shifting the running loan to the new unit.<br/><br/><span class='font-semibold'>Balance transfer loan</span> - It can be availed when an applicant wishes to transfer home loan from one bank to another. It is usually adopted to repay the remaining amount at lower interest rates.<br/><br/><span class='font-semibold'>NRI home loan</span> - It is designed for NRIs who wish to construct or buy a home in India." },
            { q: "What is the difference between fixed rate and floating rate of interest?", a: "Taking home loan on a fixed interest rate implies that your EMI will not be impacted during the loan tenure irrespective of any market conditions. The interest rate will be pre-determined and remain unchanged. On the flip side, home loan EMIs vary periodically over the loan tenure, if taken on floating interest rate." },
            { q: "Are there any other charges that accompany home loans?", a: "There are some hidden charges applicable while opting for a home loan.<ul class='list-disc pl-5 mt-2 space-y-1'><li>Conversion Fees</li><li>MODT Charges (Memorandum of Deposit of Title Deed)</li><li>Document Retrieval Charges</li><li>Administrative Charges</li><li>Legal Fees</li><li>Valuation Fees / Inspection Fees</li><li>Documentation Charges</li><li>Switching Loan Package</li><li>Changing Loan Tenure</li><li>Statement of Account</li></ul>" },
            { q: "How to calculate interest on home loan?", a: "Calculating the monthly interest levied on your home loan is easy. Follow these steps - <ul class='list-disc pl-5 mt-2 space-y-1'><li>Divide interest rate by the number of payments. If you are making monthly payments, divide by 12.</li><li>Multiply it by the loan amount.</li></ul><p class='mt-2'>Doing this will give you the amount of interest.</p>" },
            { q: "What is home loan process?", a: "The process of getting a home loan is simple. But you need to be aware of all documents required before applying for the loan.<ul class='list-disc pl-5 mt-2 space-y-1'><li>Fill loan application form with all required documents</li><li>Pay processing fee</li><li>Discussion with the bank</li><li>Valuation of the submitted documents</li><li>Loan approval process</li><li>Processing of the offer letter</li><li>Legal check</li><li>Final loan deal, signing the agreement, and disbursal</li></ul>" }
        ],
        'Banks': [
            { q: "What are the processing fees charged by the bank?", a: "Processing fee charged while applying for home loan varies from bank to bank. Typically, the processing fee is about 0.5 percent to 1 percent of the loan amount + applicable Service Tax and Surcharge. The maximum processing fee ranges between Rs 10,000-15,000 excluding applicable taxes." },
            { q: "Which bank has lowest interest rate for home loan?", a: "All banks provide loan against properties at different interest rates. One of the top nationalised banks, SBI charges interest rate of 8.35 percent to 8.65 percent for general customers. The interest rates are irrespective of the loan amount. Note: If you take loan in the name of a female member, all banks offer slightly reduced interest rates." },
            { q: "Which bank home loan is best in India?", a: "Banks and housing finance companies do offer home loan at lucrative interest rates combined with offers and incentives. If you are unable to make up your mind while choosing a bank for taking home loan, here are some of the best financial institutes granting home loan in India - <ul class='list-disc pl-5 mt-2 space-y-1'><li>ICICI Bank</li><li>HDFC Limited</li><li>SBI</li><li>Yes Bank</li><li>Axis Bank</li><li>PNB Housing</li><li>DHFL</li><li>Indiabulls</li></ul>" }
        ],
        'Loan EMI': [
            { q: "What is an EMI?", a: "EMI stands for equated monthly installments. As a borrower, you need to pay the lender a fixed amount every month on a specified date. The EMI is the sum total of the principal amount and the interest amount divided over the tenure of the loan. However, your monthly value is fixed for each month, the principal amount paid and interest amount paid changes every month. For the first few years, the interest portion is higher. With time, the interest amount keeps reducing and principal amount keeps increasing. Therefore, your 70-75% interest will be paid in the first few years of the entire loan tenure." },
            { q: "What is a Home-Loan EMI?", a: "Home loan is a loan taken from any financial institution for buying a house. The EMI that is calculated for this loan is termed as a Home loan EMI." },
            { q: "What is Pre-EMI?", a: "For home loans disbursed against an under-construction property, the lender can offer an EMI that begins once the construction is complete. Until then, you can pay just the interest part of the loan that is termed as a Pre-EMI. Pre-EMI amount is less than full EMI amount since you will be paying just the interest component of the EMI and the principal loan amount remains intact. The Pre-EMI duration is not a part of your home loan duration. Let's take an example to understand this better. Say you have a loan of 15,00,000 lacs for 20 years on a property that gets completed in 3 years. Your calculated EMI is Rs. 25,000/-. During these 3 years you can pay the interest part of the EMI. That would be your Pre-EMI and the total loan duration would be 23 years (20+3)." },
            { q: "Should I opt for Pre-EMI?", a: "You should opt of Pre-EMI if:<ul class='list-disc pl-5 mt-2 space-y-1'><li>If you wish to save money during the pre-EMI period and invest it in such a way that they get good returns on the amount saved.</li><li>If you wish to sell your property once the construction is complete.</li><li>If you are waiting for an income change and feel now it is not possible to afford a full EMI.</li></ul>" },
            { q: "How is home loan EMI calculated?", a: "EMI is calculated using a simple mathematical formula, that is EMI Amount = [P x R x (1+R)^N]/[(1+R)^N-1]. Here P stands for the principal loan amount, R is the rate of interest and N is the number of years for which the loan is taken. The value of the EMI changes according to these variables." }
        ],
        'Loan Eligibility': [
            { q: "What are the eligibility criteria for a home loan?", a: "There is an eligibility criterion that banks have before they go ahead sanctioning it. A few important of them are employment stability, age criteria, credit rating, financial stability etc." },
            { q: "How is eligibility for home loan calculated?", a: "Some steps to calculate your home loan eligibility are:<ul class='list-disc pl-5 mt-2 space-y-1'><li>To calculate the income level, banks will investigate your salary slips and bank statements.</li><li>Next, it calculates the amount saved assuming that 30% of your savings is from your INCOME.</li><li>If there are existing loans, the EMI is reduced from the income level.</li><li>According to the income level and savings, the bank calculates a home loan amount.</li></ul>" },
            { q: "What is the minimum salary for home loan?", a: "Banks usually up to 60 times your monthly net income (salary). You can calculate your home loan eligibility using the home loan eligibility calculator." },
            { q: "What are the eligibility requirements for an NRI seeking a home loan?", a: "Following are the eligibility criteria for an NRI seeking home loan:<ul class='list-disc pl-5 mt-2 space-y-1'><li>An Indian citizen holding a valid Indian passport.</li><li>The passport should be free from NO ENTRY stamp. This stamp does not allow an NRI to enter the country.</li><li>The passport of the NRI applicant should have a valid entry visa.</li><li>Valid PIO/OCI Card copy to be documented with foreign country passport for PIO/OCI.</li></ul>" }
        ]
    };

    return (
        <div className="min-h-screen bg-[#f3f4f6] font-sans pb-24">
            
            {/* Hero Section */}
            <div className="bg-[#090936] w-full pt-6 pb-12 md:pb-16 px-4 md:px-10 relative">
                
                {/* Desktop Top Links */}
                <div className="hidden md:flex justify-end gap-10 text-white text-xs font-bold tracking-wider mb-10">
                    <a href="#checkEligibility" className="cursor-pointer hover:text-[#00a699] transition-colors">CHECK ELIGIBILITY</a>
                    <a href="#calculateEmi" className="cursor-pointer hover:text-[#00a699] transition-colors">CALCULATE EMI</a>
                    <a href="#requestCallback" className="cursor-pointer hover:text-[#00a699] transition-colors">REQUEST CALLBACK</a>
                    <a href="#faqs" className="cursor-pointer hover:text-[#00a699] transition-colors">FAQs</a>
                </div>

                <div className="max-w-[1100px] mx-auto flex flex-col items-center text-center pb-4 md:pb-8">
                    <h1 className="text-3xl md:text-[42px] leading-tight font-bold text-white mb-4">
                        Let's find you the best <span className="text-[#00a699]">home loan</span> deal.
                    </h1>
                    
                    {/* Quick Inputs Box */}
                    <div className="mt-6 md:mt-8 bg-white p-4 md:p-6 rounded-lg shadow-xl w-full max-w-[900px] grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 items-end">
                        <div className="col-span-2 md:col-span-1 text-left">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Loan amount</label>
                            <div className="flex items-center border border-gray-300 rounded px-3 py-2 bg-white focus-within:border-[#00a699]">
                                <span className="text-gray-600 mr-2 text-sm">₹</span>
                                <input 
                                    type="text" 
                                    value={formatNumber(emiAmount)} 
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/,/g, '');
                                        if(!isNaN(val)) setEmiAmount(Number(val));
                                    }}
                                    className="w-full outline-none text-gray-900 font-medium bg-transparent text-sm" 
                                />
                            </div>
                        </div>
                        <div className="col-span-1 text-left">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tenure</label>
                            <div className="flex items-center border border-gray-300 rounded px-2 md:px-3 py-2 bg-white focus-within:border-[#00a699]">
                                <input 
                                    type="text" 
                                    value={tenure} 
                                    onChange={(e) => {
                                        if(!isNaN(e.target.value)) {
                                            setTenure(Number(e.target.value));
                                            setEmiTenure(Number(e.target.value));
                                        }
                                    }}
                                    className="w-full outline-none text-gray-900 font-medium bg-transparent text-sm" 
                                />
                                <span className="text-gray-400 text-sm ml-1 md:ml-2">Years</span>
                            </div>
                        </div>
                        <div className="col-span-1 text-left">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Your Age</label>
                            <div className="flex items-center border border-gray-300 rounded px-2 md:px-3 py-2 bg-white focus-within:border-[#00a699]">
                                <input 
                                    type="text" 
                                    value={age} 
                                    onChange={(e) => {
                                        if(!isNaN(e.target.value)) setAge(Number(e.target.value));
                                    }}
                                    className="w-full outline-none text-gray-900 font-medium bg-transparent text-sm" 
                                />
                                <span className="text-gray-400 text-sm ml-1 md:ml-2">Years</span>
                            </div>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <button 
                                onClick={() => document.getElementById('checkEligibility')?.scrollIntoView({behavior: 'smooth'})}
                                className="w-full bg-[#1e88e5] hover:bg-[#1565c0] text-white py-[10px] rounded font-bold transition-colors text-sm"
                            >
                                Let's get started
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-[1100px] mx-auto px-4 md:px-6 mt-8 md:mt-12 relative z-20 space-y-8">

                {/* 1. CHECK ELIGIBILITY CALCULATOR */}
                <div id="checkEligibility" className="bg-white shadow-md border border-gray-200 rounded-lg overflow-hidden scroll-mt-24">
                    <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                        <h2 className="text-xl font-bold text-gray-800">Check your home loan eligibility</h2>
                    </div>
                    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-10">
                        {/* Inputs */}
                        <div className="w-full md:w-1/2 space-y-6">
                            {/* Toggle Borrowers */}
                            <div>
                                <label className="block text-[13px] font-medium text-gray-600 mb-2">Number of Borrowers</label>
                                <div className="flex rounded-md overflow-hidden border border-gray-300 w-fit">
                                    <button 
                                        onClick={() => setBorrowers('One')}
                                        className={`px-6 py-2 text-sm font-medium transition-colors ${borrowers === 'One' ? 'bg-[#00a699] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                    >One</button>
                                    <button 
                                        onClick={() => setBorrowers('Two')}
                                        className={`px-6 py-2 text-sm font-medium transition-colors ${borrowers === 'Two' ? 'bg-[#00a699] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                    >Two</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="border border-gray-300 p-2 relative focus-within:border-[#00a699]">
                                    <label className="text-[11px] text-gray-500 absolute top-1 left-2">Your Age</label>
                                    <div className="flex justify-between items-end mt-4 px-1">
                                        <input type="text" value={age} onChange={(e) => setAge(e.target.value)} className="text-[16px] text-gray-900 w-full outline-none bg-transparent" />
                                        <span className="text-[13px] text-gray-400">Years</span>
                                    </div>
                                </div>
                                <div className="border border-gray-300 p-2 relative focus-within:border-[#00a699]">
                                    <label className="text-[11px] text-gray-500 absolute top-1 left-2">Occupation</label>
                                    <select value={occupation} onChange={(e) => setOccupation(e.target.value)} className="text-[16px] text-gray-900 w-full outline-none bg-transparent mt-4 px-1 cursor-pointer appearance-none">
                                        <option>Salaried</option>
                                        <option>Self Employed Professional</option>
                                        <option>Self Employed Business</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="border border-gray-300 p-2 relative focus-within:border-[#00a699]">
                                    <label className="text-[11px] text-gray-500 absolute top-1 left-2">Net Income</label>
                                    <div className="flex items-end mt-4 px-1">
                                        <span className="text-gray-600 mr-1">₹</span>
                                        <input type="text" value={formatNumber(netIncome)} onChange={(e) => setNetIncome(Number(e.target.value.replace(/,/g, '')))} className="text-[16px] text-gray-900 w-full outline-none bg-transparent" />
                                    </div>
                                </div>
                                <div className="border border-gray-300 p-2 relative focus-within:border-[#00a699]">
                                    <label className="text-[11px] text-gray-500 absolute top-1 left-2">Existing Monthly EMI</label>
                                    <div className="flex items-end mt-4 px-1">
                                        <span className="text-gray-600 mr-1">₹</span>
                                        <input type="text" value={formatNumber(existingEmi)} onChange={(e) => setExistingEmi(Number(e.target.value.replace(/,/g, '')))} className="text-[16px] text-gray-900 w-full outline-none bg-transparent" />
                                    </div>
                                </div>
                            </div>

                            {borrowers === 'Two' && (
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                    <div className="border border-gray-300 p-2 relative focus-within:border-[#00a699] bg-[#f8fffe]">
                                        <label className="text-[11px] text-[#00a699] absolute top-1 left-2">Co-Borrower Income</label>
                                        <div className="flex items-end mt-4 px-1">
                                            <span className="text-gray-600 mr-1">₹</span>
                                            <input type="text" value={formatNumber(coIncome)} onChange={(e) => setCoIncome(Number(e.target.value.replace(/,/g, '')))} className="text-[16px] text-gray-900 w-full outline-none bg-transparent" />
                                        </div>
                                    </div>
                                    <div className="border border-gray-300 p-2 relative focus-within:border-[#00a699] bg-[#f8fffe]">
                                        <label className="text-[11px] text-[#00a699] absolute top-1 left-2">Co-Borrower EMI</label>
                                        <div className="flex items-end mt-4 px-1">
                                            <span className="text-gray-600 mr-1">₹</span>
                                            <input type="text" value={formatNumber(coEmi)} onChange={(e) => setCoEmi(Number(e.target.value.replace(/,/g, '')))} className="text-[16px] text-gray-900 w-full outline-none bg-transparent" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="border border-gray-300 p-2 relative focus-within:border-[#00a699]">
                                    <label className="text-[11px] text-gray-500 absolute top-1 left-2">Rate of Interest</label>
                                    <div className="flex justify-between items-end mt-4 px-1">
                                        <input type="text" value={rate} onChange={(e) => setRate(e.target.value)} className="text-[16px] text-gray-900 w-full outline-none bg-transparent" />
                                        <span className="text-[13px] text-gray-400">%</span>
                                    </div>
                                </div>
                                <div className="border border-gray-300 p-2 relative focus-within:border-[#00a699]">
                                    <label className="text-[11px] text-gray-500 absolute top-1 left-2">Tenure</label>
                                    <div className="flex justify-between items-end mt-4 px-1">
                                        <input type="text" value={tenure} onChange={(e) => setTenure(e.target.value)} className="text-[16px] text-gray-900 w-full outline-none bg-transparent" />
                                        <span className="text-[13px] text-gray-400">Years</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Outputs */}
                        <div className="w-full md:w-1/2 flex flex-col justify-center items-center md:pl-10 md:border-l border-gray-200">
                            <div className="text-center mb-8 w-full">
                                <p className="text-sm font-medium text-gray-500 mb-1">You could borrow upto</p>
                                <h3 className="text-[36px] font-bold text-[#090936]">₹ {formatNumber(eligibilityResult.maxLoan)}</h3>
                            </div>
                            
                            <div className="w-full h-[180px] mb-8">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={generateAreaChartData()} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00a699" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#00a699" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} tickFormatter={(v) => `${v}L`} />
                                        <Tooltip cursor={{stroke: '#00a699', strokeWidth: 1, strokeDasharray: '4 4'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                        <Area type="monotone" dataKey="amount" stroke="#00a699" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="flex justify-between w-full mb-8">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Payable Amount</p>
                                    <p className="font-semibold text-gray-800">₹ {formatNumber(eligibilityResult.payable)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 mb-1">Monthly EMI</p>
                                    <p className="font-semibold text-gray-800">₹ {formatNumber(eligibilityResult.emi)}</p>
                                </div>
                            </div>

                            <button className="w-full bg-[#1e88e5] hover:bg-[#1565c0] text-white py-3.5 rounded-md font-bold transition-colors">
                                Apply for Loan
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. CALCULATE EMI */}
                <div id="calculateEmi" className="bg-white shadow-md border border-gray-200 rounded-lg overflow-hidden scroll-mt-24">
                    <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                        <h2 className="text-xl font-bold text-gray-800">Calculate EMI for the loan amount you require</h2>
                    </div>
                    <div className="p-6 md:p-8 flex flex-col md:flex-row gap-0">
                        {/* Inputs + Chart */}
                        <div className="w-full md:w-2/3 md:pr-10">
                            <div className="flex flex-col md:flex-row gap-4 mb-8">
                                <div className="w-full md:w-1/2 border border-gray-300 p-2 relative focus-within:border-[#00a699]">
                                    <label className="text-[11px] text-gray-500 absolute top-1 left-2">Loan amount</label>
                                    <div className="flex items-end mt-4 px-1">
                                        <span className="text-gray-600 mr-2">₹</span>
                                        <input type="text" value={formatNumber(emiAmount)} onChange={(e) => setEmiAmount(Number(e.target.value.replace(/,/g, '')))} className="text-[18px] text-gray-900 w-full outline-none bg-transparent" />
                                    </div>
                                </div>
                                <div className="w-full md:w-1/2 flex gap-4">
                                    <div className="w-1/2 border border-gray-300 p-2 relative focus-within:border-[#00a699]">
                                        <label className="text-[11px] text-gray-500 absolute top-1 left-2">Tenure</label>
                                        <div className="flex justify-between items-end mt-4 px-1">
                                            <input type="text" value={emiTenure} onChange={(e) => setEmiTenure(Number(e.target.value))} className="text-[18px] text-gray-900 w-full outline-none bg-transparent" />
                                            <span className="text-[13px] text-gray-400">Years</span>
                                        </div>
                                    </div>
                                    <div className="w-1/2 border border-gray-300 p-2 relative focus-within:border-[#00a699]">
                                        <label className="text-[11px] text-gray-500 absolute top-1 left-2">Rate of Interest</label>
                                        <div className="flex justify-between items-end mt-4 px-1">
                                            <input type="text" value={emiRate} onChange={(e) => setEmiRate(Number(e.target.value))} className="text-[18px] text-gray-900 w-full outline-none bg-transparent" />
                                            <span className="text-[16px] text-gray-400">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-[#191919] pt-8 pb-10 px-6 relative w-full flex flex-col items-center rounded-lg">
                                <div className="w-full max-w-[280px] h-[280px] relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={0}
                                                outerRadius="95%"
                                                dataKey="value"
                                                stroke="none"
                                                isAnimationActive={false}
                                                labelLine={false}
                                                label={renderCustomizedLabel}
                                                onMouseEnter={(_, index) => setActivePieIndex(index)}
                                                onMouseLeave={() => setActivePieIndex(null)}
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={COLORS[index]} 
                                                        opacity={activePieIndex !== null && activePieIndex !== index ? 0.3 : 1}
                                                        className="transition-opacity duration-300 outline-none"
                                                    />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-8 mt-6 w-full">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#0a113c]"></div><span className="text-[#a0a0a0] text-[13px]">Principal Amount</span></div>
                                        <span className="text-white text-[15px] ml-5">₹ {formatNumber(emiAmount)}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#5dd9b6]"></div><span className="text-[#a0a0a0] text-[13px]">Interest Amount</span></div>
                                        <span className="text-white text-[15px] ml-5">₹ {formatNumber(stdEmiResult.interest)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column Results */}
                        <div className="w-full md:w-1/3 mt-10 md:mt-0 flex flex-col items-center justify-center md:pl-10 md:border-l border-gray-200">
                            <div className="text-center w-full mb-10">
                                <span className="text-[13px] text-gray-500 font-medium">Monthly EMI</span>
                                <div className="text-[32px] font-bold text-gray-900 mt-1">₹ {formatNumber(stdEmiResult.emi)}</div>
                            </div>
                            <div className="text-center w-full mb-10">
                                <span className="text-[13px] text-gray-500 font-medium">Total Payable amount</span>
                                <div className="text-[20px] font-bold text-gray-800 mt-1">₹ {formatNumber(stdEmiResult.total)}</div>
                            </div>
                            <button className="w-full bg-[#1e88e5] hover:bg-[#1565c0] text-white py-3.5 rounded-md font-bold transition-colors">
                                Get instant loan
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. REQUEST CALLBACK */}
                <div id="requestCallback" className="bg-white shadow-md border border-gray-200 rounded-lg overflow-hidden scroll-mt-24 p-8 flex flex-col items-center text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Can't find any deal matching your criteria?</h2>
                    <p className="text-gray-500 mb-8">Leave your details and our experts will call you back with the best options.</p>
                    
                    <div className="flex flex-col md:flex-row gap-4 w-full max-w-[800px]">
                        <input type="text" placeholder="Full Name" className="flex-1 border border-gray-300 p-3 rounded-md outline-none focus:border-[#00a699]" />
                        <input type="email" placeholder="Your Email Id" className="flex-1 border border-gray-300 p-3 rounded-md outline-none focus:border-[#00a699]" />
                        <input type="text" placeholder="Mobile Number" className="flex-1 border border-gray-300 p-3 rounded-md outline-none focus:border-[#00a699]" />
                    </div>
                    <button className="mt-6 bg-[#1e88e5] hover:bg-[#1565c0] text-white py-3 px-10 rounded-md font-bold transition-colors">
                        Request Callback
                    </button>
                </div>

                {/* 4. FAQs Section */}
                <div id="faqs" className="bg-white shadow-md border border-gray-200 rounded-lg overflow-hidden scroll-mt-24 mb-16">
                    <div className="px-6 py-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800">Frequently Asked Questions</h2>
                    </div>
                    <div 
                        className="flex overflow-x-auto gap-3 px-4 md:px-6 py-4 border-b border-gray-100"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        <style>{`.overflow-x-auto::-webkit-scrollbar { display: none; }`}</style>
                        {Object.keys(faqData).map((tab) => (
                            <button 
                                key={tab}
                                onClick={() => { setActiveFaqTab(tab); setOpenFaqIndex(null); }}
                                className={`shrink-0 px-6 py-2.5 rounded-full text-sm font-semibold transition-colors border ${activeFaqTab === tab ? 'bg-[#5dd9b6] text-white border-[#5dd9b6]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="p-2 md:p-6 divide-y divide-gray-100">
                        {faqData[activeFaqTab].map((faq, idx) => (
                            <div key={idx}>
                                <button 
                                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                                    className="w-full flex justify-between items-center py-4 px-4 hover:bg-gray-50 text-left"
                                >
                                    <span className="font-medium text-gray-800 text-[15px]">{faq.q}</span>
                                    {openFaqIndex === idx ? <ChevronUp className="text-gray-400 shrink-0" size={18} /> : <ChevronDown className="text-gray-400 shrink-0" size={18} />}
                                </button>
                                {openFaqIndex === idx && (
                                    <div 
                                        className="px-4 pb-5 text-gray-600 text-[14px] leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: faq.a }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default HomeLoanEligibilityPage;
