import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, AlertCircle, CreditCard, Lock,
  Search, Download, Bell, Filter,
} from 'lucide-react';

const BG = '#0a0a0f';
const CARD = '#13131a';
const BORDER = '#2a2a35';
const TEXT = '#e2e8f0';
const MUTED = '#94a3b8';
const ACCENT = '#a78bfa';

type Severity = 'info' | 'warn' | 'error' | 'critical';
interface LogEntry {
  timestamp: string;
  client: string;
  event: string;
  severity: Severity;
  details: string;
}

const clients = ['Café Rond-Point', 'Bistro Maxim', 'Chez Marie', 'Brasserie Nord', 'Pizza Napoli', 'Le Gourmet', 'Snack Corner', 'Café Central', 'Taverne du Parc'];

function gen(type: string, count: number): LogEntry[] {
  const eventsMap: Record<string, { event: string; details: string; sev: Severity }[]> = {
    auth: [
      { event: 'login_success', details: 'Connexion réussie depuis 91.214.xx.xx', sev: 'info' },
      { event: 'login_failed', details: 'Mot de passe incorrect', sev: 'warn' },
      { event: 'password_reset', details: 'Email de reset envoyé', sev: 'info' },
      { event: 'logout', details: 'Session terminée', sev: 'info' },
      { event: '2fa_bypass_attempt', details: 'Tentative contournement 2FA', sev: 'critical' },
      { event: 'account_locked', details: '5 échecs consécutifs', sev: 'error' },
    ],
    api: [
      { event: 'endpoint_error', details: '/api/orders a répondu 500', sev: 'error' },
      { event: 'rate_limit', details: 'Rate limit dépassé (429)', sev: 'warn' },
      { event: 'validation_error', details: 'Payload invalide POST /menu', sev: 'warn' },
      { event: 'timeout', details: 'Timeout 30s sur /reports/generate', sev: 'error' },
      { event: 'db_connection_lost', details: 'Pool DB épuisé', sev: 'critical' },
    ],
    payments: [
      { event: 'charge_success', details: 'Facture payée 149€', sev: 'info' },
      { event: 'charge_failed', details: 'Carte refusée (insufficient_funds)', sev: 'error' },
      { event: 'refund_issued', details: 'Remboursement 49€', sev: 'info' },
      { event: 'webhook_failed', details: 'Stripe webhook 500', sev: 'warn' },
      { event: 'dispute_opened', details: 'Chargeback ouvert', sev: 'critical' },
    ],
    security: [
      { event: 'suspicious_ip', details: 'Connexion depuis IP blacklistée', sev: 'critical' },
      { event: 'bruteforce_detected', details: '50+ tentatives en 2 min', sev: 'critical' },
      { event: 'admin_privilege_granted', details: 'Nouveau super-admin ajouté', sev: 'warn' },
      { event: 'csrf_token_invalid', details: 'Token CSRF invalide', sev: 'error' },
      { event: 'unauthorized_scope', details: 'Accès non autorisé à /admin', sev: 'error' },
    ],
  };
  const list = eventsMap[type];
  return Array.from({ length: count }).map((_, i) => {
    const e = list[i % list.length];
    const d = new Date(Date.now() - i * 1000 * 60 * (((i * 7) % 45) + 2));
    return {
      timestamp: d.toISOString().replace('T', ' ').slice(0, 19),
      client: clients[i % clients.length],
      event: e.event,
      severity: e.sev,
      details: e.details,
    };
  });
}

const LOGS = {
  auth: gen('auth', 50),
  api: gen('api', 50),
  payments: gen('payments', 50),
  security: gen('security', 50),
};

const TABS = [
  { key: 'auth', label: 'Authentification', icon: Lock },
  { key: 'api', label: 'API / Erreurs', icon: AlertCircle },
  { key: 'payments', label: 'Paiements', icon: CreditCard },
  { key: 'security', label: 'Sécurité', icon: ShieldAlert },
] as const;

