import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useCart } from '../context/CartContext';

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow p-4 animate-pulse">
      <div className="bg-gray-200 h-40 rounded mb-3" />
      <div className="bg-gray-200 h-4 rounded w-3/4 mb-2" />
      <div className="bg-gray-200 h-4 rounded w-1/3" />
    </div>
  );
}

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removeLoading, setRemoveLoading] = useState({});
  const [error, setError] = useState('');
  const { addItem } = useCart();

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/wishlist');
      setWishlist(data.data.wishlist ?? []);
    } catch {
      setError('Failed to load wishlist. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  async function handleRemove(productId) {
    setRemoveLoading((p) => ({ ...p, [productId]: true }));
    try {
      const { data } = await apiClient.delete(`/wishlist/${productId}`);
      setWishlist(data.data.wishlist ?? []);
    } catch {
      setError('Failed to remove item. Please try again.');
    } finally {
      setRemoveLoading((p) => ({ ...p, [productId]: false }));
    }
  }

  async function handleAddToCart(productId) {
    try {
      await addItem(productId);
    } catch {
      // error is surfaced via CartContext
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Wishlist</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : wishlist.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">❤️</p>
          <p>Your wishlist is empty.</p>
          <Link to="/products" className="mt-4 inline-block text-blue-600 hover:underline text-sm">
            Discover products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {wishlist.map((product) => {
            const pid = product._id;
            const busy = !!removeLoading[pid];
            return (
              <div key={pid} className="bg-white rounded-lg shadow p-4 flex flex-col">
                <Link to={`/products/${pid}`}>
                  {product.images?.[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-40 w-full object-cover rounded mb-3"
                    />
                  )}
                  <p className="font-medium text-gray-800 text-sm flex-1">{product.name}</p>
                  <p className="text-blue-600 font-semibold text-sm mt-1">${product.price.toFixed(2)}</p>
                </Link>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAddToCart(pid)}
                    className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded hover:bg-blue-700"
                  >
                    Add to Cart
                  </button>
                  <button
                    onClick={() => handleRemove(pid)}
                    disabled={busy}
                    className="text-gray-400 hover:text-red-500 disabled:opacity-40 px-2"
                    aria-label="Remove from wishlist"
                  >
                    {busy ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : '×'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
