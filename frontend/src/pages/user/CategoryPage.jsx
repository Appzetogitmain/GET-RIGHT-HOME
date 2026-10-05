import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Minus, Layers, Info, Check, X, ShoppingCart, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { publicCatalogService } from '../../homster/services/catalogService';
import { useCart } from '../../homster/context/CartContext';
import { useCity } from '../../homster/context/CityContext';
import CategoryLanding from '../../components/user/CategoryLanding';
import ServiceListing from '../../homster/modules/user/components/booking/ServiceListing';

const toAssetUrl = (url) => {
    if (!url) return '';
    const clean = url.replace('/api/upload', '/upload');
    if (clean.startsWith('http')) return clean;
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
    return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

/**
 * Full-page browsing of a category (its sub-categories, or its services directly if it's a "direct
 * service" category with no sub-category step).
 */
const CategoryPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { categoryId } = useParams();
    const [searchParams] = useSearchParams();
    const { currentCity } = useCity();
    const { cartItems, cartCount, addToCart, updateItem, removeItem } = useCart();
    const cityId = currentCity?._id || currentCity?.id;
    const bookingMode = location.state?.bookingMode === 'instant' || searchParams.get('mode') === 'instant' ? 'instant' : 'slot';

    const [category, setCategory] = useState(location.state?.category || null);

    // Packers & Movers is a quote wizard, not a service list.
    useEffect(() => {
        if (/packers/i.test(category?.title || category?.name || '')) navigate('/home-services/packers-movers', { replace: true });
    }, [category, navigate]);
    const [subCategories, setSubCategories] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubCategory, setSelectedSubCategory] = useState(null);

    // Floating Cart Bar state
    const [cartBarDismissed, setCartBarDismissed] = useState(false);
    const prevCartCountRef = useRef(cartCount);
    useEffect(() => {
        if (cartCount > prevCartCountRef.current) {
            setCartBarDismissed(false);
        }
        prevCartCountRef.current = cartCount;
    }, [cartCount]);

    // Totals
    const totalCartPrice = useMemo(() => {
        return (cartItems || []).reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    }, [cartItems]);

    const totalCartItems = useMemo(() => {
        return (cartItems || []).reduce((sum, item) => sum + (Number(item.serviceCount) || 1), 0);
    }, [cartItems]);

    useEffect(() => {
        window.scrollTo(0, 0);
        const loadCategory = async () => {
            try {
                const catRes = await publicCatalogService.getCategories(cityId, bookingMode);
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
    }, [categoryId, cityId, bookingMode]);

    useEffect(() => {
        const isDirect = category?.isDirectService;
        const load = async () => {
            setLoading(true);
            try {
                if (isDirect) {
                    const res = await publicCatalogService.getServices({ categoryId, bookingMode });
                    if (res.success) setServices(res.services || []);
                } else {
                    const res = await publicCatalogService.getSubCategories({ cityId, categoryId, bookingMode });
                    if (res.success) setSubCategories(res.subCategories || []);
                }
            } catch (err) {
                console.error('Failed to load category content:', err);
            } finally {
                setLoading(false);
            }
        };
        if (category) load();
    }, [category?.isDirectService, categoryId, cityId, bookingMode]);

    const handleSubCategoryClick = async (subCat) => {
        setSelectedSubCategory(subCat);
        setLoading(true);
        try {
            const res = await publicCatalogService.getServices({
                categoryId,
                subCategoryId: subCat.id || subCat._id,
                bookingMode
            });
            if (res.success) setServices(res.services || []);
        } catch (error) {
            console.error('Failed to load services:', error);
            toast.error('Services could not be loaded');
        } finally {
            setLoading(false);
        }
    };

    // A category opens on its landing (banner + sub-category grid). Only when we
    // are sent here for one particular sub-category does its services page open directly.
    useEffect(() => {
        if (category?.isDirectService || selectedSubCategory || subCategories.length === 0) return;
        const wanted = location.state?.subCategory;
        const start = wanted && subCategories.find((s) => String(s.id || s._id) === String(wanted.id || wanted._id));
        if (start) handleSubCategoryClick(start);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subCategories, category?.isDirectService]);

    const getCartItem = (serviceId) => {
        if (!serviceId || !cartItems?.length) return null;
        return cartItems.find((item) => 
            String(item.serviceId) === String(serviceId) ||
            String(item._id) === String(serviceId) ||
            String(item.id) === String(serviceId)
        );
    };

    // Add a service (or one option of it) to the cart.
    const addToCartWithOption = async (service, option) => {
        try {
            const unit = option
                ? (Number(option.discountPrice) > 0 && Number(option.discountPrice) < Number(option.price) ? Number(option.discountPrice) : Number(option.price))
                : (service.discountPrice || service.basePrice || service.price);
            const original = option ? Number(option.price) : Number(service.basePrice || service.price);
            const response = await addToCart({
                serviceId: service.id || service._id,
                categoryId: category?.id || category?._id,
                subCategoryId: selectedSubCategory?.id || selectedSubCategory?._id || undefined,
                title: option ? `${service.title} · ${option.label}` : service.title,
                optionLabel: option?.label || '',
                description: service.description || '',
                duration: option?.duration || service.duration || '',
                icon: toAssetUrl(service.icon || service.imageUrl || selectedSubCategory?.iconUrl || category?.homeIconUrl || ''),
                category: category?.title,
                subCategory: selectedSubCategory?.title || category?.title || '',
                price: unit,
                unitPrice: unit,
                originalPrice: original > unit ? original : undefined,
                serviceCount: 1,
                isInstant: bookingMode === 'instant',
                bookingMode,
            });
            if (response.success) {
                toast.success(`${option ? `${service.title} · ${option.label}` : service.title} added`);
                setCartBarDismissed(false);
            } else {
                toast.error(response.message || 'Failed to add to cart');
            }
        } catch {
            toast.error('Failed to add to cart');
        }
    };

    // + / − on a cart line (removes it when it reaches zero).
    const changeLineQty = async (line, delta) => {
        const next = (Number(line.serviceCount) || 1) + delta;
        const itemId = line._id || line.id || line.serviceId;
        if (next <= 0) {
            await removeItem(itemId);
        } else {
            await updateItem(itemId, next);
        }
    };

    const handleServiceClick = async (service) => {
        try {
            const cartItemData = {
                serviceId: service.id || service._id,
                categoryId: category?.id || category?._id,
                subCategoryId: selectedSubCategory?.id || selectedSubCategory?._id || undefined,
                title: service.title,
                description: service.description || '',
                icon: toAssetUrl(service.icon || service.imageUrl || selectedSubCategory?.iconUrl || category?.homeIconUrl || ''),
                category: category?.title,
                subCategory: selectedSubCategory?.title || category?.title || '',
                price: service.discountPrice || service.basePrice || service.price,
                unitPrice: service.discountPrice || service.basePrice || service.price,
                serviceCount: 1,
                isInstant: bookingMode === 'instant',
                bookingMode,
            };
            const response = await addToCart(cartItemData);
            if (response.success) {
                toast.success(`${service.title} added to cart`);
                setCartBarDismissed(false);
            } else {
                toast.error(response.message || 'Failed to add to cart');
            }
        } catch {
            toast.error('Failed to add to cart');
        }
    };

    const handleQuantityChange = async (service, change) => {
        const sId = service.id || service._id;
        const item = getCartItem(sId);
        if (!item) {
            if (change > 0) return handleServiceClick(service);
            return;
        }

        const currentCount = Number(item.serviceCount) || 1;
        const newCount = currentCount + change;
        const itemId = item._id || item.id || item.serviceId;

        if (newCount <= 0) {
            const res = await removeItem(itemId);
            if (res.success) {
                toast.success(`${service.title} removed from cart`);
            }
        } else {
            await updateItem(itemId, newCount);
        }
    };

    const renderCartControl = (service) => {
        const sId = service.id || service._id;
        const cartItem = getCartItem(sId);

        if (cartItem && (cartItem.serviceCount || 0) > 0) {
            return (
                <div className="flex items-center bg-emerald-50 border-2 border-emerald-500 rounded-xl overflow-hidden shrink-0 shadow-sm">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(service, -1);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-emerald-700 hover:bg-emerald-100 active:scale-90 transition-all font-black"
                        title="Decrease quantity"
                    >
                        <Minus size={14} className="stroke-[3]" />
                    </button>
                    <span className="w-6 text-center font-black text-emerald-800 text-sm select-none">
                        {cartItem.serviceCount || 1}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(service, 1);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-emerald-700 hover:bg-emerald-100 active:scale-90 transition-all font-black"
                        title="Increase quantity"
                    >
                        <Plus size={14} className="stroke-[3]" />
                    </button>
                </div>
            );
        }

        return (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleServiceClick(service);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-500 text-emerald-700 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0"
            >
                <Plus size={14} className="stroke-[3]" /> Add
            </button>
        );
    };

    const isDirect = category?.isDirectService;

    // Services page (NoBroker-style listing) for a direct category or a chosen sub-category.
    if (category && (isDirect || selectedSubCategory)) {
        return (
            <ServiceListing
                title={category?.title || 'Services'}
                subTitle={selectedSubCategory?.title || ''}
                subRating={selectedSubCategory?.rating}
                mergePlain={bookingMode !== 'instant'}
                ctaLabel={bookingMode === 'instant' ? 'Proceed' : 'Select Address'}
                etaMinutes={bookingMode === 'instant' ? (Math.min(...(services.map((s) => Number(s.instantEtaMinutes) || 30)), 30) || 30) : 0}
                subReviewCount={selectedSubCategory?.reviewCount}
                bannerUrl={toAssetUrl(selectedSubCategory?.bannerUrl || selectedSubCategory?.imageUrl || category?.bannerUrl || '')}
                description={selectedSubCategory?.description || ''}
                services={services}
                loading={loading}
                cartItems={cartItems}
                cartCount={cartCount}
                totalPrice={totalCartPrice}
                onAdd={addToCartWithOption}
                onChangeQty={changeLineQty}
                onBack={() => (!isDirect && selectedSubCategory ? setSelectedSubCategory(null) : navigate(-1))}
                onOpenCart={() => navigate('/user/cart')}
                subCategories={isDirect ? [] : subCategories}
                activeSubId={selectedSubCategory?.id || selectedSubCategory?._id}
                onSelectSub={handleSubCategoryClick}
            />
        );
    }

    if (category && !isDirect) {
        const eta = bookingMode === 'instant' ? Math.min(...services.map((sv) => Number(sv.instantEtaMinutes) || 30), 30) : 0;
        return (
            <CategoryLanding
                category={category}
                subCategories={subCategories}
                loading={loading}
                cityName={currentCity?.name || currentCity?.title || ''}
                cartCount={cartCount}
                instantEta={eta}
                onBack={() => navigate(-1)}
                onOpenCart={() => navigate('/user/cart')}
                onPick={handleSubCategoryClick}
            />
        );
    }

    return (
        <div className="min-h-screen bg-white pb-28">
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
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none uppercase truncate">
                            {category?.title || category?.name || 'Services'}
                        </h1>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                            {isDirect ? 'Select a service to proceed' : 'Select a sub-category'}
                        </p>
                    </div>
                    {loading && <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0"></div>}
                    <button
                        onClick={() => navigate('/user/cart')}
                        className="relative w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 hover:bg-gray-100 transition-colors shrink-0 ml-1"
                        title="View Cart"
                    >
                        <ShoppingCart className="w-5 h-5 text-gray-900" />
                        {totalCartItems > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white text-[9px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-white shadow-md animate-scaleIn">
                                {totalCartItems}
                            </span>
                        )}
                    </button>
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
                                {renderCartControl(svc)}
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

            {/* Sub-Category Services Modal */}
            <AnimatePresence>
                {selectedSubCategory && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            aria-label="Close services"
                            className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer border-none"
                            onClick={() => setSelectedSubCategory(null)}
                        />
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="relative bg-white w-full sm:max-w-xl max-h-[88vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
                        >
                            <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">{selectedSubCategory.title}</h2>
                                    <p className="text-xs text-gray-500 mt-1">Choose services and add them to your cart</p>
                                </div>
                                <button
                                    onClick={() => setSelectedSubCategory(null)}
                                    className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="overflow-y-auto p-4 space-y-3 flex-1">
                                {loading ? (
                                    <div className="py-12 text-center text-sm text-gray-500">Loading services...</div>
                                ) : services.length === 0 ? (
                                    <div className="py-12 text-center text-sm text-gray-500">No {bookingMode} services available.</div>
                                ) : services.map((service) => (
                                    <div key={service.id || service._id} className="flex gap-3 rounded-2xl border border-gray-200 p-3 items-center">
                                        <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                                            {(service.imageUrl || service.icon) && (
                                                <img src={toAssetUrl(service.imageUrl || service.icon)} alt="" className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-extrabold text-gray-900">{service.title}</h3>
                                            <p className="text-xs text-gray-500 line-clamp-2">{service.subheading || service.description}</p>
                                            <p className="font-black text-gray-900 mt-1">₹{service.discountPrice || service.basePrice || service.price}</p>
                                        </div>
                                        {renderCartControl(service)}
                                    </div>
                                ))}
                            </div>

                            {/* Modal Bottom Cart Bar */}
                            <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/user/cart')}
                                    className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 font-bold flex items-center justify-between shadow-lg shadow-emerald-600/25 transition-all"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                                            <ShoppingCart size={18} />
                                        </div>
                                        <div className="text-left min-w-0">
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 leading-tight">
                                                {totalCartItems > 0 ? `${totalCartItems} ${totalCartItems > 1 ? 'items' : 'item'} added` : 'Your Cart'}
                                            </div>
                                            {totalCartPrice > 0 ? (
                                                <div className="text-base font-black leading-tight text-white">
                                                    ₹{totalCartPrice}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-white/90 font-semibold">
                                                    Proceed to Cart
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-black uppercase tracking-wider shrink-0 bg-white/15 px-3 py-1.5 rounded-xl">
                                        <span>View Cart</span>
                                        <ChevronRight size={14} className="stroke-[3]" />
                                    </div>
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Floating "View Cart" Bar (visible when modal is closed and cart has items) */}
            <AnimatePresence>
                {!cartBarDismissed && cartCount > 0 && !selectedSubCategory && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 border border-gray-100 flex items-center gap-3 p-2.5 pr-3">
                            <div className="w-11 h-11 rounded-full overflow-hidden bg-emerald-50 border border-emerald-100 shrink-0 flex items-center justify-center">
                                {cartItems[cartItems.length - 1]?.icon ? (
                                    <img
                                        src={toAssetUrl(cartItems[cartItems.length - 1]?.icon)}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <ShoppingCart className="text-emerald-700 w-5 h-5" />
                                )}
                            </div>

                            <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => navigate('/user/cart')}
                            >
                                <h4 className="text-[13px] font-bold text-gray-900 truncate">
                                    {cartItems[cartItems.length - 1]?.title || category?.title || 'Service in Cart'}
                                </h4>
                                <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-0.5">
                                    ₹{totalCartPrice} • {totalCartItems} {totalCartItems > 1 ? 'items' : 'item'}
                                </span>
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/user/cart')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 text-center shrink-0 transition-colors shadow-md shadow-emerald-600/20"
                            >
                                <span className="block text-[13px] font-bold leading-tight">View Cart</span>
                                <span className="block text-[10px] opacity-90 leading-tight">₹{totalCartPrice}</span>
                            </motion.button>

                            <button
                                onClick={() => setCartBarDismissed(true)}
                                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors"
                                title="Dismiss"
                            >
                                <X size={14} className="text-gray-500" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CategoryPage;
