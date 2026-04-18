import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, AlertTriangle, Download, FileSpreadsheet,
  BarChart3, Users,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const BG = '#0a0a0f';
const CARD = '#13131a';
const BORDER = '#2a2a35';
const TEXT = '#e2e8f0';
const MUTED = '#94a3b8';
const ACCENT = '#a78bfa';

const cohortData = [
  { cohort: 'Oct 2025', size: 12, r: [100, 92, 83, 83, 75, 75, 67] },
  { cohort: 'Nov 2025', size: 18, r: [100, 89, 83, 78, 78, 72, 72] },
  { cohort: 'Déc 2025', size: 23, r: [100, 91, 87, 78, 74, 70] },
  { cohort: 'Jan 2026', size: 27, r: [100, 93, 85, 81, 74] },
  { cohort: 'Fév 2026', size: 31, r: [100, 90, 84, 77] },
  { cohort: 'Mar 2026', size: 38, r: [100, 92, 87] },
  { cohort: 'Avr 2026', size: 29, r: [100, 93] },
];

const funnelSteps = [
  { label: 'Signups', value: 1000, color: '#a78bfa' },
  { label: 'Trial démarré', value: 650, color: '#8b5cf6' },
  { label: 'Payant', value: 127, color: '#7c3aed' },
  { label: 'Actif (30j)', value: 119, color: '#6d28d9' },
  { label: 'Expansion', value: 43, color: '#5b21b6' },
];

const featureUsageHeatmap = [
  'POS', 'Stocks', 'Menu', 'Analytique', 'Personnel', 'Marketing', 'Compta',
  'Tables', 'Commandes', 'Livraison', 'Clients', 'Fidélité', 'Planning', 'Réservations',
  'Promotions', 'Fournisseurs', 'Rapports', 'TVA', 'Happy Hour', 'QR Menu',
  'Click & Collect', 'Caisse X/Z', 'Pourboires', 'Tickets', 'Formation', 'API', 'Multi-sites',
];

const planRevenue = [
  { name: 'Starter', value: 2450, color: '#3b82f6' },
  { name: 'Pro', value: 7890, color: '#a78bfa' },
  { name: 'Business', value: 1890, color: '#8b5cf6' },
  { name: 'Enterprise', value: 220, color: '#ec4899' },
];

const countryRevenue = [
  { name: 'LU', value: 8420 },
  { name: 'FR', value: 2340 },
  { name: 'BE', value: 1120 },
  { name: 'DE', value: 570 },
];

