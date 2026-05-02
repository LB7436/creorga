import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import PricingPage from './pages/PricingPage';
import FeaturesPage from './pages/FeaturesPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import DemoPage from './pages/DemoPage';

export default function App() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      // v3.18.8 — dark theme global marketing (cohérence avec app)
      background: 'linear-gradient(145deg, #0a0a1a 0%, #0f0f2e 30%, #0d0b24 60%, #080818 100%)',
      color: '#f1f5f9',
    }}>
      {/* Override CSS pour les composants enfants qui hardcodent du blanc */}
      <style>{`
        body, html, #root { background: #0a0a1a !important; color: #f1f5f9 !important; }
        section[style*="background: #fff"], section[style*="background:#fff"],
        section[style*="background: #fafbff"], section[style*="background:#fafbff"],
        section[style*="background: rgb(255, 255, 255)"],
        div[style*="background: #fff"], div[style*="background:#fff"] {
          background: rgba(255,255,255,0.04) !important;
          backdrop-filter: blur(12px);
        }
        h1, h2, h3, h4 { color: #f1f5f9 !important; }
      `}</style>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/fonctionnalites" element={<FeaturesPage />} />
          <Route path="/tarifs" element={<PricingPage />} />
          <Route path="/a-propos" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/demo" element={<DemoPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
