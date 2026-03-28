import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 inline-block" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export default function CartDrawer() {
  const { cart, open, setOpen, loading, actionLoading, error, clearError, updateItem, removeItem } = useCart();

  // Close on Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setOpen]);

  const items = cart?.items ?? [];
  const total = items.reduce((sum, i) => sum + (i.product?.price ?? 0) * i.quantity, 0);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl z-50 flex flex-col
          transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <h2 className="text-lg font-semibold">Your Cart</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        {/* Error toast */}
        {error && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded px-3 py-2 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={clearError} className="ml-2 font-bold text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <Spinner /> <span className="ml-2">Loading cart…</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <p className="text-4xl mb-3">🛒</p>
              <p>Your cart is empty.</p>
              <button
                onClick={() => setOpen(false)}
                className="mt-4 text-blue-600 hover:underline text-sm"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const pid = item.product?._id ?? item.product;
                const busy = !!actionLoading[pid];
                return (
                  <li key={pid} className="flex gap-3 items-start">
                    {item.product?.images?.[0] && (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="h-16 w-16 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product?.name}</p>
                      <p className="text-blue-600 text-sm">${(item.product?.price ?? 0).toFixed(2)}</p>
                      {/* Quantity controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => item.quantity > 1
                            ? updateItem(pid, item.quantity - 1)
                            : removeItem(pid)}
                          disabled={busy}
                          className="w-7 h-7 border rounded flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                          aria-label="Decrease quantity"
                        >
                          {busy ? <Spinner /> : '−'}
                        </button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateItem(pid, item.quantity + 1)}
                          disabled={busy}
                          className="w-7 h-7 border rounded flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          {busy ? <Spinner /> : '+'}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(pid)}
                      disabled={busy}
                      className="text-gray-400 hover:text-red-500 disabled:opacity-40 text-lg leading-none mt-1"
                      aria-label="Remove item"
                    >
                      {busy ? <Spinner /> : '×'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t px-4 py-4 space-y-3">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <Link
              to="/checkout"
              onClick={() => setOpen(false)}
              className="block w-full bg-blue-600 text-white text-center py-2 rounded hover:bg-blue-700"
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
