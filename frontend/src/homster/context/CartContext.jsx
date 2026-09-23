import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cartService } from '../services/cartService';

/**
 * Cart Context
 * Provides global cart state management with event-driven updates
 * No polling - cart count updates instantly on add/remove actions
 */

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper to sync cart to backend without blocking UI
  const syncToBackend = async (items) => {
    try {
      // Send to backend; backend will reject if user is not authenticated (guest user)
      await cartService.syncCart(items);
    } catch (error) {
      // Silent catch for guests
      if (error?.response?.status !== 401) {
        console.error('Failed to sync cart to backend:', error);
      }
    }
  };

  // Fetch cart from localStorage (only on initial load)
  const fetchCart = useCallback(async () => {
    try {
      setIsLoading(true);
      const localCart = localStorage.getItem('cartItems');
      if (localCart) {
        let items = JSON.parse(localCart) || [];
        // Ensure every item has normalized unitPrice and correct line price
        items = items.map(item => {
          const count = Math.max(1, Number(item.serviceCount) || 1);
          const unitPrice = Number(item.unitPrice) || (item.price && item.serviceCount ? Number(item.price) / Number(item.serviceCount) : Number(item.price)) || 0;
          return {
            ...item,
            serviceCount: count,
            unitPrice: unitPrice,
            price: unitPrice * count
          };
        });
        setCartItems(items);
        setCartCount(items.length);
        localStorage.setItem('cartItems', JSON.stringify(items));
        
        // Auto-sync existing cart to backend on load
        if (items.length > 0) {
          syncToBackend(items);
        }
      } else {
        setCartItems([]);
        setCartCount(0);
      }
    } catch (error) {
      console.error('Failed to parse cart items:', error);
      setCartItems([]);
      setCartCount(0);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  // Initialize cart on mount
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Add item to cart - instant update + localStorage sync
  const addToCart = useCallback(async (itemData) => {
    try {
      const itemId = itemData._id || itemData.id || `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const unitPrice = Number(itemData.unitPrice) || Number(itemData.price) || 0;
      const initialCount = Math.max(1, Number(itemData.serviceCount) || 1);
      const newItem = {
        ...itemData,
        _id: itemId,
        id: itemId,
        unitPrice,
        serviceCount: initialCount,
        price: unitPrice * initialCount
      };

      setCartItems(prev => {
        // Prevent duplicate addition of the same serviceId
        const exists = prev.some(item => (item.serviceId && item.serviceId === itemData.serviceId) || item._id === itemId || item.id === itemId);
        let updated;
        if (exists) {
          updated = prev.map(item => {
            if ((item.serviceId && item.serviceId === itemData.serviceId) || item._id === itemId || item.id === itemId) {
              const newCount = (Number(item.serviceCount) || 1) + initialCount;
              const uPrice = Number(item.unitPrice) || unitPrice || (item.serviceCount ? Number(item.price) / Number(item.serviceCount) : Number(item.price)) || 0;
              return {
                ...item,
                serviceCount: newCount,
                unitPrice: uPrice,
                price: uPrice * newCount
              };
            }
            return item;
          });
        } else {
          updated = [...prev, newItem];
        }
        localStorage.setItem('cartItems', JSON.stringify(updated));
        setCartCount(updated.length);
        syncToBackend(updated);
        return updated;
      });

      return { success: true, data: newItem };
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      return { success: false, message: 'Failed to add item to cart' };
    }
  }, []);

  // Update item quantity
  const updateItem = useCallback(async (itemId, serviceCount) => {
    try {
      setCartItems(prev => {
        const updated = prev.map(item => {
          if (item._id === itemId || item.id === itemId || (item.serviceId && item.serviceId === itemId)) {
            const count = Math.max(1, Number(serviceCount) || 1);
            const unitPrice = Number(item.unitPrice) || (item.serviceCount ? Number(item.price) / Number(item.serviceCount) : Number(item.price)) || 0;
            return {
              ...item,
              unitPrice: unitPrice,
              serviceCount: count,
              price: unitPrice * count
            };
          }
          return item;
        });
        localStorage.setItem('cartItems', JSON.stringify(updated));
        syncToBackend(updated);
        return updated;
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to update cart item:', error);
      return { success: false, message: 'Failed to update item' };
    }
  }, []);

  // Remove item from cart - instant update
  const removeItem = useCallback(async (itemId) => {
    try {
      setCartItems(prev => {
        const updated = prev.filter(item => item._id !== itemId && item.id !== itemId && item.serviceId !== itemId);
        localStorage.setItem('cartItems', JSON.stringify(updated));
        setCartCount(updated.length);
        syncToBackend(updated);
        return updated;
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to remove cart item:', error);
      return { success: false, message: 'Failed to remove item' };
    }
  }, []);

  // Remove all items from a category
  const removeCategoryItems = useCallback(async (category) => {
    try {
      setCartItems(prev => {
        const updated = prev.filter(item => item.category !== category);
        localStorage.setItem('cartItems', JSON.stringify(updated));
        setCartCount(updated.length);
        syncToBackend(updated);
        return updated;
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to remove category items:', error);
      return { success: false, message: 'Failed to remove category items' };
    }
  }, []);

  // Remove all items from a sub-category
  const removeSubCategoryItems = useCallback(async (subCategory) => {
    try {
      setCartItems(prev => {
        const updated = prev.filter(item => item.subCategory !== subCategory);
        localStorage.setItem('cartItems', JSON.stringify(updated));
        setCartCount(updated.length);
        return updated;
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to remove subcategory items:', error);
      return { success: false, message: 'Failed to remove subcategory items' };
    }
  }, []);

  // Clear entire cart
  const clearCart = useCallback(async () => {
    try {
      setCartItems([]);
      setCartCount(0);
      localStorage.removeItem('cartItems');
      syncToBackend([]);
      return { success: true };
    } catch (error) {
      console.error('Failed to clear cart:', error);
      return { success: false, message: 'Failed to clear cart' };
    }
  }, []);

  // Reset cart (for logout)
  const resetCart = useCallback(() => {
    setCartItems([]);
    setCartCount(0);
    localStorage.removeItem('cartItems');
    setIsInitialized(false);
  }, []);

  const value = {
    cartItems,
    cartCount,
    isLoading,
    isInitialized,
    fetchCart,
    addToCart,
    updateItem,
    removeItem,
    removeCategoryItems,
    removeSubCategoryItems,
    clearCart,
    resetCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;

