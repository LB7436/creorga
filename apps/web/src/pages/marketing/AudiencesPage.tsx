import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, ScatterChart, Scatter, ZAxis,
} from 'recharts';

type Operator = 'equals' | 'greater' | 'less' | 'contains' | 'between';

type Condition = {
  id: string;
  field: string;
  operator: Operator;
  value: string;
};

type Tab = 'segments' | 'rfm' | 'predictive' | 'overlap' | 'journey' | 'geo' | 'automation';

type Audience = {
  id: string;
  name: string;
  description: string;
  count: number;
  color: string;
  icon: string;
  tags: string[];
  lastOpenRate?: number;
  custom?: boolean;
  dynamic?: boolean;
  predictive?: boolean;
  lookalike?: boolean;
};

const presetAudiences: Audience[] = [
  { id: 'all', name: 'Tous les clients', description: 'Base complète de votre clientèle', count: 248, color: '#64748b', icon: 'Tous', tags: ['default', 'global'], lastOpenRate: 34 },
  { id: 'fideles', name: 'Clients fidèles', description: 'Membres Gold + Silver actifs', count: 67, color: '#8b5cf6', icon: 'Fid', tags: ['Gold', 'Silver', 'loyalty'], lastOpenRate: 58, dynamic: true },
  { id: 'inactifs', name: 'Clients inactifs', description: 'Aucune visite depuis plus de 30 jours', count: 34, color: '#f59e0b', icon: 'Inac', tags: ['churn', 'reactivation'], lastOpenRate: 22, dynamic: true },
  { id: 'nouveaux', name: 'Nouveaux clients', description: 'Inscription il y a moins de 30 jours', count: 15, color: '#10b981', icon: 'New', tags: ['onboarding', 'welcome'], lastOpenRate: 67, dynamic: true },
  { id: 'anniv', name: 'Anniversaire ce mois', description: 'Client fêtant son anniversaire', count: 8, color: '#ec4899', icon: 'Anniv', tags: ['birthday', 'personnalisé'], lastOpenRate: 72, dynamic: true },
  { id: 'vip', name: 'VIP', description: 'Top 10% des dépenses (> 500 EUR/mois)', count: 24, color: '#eab308', icon: 'VIP', tags: ['VIP', 'high-value'], lastOpenRate: 81 },
];

const customAudiences: Audience[] = [
  { id: 'c1', name: 'Amateurs de vin', description: 'Ont commandé ≥ 3 fois catégorie vin', count: 42, color: '#be185d', icon: 'Vin', tags: ['custom', 'wine'], lastOpenRate: 54, custom: true },
  { id: 'c2', name: 'Végétariens détectés', description: 'Commandes menu végé uniquement', count: 18, color: '#059669', icon: 'Végé', tags: ['custom', 'diet'], lastOpenRate: 61, custom: true },
  { id: 'c3', name: 'Famille avec enfants', description: 'Réservations ≥ 4 personnes + menu enfant', count: 31, color: '#0ea5e9', icon: 'Fam', tags: ['custom', 'family'], lastOpenRate: 48, custom: true },
];

const predictiveAudiences: Audience[] = [
  { id: 'p1', name: 'À risque de churner', description: 'Modèle ML prédit départ dans 30 jours (prob > 70%)', count: 28, color: '#ef4444', icon: 'Churn', tags: ['prédictif', 'churn'], lastOpenRate: 41, predictive: true },
  { id: 'p2', name: 'Prêts à devenir VIP', description: 'Trajectoire similaire aux VIP actuels', count: 16, color: '#a855f7', icon: 'Next', tags: ['prédictif', 'upsell'], lastOpenRate: 73, predictive: true },
  { id: 'p3', name: 'Lookalike VIP', description: 'Similaires aux top 10% mais pas encore VIP', count: 44, color: '#eab308', icon: 'Look', tags: ['lookalike', 'acquisition'], lastOpenRate: 66, lookalike: true },
  { id: 'p4', name: 'High LTV prédit', description: 'Valeur vie client prévisionnelle > 2000€', count: 52, color: '#06b6d4', icon: 'LTV', tags: ['prédictif', 'value'], lastOpenRate: 69, predictive: true },
];

