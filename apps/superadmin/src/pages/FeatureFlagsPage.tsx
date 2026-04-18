import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, Search, Plus, X, Users, Percent, FlaskConical, Zap } from 'lucide-react';

interface FFlag {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  rollout: number;
  overrides: string[];
  abTest?: boolean;
}

const INITIAL_FLAGS: FFlag[] = [
  { id: 'ai-assistant', name: 'AI Assistant', description: 'Assistant IA pour suggestions menus et analytics', category: 'IA', enabled: true, rollout: 25, overrides: ['Brasserie LU', 'Le Gourmand'], abTest: true },
  { id: 'multi-sites', name: 'Multi-sites', description: 'Gestion centralisée de plusieurs restaurants', category: 'Core', enabled: true, rollout: 100, overrides: [] },
  { id: 'delivery-int', name: 'Delivery integrations', description: 'Uber Eats, Deliveroo, Wolt', category: 'Intégrations', enabled: true, rollout: 80, overrides: [] },
  { id: 'loyalty-v2', name: 'Loyalty v2', description: 'Nouvelle version programme fidélité', category: 'Core', enabled: true, rollout: 45, overrides: ['Chez Marco'], abTest: true },
  { id: 'voice-order', name: 'Voice Ordering', description: 'Commandes vocales en cuisine', category: 'IA', enabled: false, rollout: 0, overrides: [] },
  { id: 'smart-pricing', name: 'Smart Pricing AI', description: 'Tarification dynamique par l\'IA', category: 'IA', enabled: false, rollout: 10, overrides: ['Brasserie LU'] },
  { id: 'inventory-pred', name: 'Inventory Prediction', description: 'Prédiction stocks par ML', category: 'IA', enabled: true, rollout: 60, overrides: [] },
  { id: 'kitchen-display', name: 'Kitchen Display System', description: 'Écran cuisine temps réel', category: 'Core', enabled: true, rollout: 100, overrides: [] },
  { id: 'online-reserv', name: 'Online Reservations', description: 'Réservations via site client', category: 'Core', enabled: true, rollout: 100, overrides: [] },
  { id: 'table-qr', name: 'Table QR Ordering', description: 'Commande à table via QR code', category: 'Core', enabled: true, rollout: 90, overrides: [] },
  { id: 'payroll', name: 'Payroll Module', description: 'Gestion paie employés', category: 'RH', enabled: false, rollout: 5, overrides: [] },
  { id: 'scheduling', name: 'Staff Scheduling', description: 'Planning équipes', category: 'RH', enabled: true, rollout: 70, overrides: [] },
  { id: 'time-clock', name: 'Time Clock', description: 'Pointage employés', category: 'RH', enabled: true, rollout: 85, overrides: [] },
  { id: 'accounting', name: 'Accounting Export', description: 'Export vers Sage, Cegid', category: 'Intégrations', enabled: true, rollout: 100, overrides: [] },
  { id: 'pos-terminal', name: 'Terminal POS Bluetooth', description: 'Paiement carte Bluetooth', category: 'Paiement', enabled: true, rollout: 100, overrides: [] },
  { id: 'sumup', name: 'SumUp Integration', description: 'Intégration SumUp', category: 'Paiement', enabled: true, rollout: 100, overrides: [] },
  { id: 'split-bills', name: 'Split Bills', description: 'Partage addition entre clients', category: 'Core', enabled: true, rollout: 100, overrides: [] },
  { id: 'recipe-cost', name: 'Recipe Costing', description: 'Calcul coût réel des recettes', category: 'Core', enabled: true, rollout: 65, overrides: [] },
  { id: 'waste-track', name: 'Waste Tracking', description: 'Suivi des pertes', category: 'Core', enabled: false, rollout: 20, overrides: [] },
  { id: 'allergens', name: 'Allergens Display', description: 'Affichage allergènes', category: 'Compliance', enabled: true, rollout: 100, overrides: [] },
  { id: 'haccp', name: 'HACCP Tracking', description: 'Suivi normes HACCP', category: 'Compliance', enabled: true, rollout: 50, overrides: [] },
  { id: 'dark-mode', name: 'Dark Mode', description: 'Thème sombre dans app client', category: 'UI', enabled: true, rollout: 100, overrides: [] },
  { id: 'white-label', name: 'White Label', description: 'Rebranding complet pour Enterprise', category: 'Enterprise', enabled: true, rollout: 10, overrides: [] },
  { id: 'api-public', name: 'Public API', description: 'Accès API développeurs', category: 'Enterprise', enabled: false, rollout: 2, overrides: [] },
  { id: 'webhooks', name: 'Webhooks', description: 'Webhooks sortants', category: 'Enterprise', enabled: true, rollout: 15, overrides: [] },
  { id: 'custom-reports', name: 'Custom Reports', description: 'Générateur de rapports', category: 'Enterprise', enabled: true, rollout: 30, overrides: [] },
  { id: 'mobile-staff', name: 'Mobile Staff App', description: 'App dédiée employés', category: 'Core', enabled: true, rollout: 55, overrides: [] },
  { id: 'guest-chat', name: 'Guest Chat', description: 'Chat en direct avec les clients', category: 'Beta', enabled: false, rollout: 8, overrides: [] },
  { id: 'ar-menu', name: 'AR Menu', description: 'Menu en réalité augmentée', category: 'Beta', enabled: false, rollout: 1, overrides: [] },
  { id: 'green-score', name: 'Green Score', description: 'Score environnemental des plats', category: 'Beta', enabled: false, rollout: 3, overrides: [] },
];

