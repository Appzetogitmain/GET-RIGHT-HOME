import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { propertyService } from '../../services/apiService';
import { BadgeCheck, Phone, ChevronRight, User, Star, Loader2 } from 'lucide-react';

const RecommendedSellers = () => {
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSellers = async () => {
            try {
                const data = await propertyService.getRecommendedSellers();
                setSellers(data || []);
            } catch (err) {
                console.error("Failed to fetch recommended sellers:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSellers();
    }, []);

    if (loading) {
        return (
            <div className="py-8 flex justify-center items-center">
                <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
        );
    }

    if (sellers.length === 0) return null;

    return (
        <div className="py-8 border-b border-gray-100 last:border-0 relative">
            <div className="flex justify-between items-end px-5 md:px-0 mb-6">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                        Recommended Sellers
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Trusted partners with complete knowledge about locality</p>
                </div>
            </div>

            <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4 px-5 md:px-0 -mx-5 md:mx-0">
                {sellers.map((seller) => (
                    <motion.div
                        key={seller._id}
                        whileHover={{ y: -3 }}
                        className="min-w-[250px] md:min-w-[270px] bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                    >
                        {/* Header with Plan Color Indicator */}
                        <div className={`h-1 w-full ${seller.plan?.tier === 'diamond' ? 'bg-blue-600' :
                                seller.plan?.tier === 'platinum' ? 'bg-indigo-600' :
                                    seller.plan?.tier === 'gold' ? 'bg-yellow-500' :
                                        'bg-gray-300'
                            }`} />

                        <div className="p-3.5 flex flex-col h-full">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="w-11 h-11 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                                    {seller.profileImage ? (
                                        <img src={seller.profileImage} alt={seller.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="text-gray-300" size={24} />
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-gray-900 text-[13px] flex items-center gap-1 line-clamp-1">
                                        {seller.name}
                                        {seller.plan?.hasVerifiedTag && (
                                            <BadgeCheck size={14} className="text-blue-500 fill-blue-50" />
                                        )}
                                    </h3>
                                    <div className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold uppercase tracking-tight mt-0.5">
                                        <ChevronRight size={10} className="-ml-0.5" />
                                        {seller.plan?.name || 'Partner'}
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2 mb-3 p-2.5 bg-gray-50/50 rounded-lg border border-gray-100/50">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Experience</span>
                                    <span className="text-[12px] font-black text-gray-800 mt-0.5">
                                        {seller.experienceYears || '0.5'}+ Yrs
                                    </span>
                                </div>
                                <div className="flex flex-col border-l border-gray-200 pl-3">
                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Listings</span>
                                    <span className="text-[12px] font-black text-gray-800 mt-0.5">
                                        {seller.totalListings || 0}
                                    </span>
                                </div>
                            </div>

                            {/* Location Tags */}
                            <div className="flex flex-wrap gap-1 mb-4">
                                {seller.address?.city && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white border border-gray-200 text-gray-500 rounded">
                                        {seller.address.city}
                                    </span>
                                )}
                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white border border-gray-200 text-gray-500 rounded">
                                    Top Rated
                                </span>
                            </div>

                            {/* Action */}
                            <button
                                onClick={() => window.location.href = `tel:${seller.phone}`}
                                className="w-full mt-auto bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 group border border-indigo-100"
                            >
                                <Phone size={14} className="group-hover:animate-bounce" />
                                Show Contact
                            </button>
                        </div>
                    </motion.div>
                ))}
                {/* Spacer */}
                <div className="min-w-[5px] shrink-0" />
            </div>
        </div>
    );
};

export default RecommendedSellers;
