import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { offerService } from '../../services/apiService';
import toast from 'react-hot-toast';

const ExclusiveOffers = () => {
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOffers = async () => {
            try {
                setLoading(true);
                const data = await offerService.getActive();
                setOffers(data);
            } catch (err) {
                console.error("Fetch Offers Error:", err);
                setError(err.message);
                // toast.error("Failed to load exclusive offers");
            } finally {
                setLoading(false);
            }
        };
        fetchOffers();
    }, []);

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

    if (error || (offers.length === 0 && !loading)) {
        return null; // Don't show the section if no offers or error
    }

    return (
        <section className="py-2 pl-5 mt-2">
            <h2 className="text-xl font-bold text-emerald-900 mb-4 flex items-center gap-2">
                Exclusive offers for you
                <div className="bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold text-emerald-600">NEW</div>
            </h2>

            <div className="flex gap-4 overflow-x-auto pb-4 pr-5 snap-x no-scrollbar">
                {offers.map((offer) => (
                    <motion.div
                        key={offer._id || offer.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            // Copy code to clipboard as a courtesy
                            navigator.clipboard.writeText(offer.code);
                            toast.success(`Code ${offer.code} copied!`);
                            navigate('/listings');
                        }}
                        className={`
                            relative 
                            min-w-[280px] md:min-w-[320px] 
                            h-[160px] 
                            rounded-2xl 
                            overflow-hidden 
                            snap-center 
                            shadow-md shadow-gray-200/50
                            cursor-pointer
                        `}
                    >
                        {/* Background Image */}
                        <img
                            src={offer.image}
                            alt={offer.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                        />

                        {/* Dark Gradient Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-r from-emerald-950/80 via-emerald-900/40 to-transparent flex flex-col justify-center p-5 text-white items-start`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-emerald-500 text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase shadow-sm">
                                    {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                                </span>
                            </div>
                            <h3 className="text-xl font-black leading-tight max-w-[80%] drop-shadow-md">{offer.title}</h3>
                            <p className="text-[10px] font-semibold text-gray-300 mt-1 max-w-[70%] leading-relaxed drop-shadow-md line-clamp-2">{offer.subtitle}</p>

                            <div className="mt-3 flex items-center gap-2">
                                <button className="px-4 py-1.5 bg-white text-black text-[10px] font-black rounded-lg hover:shadow-xl transition-all shadow-md active:scale-95">
                                    {offer.btnText || "Copy Code"}
                                </button>
                                <span className="text-[9px] text-white/60 font-medium border-l border-white/20 pl-2">Code: <span className="text-white font-bold">{offer.code}</span></span>
                            </div>
                        </div>

                    </motion.div>
                ))}
            </div>
        </section>
    );
};

export default ExclusiveOffers;
