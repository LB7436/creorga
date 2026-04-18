import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Download, Search, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

const MRR_MOVE = [
  { m: 'Oct', new: 1200, expansion: 380, contraction: -120, churn: -240 },
  { m: 'Nov', new: 1400, expansion: 420, contraction: -90, churn: -180 },
  { m: 'Déc', new: 1100, expansion: 510, contraction: -160, churn: -210 },
  { m: 'Jan', new: 1600, expansion: 480, contraction: -130, churn: -190 },
  { m: 'Fév', new: 1350, expansion: 520, contraction: -100, churn: -150 },
  { m: 'Mar', new: 1700, expansion: 610, contraction: -140, churn: -170 },
  { m: 'Avr', new: 1900, expansion: 650, contraction: -120, churn: -130 },
];

const VAT_COUNTRIES = [
  { country: 'Luxembourg', rate: '17%', revenue: 142800, vat: 24276 },
  { country: 'France', rate: '20%', revenue: 4200, vat: 840 },
  { country: 'Belgique', rate: '21%', revenue: 2400, vat: 504 },
];

function genInvoices() {
  const out = [];
  const names = ['Le Gourmand', 'Chez Marco', 'Brasserie LU', 'Café Central', 'Pizzeria Bella', 'La Petite Table', 'Auberge Verte'];
  for (let i = 0; i < 80; i++) {
    const paid = Math.random() > 0.08;
    const overdue = !paid && Math.random() > 0.5;
    out.push({
      id: `INV-2026-${(500 - i).toString().padStart(4, '0')}`,
      client: names[i % names.length],
      date: `${((i * 2) % 28) + 1}/${(((i % 4) + 1)).toString().padStart(2, '0')}/2026`,
      amount: [49, 129, 289, 599][i % 4],
      status: paid ? 'Payée' : overdue ? 'Retard' : 'Attente',
    });
  }
  return out;
}

const INVOICES = genInvoices();

