import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount, setOpen } = useCart();

  return (
    <nav className="bg-white border-b shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/products" className="font-bold text-blue-600 text-lg">Shop</Link>

        <div className="flex items-center gap-4">
          {user && (
            <Link to="/wishlist" className="text-sm text-gray-600 hover:text-blue-600">
              Wishlist
            </Link>
          )}
          {user && (
            <Link to="/orders" className="text-sm text-gray-600 hover:text-blue-600">
              Orders
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className="text-sm text-gray-600 hover:text-blue-600">
              Admin
            </Link>
          )}

          {/* Cart button */}
          {user && (
            <button
              onClick={() => setOpen(true)}
              className="relative text-gray-600 hover:text-blue-600"
              aria-label="Open cart"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M9 21a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>
          )}

          {user ? (
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-red-600"
            >
              Logout
            </button>
          ) : (
            <Link to="/login" className="text-sm text-blue-600 hover:underline">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
