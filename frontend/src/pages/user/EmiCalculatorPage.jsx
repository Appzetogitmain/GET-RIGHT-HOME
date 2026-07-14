import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EmiCalculatorPage = () => {
    const navigate = useNavigate();
    const [loanAmount, setLoanAmount] = useState(3000000);
    const [tenure, setTenure] = useState(20);
    const [rate, setRate] = useState(8.9);
    
    // FAQ State
    const [openFaq, setOpenFaq] = useState(null);
    const [activeIndex, setActiveIndex] = useState(null);

    const faqData = [
        {
            question: "What is an EMI?",
            answer: "EMI stands for equated monthly installments. As a borrower, you need to pay the lender a fixed amount every month on a specified date. The EMI is the sum total of the principal amount and the interest amount divided over the tenure of the loan. However, your monthly value is fixed for each month, the principal amount paid and interest amount paid changes every month. For the first few years, the interest portion is higher. With time, the interest amount keeps reducing and principal amount keeps increasing. Therefore, your 70-75% interest will be paid in the first few years of the entire loan tenure."
        },
        {
            question: "What is a Home-Loan EMI?",
            answer: "Home loan is a loan taken from any financial institution for buying a house. The EMI that is calculated for this loan is termed as a Home loan EMI."
        },
        {
            question: "What is Pre-EMI?",
            answer: "For home loans disbursed against an under-construction property, the lender can offer an EMI that begins once the construction is complete. Until then, you can pay just the interest part of the loan that is termed as a Pre-EMI. Pre-EMI amount is less than full EMI amount since you will be paying just the interest component of the EMI and the principal loan amount remains intact. The Pre-EMI duration is not a part of your home loan duration. Let’s take an example to understand this better. Say you have a loan of 15,00,000 lacs for 20 years on a property that gets completed in 3 years. Your calculated EMI is Rs. 25,000/-. During these 3 years you can pay the interest part of the EMI. That would be your Pre-EMI and the total loan duration would be 23 years (20+3)."
        },
        {
            question: "Should I opt for Pre-EMI?",
            answer: "You should opt of Pre-EMI if:<br/><ul class='list-disc pl-5 mt-3 space-y-2'><li>If you wish to save money during the pre-EMI period and invest it in such a way that they get good returns on the amount saved.</li><li>If you wish to sell your property once the construction is complete.</li><li>If you are waiting for an income change and feel now it is not possible to afford a full EMI.</li></ul>"
        },
        {
            question: "How is home loan EMI calculated?",
            answer: "EMI is calculated using a simple mathematical formula, that is EMI Amount = [P x R x (1+R)^N]/[(1+R)^N-1]. Here P stands for the principal loan amount, R is the rate of interest and N is the number of years for which the loan is taken. The value of the EMI changes according to these variables."
        },
        {
            question: "How is EMI interest calculated?",
            answer: "When you borrow a home loan you pay back both the components. These are the principal amount and interest amount. The principal amount is the amount that you borrow. The interest amount is a fee that you pay for using the bank’s/financial institutions money. The EMI that you pay consists of two parts. A part of it consists of the principal amount and the other half consists of the interest amount. To calculate the interest you are going to pay, you can use the following mathematical formula:<br/><br/>interest = (interest rate / number of payments) * loan principal"
        },
        {
            question: "What is a floating rate of interest?",
            answer: "A floating rate of interest or adjustable interest that moves up and down and changes periodically with the market. If a borrower takes out a mortgage with a variable rate, it may start with a 4% rate and then adjust, either up or down, thus changing the monthly payments."
        },
        {
            question: "What if my floating rate of interest increases? Does that mean I will have to pay bigger amount of EMI?",
            answer: "With the increase in the floating rate of increase, the interest amount increase. Since the EMI you pay has a part of interest, it goes up with the increase in the floating rate of interest."
        },
        {
            question: "Can I get my EMI increased instead of getting my loan tenor increased?",
            answer: "Yes. You can increase your EMI instead of the loan tenor. For this, the financial institution you have borrowed from will check some of the documents like salary slips and identity card."
        }
    ];

    // Format Number for inputs
    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-IN').format(num);
    };

    // Calculate EMI
    const r = rate / (12 * 100);
    const n = tenure * 12;
    const emi = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalAmount = emi * n;
    const totalInterest = totalAmount - loanAmount;

    const data = [
        { name: 'Principal', value: loanAmount },
        { name: 'Interest', value: totalInterest }
    ];

    const COLORS = ['#0a113c', '#5dd9b6']; // Dark navy and teal/mint

    const principalPercentage = ((loanAmount / totalAmount) * 100).toFixed(2);
    const interestPercentage = ((totalInterest / totalAmount) * 100).toFixed(2);

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
        // Hide label if the slice is too small (e.g. less than 5%)
        if (percent < 0.05) return null;
        
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.65; // Place at 65% of the radius
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        const isHovered = activeIndex === index;
        const isOtherHovered = activeIndex !== null && activeIndex !== index;

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

    const toggleFaq = (index) => {
        if (openFaq === index) setOpenFaq(null);
        else setOpenFaq(index);
    };

    return (
        <div className="min-h-screen bg-[#f3f4f6] font-sans pb-24">
            
            {/* Hero Banner Section */}
            <div className="bg-[#0b1037] w-full pt-16 md:pt-6 pb-28 md:pb-36 px-4 md:px-10 relative">
                
                {/* Back Button */}
                <button 
                    onClick={() => navigate(-1)} 
                    className="absolute top-6 left-4 md:top-6 md:left-6 text-white hover:text-[#ffb71b] flex items-center text-sm font-medium transition-colors z-20"
                >
                    <ArrowLeft size={20} className="mr-1" />
                    Back
                </button>

                {/* Desktop Top Links (Hidden on Mobile) */}
                <div className="hidden md:flex justify-end gap-10 text-white text-xs font-bold tracking-wider mb-10">
                    <button onClick={() => document.getElementById('calculateEmi')?.scrollIntoView({behavior: 'smooth'})} className="cursor-pointer hover:text-[#ffb71b] transition-colors">CALCULATE EMI</button>
                    <button onClick={() => document.getElementById('faqs')?.scrollIntoView({behavior: 'smooth'})} className="cursor-pointer hover:text-[#ffb71b] transition-colors">FAQs</button>
                    <button onClick={() => document.getElementById('articles')?.scrollIntoView({behavior: 'smooth'})} className="cursor-pointer hover:text-[#ffb71b] transition-colors">ARTICLES</button>
                </div>

                <div className="max-w-[1000px] mx-auto flex flex-col-reverse md:flex-row items-center justify-center gap-6 md:gap-10">
                    {/* Decorative Graphic mimicking the screenshot */}
                    <div className="w-[200px] h-[160px] md:w-[240px] md:h-[200px] relative shrink-0">
                        <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-lg">
                            {/* Clouds */}
                            <path d="M40,50 Q40,40 50,40 Q60,40 65,45 Q75,35 85,45 Q95,45 95,55 Q95,65 85,65 L45,65 Q35,65 35,55 Q35,50 40,50 Z" fill="#141a4a" />
                            <path d="M150,70 Q150,60 160,60 Q170,60 175,65 Q185,55 195,65 Q205,65 205,75 Q205,85 195,85 L155,85 Q145,85 145,75 Q145,70 150,70 Z" fill="#141a4a" />
                            <path d="M10,90 Q10,85 15,85 Q20,85 22,88 Q28,82 35,88 Q40,88 40,93 Q40,98 35,98 L12,98 Q7,98 7,93 Q7,90 10,90 Z" fill="#141a4a" />

                            {/* Building silhouettes in background */}
                            <path d="M10,180 L10,120 L30,100 L30,180 Z" fill="#141a4a" />
                            <path d="M35,180 L35,80 L60,60 L60,180 Z" fill="#141a4a" />
                            <path d="M160,180 L160,110 L180,90 L180,180 Z" fill="#141a4a" />
                            
                            {/* Calculator base */}
                            <rect x="50" y="50" width="80" height="130" fill="#5dd9b6" />
                            <rect x="55" y="60" width="70" height="40" fill="#f89e24" />
                            <text x="65" y="90" fill="#ffffff" fontSize="24" fontWeight="bold">XX</text>
                            
                            {/* Buttons */}
                            <rect x="55" y="105" width="20" height="15" fill="#f89e24" />
                            <text x="60" y="117" fill="#ffffff" fontSize="12" fontWeight="bold">+</text>
                            
                            <rect x="80" y="105" width="20" height="15" fill="#f89e24" />
                            <text x="85" y="117" fill="#ffffff" fontSize="12" fontWeight="bold">%</text>

                            <rect x="105" y="105" width="20" height="15" fill="#f89e24" />
                            <text x="110" y="117" fill="#ffffff" fontSize="12" fontWeight="bold">x</text>

                            <rect x="55" y="125" width="20" height="15" fill="#f89e24" />
                            <text x="61" y="136" fill="#ffffff" fontSize="12" fontWeight="bold">-</text>
                            
                            <rect x="80" y="125" width="20" height="15" fill="#f89e24" />
                            <text x="87" y="136" fill="#ffffff" fontSize="12" fontWeight="bold">/</text>

                            <rect x="105" y="125" width="20" height="15" fill="#f89e24" />
                            <text x="110" y="136" fill="#ffffff" fontSize="12" fontWeight="bold">=</text>
                            
                            {/* Papers */}
                            <polygon points="120,70 170,50 190,100 130,120" fill="#f3f4f6" />
                            <polygon points="125,80 180,70 195,120 135,130" fill="#ffffff" />
                            <polygon points="115,70 130,150 140,150 125,70" fill="#f89e24" />
                        </svg>
                    </div>

                    <div className="text-center md:text-left z-10">
                        <h1 className="text-2xl md:text-[34px] leading-tight font-medium text-white tracking-wide">
                            <span className="text-[#ffb71b] font-bold">EMI Calculator</span> for your <br className="hidden md:block" /> loan amount
                        </h1>
                    </div>
                </div>
            </div>

            {/* Calculator Card */}
            <div id="calculateEmi" className="max-w-[1000px] mx-auto px-4 md:px-6 -mt-20 md:-mt-24 relative z-20 pb-16 scroll-mt-24">
                <div className="bg-white shadow-md border border-gray-200 p-6 md:p-10 flex flex-col md:flex-row gap-0">
                    
                    {/* Left Column (Inputs + Chart) */}
                    <div className="w-full md:w-2/3 md:pr-10">
                        
                        {/* Input Fields */}
                        <div className="flex flex-col md:flex-row gap-4 mb-10">
                            {/* Loan Amount */}
                            <div className="w-full md:w-1/2 border border-gray-300 p-2 md:p-3 relative group focus-within:border-gray-500">
                                <label className="text-[11px] text-gray-400 absolute top-2 left-3">Loan amount</label>
                                <div className="flex items-end mt-4 px-1">
                                    <span className="text-[16px] text-gray-700 mr-2 mb-0.5">₹</span>
                                    <input 
                                        type="text"
                                        value={formatNumber(loanAmount)}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/,/g, '');
                                            if(!isNaN(val) && val !== '') setLoanAmount(Number(val));
                                            else if(val === '') setLoanAmount(0);
                                        }}
                                        className="text-[18px] text-gray-900 w-full outline-none bg-transparent"
                                    />
                                </div>
                            </div>
                            
                            {/* Tenure and Rate Row */}
                            <div className="w-full md:w-1/2 flex gap-4">
                                <div className="w-1/2 border border-gray-300 p-2 md:p-3 relative focus-within:border-gray-500">
                                    <label className="text-[11px] text-gray-400 absolute top-2 left-3">Tenure</label>
                                    <div className="flex justify-between items-end mt-4 px-1">
                                        <input 
                                            type="text"
                                            value={tenure}
                                            onChange={(e) => {
                                                if(!isNaN(e.target.value)) setTenure(Number(e.target.value));
                                            }}
                                            className="text-[18px] text-gray-900 w-full outline-none bg-transparent"
                                        />
                                        <div className="text-[13px] text-gray-400 flex items-center whitespace-nowrap ml-1">
                                            Years <ChevronDown size={14} className="ml-1" />
                                        </div>
                                    </div>
                                </div>

                                <div className="w-1/2 border border-gray-300 p-2 md:p-3 relative focus-within:border-gray-500">
                                    <label className="text-[11px] text-gray-400 absolute top-2 left-3">Rate of Interest</label>
                                    <div className="flex justify-between items-end mt-4 px-1">
                                        <input 
                                            type="text"
                                            value={rate}
                                            onChange={(e) => {
                                                if(!isNaN(e.target.value)) setRate(Number(e.target.value));
                                            }}
                                            className="text-[18px] text-gray-900 w-full outline-none bg-transparent"
                                        />
                                        <span className="text-[16px] text-gray-400 ml-1">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="bg-[#191919] pt-8 pb-10 px-6 relative w-full flex flex-col items-center">
                            <div className="w-full max-w-[300px] h-[300px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Pie
                                            data={data}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={0}
                                            outerRadius="95%"
                                            dataKey="value"
                                            stroke="none"
                                            isAnimationActive={false}
                                            labelLine={false}
                                            label={renderCustomizedLabel}
                                            onMouseEnter={(_, index) => setActiveIndex(index)}
                                            onMouseLeave={() => setActiveIndex(null)}
                                        >
                                            {data.map((entry, index) => {
                                                const isHovered = activeIndex === index;
                                                const isOtherHovered = activeIndex !== null && activeIndex !== index;
                                                return (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={COLORS[index % COLORS.length]} 
                                                        opacity={isOtherHovered ? 0.3 : 1}
                                                        className="transition-opacity duration-300 outline-none"
                                                    />
                                                )
                                            })}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Legends */}
                            <div className="flex justify-center gap-8 mt-10 w-full">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-[#0a113c]"></div>
                                        <span className="text-[#a0a0a0] text-[13px]">Principal Amount</span>
                                    </div>
                                    <span className="text-white text-[15px] ml-5">₹ {formatNumber(loanAmount)}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-[#5dd9b6]"></div>
                                        <span className="text-[#a0a0a0] text-[13px]">Interest Amount</span>
                                    </div>
                                    <span className="text-white text-[15px] ml-5">₹ {formatNumber(Math.round(totalInterest))}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Results) */}
                    <div className="w-full md:w-1/3 mt-10 md:mt-0 flex flex-col items-center justify-center md:pl-10 md:border-l md:border-gray-200">
                        <div className="text-center w-full mb-10">
                            <div className="flex items-center justify-center gap-2 mb-2 text-gray-500">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                                    <rect x="4" y="2" width="16" height="20" rx="2" />
                                    <circle cx="12" cy="18" r="1.5" />
                                    <line x1="8" y1="6" x2="16" y2="6" />
                                </svg>
                                <span className="text-[13px] tracking-wide text-gray-500 font-medium">Monthly EMI</span>
                            </div>
                            <div className="text-[32px] font-semibold text-black">
                                ₹ {formatNumber(Math.round(emi))}
                            </div>
                        </div>

                        <div className="text-center w-full mb-12">
                            <div className="text-[13px] text-gray-500 mb-2">Total Payable amount</div>
                            <div className="text-[20px] font-semibold text-black">
                                ₹ {formatNumber(Math.round(totalAmount))}
                            </div>
                        </div>

                        <button 
                            onClick={() => navigate('/search?transactionType=buy')}
                            className="w-full bg-[#3798e4] hover:bg-[#2c7dbf] text-white py-3.5 rounded text-[16px] font-semibold transition-colors"
                        >
                            Get instant loan
                        </button>
                        <p className="text-[12px] text-gray-600 mt-4 text-center">It's easy with GetRightHome!</p>
                    </div>

                </div>
            </div>

            {/* About Section - Full Width White Background */}
            <div className="w-full bg-white pt-12 pb-10 border-t border-gray-200">
                <div className="max-w-[1000px] mx-auto px-4 md:px-6">
                    <h2 className="text-[20px] font-semibold text-[#09122c] mb-6">About EMI Calculator</h2>
                    
                    <div className="text-[14px] text-gray-600 space-y-5 leading-relaxed">
                        <p>
                            A home loan EMI calculator helps compute the monthly instalments that a borrower needs to pay against the total amount availed. Such a tool assists you in making an informed decision about the outflow towards the home loan every month.
                        </p>
                        <p>
                            To identify your home loan EMI, you need to fill in the following -
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Loan Amount:</strong> The total amount that you need to avail for your property.</li>
                            <li><strong>Loan Tenure:</strong> You would be required to furnish the desired loan term (in years). A longer tenure helps in reducing the monthly EMI.</li>
                            <li><strong>Interest Rate:</strong> Input interest rate.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* FAQ Section - Full Width White Background */}
            <div id="faq" className="w-full bg-white pt-10 pb-16 mt-4 scroll-mt-20">
                <div className="max-w-[1000px] mx-auto px-4 md:px-6">
                    <h2 className="text-[20px] font-semibold text-[#09122c] mb-2">Frequently asked questions about EMI Calculator</h2>
                    <p className="text-[14px] text-gray-500 mb-6">Know what questions the users frequently asks about EMI calculators</p>
                    
                    <div className="border border-gray-200 rounded divide-y divide-gray-200">
                        {faqData.map((faq, index) => (
                            <div key={index} className="bg-white">
                                <button 
                                    onClick={() => toggleFaq(index)}
                                    className="w-full flex justify-between items-center py-4 px-5 hover:bg-gray-50 transition-colors text-left"
                                >
                                    <span className="text-[15px] font-medium text-gray-800 pr-4">{faq.question}</span>
                                    <div className="shrink-0">
                                        {openFaq === index ? <ChevronUp className="text-gray-400" size={20} /> : <ChevronDown className="text-gray-400" size={20} />}
                                    </div>
                                </button>
                                {openFaq === index && (
                                    <div 
                                        className="px-5 pb-5 text-[14px] text-gray-600 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: faq.answer }}
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

export default EmiCalculatorPage;
