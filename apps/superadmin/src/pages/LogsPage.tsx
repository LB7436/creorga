import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, AlertCircle, Info, XCircle, Search,
  Shield, CreditCard, LogIn, Bug, Download,
} from 'lucide-react';

type Severity = 'info' | 'warn' | 'error' | 'critical';
type Category = 'Auth' | 'API' | 'Paiement' | 'Sécurité' | 'Système';

interface LogEntry {
  id: string;
  time: string;
  severity: Severity;
  category: Category;
  client?: string;
  message: string;
  ip?: string;
}

function genLogs(): LogEntry[] {
  const now = new Date();
  const out: LogEntry[] = [];
  const templates: [Category, Severity, string][] = [
    ['Auth', 'info', 'Connexion réussie'],
    ['Auth', 'warn', 'Tentative de connexion échouée (mauvais mot de passe)'],
    ['Auth', 'error', '5 tentatives échouées consécutives — compte temporairement bloqué'],
    ['Auth', 'info', 'Déconnexion'],
    ['API', 'error', 'Timeout sur endpoint /api/orders (>5s)'],
    ['API', 'warn', 'Rate limit proche du seuil (450/500 req/min)'],
    ['API', 'info', 'Déploiement v2.14.3 effectué avec succès'],
    ['API', 'error', 'Exception non gérée : TypeError in orders.service.ts:142'],
    ['Paiement', 'info', 'Paiement reçu 129 €'],
    ['Paiement', 'error', 'Échec de paiement — carte expirée'],
    ['Paiement', 'warn', 'Paiement nécessite authentification 3DS'],
    ['Paiement', 'critical', 'Dispute ouverte par client Visa •••• 4242'],
    ['Sécurité', 'critical', 'Activité suspecte détectée : 20 connexions depuis 20 IPs différentes'],
    ['Sécurité', 'warn', 'Accès API depuis IP non autorisée (blockée)'],
    ['Sécurité', 'error', 'Token JWT expiré présenté 12 fois'],
    ['Système', 'info', 'Backup DB terminé (4.2 GB)'],
    ['Système', 'warn', 'Utilisation CPU > 80% pendant 5min'],
    ['Système', 'info', 'Cache Redis purgé'],
  ];
  const clients = ['Brasserie LU', 'Le Gourmand', 'Chez Marco', 'Café Central', 'Pizzeria Bella', null];
  const ips = ['85.93.118.42', '194.154.200.11', '89.212.44.89', '213.208.160.22', '185.22.144.67'];
  for (let i = 0; i < 120; i++) {
    const [cat, sev, msg] = templates[Math.floor(Math.random() * templates.length)];
    const t = new Date(now.getTime() - i * 1000 * 60 * Math.random() * 30);
    out.push({
      id: `log_${(1_000_000 - i).toString(36)}`,
      time: t.toLocaleString('fr-FR'),
      severity: sev, category: cat, message: msg,
      client: clients[Math.floor(Math.random() * clients.length)] || undefined,
      ip: cat === 'Auth' || cat === 'Sécurité' ? ips[Math.floor(Math.random() * ips.length)] : undefined,
    });
  }
  return out;
}

const LOGS = genLogs();

const SEV_CONFIG: Record<Severity, { color: string; icon: any; label: string }> = {
  info: { color: '#60a5fa', icon: Info, label: 'INFO' },
  warn: { color: '#fbbf24', icon: AlertTriangle, label: 'WARN' },
  error: { color: '#f87171', icon: XCircle, label: 'ERROR' },
  critical: { color: '#dc2626', icon: AlertCircle, label: 'CRITICAL' },
};

const CAT_ICONS: Record<Category, any> = {
  Auth: LogIn, API: Bug, Paiement: CreditCard, Sécurité: Shield, Système: Info,
};

