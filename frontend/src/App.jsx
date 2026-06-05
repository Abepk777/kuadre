import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';

// Layout
import MainLayout from './layouts/MainLayout';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/dashboard/Dashboard';
import Inventory from './pages/dashboard/Inventory';
import Sales from './pages/dashboard/Sales';
import Credits from './pages/dashboard/Credits';
import Settings from './pages/dashboard/Settings';
import Billing from './pages/dashboard/Billing';
import Employees from './pages/dashboard/Employees';
import SalesHistory from './pages/dashboard/SalesHistory';
import Catalog from './pages/public/Catalog';
import AdminDashboard from './pages/admin/AdminDashboard';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Cargando...</div>;
    if (!user) return <Navigate to="/login" />;

    // El MainLayout envuelve la página hija solo si estamos autenticados
    return <MainLayout>{children}</MainLayout>;
};

const IndexRoute = () => {
    const { user, loading } = useAuth();
    if (loading) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Cargando...</div>;
    if (!user) return <Navigate to="/login" />;

    if (user.role === 'admin' || user.role === 'superadmin') return <Navigate to="/admin" />;
    if (user.role === 'cashier' || user.role === 'employee') return <Navigate to="/sales" />;
    return <Navigate to="/dashboard" />;
};

function App() {
    return (
        <Router>
            <Toaster position="top-center" toastOptions={{ duration: 3000, style: { borderRadius: '1rem', background: '#333', color: '#fff' } }} />
            <Routes>
                {/* Redirigir raíz al login o panel adecuado */}
                <Route path="/" element={<IndexRoute />} />

                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Public Routes */}
                <Route path="/catalog/:tenantId" element={<Catalog />} />

                {/* Protected Routes (Wrapped in MainLayout automatically by ProtectedRoute) */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><SalesHistory /></ProtectedRoute>} />
                <Route path="/credits" element={<ProtectedRoute><Credits /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
                <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            </Routes>
        </Router>
    );
}

export default App;
