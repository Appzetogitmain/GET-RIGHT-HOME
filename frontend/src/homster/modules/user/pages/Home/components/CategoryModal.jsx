import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { FiX, FiArrowLeft, FiPlus, FiCheck, FiLayers } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { publicCatalogService } from '../../../../../services/catalogService';
import { useCart } from '../../../../../context/CartContext';
import { toast } from 'react-hot-toast';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const CategoryModal = React.memo(({ isOpen, onClose, category, currentCity }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [isClosing, setIsClosing] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const cityId = currentCity?._id || currentCity?.id;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
      setTimeout(() => {
        setServices([]);
        setIsRedirecting(false);
      }, 300);
    } else if (category?.id || category?._id) {
      fetchServices(category.id || category._id);
    }
  }, [isOpen, category?.id, category?._id, cityId]);

  const fetchServices = async (catId) => {
    try {
      setLoading(true);
      const response = await publicCatalogService.getServices({
        cityId: cityId,
        categoryId: catId
      });
      if (response.success) {
        setServices(response.services || []);
      }
    } catch (error) {
      console.error("Failed to load services:", error);
    } finally {
      setLoading(false);
    }
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
        categoryTitle: category?.title || '',
        categoryIcon: toAssetUrl(category?.homeIconUrl || category?.iconUrl || ''),
        price: service.discountPrice || service.basePrice || service.price,
        originalPrice: (service.discountPrice && service.discountPrice < (service.basePrice || service.price)) ? (service.basePrice || service.price) : null,
        unitPrice: service.discountPrice || service.basePrice || service.price,
        serviceCount: 1,
        rating: "4.8",
        reviews: "1k+",
        card: {
          title: service.title,
          subtitle: service.description || '',
          price: service.discountPrice || service.basePrice || service.price,
          imageUrl: toAssetUrl(service.icon || service.imageUrl || ''),
        }
      };

      const response = await addToCart(cartItemData);
      if (response.success) {
        setIsRedirecting(true);
        setTimeout(() => {
          navigate('/user/cart');
        }, 1200);
      } else {
        toast.error(response.message || 'Failed to add to cart');
      }
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  if (!isOpen && !isClosing) return null;
  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9998]"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[9999]"
          >
            <div className="absolute -top-14 right-4">
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/20 backdrop-blur-xl border border-white/30 rounded-full flex items-center justify-center shadow-2xl hover:bg-white/40 transition-all"
              >
                <FiX className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="bg-white rounded-t-[2.5rem] max-h-[85vh] overflow-hidden flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
              {isRedirecting ? (
                <div className="flex flex-col items-center justify-center min-h-[40vh] py-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner"
                  >
                    <FiCheck className="w-10 h-10 text-emerald-500" />
                  </motion.div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Added to Cart!</h3>
                  <p className="text-gray-500 font-bold">Redirecting you to checkout...</p>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="p-8 pb-4">
                    <div className="flex items-center gap-3">
                      {category?.homeIconUrl && (
                        <div className="w-10 h-10 bg-gray-50 rounded-xl p-1.5 border border-gray-100">
                          <img src={toAssetUrl(category.homeIconUrl)} alt="" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div>
                        <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-1 uppercase">
                          {category?.title || 'Services'}
                        </h1>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select a service to proceed</p>
                      </div>
                      {loading && <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin ml-auto"></div>}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 pb-10 scrollbar-hide">
                    {loading && services.length === 0 ? (
                      <div className="space-y-3 pt-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-20 bg-gray-50 rounded-3xl animate-pulse border border-gray-100"></div>
                        ))}
                      </div>
                    ) : services.length > 0 ? (
                      <div className="space-y-3 pt-2">
                        {services.map((svc) => (
                          <div key={svc.id || svc._id} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-[1.5rem] hover:shadow-lg hover:shadow-gray-200/40 transition-all group">
                            <div className="flex-1 pr-4">
                              <h3 className="font-bold text-gray-900 text-base leading-tight mb-0.5">{svc.title}</h3>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-black text-emerald-600">₹{svc.discountPrice || svc.basePrice || svc.price}</span>
                                {(svc.discountPrice && svc.discountPrice < (svc.basePrice || svc.price)) && (
                                  <span className="text-[10px] text-gray-400 line-through font-bold">₹{svc.basePrice || svc.price}</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleServiceClick(svc)}
                              className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-emerald-600 shadow-md shadow-emerald-100 transition-all active:scale-95"
                            >
                              <FiPlus size={12} /> Add
                            </button>
                          </div>
                        ))}
                        
                        <div className="mt-10 pt-6 border-t border-gray-100 flex items-start gap-4 bg-gray-50 p-6 rounded-3xl">
                          <div className="mt-1 text-emerald-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-[11px] text-gray-500 font-black uppercase tracking-wider leading-relaxed">
                            * Final price may vary after detailed inspection or specific service requirements.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                          <FiLayers className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-black text-gray-400 uppercase tracking-widest">No Services Found</h3>
                        <p className="text-xs text-gray-400 font-bold max-w-[200px] mx-auto mt-1">We are working on bringing these services to your city soon!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
});

CategoryModal.displayName = 'CategoryModal';
export default CategoryModal;
