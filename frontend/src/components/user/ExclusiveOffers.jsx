import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { offerService } from '../../services/apiService';
import toast from 'react-hot-toast';

const ExclusiveOffers = ({ themeColor = 'emerald' }) => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    const themeMap = {
        emerald: { bg: 'bg-emerald-500', bgLight: 'bg-emerald-100', text: 'text-emerald-600' },
        violet: { bg: 'bg-violet-500', bgLight: 'bg-violet-100', text: 'text-violet-600' },
        blue: { bg: 'bg-blue-500', bgLight: 'bg-blue-100', text: 'text-blue-600' },
        amber: { bg: 'bg-amber-500', bgLight: 'bg-amber-100', text: 'text-amber-600' },
    };
    const t = themeMap[themeColor] || themeMap.emerald;

    useEffect(() => {
        let isMounted = true;
        const fetchOffers = async () => {
            try {
                setLoading(true);
                const data = await offerService.getActive();
                if (isMounted) {
                    if (Array.isArray(data)) {
                        setOffers(data);
                    } else if (data && Array.isArray(data.data)) {
                        setOffers(data.data);
                    } else {
                        setOffers([]);
                    }
                }
            } catch (err) {
                console.error("Fetch Offers Error:", err);
                if (isMounted) {
                    setError(err.message);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };
        fetchOffers();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleCopyCode = (offer, e) => {
        if (e) e.stopPropagation();
        if (offer?.code) {
            navigator.clipboard.writeText(offer.code);
            setCopiedId(offer._id || offer.id || offer.code);
            toast.success(`Coupon code ${offer.code} copied to clipboard!`, {
                icon: '🎉',
                duration: 3000
            });
            setTimeout(() => {
                setCopiedId(null);
            }, 3000);
        }
    };

    if (loading) {
        return (
            <div className="py-2 pl-5">
                <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-4"></div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar">
                    {[1, 2].map(i => (
                        <div key={i} className="min-w-[300px] h-[180px] bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center">
                            <Loader2 className="text-gray-200 animate-spin" size={24} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !Array.isArray(offers) || (offers.length === 0 && !loading)) {
        return null; // Don't show the section if no offers or error
    }

    return (
        <section className="w-full px-4 md:px-6 lg:px-8 2xl:px-12 mx-auto py-4 mt-2 border-b border-gray-100 mb-6">
            <div className="flex flex-col mb-4">
                <div className="flex items-center gap-2 mb-0.5">
                    <div className={`w-1 h-5 ${t.bg} rounded-full`} />
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
                        Exclusive offers for you
                        <div className={`${t.bgLight} px-2 py-0.5 rounded text-[10px] font-bold ${t.text}`}>NEW</div>
                    </h2>
                </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 snap-x no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                {offers.map((offer) => {
                    const isCopied = copiedId === (offer._id || offer.id || offer.code);
                    return (
                        <motion.div
                            key={offer._id || offer.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={(e) => handleCopyCode(offer, e)}
                            className={`
                                relative 
                                min-w-[280px] md:min-w-[340px] lg:min-w-[420px] xl:min-w-[480px]
                                h-[160px] md:h-[180px] lg:h-[220px] xl:h-[260px]
                                rounded-2xl 
                                overflow-hidden 
                                snap-center 
                                shadow-md shadow-gray-200/50
                                cursor-pointer
                                shrink-0
                            `}
                        >
                            {/* Background Image */}
                            <img
                                src={offer.image}
                                alt={offer.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                            />

                            {/* Dark Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center p-5 lg:p-8 text-white items-start">
                                <div className="flex items-center gap-2 mb-1 lg:mb-2">
                                    <span className={`${t.bg} text-[8px] lg:text-[10px] font-black px-1.5 py-0.5 lg:px-2 lg:py-1 rounded tracking-widest uppercase shadow-sm`}>
                                        {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                                    </span>
                                </div>
                                <h3 className="text-xl lg:text-3xl font-black leading-tight max-w-[80%] drop-shadow-md">{offer.title}</h3>
                                <p className="text-[10px] lg:text-[12px] font-semibold text-gray-300 mt-1 lg:mt-2 max-w-[70%] leading-relaxed drop-shadow-md line-clamp-2">{offer.subtitle}</p>

                                <div className="mt-3 lg:mt-5 flex items-center gap-2 lg:gap-3 flex-wrap">
                                    <button 
                                        onClick={(e) => handleCopyCode(offer, e)}
                                        className={`px-4 py-1.5 lg:px-6 lg:py-2.5 text-[10px] lg:text-xs font-black rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1.5 ${
                                            isCopied 
                                                ? 'bg-emerald-500 text-white shadow-emerald-500/30' 
                                                : 'bg-white text-black hover:shadow-xl hover:bg-gray-50'
                                        }`}
                                    >
                                        <span>{isCopied ? 'Code Copied! ✓' : (offer.btnText || 'Copy Code')}</span>
                                    </button>
                                    <span className="text-[9px] lg:text-xs text-white/70 font-medium border-l border-white/20 pl-2 lg:pl-3 truncate max-w-[200px] lg:max-w-[260px]">
                                        Code: <span className="text-white font-bold font-mono">{offer.code}</span>
                                    </span>
                                </div>
                            </div>

                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
};

export default ExclusiveOffers;
