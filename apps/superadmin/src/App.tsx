import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import BillingPage from './pages/BillingPage';
import FeatureFlagsPage from './pages/FeatureFlagsPage';
import SupportPage from './pages/SupportPage';
import LogsPage from './pages/LogsPage';
import SettingsPage from './pages/SettingsPage';
import Sidebar from './components/Sidebar';

export default function App() {
  const [authed, setAuthed] = useState<boolean>(() => localStorage.getItem('sa_auth') === '1');
  const location = useLocation();

  const handleLogin = () => {
    localStorage.setItem('sa_auth', '1');
    setAuthed(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('sa_auth');
    setAuthed(false);
  };

  if (!authed && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  if (!authed) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f' }}>
      <Sidebar onLogout={handleLogout} />
      <main style={{ flex: 1, overflow: 'auto', marginLeft: 260 }}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/feature-flags" element={<FeatureFlagsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
