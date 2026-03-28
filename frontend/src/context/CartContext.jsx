import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { token } = useAuth();
  const [cart, setCart] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');

  const fetchCart = useCallback(async () => {
    if (!token) { setCart(null); return; }
    setLoading(true);
    try {
      const { data } = await apiClient.get('/cart');
      setCart(data.data.cart);
    } catch {
      // silently fail on initial load
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addItem = useCallback(async (productId) => {
    setActionLoading((p) => ({ ...p, [productId]: true }));
    setError('');
    try {
      const { data } = await apiClient.post('/cart', { productId });
      setCart(data.data.cart);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add item to cart.');
      throw err;
    } finally {
      setActionLoading((p) => ({ ...p, [productId]: false }));
    }
  }, []);

  const updateItem = useCallback(async (productId, quantity) => {
    setActionLoading((p) => ({ ...p, [productId]: true }));
    setError('');
    try {
      const { data } = await apiClient.put(`/cart/${productId}`, { quantity });
      setCart(data.data.cart);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update cart.');
      throw err;
    } finally {
      setActionLoading((p) => ({ ...p, [productId]: false }));
    }
  }, []);

  const removeItem = useCallback(async (productId) => {
    setActionLoading((p) => ({ ...p, [productId]: true }));
    setError('');
    try {
      const { data } = await apiClient.delete(`/cart/${productId}`);
      setCart(data.data.cart);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove item.');
      throw err;
    } finally {
      setActionLoading((p) => ({ ...p, [productId]: false }));
    }
  }, []);

  const clearError = useCallback(() => setError(''), []);

  const itemCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  return (
    <CartContext.Provider value={{
      cart, loading, actionLoading, error, clearError,
      open, setOpen,
      addItem, updateItem, removeItem, fetchCart,
      itemCount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
