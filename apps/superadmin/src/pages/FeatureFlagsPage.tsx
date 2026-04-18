import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flag, FlaskConical, History, Search, Plus, Percent, Users,
  ChevronDown, ChevronUp,
} from 'lucide-react';

const BG = '#0a0a0f';
const CARD = '#13131a';
const BORDER = '#2a2a35';
const TEXT = '#e2e8f0';
const MUTED = '#94a3b8';
const ACCENT = '#a78bfa';

interface FlagItem {
  key: string;
  name: string;
  desc: string;
  enabled: boolean;
  rollout: number;
  overrides: number;
  ab?: { a: number; b: number; conversionA: number; conversionB: number };
}

const INITIAL: FlagItem[] = [
  { key: 'ai_assistant', name: 'Assistant IA', desc: "IA conversationnelle pour aide aux utilisateurs", enabled: true, rollout: 40, overrides: 3, ab: { a: 50, b: 50, conversionA: 12.4, conversionB: 18.7 } },
  { key: 'multi_sites', name: 'Multi-sites', desc: 'Gestion de plusieurs restaurants par compte', enabled: true, rollout: 100, overrides: 0 },
  { key: 'delivery_integrations', name: 'Intégrations livraison', desc: 'Uber Eats, Wolt, Deliveroo', enabled: true, rollout: 80, overrides: 2 },
  { key: 'new_pos_ui', name: 'Nouvelle UI POS', desc: 'Redesign complet du module POS', enabled: true, rollout: 25, overrides: 8, ab: { a: 50, b: 50, conversionA: 68, conversionB: 71 } },
  { key: 'ai_menu_suggestions', name: 'Suggestions menu IA', desc: 'Suggestions de plats par IA', enabled: true, rollout: 15, overrides: 1 },
  { key: 'qr_ordering', name: 'Commande QR Code', desc: 'Commande par QR sur table', enabled: true, rollout: 60, overrides: 4 },
  { key: 'stripe_terminal', name: 'Terminal Stripe', desc: 'Paiement physique via Stripe Terminal', enabled: false, rollout: 0, overrides: 0 },
  { key: 'advanced_analytics', name: 'Analytiques avancées', desc: 'Rapports prédictifs et cohortes', enabled: true, rollout: 100, overrides: 0 },
  { key: 'dark_mode', name: 'Mode sombre', desc: 'Thème sombre pour POS', enabled: true, rollout: 100, overrides: 0 },
  { key: 'voice_orders', name: 'Commandes vocales', desc: 'Prise de commande par voix', enabled: false, rollout: 5, overrides: 1 },
  { key: 'kitchen_display', name: 'Écran cuisine KDS', desc: "Kitchen Display System", enabled: true, rollout: 70, overrides: 2 },
  { key: 'inventory_ai', name: 'Prévision stocks IA', desc: 'Ruptures de stock anticipées', enabled: true, rollout: 30, overrides: 0 },
  { key: 'loyalty_v2', name: 'Fidélité V2', desc: "Programme fidélité refondu", enabled: true, rollout: 50, overrides: 2, ab: { a: 50, b: 50, conversionA: 22, conversionB: 28 } },
  { key: 'whatsapp_notifs', name: 'Notifications WhatsApp', desc: 'Envoi de tickets via WA', enabled: false, rollout: 0, overrides: 0 },
  { key: 'split_checks', name: 'Addition partagée', desc: "Séparer l'addition entre clients", enabled: true, rollout: 100, overrides: 0 },
  { key: 'staff_scheduling', name: 'Planning personnel', desc: "Module de planning avancé", enabled: true, rollout: 80, overrides: 1 },
  { key: 'online_reservations', name: 'Réservations en ligne', desc: 'Widget de réservation publique', enabled: true, rollout: 65, overrides: 3 },
  { key: 'pos_offline_mode', name: 'POS hors-ligne', desc: 'Fonctionnement sans internet', enabled: true, rollout: 90, overrides: 0 },
  { key: 'tips_digital', name: 'Pourboires numériques', desc: 'Ajout pourboire sur écran', enabled: true, rollout: 100, overrides: 0 },
  { key: 'happy_hour_auto', name: 'Happy Hour auto', desc: 'Prix automatiques par plage horaire', enabled: true, rollout: 45, overrides: 0 },
  { key: 'supplier_orders', name: 'Commandes fournisseurs', desc: 'Bons de commande intégrés', enabled: false, rollout: 10, overrides: 0 },
  { key: 'api_public', name: 'API publique', desc: 'API REST pour devs tiers', enabled: true, rollout: 15, overrides: 0 },
  { key: 'custom_receipts', name: 'Tickets personnalisés', desc: 'Logo et messages custom', enabled: true, rollout: 100, overrides: 0 },
  { key: 'table_mapping', name: 'Plan de salle', desc: 'Plan graphique des tables', enabled: true, rollout: 70, overrides: 2 },
  { key: 'time_clock', name: 'Pointeuse', desc: 'Badgeage employés', enabled: true, rollout: 55, overrides: 1 },
  { key: 'email_campaigns', name: "Campagnes email", desc: 'Newsletters clients', enabled: true, rollout: 35, overrides: 0 },
  { key: 'reports_export_xlsx', name: 'Export Excel', desc: "Export rapports en .xlsx", enabled: true, rollout: 100, overrides: 0 },
  { key: 'vat_reports', name: 'Rapports TVA LU', desc: 'Déclarations TVA luxembourgeoises', enabled: true, rollout: 100, overrides: 0 },
  { key: 'gift_cards', name: 'Cartes cadeau', desc: 'Émission et suivi', enabled: false, rollout: 0, overrides: 0 },
  { key: 'tax_region_auto', name: 'TVA multi-pays', desc: 'Détection automatique', enabled: false, rollout: 20, overrides: 0 },
];

