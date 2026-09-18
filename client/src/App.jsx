import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Customizer from './pages/Customizer.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import MockPayment from './pages/MockPayment.jsx';
import CheckoutSuccess from './pages/CheckoutSuccess.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import OrderDetail from './pages/OrderDetail.jsx';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/customize" element={<Customizer />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/pay/:orderId" element={<MockPayment />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
          </Route>
          <Route path="*" element={<div className="p-16 text-center text-zinc-500">Page not found</div>} />
        </Routes>
      </main>
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} InkLabs · Custom print-on-demand apparel · Prototype
      </footer>
    </div>
  );
}
