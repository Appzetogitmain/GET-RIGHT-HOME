import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Zap, Clock, ShoppingCart, ChevronRight, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { publicCatalogService } from '../../homster/services/catalogService';
import { useCart } from '../../homster/context/CartContext';

const toAssetUrl = (url) => {
    if (!url) return '';
    const clean = url.replace('/api/upload', '/upload');
    if (clean.startsWith('http')) return clean;
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
    return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

/**
 * Full-page replacement for InstantServicesModal — every service admin has
 * flagged "Show in Instant Booking", browsable and bookable directly.
 * Reached either unfiltered (top "Instant Services" tile on /home-services)
 * or scoped to one category (a category card's ⚡ badge), via ?category=.
 */
const InstantServicesPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const categoryId = searchParams.get('category');
    const { addToCart, cartCount, cartItems } = useCart();

    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingIds, setBookingIds] = useState([]);
    const [cartBarDismissed, setCartBarDismissed] = useState(false);
    const [lastAddedItem, setLastAddedItem] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
        const load = async () => {
            setLoading(true);
            try {
                const res = await publicCatalogService.getServices({ instant: true });
                if (res?.success) setServices(res.services || []);
            } catch (err) {
                console.error('Failed to load instant services:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const shownServices = categoryId
        ? services.filter((s) => String(s.categoryId?._id || s.categoryId) === categoryId)
        : services;

    const categoryTitle = categoryId
        ? (shownServices[0]?.categoryId?.title || null)
        : null;

    const handleBook = async (service) => {
        const serviceId = service.id || service._id;
        if (bookingIds.includes(serviceId)) return;
        setBookingIds((prev) => [...prev, serviceId]);
        try {
            const cartItemData = {
                serviceId,
                categoryId: service.categoryId?._id || service.categoryId,
                subCategoryId: service.subCategoryId?._id || service.subCategoryId || undefined,
                title: service.title,
                description: service.description || '',
                icon: toAssetUrl(service.icon || service.imageUrl || ''),
                category: service.categoryId?.title || '',
                subCategory: service.subCategoryId?.title || '',
                price: service.discountPrice || service.basePrice,
                unitPrice: service.discountPrice || service.basePrice,
                serviceCount: 1,
                isInstant: true,
            };
            const response = await addToCart(cartItemData);
            if (response.success) {
                setLastAddedItem(service);
                setCartBarDismissed(false);
            } else {
                toast.error(response.message || 'Failed to add to cart');
            }
        } catch (err) {
            console.error('Instant booking add-to-cart failed:', err);
            toast.error('Failed to add to cart');
        } finally {
            setBookingIds((prev) => prev.filter((id) => id !== serviceId));
        }
    };

    return (
        <div className="min-h-screen bg-white pb-24 relative">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 hover:bg-gray-100 transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-900" />
                    </button>
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5 text-white fill-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none uppercase truncate">
                            {categoryTitle ? `Instant ${categoryTitle}` : 'All Instant Services'}
                        </h1>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                            Verified technicians, doorstep in 30–45 min
                        </p>
                    </div>
                    {loading && <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin ml-auto shrink-0"></div>}
                </div>
            </div>

            {/* Body */}
            <div className="max-w-3xl mx-auto px-5 pt-6 space-y-3">
                {loading && shownServices.length === 0 ? (
                    [1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse border border-gray-100"></div>
                    ))
                ) : shownServices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Zap className="w-8 h-8 text-gray-200 mb-2" />
                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No instant services available right now</p>
                    </div>
                ) : (
                    shownServices.map((service) => {
                        const serviceId = service.id || service._id;
                        const isBooking = bookingIds.includes(serviceId);
                        const price = service.discountPrice || service.basePrice;
                        const subtitle = service.subheading || service.categoryId?.title || service.subCategoryId?.title || '';
                        return (
                            <motion.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                key={serviceId}
                                className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-colors"
                            >
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shrink-0 flex items-center justify-center text-white overflow-hidden">
                                    {(service.imageUrl || service.icon) ? (
                                        <img src={toAssetUrl(service.imageUrl || service.icon)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Zap size={20} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-extrabold text-gray-900 truncate">{service.title}</h4>
                                    {subtitle && <p className="text-[11px] text-gray-400 font-medium truncate">{subtitle}</p>}
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-black text-gray-900">₹{price}</span>
                                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                            <Clock size={9} /> {service.instantEtaMinutes || 30} min
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleBook(service)}
                                    disabled={isBooking}
                                    className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[11px] font-black uppercase px-4 py-2 rounded-xl shadow-sm disabled:opacity-60 transition-all"
                                >
                                    {isBooking ? 'Adding...' : 'Book'}
                                </button>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Floating "View Cart" Bar */}
            <AnimatePresence>
                {!cartBarDismissed && cartCount > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 border border-gray-100 flex items-center gap-3 p-2.5 pr-3">
                            <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-50 border border-gray-100 shrink-0 flex items-center justify-center">
                                {(lastAddedItem?.imageUrl || lastAddedItem?.icon || cartItems[cartItems.length - 1]?.icon) ? (
                                    <img
                                        src={toAssetUrl(lastAddedItem?.imageUrl || lastAddedItem?.icon || cartItems[cartItems.length - 1]?.icon)}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <ShoppingCart className="text-[#00695C] w-5 h-5" />
                                )}
                            </div>

                            <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => navigate('/user/cart')}
                            >
                                <h4 className="text-[13px] font-bold text-gray-900 truncate">
                                    {lastAddedItem?.title || cartItems[cartItems.length - 1]?.title || 'Instant Service'}
                                </h4>
                                <span className="text-[11px] font-semibold text-[#00695C] flex items-center gap-0.5">
                                    View Details <ChevronRight size={12} strokeWidth={3} />
                                </span>
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/user/cart')}
                                className="bg-[#00695C] hover:bg-[#004D40] text-white rounded-xl px-4 py-2 text-center shrink-0 transition-colors"
                            >
                                <span className="block text-[13px] font-bold leading-tight">View Cart</span>
                                <span className="block text-[10px] opacity-90 leading-tight">{cartCount} item{cartCount > 1 ? 's' : ''}</span>
                            </motion.button>

                            <button
                                onClick={() => setCartBarDismissed(true)}
                                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors"
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

export default InstantServicesPage;
