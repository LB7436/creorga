import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import CTAButton from './CTAButton';

const links = [
  { to: '/', label: 'Accueil' },
  { to: '/fonctionnalites', label: 'Fonctionnalités' },
  { to: '/tarifs', label: 'Tarifs' },
  { to: '/demo', label: 'Démo' },
  { to: '/a-propos', label: 'À propos' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100 }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(16px)',
        borderBottom: scrolled ? '1px solid #e2e8f0' : '1px solid transparent',
        transition: 'all 0.3s',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            C
          </div>
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: -0.5 }}>Creorga</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              color: '#6366f1',
              background: '#eef2ff',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            OS
          </span>
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          className="nav-links-desktop"
        >
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              style={({ isActive }) => ({
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                color: isActive ? '#6366f1' : '#475569',
                background: isActive ? '#eef2ff' : 'transparent',
                transition: 'all 0.2s',
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a
            href="http://localhost:5173"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#475569',
              padding: '8px 16px',
            }}
          >
            Connexion
          </a>
          <div className="cta-desktop">
            <CTAButton to="/demo" size="md">Essai gratuit</CTAButton>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="mobile-menu-btn"
            style={{ display: 'none', padding: 8 }}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          style={{
            borderTop: '1px solid #e2e8f0',
            padding: 16,
            background: '#fff',
          }}
        >
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              style={{
                display: 'block',
                padding: '12px 16px',
                fontSize: 15,
                fontWeight: 500,
                color: '#0f172a',
              }}
            >
              {l.label}
            </NavLink>
          ))}
        </motion.div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .nav-links-desktop { display: none !important; }
          .cta-desktop { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </motion.nav>
  );
}