const CATEGORIES = ['Tous', 'Core', 'IA', 'Intégrations', 'Paiement', 'RH', 'Compliance', 'UI', 'Enterprise', 'Beta'];

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState(INITIAL_FLAGS);
  const [cat, setCat] = useState('Tous');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<FFlag | null>(null);

  const filtered = flags.filter(f =>
    (cat === 'Tous' || f.category === cat) &&
    (!q || f.name.toLowerCase().includes(q.toLowerCase()))
  );

  const toggle = (id: string) => {
    setFlags(flags.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const updateRollout = (id: string, v: number) => {
    setFlags(flags.map(f => f.id === id ? { ...f, rollout: v } : f));
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: '#e2e8f0' }}>Feature Flags</h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
            {flags.length} flags · {flags.filter(f => f.enabled).length} actifs · {flags.filter(f => f.abTest).length} A/B tests
          </p>
        </div>
        <button style={{
          background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff',
          border: 'none', padding: '10px 16px', borderRadius: 8,
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Plus size={15} /> Nouveau flag
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: '#13131a', border: '1px solid #2a2a35', borderRadius: 12,
        padding: 14, marginBottom: 16,
      }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: '#64748b' }} />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Rechercher un flag..."
            style={{
              width: '100%', padding: '9px 12px 9px 36px',
              background: '#0a0a0f', border: '1px solid #2a2a35',
              borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: '6px 12px', background: cat === c ? 'rgba(167,139,250,0.15)' : '#0a0a0f',
              border: `1px solid ${cat === c ? '#a78bfa' : '#2a2a35'}`,
              color: cat === c ? '#a78bfa' : '#94a3b8',
              borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>{c}</button>
          ))}
        </div>
      </div>

      {/* Flags grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
        {filtered.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.3) }}
            style={{
              background: '#13131a', border: `1px solid ${f.enabled ? 'rgba(167,139,250,0.3)' : '#2a2a35'}`,
              borderRadius: 12, padding: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Flag size={14} color={f.enabled ? '#a78bfa' : '#64748b'} />
                  <span style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>{f.name}</span>
                  {f.abTest && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                      background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                    }}><FlaskConical size={9} /> A/B</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{f.description}</div>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  {f.category} · {f.id}
                </div>
              </div>
              <Toggle on={f.enabled} onChange={() => toggle(f.id)} />
            </div>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #2a2a35' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Percent size={11} /> Rollout
                </span>
                <span style={{ color: '#a78bfa', fontWeight: 600 }}>{f.rollout}%</span>
              </div>
              <input
                type="range" min={0} max={100} value={f.rollout}
                disabled={!f.enabled}
                onChange={e => updateRollout(f.id, parseInt(e.target.value))}
                style={{
                  width: '100%', accentColor: '#a78bfa',
                  opacity: f.enabled ? 1 : 0.3,
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={11} /> {f.overrides.length} client(s) override
                </span>
                <button onClick={() => setEditing(f)} style={{
                  background: 'transparent', border: 'none', color: '#a78bfa',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>Configurer →</button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditing(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
            }}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#13131a', border: '1px solid #2a2a35',
                borderRadius: 12, padding: 28, width: '90%', maxWidth: 540,
                maxHeight: '85vh', overflow: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', color: '#e2e8f0', fontSize: 18 }}>{editing.name}</h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>{editing.description}</p>
                </div>
                <button onClick={() => setEditing(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ background: '#0a0a0f', border: '1px solid #2a2a35', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                  Configuration A/B Test
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#e2e8f0' }}>
                  <input type="checkbox" defaultChecked={editing.abTest} style={{ accentColor: '#a78bfa' }} />
                  Activer split A/B (50/50)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#e2e8f0', marginTop: 6 }}>
                  <input type="checkbox" style={{ accentColor: '#a78bfa' }} />
                  Tracker les conversions
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#e2e8f0', marginTop: 6 }}>
                  <input type="checkbox" style={{ accentColor: '#a78bfa' }} />
                  Envoyer événements à Mixpanel
                </label>
              </div>

              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                Overrides clients ({editing.overrides.length})
              </div>
              <div style={{ marginBottom: 14 }}>
                {editing.overrides.map(c => (
                  <div key={c} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: '#0a0a0f',
                    border: '1px solid #2a2a35', borderRadius: 6, marginBottom: 6,
                  }}>
                    <span style={{ fontSize: 13, color: '#e2e8f0' }}>{c}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: '#4ade80', background: 'rgba(34,197,94,0.15)',
                      padding: '2px 8px', borderRadius: 4,
                    }}>Activé</span>
                  </div>
                ))}
                <button style={{
                  width: '100%', padding: '9px', background: 'transparent',
                  border: '1px dashed #2a2a35', borderRadius: 6,
                  color: '#a78bfa', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>+ Ajouter un client override</button>
              </div>

              <button
                onClick={() => setEditing(null)}
                style={{
                  width: '100%', padding: 11,
                  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <Zap size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Enregistrer la configuration
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: on ? '#a78bfa' : '#2a2a35',
        border: 'none', cursor: 'pointer',
        position: 'relative', transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ x: on ? 20 : 2 }}
        style={{
          position: 'absolute', top: 2, width: 18, height: 18,
          borderRadius: '50%', background: '#fff',
        }}
      />
    </button>
  );
}
