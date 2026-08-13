import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Lightbulb, ScrollText, Settings, LogOut, ShieldCheck, Activity,
} from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
}

// Seuls les écrans branchés sur de vraies données figurent ici — les
// maquettes sans substrat (Analytics, Billing, Feature Flags, Support) ont
// été retirées : un écran vide ne ment pas.
const NAV = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Sociétés', icon: Users },
  { to: '/opportunites', label: 'Opportunités', icon: Lightbulb },
  { to: '/logs', label: 'Journal & audit', icon: ScrollText },
  { to: '/health', label: 'Santé serveur', icon: Activity },
  { to: '/settings', label: 'Réglages', icon: Settings },
];

export default function Sidebar({ onLogout }: SidebarProps) {
  return (
    <aside style={{
      width: 260,
      background: '#13131a',
      borderRight: '1px solid #2a2a35',
      padding: '24px 16px',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      zIndex: 10,
    }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 24px', borderBottom: '1px solid #2a2a35', marginBottom: 20 }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={22} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>Creorga</div>
          <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600, letterSpacing: 0.5 }}>SUPER-ADMIN</div>
        </div>
      </motion.div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 8,
              color: isActive ? '#fff' : '#94a3b8',
              background: isActive ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
              borderLeft: isActive ? '2px solid #a78bfa' : '2px solid transparent',
              textDecoration: 'none',
              fontSize: 14, fontWeight: 500,
              transition: 'all 0.15s',
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{ borderTop: '1px solid #2a2a35', paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#a78bfa', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, color: '#fff',
          }}>B</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Bryan L.</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Fondateur</div>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: 'transparent', border: 'none',
              color: '#94a3b8', cursor: 'pointer',
              padding: 6, borderRadius: 6,
            }}
            title="Déconnexion"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