const growthData = [
  { mois: 'Oct', fideles: 52, inactifs: 28, vip: 18 },
  { mois: 'Nov', fideles: 56, inactifs: 30, vip: 19 },
  { mois: 'Déc', fideles: 61, inactifs: 32, vip: 21 },
  { mois: 'Jan', fideles: 63, inactifs: 35, vip: 22 },
  { mois: 'Fév', fideles: 65, inactifs: 33, vip: 23 },
  { mois: 'Mars', fideles: 67, inactifs: 34, vip: 24 },
];

const rfmCells = [
  { label: 'Champions', r: 5, f: 5, count: 24, color: '#10b981' },
  { label: 'Loyal Customers', r: 5, f: 4, count: 31, color: '#059669' },
  { label: 'Potential Loyalists', r: 4, f: 3, count: 18, color: '#3b82f6' },
  { label: 'New Customers', r: 5, f: 1, count: 15, color: '#8b5cf6' },
  { label: 'Promising', r: 4, f: 1, count: 22, color: '#06b6d4' },
  { label: 'Need Attention', r: 3, f: 3, count: 14, color: '#f59e0b' },
  { label: 'At Risk', r: 2, f: 4, count: 28, color: '#ef4444' },
  { label: "Can't Lose Them", r: 1, f: 5, count: 9, color: '#dc2626' },
  { label: 'Hibernating', r: 1, f: 2, count: 18, color: '#94a3b8' },
  { label: 'Lost', r: 1, f: 1, count: 25, color: '#475569' },
];

const fieldOptions = [
  { value: 'total_depense', label: 'Total dépensé (EUR)' },
  { value: 'visites', label: 'Nombre de visites' },
  { value: 'derniere_visite', label: 'Dernière visite (jours)' },
  { value: 'tier', label: 'Niveau fidélité' },
  { value: 'ville', label: 'Ville' },
  { value: 'postal', label: 'Code postal' },
  { value: 'distance', label: 'Distance (km)' },
  { value: 'age', label: 'Âge' },
];

const operatorOptions: { value: Operator; label: string }[] = [
  { value: 'equals', label: 'est égal à' },
  { value: 'greater', label: 'supérieur à' },
  { value: 'less', label: 'inférieur à' },
  { value: 'contains', label: 'contient' },
  { value: 'between', label: 'entre' },
];

const savedQueries = [
  { id: 'q1', name: 'Clients > 500€ dans 5km', uses: 14, lastRun: 'il y a 2j' },
  { id: 'q2', name: 'Nouveaux + amateurs de vin', uses: 8, lastRun: 'il y a 5j' },
  { id: 'q3', name: 'Familles réservant week-end', uses: 21, lastRun: 'hier' },
];

const journeyData = [
  { month: 'Nov', nouveaux: 28, fideles: 56, vip: 19, churned: 12 },
  { month: 'Déc', nouveaux: 32, fideles: 61, vip: 21, churned: 14 },
  { month: 'Jan', nouveaux: 24, fideles: 63, vip: 22, churned: 18 },
  { month: 'Fév', nouveaux: 19, fideles: 65, vip: 23, churned: 15 },
  { month: 'Mars', nouveaux: 15, fideles: 67, vip: 24, churned: 13 },
];

const campaignPerf = [
  { segment: 'VIP', open: 81, click: 42, conv: 18 },
  { segment: 'Fidèles', open: 58, click: 26, conv: 11 },
  { segment: 'Famille', open: 48, click: 19, conv: 8 },
  { segment: 'Inactifs', open: 22, click: 7, conv: 2 },
  { segment: 'Nouveaux', open: 67, click: 31, conv: 13 },
];

const postalData = [
  { cp: 'L-1000', clients: 48, x: 10, y: 50, z: 48 },
  { cp: 'L-1219', clients: 32, x: 25, y: 42, z: 32 },
  { cp: 'L-1511', clients: 27, x: 35, y: 65, z: 27 },
  { cp: 'L-2010', clients: 41, x: 45, y: 48, z: 41 },
  { cp: 'L-2160', clients: 21, x: 55, y: 35, z: 21 },
  { cp: 'L-2330', clients: 38, x: 60, y: 58, z: 38 },
  { cp: 'L-2510', clients: 19, x: 72, y: 45, z: 19 },
];