const churnRisk = [
  { client: 'Bistro Maxim', score: 87, reason: 'Aucune connexion 14j', mrr: 149 },
  { client: 'Chez Marie', score: 82, reason: 'Ticket support non résolu', mrr: 99 },
  { client: 'Brasserie Nord', score: 76, reason: 'Utilisation -45% sur 30j', mrr: 149 },
  { client: 'Pizza Napoli', score: 71, reason: 'Impayé 15j', mrr: 49 },
  { client: 'Le Gourmet', score: 68, reason: 'Plan trop grand', mrr: 149 },
  { client: 'Snack Corner', score: 64, reason: 'Modules inutilisés', mrr: 99 },
  { client: 'Café Central', score: 61, reason: 'Pas de nouveaux users', mrr: 49 },
  { client: 'Taverne du Parc', score: 58, reason: 'Baisse de CA', mrr: 149 },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('12m');

  return (
    <div style={{ padding: '32px 40px', background: BG, minHeight: '100vh', color: TEXT }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Analytiques SaaS</h1>
          <p style={{ margin: '6px 0 0', color: MUTED, fontSize: 14 }}>
            Cohortes, funnel, churn, et santé globale du SaaS
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              background: CARD, border: `1px solid ${BORDER}`, color: TEXT,
              padding: '9px 14px', borderRadius: 7, fontSize: 13, cursor: 'pointer',
            }}
          >
            <option value="3m">3 mois</option>
            <option value="6m">6 mois</option>
            <option value="12m">12 mois</option>
          </select>
          <button style={btnSec}><Download size={14} /> CSV</button>
          <button style={btnSec}><FileSpreadsheet size={14} /> Excel</button>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Kpi label="Conversion Trial→Paid" value="19.5%" delta="+2.3%" up icon={TrendingUp} />
        <Kpi label="Rétention M3" value="86%" delta="+1.1%" up icon={Users} />
        <Kpi label="Churn mensuel" value="2.8%" delta="-0.4%" up icon={TrendingDown} />
        <Kpi label="LTV" value="2 340€" delta="+180€" up icon={BarChart3} />
      </div>

      <Card title="Funnel de conversion">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {funnelSteps.map((s, i) => {
            const pct = (s.value / funnelSteps[0].value) * 100;
            const convFromPrev = i > 0 ? ((s.value / funnelSteps[i - 1].value) * 100).toFixed(1) : '100';
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{ display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div style={{ minWidth: 140, fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                <div style={{ flex: 1, height: 40, background: BG, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.08 }}
                    style={{
                      height: '100%', background: `linear-gradient(90deg, ${s.color}, ${s.color}aa)`,
                      display: 'flex', alignItems: 'center', paddingLeft: 14, color: '#fff',
                      fontWeight: 700, fontSize: 13,
                    }}
                  >
                    {s.value.toLocaleString()}
                  </motion.div>
                </div>
                <div style={{ minWidth: 100, textAlign: 'right', fontSize: 12, color: MUTED }}>
                  {convFromPrev}%
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      <Card title="Matrice de rétention (cohortes)" style={{ marginTop: 20 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 3, fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 6, color: MUTED, fontWeight: 500 }}>Cohorte</th>
                <th style={{ textAlign: 'left', padding: 6, color: MUTED, fontWeight: 500 }}>N</th>
                {Array.from({ length: 7 }).map((_, i) => (
                  <th key={i} style={{ textAlign: 'center', padding: 6, color: MUTED, fontWeight: 500 }}>M{i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohortData.map((c) => (
                <tr key={c.cohort}>
                  <td style={{ padding: 6, fontWeight: 600 }}>{c.cohort}</td>
                  <td style={{ padding: 6, color: MUTED }}>{c.size}</td>
                  {c.r.map((v, i) => (
                    <td key={i} style={{ padding: 0 }}>
                      <div style={{
                        background: `rgba(167, 139, 250, ${v / 100})`,
                        padding: '10px 6px', borderRadius: 5,
                        textAlign: 'center', color: v > 60 ? '#fff' : TEXT,
                        fontWeight: 600,
                      }}>{v}%</div>
                    </td>
                  ))}
                  {Array.from({ length: 7 - c.r.length }).map((_, i) => (
                    <td key={`e${i}`} style={{ padding: 0 }}>
                      <div style={{ padding: '10px 6px', background: BG, borderRadius: 5 }}></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Heatmap usage modules (7 derniers jours)" style={{ marginTop: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(7, 1fr)', gap: 4 }}>
          <div></div>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 11, color: MUTED, fontWeight: 600 }}>{d}</div>
          ))}
          {featureUsageHeatmap.map((m, mi) => (
            <HeatmapRow key={m} name={m} seed={mi} />
          ))}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <Card title="Revenu par plan">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={planRevenue} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {planRevenue.map((p) => <Cell key={p.name} fill={p.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Revenu par pays">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={countryRevenue} layout="vertical">
              <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
              <XAxis type="number" stroke={MUTED} fontSize={11} />
              <YAxis dataKey="name" type="category" stroke={MUTED} fontSize={11} />
              <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }} />
              <Bar dataKey="value" fill={ACCENT} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Clients à risque de churn" style={{ marginTop: 20 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          {churnRisk.map((c, i) => (
            <motion.div
              key={c.client}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{
                padding: 14, background: BG, borderRadius: 8,
                border: `1px solid ${BORDER}`, display: 'grid',
                gridTemplateColumns: '40px 1fr auto auto auto', gap: 14,
                alignItems: 'center',
              }}
            >
              <AlertTriangle size={20} color={c.score > 75 ? '#ef4444' : c.score > 60 ? '#f59e0b' : '#facc15'} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.client}</div>
                <div style={{ fontSize: 12, color: MUTED }}>{c.reason}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>{c.score}/100</div>
              <div style={{ fontSize: 13, color: MUTED }}>{c.mrr}€/mo</div>
              <button style={btnSec}>Agir</button>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function HeatmapRow({ name, seed }: { name: string; seed: number }) {
  return (
    <>
      <div style={{ fontSize: 11, padding: '4px 0' }}>{name}</div>
      {Array.from({ length: 7 }).map((_, d) => {
        const intensity = ((Math.sin(seed * 7 + d * 13) + 1) / 2) * 0.85 + 0.12;
        return (
          <div
            key={d}
            style={{
              height: 20, borderRadius: 3,
              background: `rgba(167, 139, 250, ${intensity})`,
            }}
            title={`${name} j${d + 1}: ${Math.round(intensity * 100)}%`}
          />
        );
      })}
    </>
  );
}

function Kpi({ label, value, delta, up, icon: Icon }: any) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
          <div style={{ fontSize: 12, color: up ? '#10b981' : '#ef4444', marginTop: 4, fontWeight: 600 }}>
            {delta}
          </div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: 'rgba(167, 139, 250, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={ACCENT} />
        </div>
      </div>
    </div>
  );
}

function Card({ title, children, style }: any) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, ...style }}>
      {title && <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>{title}</h3>}
      {children}
    </div>
  );
}

const btnSec: React.CSSProperties = {
  background: CARD, border: `1px solid ${BORDER}`, color: TEXT,
  padding: '9px 14px', borderRadius: 7, cursor: 'pointer',
  fontSize: 13, fontWeight: 600, display: 'inline-flex',
  alignItems: 'center', gap: 6,
};
