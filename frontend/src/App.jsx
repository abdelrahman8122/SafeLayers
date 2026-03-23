import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import AppShell from './components/layout/AppShell';
import AdminConsole from './components/pages/AdminConsole';
import Cards from './components/pages/Cards';
import Dashboard from './components/pages/Dashboard';
import Deposit from './components/pages/Deposit';
import History from './components/pages/History';
import Loans from './components/pages/Loans';
import Profile from './components/pages/Profile';
import SecurityCenter from './components/pages/SecurityCenter';
import Transfer from './components/pages/Transfer';
import Withdraw from './components/pages/Withdraw';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BalanceProvider } from './context/BalanceContext';
import { ThemeProvider } from './context/ThemeContext';

const getHomePath = (user) => (user?.role === 'admin' ? '/admin' : '/dashboard');

const LoadingScreen = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
    }}
  >
    <div className="spinner" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
};

const RoleRoute = ({ roles, children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return roles.includes(user.role) ? children : <Navigate to={getHomePath(user)} replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  return user ? <Navigate to={getHomePath(user)} replace /> : children;
};

const HomeRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={getHomePath(user)} replace />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BalanceProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <SignupPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<HomeRedirect />} />
                <Route
                  path="admin"
                  element={
                    <RoleRoute roles={['admin']}>
                      <AdminConsole />
                    </RoleRoute>
                  }
                />
                <Route
                  path="dashboard"
                  element={
                    <RoleRoute roles={['customer']}>
                      <Dashboard />
                    </RoleRoute>
                  }
                />
                <Route
                  path="transfer"
                  element={
                    <RoleRoute roles={['customer']}>
                      <Transfer />
                    </RoleRoute>
                  }
                />
                <Route
                  path="deposit"
                  element={
                    <RoleRoute roles={['customer']}>
                      <Deposit />
                    </RoleRoute>
                  }
                />
                <Route
                  path="withdraw"
                  element={
                    <RoleRoute roles={['customer']}>
                      <Withdraw />
                    </RoleRoute>
                  }
                />
                <Route
                  path="loans"
                  element={
                    <RoleRoute roles={['customer']}>
                      <Loans />
                    </RoleRoute>
                  }
                />
                <Route
                  path="cards"
                  element={
                    <RoleRoute roles={['customer']}>
                      <Cards />
                    </RoleRoute>
                  }
                />
                <Route
                  path="history"
                  element={
                    <RoleRoute roles={['customer']}>
                      <History />
                    </RoleRoute>
                  }
                />
                <Route path="security" element={<SecurityCenter />} />
                <Route path="profile" element={<Profile />} />
              </Route>
              <Route path="*" element={<HomeRedirect />} />
            </Routes>
          </BrowserRouter>
        </BalanceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
