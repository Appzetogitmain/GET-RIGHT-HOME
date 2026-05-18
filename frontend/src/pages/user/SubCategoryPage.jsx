import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Search,
    ShoppingCart,
    Plus,
    Minus,
    CheckCircle2,
    Info,
    Star,
    ChevronRight,
    Layers,
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { publicCatalogService } from '../../homster/services/catalogService';
import { useCart } from '../../homster/context/CartContext';
import { useCity } from '../../homster/context/CityContext';
import { toast } from 'react-hot-toast';

const toAssetUrl = (url) => {
    if (!url) return '';
    const clean = url.replace('/api/upload', '/upload');
    if (clean.startsWith('http')) return clean;
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
    return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const SubCategoryPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addToCart } = useCart();
    const { currentCity } = useCity();

    // Data passed via navigation state
    const { subCategory, category } = location.state || {};

    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [addedServices, setAddedServices] = useState({});
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        if (!subCategory) {
            navigate(-1);
            return;
        }
        fetchServices();
    }, [subCategory]);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const subCatId = subCategory?.id || subCategory?._id;
            const catId = category?.id || category?._id;
            const response = await publicCatalogService.getServices({
                subCategoryId: subCatId,
                categoryId: catId,
            });
            if (response.success) {
                setServices(response.services || []);
            }
        } catch (error) {
            console.error('Failed to load services:', error);
            toast.error('Failed to load services');
        } finally {
            setLoading(false);
        }
    };

    const filteredServices = services.filter(svc =>
        svc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        svc.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddToCart = async (service) => {
        try {
            const cartItemData = {
                serviceId: service.id || service._id,
                categoryId: category?.id || category?._id,
                subCategoryId: subCategory?.id || subCategory?._id,
                title: service.title,
                description: service.description || '',
                icon: toAssetUrl(service.icon || service.imageUrl || subCategory?.iconUrl || ''),
                category: category?.title,
                subCategory: subCategory?.title,
                price: service.discountPrice || service.basePrice || service.price,
                unitPrice: service.discountPrice || service.basePrice || service.price,
                serviceCount: 1,
            };

            const response = await addToCart(cartItemData);
            if (response.success) {
                setAddedServices(prev => ({ ...prev, [service.id || service._id]: true }));
                toast.success('Added to cart!');
                setTimeout(() => {
                    setRedirecting(true);
                    setTimeout(() => navigate('/user/cart'), 800);
                }, 300);
            } else {
                toast.error(response.message || 'Failed to add to cart');
            }
        } catch (error) {
            toast.error('Failed to add to cart');
        }
    };

    if (!subCategory) return null;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans">
            {/* Parent Wrapper with NO overflow-hidden to prevent search bar clipping */}
            <div className="relative w-full">
                {/* Full-Width Edge-to-Edge Premium Banner Container (handles overflow-hidden and rounded bottom corners) */}
                <div className="relative w-full h-[64vw] sm:h-80 bg-gray-150 overflow-hidden shadow-sm rounded-b-[2.5rem] sm:rounded-b-[3rem]">
                    {subCategory?.bannerUrl ? (
                        <img
                            src={toAssetUrl(subCategory.bannerUrl)}
                            alt={subCategory.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        /* Fallback Banner Gradient */
                        <div className="w-full h-full bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 flex flex-col items-center justify-center p-6 text-white">
                            <Layers size={48} className="animate-bounce mb-2 opacity-80" />
                        </div>
                    )}
                    
                    {/* Subtle overlay gradient to ensure high readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    
                    {/* Transparent Floating Header Buttons */}
                    <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 flex items-center justify-center bg-black/45 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-black/60 transition-all active:scale-95 shadow-md"
                        >
                            <ArrowLeft size={20} className="stroke-[3]" />
                        </button>
                        
                        {/* Floating City/Location Badge */}
                        {currentCity?.name && (
                            <div className="bg-black/45 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-white text-xs font-black tracking-widest uppercase flex items-center gap-1 shadow-md">
                                <span>{currentCity.name}</span>
                                <ChevronRight size={10} className="rotate-90 stroke-[3] text-emerald-400 animate-pulse" />
                            </div>
                        )}
                        
                        <button
                            onClick={() => navigate('/user/cart')}
                            className="w-10 h-10 flex items-center justify-center bg-black/45 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-black/60 transition-all active:scale-95 shadow-md"
                        >
                            <ShoppingCart size={18} className="stroke-[3]" />
                        </button>
                    </div>

                    {/* Overlaid Banner Typography */}
                    <div className="absolute bottom-12 left-6 right-6 text-white z-20">
                        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight drop-shadow-md">
                            {subCategory.title}
                        </h2>
                        {category?.title && (
                            <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/90 text-white py-1 px-3 rounded-full mt-2 inline-block shadow-sm">
                                {category.title}
                            </span>
                        )}
                    </div>
                </div>

                {/* Overlapping Floating Search Bar (Placed OUTSIDE the overflow-hidden parent to prevent clipping) */}
                <div className="absolute bottom-0 left-6 right-6 translate-y-1/2 z-30 max-w-xl mx-auto">
                    <div className="flex items-center bg-white border border-gray-150 rounded-2xl px-4 py-3.5 shadow-lg shadow-gray-200/80 gap-2.5">
                        <Search size={18} className="text-gray-400 flex-shrink-0 stroke-[3]" />
                        <input
                            type="text"
                            placeholder={`Search in ${subCategory?.title || 'services'}...`}
                            className="bg-transparent border-none outline-none w-full text-sm font-semibold text-gray-700 placeholder:text-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Services List Content Section */}
            <div className="max-w-3xl mx-auto px-4 mt-12 pt-8">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white rounded-[1.5rem] border border-gray-100 p-5 flex gap-4 animate-pulse">
                                <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Layers size={32} className="text-gray-200" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-2">
                            {searchQuery ? 'No results found' : 'No services available'}
                        </h3>
                        <p className="text-gray-400 text-sm font-medium">
                            {searchQuery
                                ? `No services match "${searchQuery}"`
                                : 'Services will be added soon.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
                        </p>
                        <AnimatePresence>
                            {filteredServices.map((svc, idx) => {
                                const price = svc.discountPrice || svc.basePrice || svc.price;
                                const originalPrice = (svc.discountPrice && svc.basePrice && svc.discountPrice < svc.basePrice)
                                    ? svc.basePrice
                                    : null;
                                const isAdded = addedServices[svc.id || svc._id];

                                return (
                                    <motion.div
                                        key={svc.id || svc._id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-white rounded-[1.5rem] border border-gray-100 shadow-md shadow-gray-200/30 overflow-hidden p-5"
                                    >
                                        <div className="flex justify-between items-start gap-4">
                                            {/* Service Info (Left side) */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-extrabold text-gray-900 text-base leading-snug mb-1">
                                                    {svc.title}
                                                </h3>
                                                
                                                {/* Price block */}
                                                <div className="flex items-center gap-1.5 mt-1 mb-2">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Starts at</span>
                                                    <span className="text-base font-black text-gray-800">
                                                        ₹{price}
                                                    </span>
                                                    {originalPrice && (
                                                        <span className="text-[11px] text-gray-400 line-through font-bold">
                                                            ₹{originalPrice}
                                                        </span>
                                                    )}
                                                </div>

                                                {svc.description && (
                                                    <p className="text-xs text-gray-500 leading-relaxed mb-3">
                                                        {svc.description}
                                                    </p>
                                                )}

                                                <button className="text-[11px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1 hover:underline">
                                                    View details <ChevronRight size={12} className="stroke-[3]" />
                                                </button>
                                            </div>

                                            {/* Service Image + Add CTA (Right side) */}
                                            <div className="relative flex flex-col items-center flex-shrink-0 pb-2">
                                                <div className="w-24 h-24 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden relative shadow-sm">
                                                    {(svc.imageUrl || svc.icon) ? (
                                                        <img
                                                            src={toAssetUrl(svc.imageUrl || svc.icon)}
                                                            alt={svc.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                                            <Layers size={24} />
                                                        </div>
                                                    )}

                                                    {/* Subheading badge overlay */}
                                                    {svc.subheading && (
                                                        <div className="absolute top-1 left-1 right-1 bg-emerald-500/90 text-white text-[8px] font-black uppercase py-0.5 px-1.5 rounded-md text-center tracking-wider truncate shadow-sm">
                                                            {svc.subheading}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Overlaid / Bottom aligned ADD Button */}
                                                <div className="absolute -bottom-2 z-10 shadow-lg shadow-emerald-100/50 rounded-xl overflow-hidden border border-emerald-100">
                                                    <motion.button
                                                        whileTap={{ scale: 0.92 }}
                                                        onClick={() => handleAddToCart(svc)}
                                                        disabled={isAdded}
                                                        className={`flex items-center justify-center gap-1 px-5 py-1.5 min-w-[80px] text-[10px] font-black uppercase tracking-widest transition-all
                                                            ${isAdded
                                                                ? 'bg-emerald-50 text-emerald-700 font-bold'
                                                                : 'bg-white text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100'
                                                            }`}
                                                    >
                                                        {isAdded ? (
                                                            <>
                                                                <CheckCircle2 size={12} className="stroke-[3]" />
                                                                Added
                                                            </>
                                                        ) : (
                                                            <>
                                                                Add
                                                            </>
                                                        )}
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Footer Info */}
                        <div className="mt-6 p-5 bg-gray-50/80 rounded-[1.5rem] border border-gray-100 flex items-start gap-3">
                            <Info size={16} className="text-emerald-500 flex-shrink-0 mt-0.5 stroke-[3]" />
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider leading-relaxed">
                                * Final price may vary after detailed inspection or specific service requirements.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Redirect overlay */}
            <AnimatePresence>
                {redirecting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-white/90 z-50 flex flex-col items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner"
                        >
                            <CheckCircle2 size={40} className="text-emerald-500" />
                        </motion.div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Added to Cart!</h3>
                        <p className="text-gray-500 font-bold">Redirecting to checkout...</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SubCategoryPage;
