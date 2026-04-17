import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

type Period = '7j' | '30j' | '90j' | '1an';

const monthlyRating = [
  { mois: 'Mai', note: 4.3, trend: 4.35 },
  { mois: 'Juin', note: 4.4, trend: 4.40 },
  { mois: 'Juil', note: 4.2, trend: 4.42 },
  { mois: 'Août', note: 4.5, trend: 4.47 },
  { mois: 'Sept', note: 4.4, trend: 4.48 },
  { mois: 'Oct', note: 4.5, trend: 4.51 },
  { mois: 'Nov', note: 4.6, trend: 4.54 },
  { mois: 'Déc', note: 4.5, trend: 4.55 },
  { mois: 'Jan', note: 4.7, trend: 4.58 },
  { mois: 'Fév', note: 4.6, trend: 4.60 },
  { mois: 'Mars', note: 4.6, trend: 4.61 },
  { mois: 'Avr', note: 4.6, trend: 4.62 },
];

const monthlyVolume = [
  { mois: 'Mai', avis: 7 }, { mois: 'Juin', avis: 9 }, { mois: 'Juil', avis: 12 },
  { mois: 'Août', avis: 14 }, { mois: 'Sept', avis: 11 }, { mois: 'Oct', avis: 13 },
  { mois: 'Nov', avis: 10 }, { mois: 'Déc', avis: 15 }, { mois: 'Jan', avis: 8 },
  { mois: 'Fév', avis: 9 }, { mois: 'Mars', avis: 10 }, { mois: 'Avr', avis: 9 },
];

const platforms = [
  { name: 'Google', value: 67, color: '#4285f4' },
  { name: 'TripAdvisor', value: 34, color: '#00af87' },
  { name: 'Facebook', value: 15, color: '#1877f2' },
  { name: 'Interne', value: 11, color: '#f59e0b' },
];

const ratingBars = [
  { stars: 5, count: 67, color: '#10b981' },
  { stars: 4, count: 34, color: '#84cc16' },
  { stars: 3, count: 15, color: '#f59e0b' },
  { stars: 2, count: 8, color: '#f97316' },
  { stars: 1, count: 3, color: '#ef4444' },
];

const positiveWords = [
  { word: 'service', count: 89 }, { word: 'excellent', count: 76 },
  { word: 'ambiance', count: 62 }, { word: 'délicieux', count: 54 },
  { word: 'accueil', count: 48 }, { word: 'chaleureux', count: 41 },
  { word: 'qualité', count: 38 }, { word: 'frais', count: 32 },
  { word: 'cosy', count: 28 }, { word: 'personnel', count: 24 },
  { word: 'rapide', count: 21 }, { word: 'généreux', count: 18 },
  { word: 'authentique', count: 15 }, { word: 'raffiné', count: 12 },
  { word: 'savoureux', count: 10 },
];

const negativeWords = [
  { word: 'attente', count: 24 }, { word: 'bruit', count: 18 },
  { word: 'parking', count: 14 }, { word: 'cher', count: 11 },
  { word: 'froid', count: 9 }, { word: 'lent', count: 7 },
  { word: 'petit', count: 6 }, { word: 'fade', count: 5 },
  { word: 'salé', count: 4 }, { word: 'bondé', count: 3 },
];

const competitors = [
  { nom: 'Café du Centre', note: 4.3, avis: 98, taux: 78 },
  { nom: 'Brasserie Nationale', note: 4.5, avis: 156, taux: 89 },
  { nom: 'Chez Louis', note: 4.2, avis: 73, taux: 65 },
];

