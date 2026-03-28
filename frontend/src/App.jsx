import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import WishlistPage from './pages/WishlistPage';
import AdminPanelPage from './pages/AdminPanelPage';

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <CartDrawer />
      <main>{children}</main>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          {/* Public routes — no navbar needed */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Routes with shared layout */}
          <Route path="/" element={<Navigate to="/products" replace />} />

          <Route path="/products" element={
            <Layout><ProductListPage /></Layout>
          } />

          <Route path="/products/:id" element={
            <Layout><ProductDetailPage /></Layout>
          } />

          <Route path="/checkout" element={
            <ProtectedRoute>
              <Layout><CheckoutPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/orders" element={
            <ProtectedRoute>
              <Layout><OrderHistoryPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/wishlist" element={
            <ProtectedRoute>
              <Layout><WishlistPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <AdminRoute>
              <Layout><AdminPanelPage /></Layout>
            </AdminRoute>
          } />
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
