import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import LogsPage from './pages/LogsPage';
import OpportunitesPage from './pages/OpportunitesPage';
import SettingsPage from './pages/SettingsPage';
import TenantHealthPage from './pages/TenantHealthPage';
import Sidebar from './components/Sidebar';
import { rafraichirSession, deconnexion, surPerteDeSession } from './lib/api';
import { couleurs } from './lib/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

export default function App() {
  // Fini le `localStorage.sa_auth` : la session est un cookie httpOnly posé
  // par le backend, le jeton d'accès ne vit qu'en mémoire.
  const [etat, setEtat] = useState<'chargement' | 'connecte' | 'deconnecte'>('chargement');

  useEffect(() => {
    surPerteDeSession(() => setEtat('deconnecte'));
    // Reprise de session silencieuse au chargement.
    rafraichirSession().then((ok) => setEtat(ok ? 'connecte' : 'deconnecte'));
  }, []);

  const handleLogin = () => setEtat('connecte');
  const handleLogout = () => {
    void deconnexion().finally(() => {
      queryClient.clear();
      setEtat('deconnecte');
    });
  };

  if (etat === 'chargement') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: couleurs.fond,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: couleurs.texteSecondaire,
          fontSize: 14,
        }}
      >
        Connexion à la console…
      </div>
    );
  }

  if (etat !== 'connecte') {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ display: 'flex', minHeight: '100vh', background: couleurs.fond }}>
        <Sidebar onLogout={handleLogout} />
        <main style={{ flex: 1, overflow: 'auto', marginLeft: 260 }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/health" element={<TenantHealthPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/opportunites" element={<OpportunitesPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </QueryClientProvider>
  );
}
