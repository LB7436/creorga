import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { Download, TrendingUp, AlertTriangle, FileSpreadsheet } from 'lucide-react';

const COHORTS = [
  { month: 'Oct 25', m0: 100, m1: 92, m2: 88, m3: 86, m4: 84, m5: 82, m6: 81 },
  { month: 'Nov 25', m0: 100, m1: 94, m2: 90, m3: 87, m4: 85, m5: 83, m6: null },
  { month: 'Déc 25', m0: 100, m1: 91, m2: 86, m3: 84, m4: 82, m5: null, m6: null },
  { month: 'Jan 26', m0: 100, m1: 95, m2: 91, m3: 89, m4: null, m5: null, m6: null },
  { month: 'Fév 26', m0: 100, m1: 93, m2: 89, m3: null, m4: null, m5: null, m6: null },
  { month: 'Mar 26', m0: 100, m1: 96, m2: null, m3: null, m4: null, m5: null, m6: null },
  { month: 'Avr 26', m0: 100, m1: null, m2: null, m3: null, m4: null, m5: null, m6: null },
];

const FUNNEL = [
  { step: 'Signup', count: 420, pct: 100 },
  { step: 'Trial activé', count: 312, pct: 74 },
  { step: 'Payant', count: 178, pct: 42 },
  { step: 'Actif 30j', count: 162, pct: 39 },
  { step: 'Expansion', count: 48, pct: 11 },
];

const HEATMAP_MODULES = [
  { name: 'POS Caisse', Starter: 95, Pro: 98, Business: 99, Enterprise: 100 },
  { name: 'Réservations', Starter: 42, Pro: 78, Business: 91, Enterprise: 96 },
  { name: 'Loyalty', Starter: 18, Pro: 54, Business: 82, Enterprise: 94 },
  { name: 'Delivery', Starter: 12, Pro: 48, Business: 74, Enterprise: 89 },
  { name: 'Stocks', Starter: 28, Pro: 61, Business: 85, Enterprise: 93 },
  { name: 'AI Assistant', Starter: 4, Pro: 18, Business: 42, Enterprise: 78 },
  { name: 'Multi-sites', Starter: 0, Pro: 8, Business: 52, Enterprise: 91 },
];

const REVENUE_PLAN = [
  { name: 'Starter', value: 1470, color: '#64748b' },
  { name: 'Pro', value: 4902, color: '#60a5fa' },
  { name: 'Business', value: 4335, color: '#a78bfa' },
  { name: 'Enterprise', value: 1797, color: '#f472b6' },
];

const CHURN_PRED = [
  { name: 'Pizzeria Bella', risk: 87, reason: 'Usage -60%, pas de connexion 14j' },
  { name: 'Bar Le Coin', risk: 72, reason: 'Tickets support x3, aucune résolution' },
  { name: 'Resto Panorama', risk: 68, reason: 'Paiement en retard 30j+' },
  { name: 'Café Namur', risk: 54, reason: 'NPS passé de 9 à 4' },
  { name: 'Le Jardin Secret', risk: 48, reason: 'Désactivation modules' },
];