const history = [
  { when: '2026-04-17 14:32', who: 'Bryan L.', what: "ai_assistant rollout 25% → 40%" },
  { when: '2026-04-15 09:10', who: 'Bryan L.', what: 'new_pos_ui activé pour Café Rond-Point' },
  { when: '2026-04-12 18:02', who: 'Bryan L.', what: 'whatsapp_notifs désactivé' },
  { when: '2026-04-10 11:47', who: 'Bryan L.', what: 'loyalty_v2 A/B test démarré' },
  { when: '2026-04-08 16:20', who: 'Bryan L.', what: 'advanced_analytics rollout → 100%' },
];

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState(INITIAL);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const filtered = flags.filter(
    (f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.key.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (key: string) => {
    setFlags(flags.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f)));
  };
  const setRollout = (key: string, v: number) => {
    setFlags(flags.map((f) => (f.key === key ? { ...f, rollout: v } : f)));
  };

  const totalEnabled = flags.filter((f) => f.enabled).length;

  return (
    <div style={{ padding: '32px 40px', background: BG, minHeight: '100vh', color: TEXT }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Feature Flags</h1>
          <p style={{ margin: '6px 0 0', color: MUTED, fontSize: 14 }}>
            {totalEnabled} flags actifs sur {flags.length} — rollout progressif et A/B testing
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowHistory(!showHistory)} style={btnSec}>
            <History size={14} /> Historique
          </button>
          <button style={btnPrimary}><Plus size={14} /> Nouveau flag</button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
              padding: 20, marginBottom: 20, overflow: 'hidden',
            }}
          >
            <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>Journal des modifications</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {history.map((h, i) => (
                <div key={i} style={{
                  padding: 10, background: BG, borderRadius: 7,
                  display: 'flex', justifyContent: 'space-between', fontSize: 12,
                }}>
                  <div>
                    <strong>{h.who}</strong> — {h.what}
                  </div>
                  <span style={{ color: MUTED }}>{h.when}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
        padding: '10px 14px', display: 'flex', alignItems: 'center',
        gap: 10, marginBottom: 20,
      }}>
        <Search size={16} color={MUTED} />
        <input
          placeholder="Rechercher un flag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, background: 'transparent', border: 'none',
            color: TEXT, fontSize: 14, outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map((f, i) => (
          <motion.div
            key={f.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.015 }}
            style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}
          >
            <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: f.enabled ? 'rgba(167,139,250,0.15)' : 'rgba(148,163,184,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Flag size={18} color={f.enabled ? ACCENT : MUTED} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 14 }}>{f.name}</strong>
                  <code style={{ fontSize: 11, color: MUTED, background: BG, padding: '2px 6px', borderRadius: 4 }}>{f.key}</code>
                  {f.ab && (
                    <span style={{
                      background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24',
                      padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <FlaskConical size={10} /> A/B
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{f.desc}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: MUTED }}>Rollout</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: ACCENT }}>{f.rollout}%</div>
                </div>
                <div style={{ fontSize: 11, color: MUTED, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={12} /> {f.overrides}
                </div>

                <Toggle enabled={f.enabled} onChange={() => toggle(f.key)} />

                <button
                  onClick={() => setExpanded(expanded === f.key ? null : f.key)}
                  style={btnGhost}
                >
                  {expanded === f.key ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {expanded === f.key && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden', borderTop: `1px solid ${BORDER}`, background: BG }}
                >
                  <div style={{ padding: 18, display: 'grid', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, color: MUTED, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Percent size={12} /> Pourcentage de rollout
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={f.rollout}
                        onChange={(e) => setRollout(f.key, Number(e.target.value))}
                        style={{ width: '100%', accentColor: ACCENT }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: MUTED, marginTop: 4 }}>
                        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                      </div>
                    </div>

                    <div style={{
                      padding: 12, background: CARD, borderRadius: 8,
                      border: `1px solid ${BORDER}`, fontSize: 12,
                    }}>
                      <div style={{ marginBottom: 6, fontWeight: 600 }}>Overrides par client ({f.overrides})</div>
                      <div style={{ color: MUTED }}>Forcer activé ou désactivé pour des clients spécifiques.</div>
                    </div>

                    {f.ab && (
                      <div style={{
                        padding: 14, background: CARD, borderRadius: 8,
                        border: `1px solid ${BORDER}`,
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FlaskConical size={14} color="#fbbf24" /> Test A/B actif
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <Variant name="Variant A (contrôle)" split={f.ab.a} conv={f.ab.conversionA} color="#94a3b8" />
                          <Variant name="Variant B (test)" split={f.ab.b} conv={f.ab.conversionB} color={ACCENT} />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Variant({ name, split, conv, color }: any) {
  return (
    <div style={{ padding: 12, background: BG, borderRadius: 7, border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>{name}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600 }}>{split}% trafic</span>
        <span style={{ color, fontWeight: 700 }}>{conv}% conv.</span>
      </div>
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: enabled ? ACCENT : BORDER,
        border: 'none', position: 'relative',
        cursor: 'pointer', transition: 'background 0.2s',
      }}
    >
      <motion.div
        animate={{ x: enabled ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute', top: 2, width: 20, height: 20,
          borderRadius: '50%', background: '#fff',
        }}
      />
    </button>
  );
}

const btnSec: React.CSSProperties = {
  background: CARD, border: `1px solid ${BORDER}`, color: TEXT,
  padding: '9px 14px', borderRadius: 7, cursor: 'pointer',
  fontSize: 13, fontWeight: 600, display: 'inline-flex',
  alignItems: 'center', gap: 6,
};
const btnPrimary: React.CSSProperties = {
  background: ACCENT, border: 'none', color: '#fff',
  padding: '9px 16px', borderRadius: 7, cursor: 'pointer',
  fontSize: 13, fontWeight: 600, display: 'inline-flex',
  alignItems: 'center', gap: 6,
};
const btnGhost: React.CSSProperties = {
  background: 'transparent', border: 'none', color: MUTED,
  cursor: 'pointer', padding: 4,
};
