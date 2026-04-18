import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, AreaChart, Area,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, DollarSign, AlertCircle,
  Rocket, ArrowUpRight, MapPin, Bell, Zap,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

const MRR_DATA = [
  { month: 'Mai', mrr: 6800 }, { month: 'Juin', mrr: 7400 },
  { month: 'Juil', mrr: 8100 }, { month: 'Août', mrr: 8600 },
  { month: 'Sep', mrr: 9200 }, { month: 'Oct', mrr: 9800 },
  { month: 'Nov', mrr: 10400 }, { month: 'Déc', mrr: 10900 },
  { month: 'Jan', mrr: 11300 }, { month: 'Fév', mrr: 11700 },
  { month: 'Mar', mrr: 12100 }, { month: 'Avr', mrr: 12450 },
];

const SIGNUPS_DATA = [
  { month: 'Mai', s: 8 }, { month: 'Juin', s: 11 },
  { month: 'Juil', s: 9 }, { month: 'Août', s: 14 },
  { month: 'Sep', s: 12 }, { month: 'Oct', s: 15 },
  { month: 'Nov', s: 13 }, { month: 'Déc', s: 10 },
  { month: 'Jan', s: 16 }, { month: 'Fév', s: 14 },
  { month: 'Mar', s: 18 }, { month: 'Avr', s: 21 },
];

const ALERTS = [
  { icon: Rocket, color: '#4ade80', text: '3 clients ont upgradé vers Pro ce matin', time: 'il y a 2h' },
  { icon: AlertCircle, color: '#f87171', text: 'Ticket urgent de Café Namur — 4h sans réponse', time: 'il y a 4h' },
  { icon: DollarSign, color: '#a78bfa', text: 'Paiement de 890€ reçu — Brasserie Luxembourg', time: 'il y a 6h' },
  { icon: TrendingDown, color: '#fbbf24', text: 'Pizzeria Bella à risque de churn (score 23)', time: 'hier' },
  { icon: Zap, color: '#60a5fa', text: 'Nouveau module AI Assistant activé sur 5 comptes', time: 'hier' },
];

const RECENT_SIGNUPS = [
  { name: 'Le Gourmand', city: 'Luxembourg', plan: 'Pro', date: '18 Avr 2026' },
  { name: 'Brasserie du Lac', city: 'Esch', plan: 'Starter', date: '17 Avr 2026' },
  { name: 'Chez Marco', city: 'Differdange', plan: 'Business', date: '17 Avr 2026' },
  { name: 'La Petite Table', city: 'Mersch', plan: 'Pro', date: '16 Avr 2026' },
  { name: 'Sushi Tokyo', city: 'Luxembourg', plan: 'Starter', date: '15 Avr 2026' },
  { name: 'Auberge Verte', city: 'Vianden', plan: 'Pro', date: '14 Avr 2026' },
  { name: 'Café Central', city: 'Dudelange', plan: 'Starter', date: '14 Avr 2026' },
];

const CHURN_RISK = [
  { name: 'Pizzeria Bella', score: 23, reason: 'Usage -60% sur 30j' },
  { name: 'Bar Le Coin', score: 31, reason: 'Aucune connexion 14j' },
  { name: 'Resto Panorama', score: 38, reason: 'Paiement en retard' },
];

const GEO = [
  { city: 'Luxembourg', count: 42, x: 50, y: 45 },
  { city: 'Esch-sur-Alzette', count: 24, x: 42, y: 70 },
  { city: 'Differdange', count: 12, x: 32, y: 68 },
  { city: 'Dudelange', count: 10, x: 52, y: 75 },
  { city: 'Mersch', count: 9, x: 50, y: 28 },
  { city: 'Vianden', count: 5, x: 64, y: 15 },
  { city: 'Remich', count: 8, x: 72, y: 58 },
  { city: 'Autres', count: 17, x: 35, y: 40 },
];

