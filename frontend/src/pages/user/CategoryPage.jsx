import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Layers, Info, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { publicCatalogService } from '../../homster/services/catalogService';
import { useCart } from '../../homster/context/CartContext';
import { useCity } from '../../homster/context/CityContext';

const toAssetUrl = (url) => {
    if (!url) return '';
    const clean = url.replace('/api/upload', '/upload');
    if (clean.startsWith('http')) return clean;
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
    return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

/**
 * Full-page replacement for the old CategoryModal bottom-sheet — browsing a
 * category (its sub-categories, or its services directly if it's a "direct
 * service" category with no sub-category step) is its own page now instead
 * of a popup, matching every other browsing step in Home Services
 * (/home-services/sub-category is already a page; this fills the gap one
 * level up).
 */
const CategoryPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { categoryId } = useParams();
    const { currentCity } = useCity();
    const { addToCart } = useCart();
    const cityId = currentCity?._id || currentCity?.id;

    // Whatever the card that linked here already knew (title, icon, etc.) —
    // shown immediately so the page isn't blank while the real fetch runs.
    const [category, setCategory] = useState(location.state?.category || null);
    const [subCategories, setSubCategories] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        const loadCategory = async () => {
            try {
                const catRes = await publicCatalogService.getCategories(cityId);
                if (catRes?.success) {
                    const allCats = catRes.categories || [];
                    const full = allCats.find((c) => String(c._id || c.id) === String(categoryId));
                    if (full) setCategory(full);
                }
            } catch (err) {
                console.error('Failed to load category:', err);
            }
        };
        loadCategory();
    }, [categoryId, cityId]);

    useEffect(() => {
        const isDirect = category?.isDirectService;
        const load = async () => {
            setLoading(true);
            try {
                if (isDirect) {
                    const res = await publicCatalogService.getServices({ categoryId });
                    if (res.success) setServices(res.services || []);
                } else {
                    const res = await publicCatalogService.getSubCategories({ cityId, categoryId });
                    if (res.success) setSubCategories(res.subCategories || []);
                }
            } catch (err) {
                console.error('Failed to load category content:', err);
            } finally {
                setLoading(false);
            }
        };
        // Only once we actually know whether it's direct or not — category
        // starts as whatever the link handed us, which may not include that
        // flag, so wait for the real fetch above to settle it first.
        if (category) load();
    }, [category, categoryId, cityId]);

    const handleSubCategoryClick = (subCat) => {
        navigate('/home-services/sub-category', {
            state: { subCategory: subCat, category, currentCity: { _id: cityId } }
        });
    };

    const handleServiceClick = async (service) => {
        try {
            const cartItemData = {
                serviceId: service.id || service._id,
                categoryId: category?.id || category?._id,
                title: service.title,
                description: service.description || '',
                icon: toAssetUrl(service.icon || service.imageUrl || ''),
                category: category?.title,
                subCategory: category?.title || '',
                price: service.discountPrice || service.basePrice || service.price,
                unitPrice: service.discountPrice || service.basePrice || service.price,
                serviceCount: 1,
            };
            const response = await addToCart(cartItemData);
            if (response.success) {
                setIsRedirecting(true);
                setTimeout(() => navigate('/user/cart'), 1000);
            } else {
                toast.error(response.message || 'Failed to add to cart');
            }
        } catch {
            toast.error('Failed to add to cart');
        }
    };

    const isDirect = category?.isDirectService;

    if (isRedirecting) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner"
                >
                    <Check className="w-10 h-10 text-emerald-500" />
                </motion.div>
                <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Added to Cart!</h3>
                <p className="text-gray-500 font-bold">Redirecting to checkout...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pb-16">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 hover:bg-gray-100 transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-900" />
                    </button>
                    {category?.homeIconUrl && (
                        <div className="w-10 h-10 bg-gray-50 rounded-xl p-1.5 border border-gray-100 shrink-0">
                            <img src={toAssetUrl(category.homeIconUrl)} alt="" className="w-full h-full object-contain" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none uppercase truncate">
                            {category?.title || category?.name || 'Services'}
                        </h1>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                            {isDirect ? 'Select a service to proceed' : 'Select a sub-category'}
                        </p>
                    </div>
                    {loading && <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin ml-auto shrink-0"></div>}
                </div>
            </div>

            {/* Body */}
            <div className="max-w-3xl mx-auto px-5 pt-6">
                {loading && (isDirect ? services.length === 0 : subCategories.length === 0) ? (
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="aspect-square bg-gray-50 rounded-3xl animate-pulse border border-gray-100"></div>
                        ))}
                    </div>
                ) : !isDirect ? (
                    /* Sub-category grid */
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                        {subCategories.map((sub) => (
                            <motion.button
                                key={sub.id || sub._id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSubCategoryClick(sub)}
                                className="flex flex-col items-center group"
                            >
                                <div className="w-full aspect-square bg-gray-50 rounded-3xl flex items-center justify-center p-4 border border-gray-100 shadow-sm group-hover:shadow-md group-hover:border-emerald-100 transition-all mb-2 overflow-hidden">
                                    <img src={toAssetUrl(sub.iconUrl || sub.imageUrl)} alt={sub.title} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-800 text-center leading-tight line-clamp-2 px-1 uppercase tracking-tighter">
                                    {sub.title}
                                </span>
                            </motion.button>
                        ))}
                        {subCategories.length === 0 && !loading && (
                            <div className="col-span-3 sm:col-span-4 py-16 text-center">
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No options available</p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Direct category: service list */
                    <div className="space-y-3">
                        {services.map((svc) => (
                            <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                key={svc.id || svc._id}
                                className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm hover:shadow-lg hover:shadow-gray-200/40 transition-all group"
                            >
                                <div className="flex-1 pr-4">
                                    <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{svc.title}</h3>
                                    <div className="flex items-baseline gap-2">
                                        <div className="flex items-center gap-1">
                                            <span className="text-lg font-black text-emerald-600">₹{svc.discountPrice || svc.basePrice || svc.price}</span>
                                            {svc.pricingUnit && <span className="text-xs font-bold text-gray-500 lowercase"> / {svc.pricingUnit}</span>}
                                        </div>
                                        {(svc.discountPrice && svc.discountPrice < (svc.basePrice || svc.price)) && (
                                            <span className="text-[11px] text-gray-400 line-through font-bold">₹{svc.basePrice || svc.price}</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleServiceClick(svc)}
                                    className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                                >
                                    <Plus size={14} /> Add
                                </button>
                            </motion.div>
                        ))}

                        {services.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Layers className="w-8 h-8 text-gray-200 mb-2" />
                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No services found</p>
                            </div>
                        )}

                        <div className="mt-6 p-5 bg-gray-50/80 rounded-[2rem] border border-gray-100 flex items-start gap-4">
                            <div className="mt-0.5 text-emerald-500">
                                <Info size={18} className="stroke-[3]" />
                            </div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider leading-relaxed">
                                * Final price may vary after detailed inspection or specific service requirements.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategoryPage;
