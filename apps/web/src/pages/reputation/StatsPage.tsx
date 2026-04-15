import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const ratingEvolution = [
  { mois: 'Nov', note: 4.2 },
  { mois: 'Déc', note: 4.3 },
  { mois: 'Jan', note: 4.4 },
  { mois: 'Fév', note: 4.5 },
  { mois: 'Mars', note: 4.5 },
  { mois: 'Avr', note: 4.6 },
];

const platformDistribution = [
  { name: 'Google', value: 52, color: '#2563eb' },
  { name: 'TripAdvisor', value: 28, color: '#059669' },
  { name: 'Facebook', value: 14, color: '#4f46e5' },
  { name: 'Interne', value: 6, color: '#7c3aed' },
];

const reviewsByMonth = [
  { mois: 'Nov', avis: 18 },
  { mois: 'Déc', avis: 22 },
  { mois: 'Jan', avis: 15 },
  { mois: 'Fév', avis: 20 },
  { mois: 'Mars', avis: 24 },
  { mois: 'Avr', avis: 12 },
];

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(0,0,0,0.06)',
  borderRadius: 20,
  padding: '22px 24px',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ fontSize: 13, color: '#475569' }}>
          {p.name}: <strong style={{ color: '#1e293b' }}>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

export default function StatsPage() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', margin: 0 }}>Statistiques de réputation</h1>
        <p style={{ color: '#475569', marginTop: 6, fontSize: 15 }}>
          Analysez l'évolution de votre réputation en ligne
        </p>
      </motion.div>

      {/* KPI cards */}
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Réponse moyenne</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#1e293b' }}>2.3</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>heures</span>
          </div>
          <div style={{ fontSize: 13, color: '#059669', marginTop: 6 }}>-18 min vs mois dernier</div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Taux de réponse</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#1e293b' }}>94</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>%</span>
          </div>
          <div style={{ fontSize: 13, color: '#059669', marginTop: 6 }}>+2% vs mois dernier</div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sentiment positif</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#1e293b' }}>87</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#475569' }}>%</span>
          </div>
          <div style={{ fontSize: 13, color: '#059669', marginTop: 6 }}>+5% vs mois dernier</div>
        </div>
      </motion.div>

      {/* Line chart - Note moyenne evolution */}
      <motion.div variants={item} style={cardStyle}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 20 }}>
          Évolution de la note moyenne
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={ratingEvolution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="mois" tick={{ fill: '#64748b', fontSize: 13 }} axisLine={{ stroke: 'rgba(0,0,0,0.08)' }} />
            <YAxis domain={[3.5, 5]} tick={{ fill: '#64748b', fontSize: 13 }} axisLine={{ stroke: 'rgba(0,0,0,0.08)' }} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="note"
              name="Note"
              stroke="#0369A1"
              strokeWidth={3}
              dot={{ r: 5, fill: '#0369A1', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7, fill: '#0369A1', stroke: '#fff', strokeWidth: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Pie + Bar row */}
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Pie chart - Platform distribution */}
        <div style={cardStyle}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 20 }}>
            Répartition par plateforme
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={platformDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {platformDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
            {platformDistribution.map((p) => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color }} />
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{p.name} ({p.value}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart - Reviews by month */}
        <div style={cardStyle}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 20 }}>
            Nombre d'avis par mois
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={reviewsByMonth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="mois" tick={{ fill: '#64748b', fontSize: 13 }} axisLine={{ stroke: 'rgba(0,0,0,0.08)' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 13 }} axisLine={{ stroke: 'rgba(0,0,0,0.08)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avis" name="Avis" fill="#0369A1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Sentiment breakdown */}
      <motion.div variants={item} style={cardStyle}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
          Répartition du sentiment
        </div>
        <div style={{ display: 'flex', gap: 8, height: 32, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ flex: 87, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Positif 87%</span>
          </div>
          <div style={{ flex: 8, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>8%</span>
          </div>
          <div style={{ flex: 5, background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>5%</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
          {[
            { label: 'Positif (4-5 étoiles)', color: '#059669', count: 110 },
            { label: 'Neutre (3 étoiles)', color: '#f59e0b', count: 10 },
            { label: 'Négatif (1-2 étoiles)', color: '#dc2626', count: 7 },
          ].map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
              <span style={{ fontSize: 13, color: '#475569' }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>({s.count})</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
