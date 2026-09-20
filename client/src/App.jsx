import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { useKeepAlive } from './hooks/useKeepAlive.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import OrdersList from './pages/orders/OrdersList.jsx';
import OrderDetail from './pages/orders/OrderDetail.jsx';
import ToBuy from './pages/tobuy/ToBuy.jsx';
import CargoList from './pages/cargo/CargoList.jsx';
import CargoDetail from './pages/cargo/CargoDetail.jsx';
import ProductsList from './pages/products/ProductsList.jsx';
import ExpensesList from './pages/expenses/ExpensesList.jsx';
import VouchersList from './pages/vouchers/VouchersList.jsx';
import VoucherView from './pages/vouchers/VoucherView.jsx';
import PricingPage from './pages/pricing/PricingPage.jsx';

export default function App() {
  useKeepAlive();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<OrdersList />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="to-buy" element={<ToBuy />} />
        <Route path="cargo" element={<CargoList />} />
        <Route path="cargo/:id" element={<CargoDetail />} />
        <Route path="products" element={<ProductsList />} />
        <Route path="expenses" element={<ExpensesList />} />
        <Route path="vouchers" element={<VouchersList />} />
        <Route path="vouchers/:id" element={<VoucherView />} />
        <Route path="pricing" element={<PricingPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
