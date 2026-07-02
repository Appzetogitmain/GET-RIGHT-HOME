import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const BHKChoice = ({ transactionType }) => {
    const navigate = useNavigate();

    // 99acres style BHK options
    const options = [
        { label: '1 RK/1 BHK', value: '1', icon: '🛏️' },
        { label: '2 BHK', value: '2', icon: '🛋️' },
        { label: '3 BHK', value: '3', icon: '🏡' },
        { label: '4+ BHK', value: '4', icon: '✨' },
    ];

    const handleSelect = (bhkValue) => {
        // Navigate to search with bhk filter
        const params = new URLSearchParams();
        if (transactionType) {
            params.set('type', transactionType);
        }
        params.set('bhk', bhkValue);
        navigate(`/search?${params.toString()}`);
    };

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 mb-4 tracking-tight">
                BHK Choice in Mind
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {options.map((opt, idx) => (
                    <motion.button
                        key={idx}
                        whileHover={{ y: -4, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleSelect(opt.value)}
                        className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl border-2 border-slate-50 bg-slate-50 hover:bg-white hover:border-blue-100 transition-all duration-300 group"
                    >
                        <span className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
                            {opt.icon}
                        </span>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600">
                            {opt.label}
                        </span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

export default BHKChoice;
