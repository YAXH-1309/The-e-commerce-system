import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

function StarRating({ rating }) {
  return (
    <span className="text-yellow-400">
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
    </span>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const { addItem, actionLoading } = useCart();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [wishlistMsg, setWishlistMsg] = useState('');
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      setError('');
      setNotFound(false);
      try {
        const { data } = await apiClient.get(`/products/${id}`);
        setProduct(data.data.product);
        setReviews(data.data.reviews || []);
      } catch (err) {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError('Failed to load product. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="bg-gray-200 h-64 rounded mb-6" />
        <div className="bg-gray-200 h-6 rounded w-1/2 mb-3" />
        <div className="bg-gray-200 h-4 rounded w-full mb-2" />
        <div className="bg-gray-200 h-4 rounded w-3/4" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <h2 className="text-xl font-semibold mb-2">Product not found</h2>
        <p className="text-gray-500 mb-6">The product you're looking for doesn't exist or has been removed.</p>
        <Link to="/products" className="text-blue-600 hover:underline">← Back to products</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-red-600">{error}</p>
        <Link to="/products" className="text-blue-600 hover:underline mt-4 inline-block">← Back to products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/products" className="text-blue-600 hover:underline text-sm mb-4 inline-block">← Back to products</Link>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        {/* Images */}
        {product.images?.length > 0 && (
          <div className="flex gap-3 overflow-x-auto mb-6">
            {product.images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`${product.name} image ${i + 1}`}
                className="h-64 w-auto object-cover rounded flex-shrink-0"
              />
            ))}
          </div>
        )}

        {/* Info */}
        <h1 className="text-2xl font-semibold mb-1">{product.name}</h1>
        <p className="text-sm text-gray-500 mb-3">{product.category}</p>
        <p className="text-3xl font-bold text-blue-600 mb-4">${product.price.toFixed(2)}</p>

        <div className="flex items-center gap-3 mb-4">
          <StarRating rating={product.averageRating || 0} />
          <span className="text-sm text-gray-500">
            {product.averageRating ? product.averageRating.toFixed(1) : 'No ratings yet'}
          </span>
        </div>

        <p className="text-gray-700 mb-4">{product.description}</p>

        <p className={`text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
        </p>

        {token && (
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => addItem(product._id)}
              disabled={product.stock === 0 || !!actionLoading[product._id]}
              className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading[product._id] ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : null}
              Add to Cart
            </button>
            <button
              onClick={async () => {
                setWishlistLoading(true);
                try {
                  await apiClient.post('/wishlist', { productId: product._id });
                  setWishlistMsg('Added to wishlist!');
                  setTimeout(() => setWishlistMsg(''), 2500);
                } catch (err) {
                  setWishlistMsg(err.response?.data?.message || 'Could not add to wishlist.');
                  setTimeout(() => setWishlistMsg(''), 2500);
                } finally {
                  setWishlistLoading(false);
                }
              }}
              disabled={wishlistLoading}
              className="border px-5 py-2 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              ♡ Wishlist
            </button>
          </div>
        )}
        {wishlistMsg && <p className="text-sm text-gray-600 mt-2">{wishlistMsg}</p>}
      </div>

      {/* Reviews */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Reviews ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-500">No reviews yet. Be the first to review this product.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r._id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-1">
                  <StarRating rating={r.rating} />
                  <span className="text-sm font-medium text-gray-700">
                    {r.user?.name || 'Anonymous'}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-700 text-sm">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
