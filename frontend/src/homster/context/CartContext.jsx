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

  // Fetch cart from localStorage (only on initial load)
  const fetchCart = useCallback(async () => {
    try {
      setIsLoading(true);
      const localCart = localStorage.getItem('cartItems');
      if (localCart) {
        const items = JSON.parse(localCart) || [];
        setCartItems(items);
        setCartCount(items.length);
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
      const newItem = { ...itemData, _id: itemId, id: itemId };

      setCartItems(prev => {
        // Prevent duplicate addition of the same serviceId
        const exists = prev.some(item => item.serviceId === itemData.serviceId);
        let updated;
        if (exists) {
          updated = prev.map(item =>
            item.serviceId === itemData.serviceId
              ? { ...item, serviceCount: (item.serviceCount || 1) + 1 }
              : item
          );
        } else {
          updated = [...prev, newItem];
        }
        localStorage.setItem('cartItems', JSON.stringify(updated));
        setCartCount(updated.length);
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
          if (item._id === itemId || item.id === itemId) {
            const unitPrice = item.unitPrice || (item.serviceCount ? item.price / item.serviceCount : item.price);
            return {
              ...item,
              serviceCount,
              price: unitPrice * serviceCount
            };
          }
          return item;
        });
        localStorage.setItem('cartItems', JSON.stringify(updated));
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
        const updated = prev.filter(item => item._id !== itemId && item.id !== itemId);
        localStorage.setItem('cartItems', JSON.stringify(updated));
        setCartCount(updated.length);
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