function KpiCard({
  label, value, trend, Icon, tint,
}: { label: string; value: string; trend?: string; Icon: any; tint: string }) {
  const positive = trend?.startsWith('+');
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#13131a',
        border: '1px solid #2a2a35',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${tint}22`, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={tint} />
        </div>
        {trend && (
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: positive ? '#4ade80' : '#f87171',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend}
          </span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#94a3b8' }}>{label}</div>
    </motion.div>
  );
}

function Card({ title, children, action }: any) {
  return (
    <div style={{
      background: '#13131a',
      border: '1px solid #2a2a35',
      borderRadius: 12,
      padding: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div style={{ padding: 32 }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 24 }}
      >
        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: '#e2e8f0' }}>
          Tableau de bord
        </h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
          Vue d'ensemble en temps réel de votre business Creorga · 18 Avril 2026
        </p>
      </motion.div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20,
      }}>
        <KpiCard label="MRR (Revenu mensuel)" value="12 450 €" trend="+3.0%" Icon={DollarSign} tint="#a78bfa" />
        <KpiCard label="ARR (Revenu annuel)" value="149 400 €" trend="+18%" Icon={TrendingUp} tint="#4ade80" />
        <KpiCard label="Clients actifs" value="127" trend="+6" Icon={Users} tint="#60a5fa" />
        <KpiCard label="Taux de churn" value="2.3%" trend="-0.4%" Icon={TrendingDown} tint="#fbbf24" />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20,
      }}>
        <KpiCard label="NPS Score" value="68" trend="+4" Icon={ArrowUpRight} tint="#4ade80" />
        <KpiCard label="CAC moyen" value="142 €" trend="-8 €" Icon={DollarSign} tint="#60a5fa" />
        <KpiCard label="LTV moyen" value="3 850 €" trend="+210 €" Icon={TrendingUp} tint="#a78bfa" />
        <KpiCard label="Trial → Paid" value="42%" trend="+3%" Icon={Rocket} tint="#f472b6" />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20,
      }}>
        <Card title="Croissance MRR sur 12 mois" action={<span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>+83% YoY</span>}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={MRR_DATA}>
              <defs>
                <linearGradient id="mrrg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2a2a35" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" style={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#13131a', border: '1px solid #2a2a35', borderRadius: 8 }} />
              <Area type="monotone" dataKey="mrr" stroke="#a78bfa" strokeWidth={2} fill="url(#mrrg)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Alertes & Événements" action={<Bell size={14} color="#a78bfa" />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 260, overflowY: 'auto' }}>
            {ALERTS.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: `${a.color}22`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <a.icon size={15} color={a.color} />
                </div>
                <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.4 }}>
                  {a.text}
                  <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>{a.time}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20,
      }}>
        <Card title="Nouvelles inscriptions / mois">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={SIGNUPS_DATA}>
              <CartesianGrid stroke="#2a2a35" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" style={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#13131a', border: '1px solid #2a2a35', borderRadius: 8 }} />
              <Bar dataKey="s" fill="#a78bfa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Distribution géographique (Luxembourg)">
          <div style={{ position: 'relative', height: 240, background: '#0a0a0f', borderRadius: 8, border: '1px solid #2a2a35', overflow: 'hidden' }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
              <path d="M30,20 Q40,10 55,15 Q70,12 75,25 Q78,40 72,55 Q68,75 55,82 Q40,85 32,75 Q25,60 22,45 Q25,30 30,20 Z"
                fill="rgba(167,139,250,0.08)" stroke="#2a2a35" strokeWidth="0.3" />
            </svg>
            {GEO.map((g, i) => (
              <motion.div
                key={g.city}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.08, type: 'spring' }}
                style={{
                  position: 'absolute', left: `${g.x}%`, top: `${g.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                title={`${g.city} — ${g.count} clients`}
              >
                <div style={{
                  width: Math.max(12, g.count / 2),
                  height: Math.max(12, g.count / 2),
                  borderRadius: '50%',
                  background: 'rgba(167,139,250,0.4)',
                  border: '2px solid #a78bfa',
                  boxShadow: '0 0 16px rgba(167,139,250,0.5)',
                }} />
                <div style={{
                  position: 'absolute', top: '100%', left: '50%',
                  transform: 'translateX(-50%)', marginTop: 2,
                  fontSize: 9, color: '#cbd5e1', whiteSpace: 'nowrap',
                }}>
                  {g.city} · {g.count}
                </div>
              </motion.div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={12} /> 127 clients répartis sur 8 villes
          </div>
        </Card>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16,
      }}>
        <Card title="Inscriptions récentes">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: 11, textAlign: 'left' }}>
                <th style={{ padding: '8px 0', fontWeight: 600, textTransform: 'uppercase' }}>Restaurant</th>
                <th style={{ padding: '8px 0', fontWeight: 600, textTransform: 'uppercase' }}>Ville</th>
                <th style={{ padding: '8px 0', fontWeight: 600, textTransform: 'uppercase' }}>Plan</th>
                <th style={{ padding: '8px 0', fontWeight: 600, textTransform: 'uppercase' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_SIGNUPS.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid #2a2a35' }}>
                  <td style={{ padding: '10px 0', color: '#e2e8f0', fontWeight: 500 }}>{r.name}</td>
                  <td style={{ padding: '10px 0', color: '#94a3b8' }}>{r.city}</td>
                  <td style={{ padding: '10px 0' }}><StatusBadge status={r.plan} /></td>
                  <td style={{ padding: '10px 0', color: '#94a3b8' }}>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Clients à risque de churn" action={<span style={{ fontSize: 11, color: '#f87171' }}>{CHURN_RISK.length} détectés</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CHURN_RISK.map((c, i) => (
              <div key={i} style={{
                padding: 12, background: '#0a0a0f',
                border: '1px solid #2a2a35', borderRadius: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{c.name}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#f87171',
                    background: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: 4,
                  }}>Score {c.score}</span>
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.reason}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
