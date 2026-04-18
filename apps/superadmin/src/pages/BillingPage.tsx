import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Euro, TrendingUp, AlertCircle, Clock, Download,
  ArrowUpRight, ArrowDownRight, CreditCard, Calendar,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const BG = '#0a0a0f';
const CARD = '#13131a';
const BORDER = '#2a2a35';
const TEXT = '#e2e8f0';
const MUTED = '#94a3b8';
const ACCENT = '#a78bfa';

const mrrMovement = [
  { type: 'Début', value: 10360, color: MUTED },
  { type: 'New', value: 2100, color: '#10b981' },
  { type: 'Expansion', value: 450, color: '#3b82f6' },
  { type: 'Contraction', value: -120, color: '#f59e0b' },
  { type: 'Churn', value: -340, color: '#ef4444' },
  { type: 'Fin', value: 12450, color: ACCENT },
];

const statuses = ['Toutes', 'Payée', 'En attente', 'En retard', 'Échouée'];

function makeInvoices() {
  const clients = [
    'Café Rond-Point', 'Bistro Maxim', 'Chez Marie', 'Brasserie Nord', 'Pizza Napoli',
    'Le Gourmet', 'Snack Corner', 'Café Central', 'Taverne du Parc', 'Resto Luna',
    'La Fourchette', 'Le Petit Coin', 'Chez Antoine', 'Bar du Port', 'Brasserie Est',
    'Café des Arts', 'Le Refuge', 'Chez Pierre', 'La Terrasse', 'Bistrot 22',
    'Pizza Express', 'Le Safran', 'La Cantine', 'Café Rose', 'Chez Léa',
    'Le Vieux Four', 'La Marmite', 'Bar Central', 'Le Bacchus', 'Maison Dupont',
  ];
  const stt = ['Payée', 'Payée', 'Payée', 'Payée', 'En attente', 'En retard', 'Échouée'];
  return clients.map((c, i) => ({
    id: `INV-2026-${String(400 + i).padStart(4, '0')}`,
    client: c,
    date: `2026-04-${String((i % 28) + 1).padStart(2, '0')}`,
    amount: [49, 99, 149, 299][i % 4],
    status: stt[i % stt.length],
  }));
}

const invoices = makeInvoices();