export default function BillingPage() {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const list = useMemo(() => INVOICES.filter(i =>
    (!q || i.client.toLowerCase().includes(q.toLowerCase()) || i.id.includes(q)) &&
    (!statusFilter || i.status === statusFilter)
  ), [q, statusFilter]);

  const totals = {
    paid: INVOICES.filter(i => i.status === 'Payée').reduce((s, i) => s + i.amount, 0),
    overdue: INVOICES.filter(i => i.status === 'Retard').reduce((s, i) => s + i.amount, 0),
    pending: INVOICES.filter(i => i.status === 'Attente').reduce((s, i) => s + i.amount, 0),
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: '#e2e8f0' }}>Facturation</h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Gestion globale · MRR movements · TVA · Stripe</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <Stat label="Payées" value={`${totals.paid.toLocaleString()} €`} color="#4ade80" icon={TrendingUp} />
        <Stat label="En attente" value={`${totals.pending.toLocaleString()} €`} color="#fbbf24" icon={AlertTriangle} />
        <Stat label="En retard" value={`${totals.overdue.toLocaleString()} €`} color="#f87171" icon={TrendingDown} />
        <Stat label="Total 2026" value={`${(totals.paid + totals.pending + totals.overdue).toLocaleString()} €`} color="#a78bfa" icon={TrendingUp} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Mouvements MRR (New · Expansion · Contraction · Churn)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={MRR_MOVE} stackOffset="sign">
              <CartesianGrid stroke="#2a2a35" strokeDasharray="3 3" />
              <XAxis dataKey="m" stroke="#64748b" style={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" style={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#13131a', border: '1px solid #2a2a35', borderRadius: 8 }} />
              <Bar dataKey="new" stackId="a" fill="#4ade80" name="Nouveau" />
              <Bar dataKey="expansion" stackId="a" fill="#a78bfa" name="Expansion" />
              <Bar dataKey="contraction" stackId="a" fill="#fbbf24" name="Contraction" />
              <Bar dataKey="churn" stackId="a" fill="#f87171" name="Churn" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Intégration Stripe">
          <div style={{
            padding: 16, background: '#0a0a0f', borderRadius: 8, border: '1px solid #2a2a35', marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Compte Stripe</div>
            <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600, margin: '4px 0' }}>acct_creorga_lu_prod</div>
            <div style={{ fontSize: 11, color: '#4ade80' }}>● Actif · Payouts quotidiens</div>
          </div>
          <Row label="Balance disponible" value="8 420 €" />
          <Row label="En cours de transfert" value="2 180 €" />
          <Row label="Payout suivant" value="19 Avr 2026" />
          <Row label="Disputes ouvertes" value="0" ok />
          <Row label="Frais Stripe (mois)" value="412 €" />
        </Card>
      </div>

      {/* TVA */}
      <Card title="Rapports TVA par pays">
        <table style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#64748b', fontSize: 11, textAlign: 'left' }}>
              <th style={{ padding: 10, fontWeight: 600 }}>PAYS</th>
              <th style={{ padding: 10, fontWeight: 600 }}>TAUX</th>
              <th style={{ padding: 10, fontWeight: 600 }}>CA HT</th>
              <th style={{ padding: 10, fontWeight: 600 }}>TVA COLLECTÉE</th>
            </tr>
          </thead>
          <tbody>
            {VAT_COUNTRIES.map(v => (
              <tr key={v.country} style={{ borderTop: '1px solid #2a2a35' }}>
                <td style={{ padding: 12, color: '#e2e8f0', fontWeight: 600 }}>{v.country}</td>
                <td style={{ padding: 12, color: '#94a3b8' }}>{v.rate}</td>
                <td style={{ padding: 12, color: '#e2e8f0' }}>{v.revenue.toLocaleString()} €</td>
                <td style={{ padding: 12, color: '#a78bfa', fontWeight: 600 }}>{v.vat.toLocaleString()} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Invoices */}
      <div style={{ marginTop: 20 }}>
        <Card title={`Toutes les factures (${INVOICES.length})`} action={
          <button style={{
            background: 'transparent', border: '1px solid #2a2a35', color: '#94a3b8',
            padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}><Download size={12} /> Exporter tout</button>
        }>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#64748b' }} />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Rechercher par client ou ID..."
                style={{
                  width: '100%', padding: '8px 12px 8px 32px',
                  background: '#0a0a0f', border: '1px solid #2a2a35',
                  borderRadius: 6, color: '#e2e8f0', fontSize: 13, outline: 'none',
                }}
              />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
              padding: '8px 12px', background: '#0a0a0f', border: '1px solid #2a2a35',
              borderRadius: 6, color: '#e2e8f0', fontSize: 13, outline: 'none', cursor: 'pointer',
            }}>
              <option value="">Tous statuts</option>
              <option>Payée</option>
              <option>Attente</option>
              <option>Retard</option>
            </select>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#13131a' }}>
                <tr style={{ color: '#64748b', fontSize: 11, textAlign: 'left' }}>
                  <th style={{ padding: 8, fontWeight: 600 }}>ID</th>
                  <th style={{ padding: 8, fontWeight: 600 }}>CLIENT</th>
                  <th style={{ padding: 8, fontWeight: 600 }}>DATE</th>
                  <th style={{ padding: 8, fontWeight: 600 }}>MONTANT</th>
                  <th style={{ padding: 8, fontWeight: 600 }}>STATUT</th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, 50).map(inv => (
                  <tr key={inv.id} style={{ borderTop: '1px solid #2a2a35' }}>
                    <td style={{ padding: 10, color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12 }}>{inv.id}</td>
                    <td style={{ padding: 10, color: '#e2e8f0' }}>{inv.client}</td>
                    <td style={{ padding: 10, color: '#94a3b8' }}>{inv.date}</td>
                    <td style={{ padding: 10, color: '#e2e8f0', fontWeight: 600 }}>{inv.amount} €</td>
                    <td style={{ padding: 10 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                        background: inv.status === 'Payée' ? 'rgba(34,197,94,0.15)' :
                                   inv.status === 'Retard' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        color: inv.status === 'Payée' ? '#4ade80' :
                               inv.status === 'Retard' ? '#f87171' : '#fbbf24',
                      }}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children, action }: any) {
  return (
    <div style={{ background: '#13131a', border: '1px solid #2a2a35', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, color, icon: Icon }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#13131a', border: '1px solid #2a2a35', borderRadius: 12, padding: 18 }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 8,
        background: `${color}22`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', marginBottom: 10,
      }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#94a3b8' }}>{label}</div>
    </motion.div>
  );
}

function Row({ label, value, ok }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 12, borderTop: '1px solid #2a2a35' }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{ color: ok ? '#4ade80' : '#e2e8f0', fontWeight: 600 }}>{value}</span>
    </div>
  );
}
