import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  shipped: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

function SkeletonRow() {
  return (
    <div className="bg-white rounded-lg shadow p-4 animate-pulse space-y-2">
      <div className="flex justify-between">
        <div className="bg-gray-200 h-4 rounded w-1/3" />
        <div className="bg-gray-200 h-4 rounded w-16" />
      </div>
      <div className="bg-gray-200 h-3 rounded w-1/4" />
      <div className="bg-gray-200 h-3 rounded w-1/2" />
    </div>
  );
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError('');
      try {
        const { data } = await apiClient.get('/orders/me');
        setOrders(data.data.orders);
      } catch {
        setError('Failed to load orders. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Order History</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">📦</p>
          <p>You haven't placed any orders yet.</p>
          <a href="/products" className="mt-4 inline-block text-blue-600 hover:underline text-sm">
            Start shopping
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-gray-400 font-mono">#{order._id}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {order.status}
                </span>
              </div>

              {/* Items */}
              <ul className="text-sm text-gray-700 space-y-1 mb-3">
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>{item.name} × {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span>${order.totalPrice.toFixed(2)}</span>
              </div>

              {/* Shipping address */}
              <p className="text-xs text-gray-400 mt-2">
                Ship to: {order.shippingAddress.street}, {order.shippingAddress.city},{' '}
                {order.shippingAddress.country} {order.shippingAddress.postalCode}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