function Card({ title, children, action }: any) {
  return (
    <div style={{
      background: '#13131a', border: '1px solid #2a2a35',
      borderRadius: 12, padding: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function retentionColor(v: number | null): string {
  if (v === null) return 'transparent';
  if (v >= 90) return 'rgba(74, 222, 128, 0.35)';
  if (v >= 80) return 'rgba(167, 139, 250, 0.35)';
  if (v >= 70) return 'rgba(251, 191, 36, 0.3)';
  return 'rgba(248, 113, 113, 0.3)';
}

function heatColor(v: number): string {
  if (v >= 80) return 'rgba(74, 222, 128, 0.4)';
  if (v >= 50) return 'rgba(167, 139, 250, 0.4)';
  if (v >= 20) return 'rgba(251, 191, 36, 0.3)';
  return 'rgba(248, 113, 113, 0.2)';
}

export default function AnalyticsPage() {
  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: '#e2e8f0' }}>Analytiques avancées</h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Cohortes, funnels, prédictions churn — tous les KPIs business</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={actBtn}><Download size={14} /> CSV</button>
          <button style={actBtn}><FileSpreadsheet size={14} /> Excel</button>
        </div>
      </div>

      {/* Cohort analysis */}
      <Card title="Analyse de cohortes · Rétention mensuelle" action={<span style={{ fontSize: 11, color: '#94a3b8' }}>% clients actifs N mois après inscription</span>}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, color: '#64748b', fontWeight: 600 }}>COHORTE</th>
                {['M0', 'M+1', 'M+2', 'M+3', 'M+4', 'M+5', 'M+6'].map(l => (
                  <th key={l} style={{ padding: 8, color: '#64748b', fontWeight: 600 }}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COHORTS.map(c => (
                <tr key={c.month}>
                  <td style={{ padding: 8, color: '#e2e8f0', fontWeight: 600 }}>{c.month}</td>
                  {[c.m0, c.m1, c.m2, c.m3, c.m4, c.m5, c.m6].map((v, i) => (
                    <td key={i} style={{ padding: 4 }}>
                      <div style={{
                        padding: '10px 6px', textAlign: 'center',
                        background: retentionColor(v), borderRadius: 4,
                        color: v ? '#e2e8f0' : 'transparent',
                        fontWeight: 600,
                      }}>{v ?? '—'}%</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: '20px 0' }}>
        {/* Funnel */}
        <Card title="Funnel de conversion">
          {FUNNEL.map((f, i) => (
            <motion.div
              key={f.step}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{ marginBottom: 14 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{f.step}</span>
                <span style={{ color: '#94a3b8' }}>{f.count} ({f.pct}%)</span>
              </div>
              <div style={{ height: 28, background: '#0a0a0f', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${f.pct}%` }}
                  transition={{ delay: i * 0.1 + 0.1, duration: 0.6 }}
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, #a78bfa ${f.pct - 20}%, #7c3aed)`,
                  }}
                />
              </div>
            </motion.div>
          ))}
        </Card>

        {/* Revenue by plan */}
        <Card title="Revenu par plan (MRR)">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={REVENUE_PLAN} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {REVENUE_PLAN.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#13131a', border: '1px solid #2a2a35', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            {REVENUE_PLAN.map(r => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#e2e8f0' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: r.color }} />
                {r.name} — {r.value} €
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Feature usage heatmap */}
      <Card title="Heatmap d'usage des modules (% adoption par plan)">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, color: '#64748b', fontWeight: 600 }}>MODULE</th>
                {['Starter', 'Pro', 'Business', 'Enterprise'].map(p => (
                  <th key={p} style={{ padding: 8, color: '#64748b', fontWeight: 600 }}>{p.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HEATMAP_MODULES.map(m => (
                <tr key={m.name}>
                  <td style={{ padding: 8, color: '#e2e8f0', fontWeight: 600 }}>{m.name}</td>
                  {(['Starter', 'Pro', 'Business', 'Enterprise'] as const).map(p => (
                    <td key={p} style={{ padding: 4 }}>
                      <div style={{
                        padding: '10px 6px', textAlign: 'center',
                        background: heatColor(m[p]), borderRadius: 4,
                        color: '#e2e8f0', fontWeight: 600,
                      }}>{m[p]}%</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        <Card title="Prédiction de churn (ML)" action={<span style={{ fontSize: 11, color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} /> {CHURN_PRED.length} à risque</span>}>
          {CHURN_PRED.map((c, i) => (
            <div key={i} style={{
              padding: 12, borderBottom: i < CHURN_PRED.length - 1 ? '1px solid #2a2a35' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{c.name}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: c.risk > 70 ? '#f87171' : '#fbbf24',
                  background: c.risk > 70 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                  padding: '2px 8px', borderRadius: 4,
                }}>Risque {c.risk}%</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.reason}</div>
              <div style={{ height: 4, background: '#0a0a0f', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${c.risk}%`, background: c.risk > 70 ? '#f87171' : '#fbbf24' }} />
              </div>
            </div>
          ))}
        </Card>

        <Card title="Revenu par taille de client">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[
              { size: '1 site', rev: 4200, count: 72 },
              { size: '2-5 sites', rev: 5800, count: 38 },
              { size: '6-10 sites', rev: 1900, count: 12 },
              { size: '10+ sites', rev: 550, count: 5 },
            ]}>
              <CartesianGrid stroke="#2a2a35" strokeDasharray="3 3" />
              <XAxis dataKey="size" stroke="#64748b" style={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" style={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#13131a', border: '1px solid #2a2a35', borderRadius: 8 }} />
              <Bar dataKey="rev" fill="#a78bfa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

const actBtn: React.CSSProperties = {
  background: '#13131a', border: '1px solid #2a2a35',
  color: '#e2e8f0', padding: '8px 14px', borderRadius: 8,
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 6,
};