const AudienceCard = ({ audience, total, onView, onSend, onEdit }: any) => {
  const pct = (audience.count / total) * 100;
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
      layout
      style={{ background: '#fff', borderRadius: 16, padding: 22, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${audience.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: audience.color }}>{audience.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            {audience.name}
            {audience.dynamic && <span title="Segment dynamique" style={{ fontSize: 9, background: '#10b98118', color: '#059669', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>LIVE</span>}
            {audience.predictive && <span style={{ fontSize: 9, background: '#a855f718', color: '#7c3aed', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>IA</span>}
            {audience.lookalike && <span style={{ fontSize: 9, background: '#eab30818', color: '#a16207', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>LAL</span>}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>{audience.description}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: audience.color }}>{audience.count}</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>clients ({pct.toFixed(0)}% du total)</span>
      </div>

      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
          style={{ height: '100%', background: audience.color, borderRadius: 3 }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {audience.tags.map((t: string) => (
          <span key={t} style={{ padding: '3px 10px', borderRadius: 12, background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 500 }}>{t}</span>
        ))}
      </div>

      {audience.lastOpenRate !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 12 }}>
          <span style={{ color: '#64748b' }}>Dernière campagne :</span>
          <strong style={{ color: audience.lastOpenRate > 50 ? '#10b981' : '#f59e0b' }}>{audience.lastOpenRate}% d'ouverture</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        <button onClick={onView} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Voir</button>
        <button onClick={onSend} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: audience.color, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Campagne</button>
        <button onClick={onEdit} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>Modifier</button>
      </div>

      <div style={{ display: 'flex', gap: 4, fontSize: 11 }}>
        <button style={{ flex: 1, padding: '6px', border: '1px solid #e2e8f0', background: '#fafbff', color: '#475569', cursor: 'pointer', borderRadius: 6, fontWeight: 600 }}>CSV</button>
        <button style={{ flex: 1, padding: '6px', border: '1px solid #e2e8f0', background: '#fafbff', color: '#475569', cursor: 'pointer', borderRadius: 6, fontWeight: 600 }}>Mailchimp</button>
        <button style={{ flex: 1, padding: '6px', border: '1px solid #e2e8f0', background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', borderRadius: 6, fontWeight: 600 }}>Facebook</button>
        <button style={{ flex: 1, padding: '6px', border: '1px solid #e2e8f0', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer', borderRadius: 6, fontWeight: 600 }}>Google</button>
      </div>

      <button style={{ padding: '6px', border: '1px dashed #cbd5e1', background: 'transparent', color: '#64748b', cursor: 'pointer', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
        Créer un test A/B 50/50 sur ce segment
      </button>
    </motion.div>
  );
};

export default function AudiencesPage() {
  const [tab, setTab] = useState<Tab>('segments');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [combinator, setCombinator] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<Condition[]>([
    { id: '1', field: 'total_depense', operator: 'greater', value: '100' },
  ]);

  const total = 248;

  const livePreview = useMemo(() => {
    const seed = conditions.reduce((acc, c) => acc + c.value.length * 7, 13);
    const base = combinator === 'AND' ? 42 : 98;
    return Math.max(1, Math.min(total, base + (seed % 50) - conditions.length * 3));
  }, [conditions, combinator]);

  const addCondition = () => setConditions([...conditions, {
    id: String(Date.now()), field: 'visites', operator: 'greater', value: '3',
  }]);

  const removeCondition = (id: string) => setConditions(conditions.filter(c => c.id !== id));
  const updateCondition = (id: string, patch: Partial<Condition>) =>
    setConditions(conditions.map(c => c.id === id ? { ...c, ...patch } : c));

  const overlapMatrix = [
    ['', 'Fidèles', 'Inactifs', 'VIP', 'Nouveaux', 'Famille'],
    ['Fidèles', '—', '2%', '68%', '5%', '22%'],
    ['Inactifs', '2%', '—', '3%', '0%', '8%'],
    ['VIP', '68%', '3%', '—', '8%', '31%'],
    ['Nouveaux', '5%', '0%', '8%', '—', '14%'],
    ['Famille', '22%', '8%', '31%', '14%', '—'],
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'segments', label: 'Segments' },
    { key: 'rfm', label: 'Analyse RFM' },
    { key: 'predictive', label: 'Prédictifs & Lookalike' },
    { key: 'overlap', label: 'Recouvrement' },
    { key: 'journey', label: 'Journey segments' },
    { key: 'geo', label: 'Géographique' },
    { key: 'automation', label: 'Automatisations' },
  ];

  return (
    <div style={{ padding: 32, background: '#f8fafc', minHeight: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0 }}>Audiences marketing</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Segmentez, prédisez et activez votre clientèle pour des campagnes ultra-ciblées</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Queries sauvegardées ({savedQueries.length})</button>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '12px 22px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            color: '#fff', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(139,92,246,0.3)', fontSize: 14,
          }}>+ Créer un segment</button>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total clients', value: '248', sub: '+12 ce mois', color: '#3b82f6' },
          { label: 'Segments actifs', value: '13', sub: '+4 dynamiques', color: '#8b5cf6' },
          { label: 'Couverture', value: '85%', sub: 'clients segmentés', color: '#10b981' },
          { label: 'Clients à risque', value: '28', sub: 'IA prédit churn', color: '#ef4444' },
        ].map(s => (
          <motion.div key={s.label} whileHover={{ y: -2 }} style={{
            background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0',
          }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.sub}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 4, width: 'fit-content', marginBottom: 22, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, background: tab === t.key ? '#8b5cf6' : 'transparent', color: tab === t.key ? '#fff' : '#475569', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'segments' && (
        <>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>Audiences prédéfinies</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
            {presetAudiences.map(a => (
              <AudienceCard key={a.id} audience={a} total={total} onView={() => {}} onSend={() => {}} onEdit={() => {}} />
            ))}
          </div>

          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>Audiences personnalisées</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
            {customAudiences.map(a => (
              <AudienceCard key={a.id} audience={a} total={total} onView={() => {}} onSend={() => {}} onEdit={() => {}} />
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Queries sauvegardées</h3>
              <button style={{ padding: '7px 14px', background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Nouvelle query</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {savedQueries.map(q => (
                <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#fafbff', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{q.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Utilisée {q.uses}× · dernière exécution {q.lastRun}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ padding: '6px 12px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Exécuter</button>
                    <button style={{ padding: '6px 12px', background: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Dupliquer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Performance par segment</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={campaignPerf}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="segment" stroke="#64748b" style={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" style={{ fontSize: 12 }} unit="%" />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="open" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Ouverture" />
                <Bar dataKey="click" fill="#6366f1" radius={[6, 6, 0, 0]} name="Clic" />
                <Bar dataKey="conv" fill="#10b981" radius={[6, 6, 0, 0]} name="Conversion" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {tab === 'rfm' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Matrice RFM</h3>
            <p style={{ margin: '4px 0 18px', fontSize: 13, color: '#64748b' }}>Recency × Frequency × Monetary · 10 segments générés automatiquement</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, position: 'relative' }}>
              {Array.from({ length: 25 }).map((_, i) => {
                const r = 5 - Math.floor(i / 5);
                const f = (i % 5) + 1;
                const cell = rfmCells.find(c => c.r === r && c.f === f);
                return (
                  <div key={i} style={{ aspectRatio: 1, background: cell ? cell.color : '#f8fafc', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: cell ? '#fff' : '#94a3b8', border: cell ? 'none' : '1px dashed #e2e8f0' }}>
                    {cell && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2 }}>{cell.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, textAlign: 'right' }}>{cell.count}</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 11, color: '#64748b' }}>
              <span>← Récence faible</span>
              <span>Récence haute →</span>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Actions recommandées</h3>
            <p style={{ margin: '4px 0 18px', fontSize: 13, color: '#64748b' }}>Générées depuis la matrice RFM</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Champions', action: 'Programme ambassadeur, early access', color: '#10b981' },
                { label: "Can't Lose Them", action: 'Appel personnel + geste commercial', color: '#dc2626' },
                { label: 'At Risk', action: 'Campagne de réengagement urgente', color: '#ef4444' },
                { label: 'New Customers', action: 'Série de welcome + programme fidélité', color: '#8b5cf6' },
                { label: 'Hibernating', action: 'Ignorer temporairement, coût > gain', color: '#94a3b8' },
              ].map(a => (
                <div key={a.label} style={{ padding: 12, background: '#fafbff', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: a.color }}>{a.label}</span>
                    <button style={{ background: a.color, color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Activer</button>
                  </div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{a.action}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'predictive' && (
        <>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>Segments prédictifs & lookalike</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 22 }}>
            {predictiveAudiences.map(a => (
              <AudienceCard key={a.id} audience={a} total={total} onView={() => {}} onSend={() => {}} onEdit={() => {}} />
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Entraînement du modèle ML</h3>
            <p style={{ margin: '4px 0 16px', fontSize: 13, color: '#64748b' }}>Modèle XGBoost entraîné sur 24 mois d'historique · mis à jour chaque nuit</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Précision', value: '87%' },
                { label: 'Rappel', value: '82%' },
                { label: 'F1-score', value: '0.84' },
                { label: 'Features utilisées', value: '47' },
              ].map(m => (
                <div key={m.label} style={{ padding: 14, background: '#faf5ff', borderRadius: 10, border: '1px solid #e9d5ff' }}>
                  <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#5b21b6', marginTop: 4 }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: 14, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>Impact ce mois</div>
              <div style={{ fontSize: 12, color: '#15803d', marginTop: 3 }}>11 churns évités sur 28 prédits (39%) · 4 nouveaux VIP identifiés · +3 240 € de CA additionnel</div>
            </div>
          </div>
        </>
      )}

      {tab === 'overlap' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Matrice de recouvrement</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {overlapMatrix.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => {
                      const isHeader = ri === 0 || ci === 0;
                      const pct = parseInt(cell);
                      const bg = !isHeader && !isNaN(pct)
                        ? `rgba(139, 92, 246, ${pct / 100})`
                        : isHeader ? '#f8fafc' : '#fff';
                      return (
                        <td key={ci} style={{
                          padding: '10px', textAlign: 'center',
                          background: bg, border: '1px solid #f1f5f9',
                          fontWeight: isHeader ? 700 : 500,
                          color: !isHeader && pct > 40 ? '#fff' : '#1e293b',
                        }}>{cell}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 14, padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
              Recouvrement Fidèles × VIP : 68% — à prévoir pour éviter sur-sollicitation
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Diagramme de Venn</h3>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b' }}>3 segments sélectionnés</p>
            <svg viewBox="0 0 400 280" style={{ width: '100%', maxHeight: 260 }}>
              <circle cx="150" cy="140" r="90" fill="#8b5cf6" fillOpacity="0.4" />
              <circle cx="250" cy="140" r="90" fill="#ec4899" fillOpacity="0.4" />
              <circle cx="200" cy="210" r="90" fill="#10b981" fillOpacity="0.4" />
              <text x="100" y="120" fontSize="14" fontWeight="700" fill="#5b21b6">Fidèles</text>
              <text x="100" y="138" fontSize="12" fill="#5b21b6">67</text>
              <text x="275" y="120" fontSize="14" fontWeight="700" fill="#9d174d">VIP</text>
              <text x="275" y="138" fontSize="12" fill="#9d174d">24</text>
              <text x="180" y="260" fontSize="14" fontWeight="700" fill="#065f46">Famille</text>
              <text x="185" y="276" fontSize="12" fill="#065f46">31</text>
              <text x="195" y="165" fontSize="18" fontWeight="700" fill="#fff">12</text>
            </svg>
            <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 8 }}>12 clients intersection des 3 segments</div>
          </div>
        </div>
      )}

      {tab === 'journey' && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Journey entre segments</h3>
          <p style={{ margin: '4px 0 18px', fontSize: 13, color: '#64748b' }}>Suivez comment les clients évoluent entre segments au fil du temps</p>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={journeyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: 12 }} />
              <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="nouveaux" stroke="#10b981" strokeWidth={2.5} name="Nouveaux" />
              <Line type="monotone" dataKey="fideles" stroke="#8b5cf6" strokeWidth={2.5} name="Fidèles" />
              <Line type="monotone" dataKey="vip" stroke="#eab308" strokeWidth={2.5} name="VIP" />
              <Line type="monotone" dataKey="churned" stroke="#ef4444" strokeWidth={2.5} name="Churnés" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={{ padding: 14, background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 12, color: '#166534', fontWeight: 700 }}>Nouveaux → Fidèles</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#15803d', marginTop: 4 }}>42%</div>
              <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>Conversion sur 6 mois</div>
            </div>
            <div style={{ padding: 14, background: '#faf5ff', borderRadius: 10, border: '1px solid #e9d5ff' }}>
              <div style={{ fontSize: 12, color: '#5b21b6', fontWeight: 700 }}>Fidèles → VIP</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#6d28d9', marginTop: 4 }}>18%</div>
              <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 2 }}>Upgrade sur 12 mois</div>
            </div>
            <div style={{ padding: 14, background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
              <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 700 }}>VIP → Inactif</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#b91c1c', marginTop: 4 }}>7%</div>
              <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>Risque à surveiller</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'geo' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Répartition géographique</h3>
            <p style={{ margin: '4px 0 18px', fontSize: 13, color: '#64748b' }}>Bulles proportionnelles au nombre de clients par code postal</p>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="x" name="Longitude" stroke="#64748b" />
                <YAxis type="number" dataKey="y" name="Latitude" stroke="#64748b" />
                <ZAxis dataKey="z" range={[100, 800]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} formatter={(v, n) => n === 'z' ? `${v} clients` : v} />
                <Scatter data={postalData} fill="#8b5cf6" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Top codes postaux</h3>
            <p style={{ margin: '4px 0 14px', fontSize: 13, color: '#64748b' }}>Distance depuis restaurant (L-1000)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {postalData.sort((a, b) => b.clients - a.clients).map((p, i) => (
                <div key={p.cp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: i < 3 ? '#faf5ff' : '#f8fafc', borderRadius: 8, border: i < 3 ? '1px solid #e9d5ff' : '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{p.cp}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{(Math.abs(p.x - 10) * 0.8).toFixed(1)} km</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#8b5cf6' }}>{p.clients}</div>
                </div>
              ))}
            </div>
            <button style={{ width: '100%', marginTop: 12, padding: '10px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Créer segment par distance</button>
          </div>
        </div>
      )}

      {tab === 'automation' && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Règles d'automatisation</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Créez des segments et campagnes qui s'exécutent automatiquement</p>
            </div>
            <button style={{ padding: '9px 16px', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Nouvelle automatisation</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { trig: 'Client passe dans "Champions"', act: 'Envoie email "Programme ambassadeur"', active: true, runs: 42 },
              { trig: 'Client détecté "À risque de churn"', act: 'Campagne de réengagement -15% auto', active: true, runs: 28 },
              { trig: 'Anniversaire J-7', act: 'SMS + carte cadeau 25€ offerte', active: true, runs: 67 },
              { trig: 'Inscription nouveau client', act: 'Série welcome 4 emails sur 30 jours', active: true, runs: 15 },
              { trig: '3 visites consécutives annulées', act: 'Alerte équipe service + appel', active: false, runs: 0 },
              { trig: 'Dépense >1000€ cumulé', act: 'Auto-upgrade vers tier Gold', active: true, runs: 9 },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: r.active ? '#fafbff' : '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#eef2ff', color: '#4338ca', padding: '2px 8px', borderRadius: 5 }}>SI</span>
                    <span style={{ fontSize: 13, color: '#1e293b' }}>{r.trig}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: 5 }}>ALORS</span>
                    <span style={{ fontSize: 13, color: '#475569' }}>{r.act}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{r.runs}</div>
                  <div>exécutions</div>
                </div>
                <div style={{ width: 42, height: 22, borderRadius: 11, background: r.active ? '#8b5cf6' : '#cbd5e1', position: 'relative', cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', top: 2, left: r.active ? 22 : 2, width: 18, height: 18, borderRadius: 9, background: '#fff', transition: 'left 0.2s' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, padding: 14, background: '#faf5ff', borderRadius: 10, border: '1px solid #e9d5ff' }}>
            <div style={{ fontSize: 13, color: '#5b21b6', fontWeight: 700 }}>Impact des automatisations ce mois</div>
            <div style={{ fontSize: 12, color: '#6d28d9', marginTop: 3 }}>161 actions automatiques exécutées · 4 210 € de CA généré · 38 heures économisées</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Croissance par segment</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={growthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mois" stroke="#64748b" style={{ fontSize: 12 }} />
            <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }} />
            <Legend />
            <Line type="monotone" dataKey="fideles" stroke="#8b5cf6" strokeWidth={2} name="Fidèles" />
            <Line type="monotone" dataKey="inactifs" stroke="#f59e0b" strokeWidth={2} name="Inactifs" />
            <Line type="monotone" dataKey="vip" stroke="#eab308" strokeWidth={2} name="VIP" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }}
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
              style={{ background: '#fff', borderRadius: 16, padding: 28, width: 700, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Créer un segment</h2>
                <button onClick={() => setShowCreate(false)} style={{ background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b' }}>×</button>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Nom du segment</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Clients premium printemps"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez ce segment..." rows={2}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, color: '#1e293b', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Combiner avec :</span>
                {(['AND', 'OR'] as const).map(op => (
                  <button key={op} onClick={() => setCombinator(op)} style={{ padding: '6px 14px', borderRadius: 8, border: combinator === op ? '1px solid #8b5cf6' : '1px solid #e2e8f0', background: combinator === op ? '#8b5cf615' : '#fff', color: combinator === op ? '#8b5cf6' : '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{op === 'AND' ? 'ET' : 'OU'}</button>
                ))}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', marginLeft: 'auto', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked /> Segment dynamique (mise à jour temps réel)
                </label>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 14, border: '1px solid #e2e8f0' }}>
                {conditions.map((c, idx) => (
                  <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    {idx > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#8b5cf6', background: '#8b5cf615', padding: '3px 8px', borderRadius: 4 }}>{combinator === 'AND' ? 'ET' : 'OU'}</span>
                    )}
                    <select value={c.field} onChange={(e) => updateCondition(c.id, { field: e.target.value })}
                      style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}>
                      {fieldOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    <select value={c.operator} onChange={(e) => updateCondition(c.id, { operator: e.target.value as Operator })}
                      style={{ padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}>
                      {operatorOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <input value={c.value} onChange={(e) => updateCondition(c.id, { value: e.target.value })}
                      placeholder="Valeur"
                      style={{ width: 90, padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <button onClick={() => removeCondition(c.id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontWeight: 700 }}>×</button>
                  </div>
                ))}
                <button onClick={addCondition} style={{ padding: '8px 14px', borderRadius: 8, border: '1px dashed #cbd5e1', background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 4 }}>+ Ajouter une condition</button>
              </div>

              <motion.div
                key={livePreview}
                initial={{ scale: 0.96 }} animate={{ scale: 1 }}
                style={{ background: 'linear-gradient(135deg, #8b5cf615, #6366f115)', border: '1px solid #8b5cf630', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}
              >
                <span style={{ fontSize: 13, color: '#4c1d95', fontWeight: 600 }}>Aperçu en direct</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#6d28d9' }}>{livePreview} clients match</span>
              </motion.div>

              <div style={{ padding: 14, background: '#faf5ff', borderRadius: 10, border: '1px solid #e9d5ff', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#5b21b6' }}>Options avancées</div>
                    <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 2 }}>Sauvegarder comme query · Créer A/B test · Export continu</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e9d5ff', borderRadius: 6, fontSize: 11, color: '#5b21b6', fontWeight: 600, cursor: 'pointer' }}>Sauver</button>
                    <button style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e9d5ff', borderRadius: 6, fontSize: 11, color: '#5b21b6', fontWeight: 600, cursor: 'pointer' }}>A/B test</button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowCreate(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                <button onClick={() => setShowCreate(false)} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Créer le segment</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
