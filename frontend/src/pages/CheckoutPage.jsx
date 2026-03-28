import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useCart } from '../context/CartContext';

const EMPTY = { street: '', city: '', country: '', postalCode: '' };

function fieldError(errors, field) {
  return errors[field] ? (
    <p className="text-red-600 text-xs mt-1">{errors[field]}</p>
  ) : null;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, fetchCart } = useCart();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const items = cart?.items ?? [];
  const total = items.reduce((sum, i) => sum + (i.product?.price ?? 0) * i.quantity, 0);

  function validate() {
    const e = {};
    if (!form.street.trim()) e.street = 'Street is required.';
    if (!form.city.trim()) e.city = 'City is required.';
    if (!form.country.trim()) e.country = 'Country is required.';
    if (!form.postalCode.trim()) e.postalCode = 'Postal code is required.';
    return e;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }

    setServerError('');
    setLoading(true);
    try {
      const { data } = await apiClient.post('/orders', { shippingAddress: form });
      await fetchCart(); // refresh cart (now empty)
      navigate(`/orders`, { state: { newOrderId: data.data.order._id } });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to place order. Please try again.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-3">🛒</p>
        <p className="text-gray-600 mb-4">Your cart is empty. Add some items before checking out.</p>
        <a href="/products" className="text-blue-600 hover:underline">Browse products</a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Checkout</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Shipping form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <h2 className="font-semibold text-lg">Shipping Address</h2>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="street">Street</label>
            <input
              id="street" name="street" type="text"
              value={form.street} onChange={handleChange}
              className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.street ? 'border-red-400' : ''}`}
            />
            {fieldError(errors, 'street')}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="city">City</label>
            <input
              id="city" name="city" type="text"
              value={form.city} onChange={handleChange}
              className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.city ? 'border-red-400' : ''}`}
            />
            {fieldError(errors, 'city')}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="country">Country</label>
            <input
              id="country" name="country" type="text"
              value={form.country} onChange={handleChange}
              className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.country ? 'border-red-400' : ''}`}
            />
            {fieldError(errors, 'country')}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="postalCode">Postal Code</label>
            <input
              id="postalCode" name="postalCode" type="text"
              value={form.postalCode} onChange={handleChange}
              className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.postalCode ? 'border-red-400' : ''}`}
            />
            {fieldError(errors, 'postalCode')}
          </div>

          {serverError && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {loading ? 'Placing order…' : `Place Order — $${total.toFixed(2)}`}
          </button>
        </form>

        {/* Order summary */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Order Summary</h2>
          <ul className="space-y-3 mb-4">
            {items.map((item) => {
              const pid = item.product?._id ?? item.product;
              return (
                <li key={pid} className="flex justify-between text-sm">
                  <span className="truncate max-w-[180px]">
                    {item.product?.name} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    ${((item.product?.price ?? 0) * item.quantity).toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="border-t pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