export default function LogsPage() {
  const [q, setQ] = useState('');
  const [sevFilter, setSevFilter] = useState<Severity | ''>('');
  const [catFilter, setCatFilter] = useState<Category | ''>('');

  const filtered = useMemo(() => LOGS.filter(l =>
    (!q || l.message.toLowerCase().includes(q.toLowerCase()) || l.client?.toLowerCase().includes(q.toLowerCase())) &&
    (!sevFilter || l.severity === sevFilter) &&
    (!catFilter || l.category === catFilter)
  ), [q, sevFilter, catFilter]);

  const stats = {
    info: LOGS.filter(l => l.severity === 'info').length,
    warn: LOGS.filter(l => l.severity === 'warn').length,
    error: LOGS.filter(l => l.severity === 'error').length,
    critical: LOGS.filter(l => l.severity === 'critical').length,
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: '#e2e8f0' }}>Logs Système</h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
            {LOGS.length} événements · Temps réel · Rétention 90 jours
          </p>
        </div>
        <button style={{
          background: '#13131a', border: '1px solid #2a2a35', color: '#e2e8f0',
          padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Download size={14} /> Exporter
        </button>
      </div>

      {/* Severity stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {(['info', 'warn', 'error', 'critical'] as Severity[]).map(s => {
          const c = SEV_CONFIG[s];
          const active = sevFilter === s;
          return (
            <button
              key={s}
              onClick={() => setSevFilter(active ? '' : s)}
              style={{
                background: '#13131a', textAlign: 'left',
                border: `1px solid ${active ? c.color : '#2a2a35'}`,
                borderRadius: 12, padding: 18, cursor: 'pointer',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, marginBottom: 10,
                background: `${c.color}22`, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <c.icon size={18} color={c.color} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>{stats[s]}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.label}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{
        background: '#13131a', border: '1px solid #2a2a35', borderRadius: 12,
        padding: 14, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#64748b' }} />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Rechercher dans les logs..."
            style={{
              width: '100%', padding: '8px 12px 8px 32px',
              background: '#0a0a0f', border: '1px solid #2a2a35',
              borderRadius: 6, color: '#e2e8f0', fontSize: 13, outline: 'none',
            }}
          />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value as Category | '')} style={{
          padding: '8px 12px', background: '#0a0a0f', border: '1px solid #2a2a35',
          borderRadius: 6, color: '#e2e8f0', fontSize: 13, outline: 'none', cursor: 'pointer',
        }}>
          <option value="">Toutes catégories</option>
          {['Auth', 'API', 'Paiement', 'Sécurité', 'Système'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => { setQ(''); setSevFilter(''); setCatFilter(''); }} style={{
          background: 'transparent', border: '1px solid #2a2a35', color: '#94a3b8',
          padding: '8px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
        }}>Réinitialiser</button>
      </div>

      {/* Logs feed */}
      <div style={{
        background: '#13131a', border: '1px solid #2a2a35',
        borderRadius: 12, overflow: 'hidden',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      }}>
        <div style={{ padding: '10px 14px', background: '#0f0f16', borderBottom: '1px solid #2a2a35', fontSize: 11, color: '#64748b' }}>
          {filtered.length} résultats — stream live ⚡
        </div>
        <div style={{ maxHeight: 640, overflowY: 'auto' }}>
          {filtered.slice(0, 80).map((l, i) => {
            const cfg = SEV_CONFIG[l.severity];
            const CatIcon = CAT_ICONS[l.category];
            return (
              <motion.div
                key={l.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.01, 0.25) }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 80px 110px 1fr 140px 140px',
                  gap: 12, padding: '10px 14px',
                  borderBottom: '1px solid #1e1e28',
                  fontSize: 12, alignItems: 'center',
                }}
              >
                <span style={{ color: '#64748b' }}>{l.time}</span>
                <span style={{
                  color: cfg.color, fontWeight: 700,
                  background: `${cfg.color}15`, padding: '2px 6px',
                  borderRadius: 3, textAlign: 'center', fontSize: 10,
                }}>{cfg.label}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94a3b8' }}>
                  <CatIcon size={11} /> {l.category}
                </span>
                <span style={{ color: '#e2e8f0' }}>{l.message}</span>
                <span style={{ color: '#a78bfa', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.client || '—'}
                </span>
                <span style={{ color: '#64748b', fontSize: 11 }}>{l.ip || '—'}</span>
              </motion.div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontFamily: 'sans-serif' }}>
              Aucun log ne correspond aux filtres.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
