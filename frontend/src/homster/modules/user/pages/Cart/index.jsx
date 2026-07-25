import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShoppingCart, FiTrash2, FiPlus, FiMinus, FiLoader, FiBell } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { themeColors } from '../../../../theme';
import BottomNav from '../../components/layout/BottomNav';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useCart } from '../../../../context/CartContext';
import electricianIcon from '../../../../assets/images/icons/services/electrician.png';
import womensSalonIcon from '../../../../assets/images/icons/services/womens-salon-spa-icon.png';
import massageMenIcon from '../../../../assets/images/icons/services/massage-men-icon.png';
import cleaningIcon from '../../../../assets/images/icons/services/cleaning-icon.png';
import acApplianceRepairIcon from '../../../../assets/images/icons/services/ac-appliance-repair-icon.png';
import NotificationBell from '../../components/common/NotificationBell';

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, isLoading: loading, removeItem, updateItem } = useCart();

  // Category icon mapping
  const getCategoryIcon = (category) => {
    const iconMap = {
      'Electrician': electricianIcon,
      'Electricity': electricianIcon,
      "Women's Salon & Spa": womensSalonIcon,
      'Salon for Women': womensSalonIcon,
      'Salon Prime': womensSalonIcon,
      'Massage for Men': massageMenIcon,
      'Cleaning': cleaningIcon,
      'Bathroom & Kitchen Cleaning': cleaningIcon,
      'Sofa & Carpet Cleaning': cleaningIcon,
      'AC Service and Repair': acApplianceRepairIcon,
      'AC & Appliance Repair': acApplianceRepairIcon,
    };
    return iconMap[category] || electricianIcon; // Default icon
  };

  // Group items by subcategory
  const groupedItems = useMemo(() => {
    const groups = {};
    cartItems.forEach(item => {
      const subCategoryName = item.subCategory || item.category || 'Other';
      if (!groups[subCategoryName]) {
        groups[subCategoryName] = [];
      }
      groups[subCategoryName].push(item);
    });
    return groups;
  }, [cartItems]);

  const cartCount = cartItems.length;

  const handleBack = () => {
    navigate(-1);
  };

  const handleDeleteSubCategory = async (subCategoryName) => {
    try {
      const itemsInSub = groupedItems[subCategoryName] || [];
      for (const item of itemsInSub) {
        await removeItem(item._id || item.id);
      }
      toast.success(`${subCategoryName} items removed`);
    } catch (error) {
      toast.error('Failed to remove items');
    }
  };

  const handleCustomise = (subCategoryName) => {
    const itemsInSub = groupedItems[subCategoryName] || [];
    const firstItem = itemsInSub[0];
    if (firstItem) {
      navigate('/home-services/sub-category', {
        state: {
          subCategory: {
            id: firstItem.subCategoryId,
            _id: firstItem.subCategoryId,
            title: firstItem.subCategory
          },
          category: {
            id: firstItem.categoryId,
            _id: firstItem.categoryId,
            title: firstItem.category
          }
        }
      });
    } else {
      navigate('/home-services');
    }
  };

  const handleSubCategoryCheckout = (subCategoryName) => {
    const itemsInSub = groupedItems[subCategoryName] || [];
    const firstItem = itemsInSub[0];
    navigate('/user/home-services/checkout', {
      state: {
        subCategory: subCategoryName,
        subCategoryId: firstItem?.subCategoryId
      }
    });
  };

  return (
    <div className="min-h-screen pb-32 relative bg-white">
      {/* Refined Brand Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0"
          style={{
            background: `
              radial-gradient(at 0% 0%, ${themeColors?.brand?.teal || '#347989'}25 0%, transparent 70%),
              radial-gradient(at 100% 0%, ${themeColors?.brand?.yellow || '#D68F35'}20 0%, transparent 70%),
              radial-gradient(at 100% 100%, ${themeColors?.brand?.orange || '#BB5F36'}15 0%, transparent 75%),
              radial-gradient(at 0% 100%, ${themeColors?.brand?.teal || '#347989'}10 0%, transparent 70%),
              radial-gradient(at 50% 50%, ${themeColors?.brand?.teal || '#347989'}03 0%, transparent 100%),
              #FFFFFF
            `
          }}
        />
        {/* Elegant Dot Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(${themeColors?.brand?.teal || '#347989'} 0.8px, transparent 0.8px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Modern Glassmorphism Header */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/40 border-b border-black/[0.03] px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-black/[0.02]"
            >
              <FiArrowLeft className="w-5 h-5 text-black" />
            </button>
            <div className="flex items-center gap-2">
              <FiShoppingCart className="w-5 h-5" style={{ color: themeColors.button }} />
              <h1 className="text-xl font-extrabold text-black">Your Cart</h1>
              {cartCount > 0 && (
                <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </div>
          </div>
          <NotificationBell />
        </header>

        {/* Cart Items - Grouped by Sub-Category */}
        <main className="px-4 py-4" style={{ paddingBottom: cartItems.length > 0 ? '70px' : '100px' }}>
          {loading ? (
            <div className="space-y-6">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      <div className="h-3 w-24 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-10 w-full bg-gray-100 rounded"></div>
                    <div className="h-10 w-full bg-gray-100 rounded"></div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <div className="flex-1 h-10 bg-gray-200 rounded-xl"></div>
                    <div className="flex-1 h-10 bg-gray-300 rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FiShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg font-medium">Your cart is empty</p>
              <p className="text-gray-400 text-sm mt-2">Add services to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedItems).map(([subCategory, items]) => {
                const subCategoryTotal = items.reduce((sum, item) => sum + ((item.price || 0) * (item.serviceCount || 1)), 0);
                const firstItem = items[0];
                const cardImage = firstItem?.icon || firstItem?.imageUrl || getCategoryIcon(firstItem?.category);
                const serviceCount = items.length;

                return (
                  <div
                    key={subCategory}
                    className="bg-white rounded-2xl shadow-md border border-gray-100"
                    style={{
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
                      padding: '16px'
                    }}
                  >
                    {/* Sub-Category Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Sub-Category Icon */}
                        <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
                          <img
                            src={cardImage}
                            alt={subCategory}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                          <div
                            className="hidden items-center justify-center w-full h-full"
                            style={{ display: 'none' }}
                          >
                            <FiShoppingCart className="w-6 h-6 text-gray-400" />
                          </div>
                        </div>

                        {/* Sub-Category Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-black mb-0.5">{subCategory}</h3>
                          <p className="text-xs font-semibold text-gray-400 mb-0.5">
                            {serviceCount} {serviceCount === 1 ? 'service' : 'services'}
                          </p>
                          <p className="text-sm font-extrabold text-[#347989]">
                            ₹{subCategoryTotal.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      {/* Delete Sub-Category Button */}
                      <button
                        onClick={() => handleDeleteSubCategory(subCategory)}
                        className="p-2 hover:bg-red-50 rounded-full transition-colors shrink-0"
                      >
                        <FiTrash2 className="w-5 h-5 text-red-500" />
                      </button>
                    </div>

                    {/* Services Bullet List */}
                    <div className="my-3 border-t border-b border-gray-50 py-3">
                      <ul className="space-y-1.5 pl-1">
                        {items.map((item) => (
                          <li key={item._id || item.id} className="flex items-start gap-2 text-xs font-semibold text-gray-500">
                            <span className="text-gray-400 mt-0.5">•</span>
                            <span className="flex-1">
                              {item.title} {item.serviceCount > 1 ? `x${item.serviceCount}` : ''}
                            </span>
                            <span className="shrink-0 text-gray-600 font-medium">
                              ₹{((item.price || 0) * (item.serviceCount || 1)).toLocaleString('en-IN')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCustomise(subCategory)}
                        className="flex-1 px-4 py-2.5 bg-[#EDF7F9] hover:bg-[#D9EFF2] rounded-xl text-sm font-bold text-[#347989] transition-all active:scale-95 text-center"
                      >
                        Customise
                      </button>
                      <button
                        onClick={() => handleSubCategoryCheckout(subCategory)}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 shadow-md text-center"
                        style={{
                          background: themeColors.brand.gradient,
                          boxShadow: `0 2px 6px rgba(0,0,0,0.1)`
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.opacity = '0.9';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.opacity = '1';
                        }}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </div>
  );
};

export default Cart;