export default function BillingPage() {
  const [filter, setFilter] = useState('Toutes');
  const filtered = filter === 'Toutes' ? invoices : invoices.filter((i) => i.status === filter);

  return (
    <div style={{ padding: '32px 40px', background: BG, minHeight: '100vh', color: TEXT }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Facturation globale</h1>
        <p style={{ margin: '6px 0 0', color: MUTED, fontSize: 14 }}>
          MRR, ARR, factures et rapports fiscaux
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Stat label="MRR" value="12 450€" delta="+8.4%" icon={Euro} color="#10b981" />
        <Stat label="ARR" value="149 400€" delta="+12.1%" icon={TrendingUp} color={ACCENT} />
        <Stat label="En attente" value="2 340€" delta="7 factures" icon={Clock} color="#f59e0b" />
        <Stat label="En retard" value="890€" delta="2 factures" icon={AlertCircle} color="#ef4444" />
      </div>

      <Card title="Mouvement MRR (Avril 2026)">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={mrrMovement}>
            <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
            <XAxis dataKey="type" stroke={MUTED} fontSize={12} />
            <YAxis stroke={MUTED} fontSize={12} />
            <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {mrrMovement.map((m) => <Cell key={m.type} fill={m.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12, fontSize: 12 }}>
          {mrrMovement.slice(1, -1).map((m) => (
            <div key={m.type} style={{ textAlign: 'center' }}>
              <div style={{ color: m.color, fontWeight: 700, fontSize: 15 }}>
                {m.value > 0 ? '+' : ''}{m.value.toLocaleString()}€
              </div>
              <div style={{ color: MUTED }}>{m.type}</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <Card title="Résumé Stripe">
          <div style={{ display: 'grid', gap: 12 }}>
            <RowItem label="Solde disponible" value="8 934,20€" icon={CreditCard} color="#10b981" />
            <RowItem label="En transit" value="1 240,50€" icon={ArrowUpRight} color="#3b82f6" />
            <RowItem label="Dernier payout" value="4 520€ — 15/04" icon={ArrowDownRight} color={ACCENT} />
            <RowItem label="Prochain payout" value="22/04/2026" icon={Calendar} color={MUTED} />
          </div>
        </Card>

        <Card title="Rapports fiscaux par pays">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: MUTED, textAlign: 'left' }}>
                <th style={thStyle}>Pays</th>
                <th style={thStyle}>CA HT</th>
                <th style={thStyle}>TVA</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {[
                { c: 'Luxembourg', code: 'LU', ht: 8420, tva: 17 },
                { c: 'France', code: 'FR', ht: 2340, tva: 20 },
                { c: 'Belgique', code: 'BE', ht: 1120, tva: 21 },
                { c: 'Allemagne', code: 'DE', ht: 570, tva: 19 },
              ].map((p) => (
                <tr key={p.code} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td style={tdStyle}><strong>{p.code}</strong> {p.c}</td>
                  <td style={tdStyle}>{p.ht.toLocaleString()}€</td>
                  <td style={tdStyle}>{((p.ht * p.tva) / 100).toFixed(0)}€ ({p.tva}%)</td>
                  <td style={tdStyle}>
                    <button style={btnGhost}><Download size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card
        title="Factures"
        style={{ marginTop: 20 }}
        right={
          <div style={{ display: 'flex', gap: 10 }}>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                background: BG, border: `1px solid ${BORDER}`, color: TEXT,
                padding: '7px 10px', borderRadius: 6, fontSize: 12,
              }}
            >
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button style={btnSec}><Download size={13} /> Exporter</button>
          </div>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: MUTED, textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>
                <th style={thStyle}>N°</th>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Montant</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <motion.tr
                  key={inv.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.015 }}
                  style={{ borderBottom: `1px solid ${BORDER}` }}
                >
                  <td style={tdStyle}>{inv.id}</td>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{inv.client}</td>
                  <td style={{ ...tdStyle, color: MUTED }}>{inv.date}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{inv.amount}€</td>
                  <td style={tdStyle}><StatusBadge status={inv.status} /></td>
                  <td style={tdStyle}>
                    <button style={btnGhost}><Download size={14} /></button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Payée': '#10b981',
    'En attente': '#f59e0b',
    'En retard': '#ef4444',
    'Échouée': '#dc2626',
  };
  const c = map[status] || MUTED;
  return (
    <span style={{
      background: `${c}26`, color: c, padding: '3px 10px',
      borderRadius: 5, fontSize: 11, fontWeight: 600,
    }}>{status}</span>
  );
}

function Stat({ label, value, delta, icon: Icon, color }: any) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
          <div style={{ fontSize: 12, color, marginTop: 4, fontWeight: 600 }}>{delta}</div>
        </div>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </div>
  );
}

function RowItem({ label, value, icon: Icon, color }: any) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: 12, background: BG, borderRadius: 8, border: `1px solid ${BORDER}`,
    }}>
      <Icon size={18} color={color} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: MUTED }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}

function Card({ title, right, children, style }: any) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, ...style }}>
      {(title || right) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          {title && <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '10px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' };
const tdStyle: React.CSSProperties = { padding: '12px 8px' };
const btnSec: React.CSSProperties = {
  background: BG, border: `1px solid ${BORDER}`, color: TEXT,
  padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
  fontSize: 12, fontWeight: 600, display: 'inline-flex',
  alignItems: 'center', gap: 6,
};
const btnGhost: React.CSSProperties = {
  background: 'transparent', border: 'none', color: MUTED,
  cursor: 'pointer', padding: 4,
};