const StatCard = ({ label, value, icon, extra, color }: any) => (
  <motion.div
    whileHover={{ y: -4 }}
    style={{
      background: '#fff', borderRadius: 16, padding: 24,
      border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{label}</span>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>{icon}</div>
    </div>
    <div style={{ fontSize: 30, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{value}</div>
    {extra && <div style={{ fontSize: 12, color: '#64748b' }}>{extra}</div>}
  </motion.div>
);

const Stars = ({ value }: { value: number }) => (
  <span style={{ fontSize: 16, color: '#fbbf24', letterSpacing: 2 }}>
    {'★'.repeat(Math.round(value))}{'☆'.repeat(5 - Math.round(value))}
  </span>
);

export default function StatsPage() {
  const [period, setPeriod] = useState<Period>('30j');

  const heatmap = useMemo(() => {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    return days.map((d, di) => ({
      day: d,
      hours: Array.from({ length: 24 }, (_, h) => {
        const peak = (h >= 11 && h <= 14) || (h >= 19 && h <= 22);
        const weekend = di >= 5;
        return Math.floor((peak ? 6 : 1) * (weekend ? 1.8 : 1) * Math.random() + 0.5);
      }),
    }));
  }, []);

  const maxHeat = Math.max(...heatmap.flatMap(r => r.hours));

  return (
    <div style={{ padding: 32, background: '#f8fafc', minHeight: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Statistiques e-réputation
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>
            Analyse complète de vos avis et de votre image en ligne
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{
            padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0',
            background: '#fff', color: '#1e293b', fontWeight: 500, cursor: 'pointer',
          }}>Export CSV</button>
          <button style={{
            padding: '10px 16px', borderRadius: 10, border: 'none',
            background: '#1e293b', color: '#fff', fontWeight: 500, cursor: 'pointer',
          }}>Export PDF</button>
        </div>
      </motion.div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['7j', '30j', '90j', '1an'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: '8px 18px', borderRadius: 10,
            border: period === p ? '1px solid #1e293b' : '1px solid #e2e8f0',
            background: period === p ? '#1e293b' : '#fff',
            color: period === p ? '#fff' : '#1e293b',
            fontWeight: 600, cursor: 'pointer', fontSize: 13,
          }}>{p === '1an' ? '1 an' : p}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Note moyenne" value={<span>4.6<span style={{ fontSize: 16, color: '#94a3b8' }}>/5</span></span>}
          icon="⭐" color="#fbbf24" extra={<Stars value={4.6} />} />
        <StatCard label="Total avis" value="127" icon="💬" color="#3b82f6" extra="+12 ce mois" />
        <StatCard label="Taux de réponse" value="94%" icon="↩" color="#10b981" extra="+3% vs période préc." />
        <StatCard label="Sentiment" value="87%" icon="😊" color="#8b5cf6" extra="positif global" />
      </div>

      <motion.div
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        style={{
          background: 'linear-gradient(135deg, #10b98115, #10b98105)',
          border: '1px solid #10b98130', borderRadius: 14, padding: 20, marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 16,
        }}
      >
        <div style={{ fontSize: 32 }}>📈</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#065f46', marginBottom: 4 }}>
            Votre note a augmenté de 0.3 ces 30j ⬆
          </div>
          <div style={{ fontSize: 13, color: '#047857' }}>
            Tendance positive confirmée — continuez sur cette lancée !
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
            Évolution de la note moyenne (12 mois)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyRating}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" stroke="#64748b" style={{ fontSize: 12 }} />
              <YAxis domain={[3.8, 5]} stroke="#64748b" style={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="note" stroke="#3b82f6" strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }} name="Note" />
              <Line type="monotone" dataKey="trend" stroke="#10b981" strokeWidth={2}
                strokeDasharray="5 5" dot={false} name="Tendance" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
            Répartition par plateforme
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={platforms} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={80} innerRadius={45} paddingAngle={3}>
                {platforms.map((p, i) => <Cell key={i} fill={p.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 8 }}>
            {platforms.map(p => (
              <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
                  {p.name}
                </span>
                <strong style={{ color: '#1e293b' }}>{p.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
            Nombre d'avis par mois
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" stroke="#64748b" style={{ fontSize: 12 }} />
              <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
              <Bar dataKey="avis" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
            Répartition par note
          </h3>
          {ratingBars.map(r => {
            const total = ratingBars.reduce((a, b) => a + b.count, 0);
            const pct = (r.count / total) * 100;
            return (
              <div key={r.stars} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#1e293b', fontWeight: 500 }}>
                    {r.stars} ★
                  </span>
                  <span style={{ color: '#64748b' }}>{r.count} ({pct.toFixed(0)}%)</span>
                </div>
                <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: r.stars * 0.08 }}
                    style={{ height: '100%', background: r.color, borderRadius: 5 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
          Analyse du sentiment
        </h3>
        <div style={{ display: 'flex', height: 48, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
          <motion.div initial={{ width: 0 }} animate={{ width: '87%' }}
            style={{ background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600 }}>
            Positif 87%
          </motion.div>
          <motion.div initial={{ width: 0 }} animate={{ width: '10%' }}
            style={{ background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600 }}>
            10%
          </motion.div>
          <motion.div initial={{ width: 0 }} animate={{ width: '3%' }}
            style={{ background: '#ef4444' }} />
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#64748b' }}>
          <span><span style={{ color: '#10b981', fontWeight: 700 }}>●</span> Positif</span>
          <span><span style={{ color: '#f59e0b', fontWeight: 700 }}>●</span> Neutre</span>
          <span><span style={{ color: '#ef4444', fontWeight: 700 }}>●</span> Négatif</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#10b981' }}>
            🟢 Mots-clés positifs
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {positiveWords.map(w => (
              <span key={w.word} style={{
                padding: '6px 12px', borderRadius: 20,
                background: '#10b98115', color: '#047857',
                fontSize: 10 + (w.count / 8), fontWeight: 600,
              }}>{w.word}</span>
            ))}
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#ef4444' }}>
            🔴 Mots-clés négatifs
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {negativeWords.map(w => (
              <span key={w.word} style={{
                padding: '6px 12px', borderRadius: 20,
                background: '#ef444415', color: '#b91c1c',
                fontSize: 10 + (w.count / 4), fontWeight: 600,
              }}>{w.word}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
          Comparaison vs concurrence
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#64748b', fontWeight: 600 }}>Établissement</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#64748b', fontWeight: 600 }}>Note</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#64748b', fontWeight: 600 }}>Avis</th>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: '#64748b', fontWeight: 600 }}>Taux réponse</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#eff6ff' }}>
              <td style={{ padding: '12px 8px', fontWeight: 700, color: '#1e40af' }}>Vous (Creorga)</td>
              <td style={{ padding: '12px 8px' }}><Stars value={4.6} /> <strong>4.6</strong></td>
              <td style={{ padding: '12px 8px' }}>127</td>
              <td style={{ padding: '12px 8px', color: '#10b981', fontWeight: 600 }}>94%</td>
            </tr>
            {competitors.map(c => (
              <tr key={c.nom} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 8px', color: '#1e293b' }}>{c.nom}</td>
                <td style={{ padding: '12px 8px' }}><Stars value={c.note} /> <strong>{c.note}</strong></td>
                <td style={{ padding: '12px 8px', color: '#64748b' }}>{c.avis}</td>
                <td style={{ padding: '12px 8px', color: '#64748b' }}>{c.taux}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
          Heures de publication des avis
        </h3>
        <div style={{ display: 'flex', gap: 4, marginLeft: 44, marginBottom: 4 }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} style={{ flex: 1, fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>
              {h % 3 === 0 ? h : ''}
            </div>
          ))}
        </div>
        {heatmap.map(row => (
          <div key={row.day} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
            <div style={{ width: 40, fontSize: 11, color: '#64748b', fontWeight: 600 }}>{row.day}</div>
            {row.hours.map((v, i) => (
              <div key={i} style={{
                flex: 1, height: 22, borderRadius: 4,
                background: v === 0 ? '#f1f5f9' : `rgba(59, 130, 246, ${0.15 + (v / maxHeat) * 0.85})`,
              }} title={`${row.day} ${i}h: ${v} avis`} />
            ))}
          </div>
        ))}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#64748b' }}>
          <span>Moins</span>
          {[0.15, 0.35, 0.55, 0.75, 1].map((o, i) => (
            <div key={i} style={{ width: 18, height: 12, borderRadius: 3, background: `rgba(59, 130, 246, ${o})` }} />
          ))}
          <span>Plus</span>
        </div>
      </div>
    </div>
  );
}