export default function LogsPage() {
  const [tab, setTab] = useState<'auth' | 'api' | 'payments' | 'security'>('auth');
  const [severity, setSeverity] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAlerts, setShowAlerts] = useState(false);

  const filtered = useMemo(() => {
    return LOGS[tab].filter((l) => {
      if (severity !== 'all' && l.severity !== severity) return false;
      if (search && !`${l.event} ${l.client} ${l.details}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tab, severity, search]);

  const counts = {
    info: LOGS[tab].filter((l) => l.severity === 'info').length,
    warn: LOGS[tab].filter((l) => l.severity === 'warn').length,
    error: LOGS[tab].filter((l) => l.severity === 'error').length,
    critical: LOGS[tab].filter((l) => l.severity === 'critical').length,
  };

  return (
    <div style={{ padding: '32px 40px', background: BG, minHeight: '100vh', color: TEXT }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Logs système</h1>
          <p style={{ margin: '6px 0 0', color: MUTED, fontSize: 14 }}>
            Événements authentification, API, paiements et sécurité
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowAlerts(!showAlerts)} style={btnSec}>
            <Bell size={14} /> Alertes
          </button>
          <button style={btnSec}><Download size={14} /> Exporter</button>
        </div>
      </motion.div>

      {showAlerts && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
            padding: 20, marginBottom: 20, overflow: 'hidden',
          }}
        >
          <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>Seuils d'alerte</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <AlertThreshold label="Erreurs API / minute" value="> 10" />
            <AlertThreshold label="Logins échoués / heure" value="> 50" />
            <AlertThreshold label="Paiements échoués / jour" value="> 5" />
            <AlertThreshold label="IPs suspectes" value="> 3" />
          </div>
        </motion.div>
      )}

      <div style={{
        display: 'flex', gap: 4, borderBottom: `1px solid ${BORDER}`, marginBottom: 20,
      }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: 'transparent', border: 'none',
              padding: '12px 18px', cursor: 'pointer',
              color: tab === t.key ? ACCENT : MUTED,
              borderBottom: `2px solid ${tab === t.key ? ACCENT : 'transparent'}`,
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: -1,
            }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <SeverityPill label="Info" value={counts.info} color="#3b82f6" onClick={() => setSeverity('info')} />
        <SeverityPill label="Warnings" value={counts.warn} color="#f59e0b" onClick={() => setSeverity('warn')} />
        <SeverityPill label="Erreurs" value={counts.error} color="#ef4444" onClick={() => setSeverity('error')} />
        <SeverityPill label="Critiques" value={counts.critical} color="#dc2626" onClick={() => setSeverity('critical')} />
      </div>

      <div style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
        padding: 10, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16,
      }}>
        <Search size={14} color={MUTED} />
        <input
          placeholder="Rechercher un événement, client, détail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, background: 'transparent', border: 'none',
            color: TEXT, fontSize: 13, outline: 'none',
          }}
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          style={{
            background: BG, border: `1px solid ${BORDER}`, color: TEXT,
            padding: '6px 10px', borderRadius: 6, fontSize: 12,
          }}
        >
          <option value="all">Toutes sévérités</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Erreur</option>
          <option value="critical">Critique</option>
        </select>
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, background: CARD, zIndex: 1 }}>
              <tr style={{ color: MUTED, textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>
                <th style={thStyle}>Horodatage</th>
                <th style={thStyle}>Sévérité</th>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Événement</th>
                <th style={thStyle}>Détails</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', color: MUTED, whiteSpace: 'nowrap' }}>{l.timestamp}</td>
                  <td style={tdStyle}><SeverityBadge sev={l.severity} /></td>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{l.client}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', color: ACCENT }}>{l.event}</td>
                  <td style={{ ...tdStyle, color: MUTED }}>{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 10, borderTop: `1px solid ${BORDER}`, fontSize: 11, color: MUTED, textAlign: 'center' }}>
          {filtered.length} événements affichés
        </div>
      </div>
    </div>
  );
}

function SeverityBadge({ sev }: { sev: Severity }) {
  const map = {
    info: { c: '#3b82f6', l: 'INFO' },
    warn: { c: '#f59e0b', l: 'WARN' },
    error: { c: '#ef4444', l: 'ERROR' },
    critical: { c: '#dc2626', l: 'CRITIQUE' },
  };
  const s = map[sev];
  return (
    <span style={{
      background: `${s.c}26`, color: s.c, padding: '2px 7px',
      borderRadius: 4, fontSize: 10, fontWeight: 700,
      fontFamily: 'monospace',
    }}>{s.l}</span>
  );
}

function SeverityPill({ label, value, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        background: CARD, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${color}`,
        padding: 12, borderRadius: 8, cursor: 'pointer', color: TEXT,
        textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: MUTED }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      </div>
      <Filter size={14} color={MUTED} />
    </button>
  );
}

function AlertThreshold({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: 12, background: BG, borderRadius: 8,
      border: `1px solid ${BORDER}`, display: 'flex',
      justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div style={{ fontSize: 12 }}>{label}</div>
      <input
        defaultValue={value}
        style={{
          background: CARD, border: `1px solid ${BORDER}`,
          color: ACCENT, padding: '4px 8px', borderRadius: 5,
          fontSize: 12, width: 80, textAlign: 'center',
          fontWeight: 600,
        }}
      />
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' };
const tdStyle: React.CSSProperties = { padding: '10px 12px' };
const btnSec: React.CSSProperties = {
  background: CARD, border: `1px solid ${BORDER}`, color: TEXT,
  padding: '9px 14px', borderRadius: 7, cursor: 'pointer',
  fontSize: 13, fontWeight: 600, display: 'inline-flex',
  alignItems: 'center', gap: 6,
};
