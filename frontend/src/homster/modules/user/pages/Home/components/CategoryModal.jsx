import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { FiX, FiArrowLeft, FiPlus, FiCheck, FiLayers, FiInfo } from 'react-icons/fi';
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

  const [subCategories, setSubCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
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
        setSubCategories([]);
        setServices([]);
        setSelectedSubCategory(null);
        setIsRedirecting(false);
      }, 300);
    } else if (category?.id || category?._id) {
      if (category.isDirectService) {
        fetchDirectServices(category.id || category._id);
      } else {
        fetchSubCategories(category.id || category._id);
      }
    }
  }, [isOpen, category?.id, category?._id, cityId, category?.isDirectService]);

  const fetchDirectServices = async (catId) => {
    try {
      setLoading(true);
      const response = await publicCatalogService.getServices({
        categoryId: catId
      });
      if (response.success) {
        setServices(response.services || []);
      }
    } catch (error) {
      console.error("Failed to load direct services:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubCategories = async (catId) => {
    try {
      setLoading(true);
      const response = await publicCatalogService.getSubCategories({
        cityId: cityId,
        categoryId: catId
      });
      if (response.success) {
        setSubCategories(response.subCategories || []);
      }
    } catch (error) {
      console.error("Failed to load sub-categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async (subCatId) => {
    try {
      setLoading(true);
      const response = await publicCatalogService.getServices({
        subCategoryId: subCatId,
        categoryId: category.id || category._id
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

  const handleSubCategoryClick = (subCat) => {
    // Navigate to dedicated sub-category page with full context
    onClose();
    navigate('/home-services/sub-category', {
      state: {
        subCategory: subCat,
        category: category,
        currentCity: { _id: cityId },
      }
    });
  };

  const goBack = () => {
    setSelectedSubCategory(null);
    setServices([]);
  };

  const handleServiceClick = async (service) => {
    try {
      const cartItemData = {
        serviceId: service.id || service._id,
        categoryId: category?.id || category?._id,
        subCategoryId: selectedSubCategory?.id || selectedSubCategory?._id || undefined,
        title: service.title,
        description: service.description || '',
        icon: toAssetUrl(service.icon || service.imageUrl || selectedSubCategory?.iconUrl || ''),
        category: category?.title,
        subCategory: selectedSubCategory?.title || category?.title || '',
        price: service.discountPrice || service.basePrice || service.price,
        unitPrice: service.discountPrice || service.basePrice || service.price,
        serviceCount: 1,
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
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9998]"
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

            <div className="bg-white rounded-t-[2.5rem] max-h-[85vh] min-h-[40vh] overflow-hidden flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.15)]">
              {isRedirecting ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner"
                  >
                    <FiCheck className="w-10 h-10 text-emerald-500" />
                  </motion.div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Added to Cart!</h3>
                  <p className="text-gray-500 font-bold">Redirecting to checkout...</p>
                </div>
              ) : (
                <div className="flex flex-col h-full overflow-hidden">
                  {/* Header */}
                  <div className="p-8 pb-4">
                    <div className="flex items-center gap-3">
                      {selectedSubCategory ? (
                        <button 
                          onClick={goBack}
                          className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 hover:bg-gray-100 transition-colors"
                        >
                          <FiArrowLeft className="w-5 h-5 text-gray-900" />
                        </button>
                      ) : category?.homeIconUrl && (
                        <div className="w-10 h-10 bg-gray-50 rounded-xl p-1.5 border border-gray-100">
                          <img src={toAssetUrl(category.homeIconUrl)} alt="" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div>
                        <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-1 uppercase">
                          {selectedSubCategory ? selectedSubCategory.title : category?.title || 'Services'}
                        </h1>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {selectedSubCategory || category?.isDirectService ? 'Select a service to proceed' : 'Select a sub-category'}
                        </p>
                      </div>
                      {loading && <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin ml-auto"></div>}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto px-6 pb-10 scrollbar-hide">
                    {loading && (selectedSubCategory ? services.length === 0 : subCategories.length === 0 && !category?.isDirectService) ? (
                      <div className="grid grid-cols-3 gap-4 pt-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="aspect-square bg-gray-50 rounded-3xl animate-pulse border border-gray-100"></div>
                        ))}
                      </div>
                    ) : (!selectedSubCategory && !category?.isDirectService) ? (
                      /* Level 1: Sub-category Grid */
                      <div className="grid grid-cols-3 gap-4 pt-4">
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
                          <div className="col-span-3 py-10 text-center">
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No options available</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Level 2: Service List */
                      <div className="space-y-3 pt-4">
                        {services.map((svc) => (
                          <motion.div 
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            key={svc.id || svc._id} 
                            className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm hover:shadow-lg hover:shadow-gray-200/40 transition-all group"
                          >
                            <div className="flex-1 pr-4">
                              <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{svc.title}</h3>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-black text-emerald-600">₹{svc.discountPrice || svc.basePrice || svc.price}</span>
                                {(svc.discountPrice && svc.discountPrice < (svc.basePrice || svc.price)) && (
                                  <span className="text-[11px] text-gray-400 line-through font-bold">₹{svc.basePrice || svc.price}</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleServiceClick(svc)}
                              className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                            >
                              <FiPlus size={14} /> Add
                            </button>
                          </motion.div>
                        ))}
                        
                        {services.length === 0 && !loading && (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <FiLayers className="w-8 h-8 text-gray-200 mb-2" />
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No services found</p>
                          </div>
                        )}

                        {/* Footer Info */}
                        <div className="mt-10 p-5 bg-gray-50/80 rounded-[2rem] border border-gray-100 flex items-start gap-4">
                          <div className="mt-0.5 text-emerald-500">
                            <FiInfo size={18} className="stroke-[3]" />
                          </div>
                          <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider leading-relaxed">
                            * Final price may vary after detailed inspection or specific service requirements.
                          </p>
                        </div>
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
