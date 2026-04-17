import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

type Operator = 'equals' | 'greater' | 'less' | 'contains' | 'between';

type Condition = {
  id: string;
  field: string;
  operator: Operator;
  value: string;
};

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
};

const presetAudiences: Audience[] = [
  { id: 'all', name: 'Tous les clients', description: 'Base complète de votre clientèle',
    count: 248, color: '#64748b', icon: '👥', tags: ['default', 'global'], lastOpenRate: 34 },
  { id: 'fideles', name: 'Clients fidèles', description: 'Membres Gold + Silver actifs',
    count: 67, color: '#8b5cf6', icon: '💎', tags: ['Gold', 'Silver', 'loyalty'], lastOpenRate: 58 },
  { id: 'inactifs', name: 'Clients inactifs', description: 'Aucune visite depuis plus de 30 jours',
    count: 34, color: '#f59e0b', icon: '💤', tags: ['churn', 'reactivation'], lastOpenRate: 22 },
  { id: 'nouveaux', name: 'Nouveaux clients', description: 'Inscription il y a moins de 30 jours',
    count: 15, color: '#10b981', icon: '✨', tags: ['onboarding', 'welcome'], lastOpenRate: 67 },
  { id: 'anniv', name: 'Anniversaire ce mois', description: 'Client fêtant son anniversaire',
    count: 8, color: '#ec4899', icon: '🎂', tags: ['birthday', 'personnalisé'], lastOpenRate: 72 },
  { id: 'vip', name: 'VIP', description: 'Top 10% des dépenses (> 500 EUR/mois)',
    count: 24, color: '#eab308', icon: '👑', tags: ['VIP', 'high-value'], lastOpenRate: 81 },
];

const customAudiences: Audience[] = [
  { id: 'c1', name: 'Amateurs de vin', description: 'Ont commandé ≥ 3 fois catégorie vin',
    count: 42, color: '#be185d', icon: '🍷', tags: ['custom', 'wine'], lastOpenRate: 54, custom: true },
  { id: 'c2', name: 'Végétariens détectés', description: 'Commandes menu végé uniquement',
    count: 18, color: '#059669', icon: '🥗', tags: ['custom', 'diet'], lastOpenRate: 61, custom: true },
  { id: 'c3', name: 'Famille avec enfants', description: 'Réservations ≥ 4 personnes + menu enfant',
    count: 31, color: '#0ea5e9', icon: '👨‍👩‍👧', tags: ['custom', 'family'], lastOpenRate: 48, custom: true },
];

const growthData = [
  { mois: 'Oct', fideles: 52, inactifs: 28, vip: 18 },
  { mois: 'Nov', fideles: 56, inactifs: 30, vip: 19 },
  { mois: 'Déc', fideles: 61, inactifs: 32, vip: 21 },
  { mois: 'Jan', fideles: 63, inactifs: 35, vip: 22 },
  { mois: 'Fév', fideles: 65, inactifs: 33, vip: 23 },
  { mois: 'Mars', fideles: 67, inactifs: 34, vip: 24 },
];

const fieldOptions = [
  { value: 'total_depense', label: 'Total dépensé (EUR)' },
  { value: 'visites', label: 'Nombre de visites' },
  { value: 'derniere_visite', label: 'Dernière visite (jours)' },
  { value: 'tier', label: 'Niveau fidélité' },
  { value: 'ville', label: 'Ville' },
  { value: 'age', label: 'Âge' },
];

const operatorOptions: { value: Operator; label: string }[] = [
  { value: 'equals', label: 'est égal à' },
  { value: 'greater', label: 'supérieur à' },
  { value: 'less', label: 'inférieur à' },
  { value: 'contains', label: 'contient' },
  { value: 'between', label: 'entre' },
];

const AudienceCard = ({ audience, total, onView, onSend, onEdit }: any) => {
  const pct = (audience.count / total) * 100;
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
      layout
      style={{
        background: '#fff', borderRadius: 16, padding: 22,
        border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: `${audience.color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>{audience.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>
            {audience.name}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
            {audience.description}
          </div>
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
          <span key={t} style={{
            padding: '3px 10px', borderRadius: 12, background: '#f1f5f9',
            color: '#475569', fontSize: 11, fontWeight: 500,
          }}>{t}</span>
        ))}
      </div>

      {audience.lastOpenRate !== undefined && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 12,
        }}>
          <span>📬</span>
          <span style={{ color: '#64748b' }}>Dernière campagne :</span>
          <strong style={{ color: audience.lastOpenRate > 50 ? '#10b981' : '#f59e0b' }}>
            {audience.lastOpenRate}% d'ouverture
          </strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
        <button onClick={onView} style={{
          flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0',
          background: '#fff', color: '#1e293b', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>Voir</button>
        <button onClick={onSend} style={{
          flex: 1, padding: '8px', borderRadius: 8, border: 'none',
          background: audience.color, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>Campagne</button>
        <button onClick={onEdit} style={{
          padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0',
          background: '#fff', color: '#64748b', fontSize: 12, cursor: 'pointer',
        }}>✎</button>
      </div>

      <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
        <button style={{ flex: 1, padding: '6px', border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer' }}>
          📥 CSV
        </button>
        <button style={{ flex: 1, padding: '6px', border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer' }}>
          🔗 Mailchimp
        </button>
        <button style={{ flex: 1, padding: '6px', border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer' }}>
          ⏰ Récurrent
        </button>
      </div>
    </motion.div>
  );
};

export default function AudiencesPage() {
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
    ['', 'Fidèles', 'Inactifs', 'VIP', 'Nouveaux'],
    ['Fidèles', '—', '2%', '68%', '5%'],
    ['Inactifs', '2%', '—', '3%', '0%'],
    ['VIP', '68%', '3%', '—', '8%'],
    ['Nouveaux', '5%', '0%', '8%', '—'],
  ];

  return (
    <div style={{ padding: 32, background: '#f8fafc', minHeight: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Audiences marketing
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>
            Segmentez votre clientèle pour des campagnes ciblées
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          padding: '12px 22px', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          color: '#fff', fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(139,92,246,0.3)', fontSize: 14,
        }}>+ Créer un segment</button>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total clients', value: 248, icon: '👥', color: '#3b82f6' },
          { label: 'Segments actifs', value: 8, icon: '🎯', color: '#8b5cf6' },
          { label: 'Clients segmentés', value: '85%', icon: '✓', color: '#10b981' },
        ].map(s => (
          <motion.div key={s.label} whileHover={{ y: -2 }} style={{
            background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: `${s.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>{s.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>
        Audiences prédéfinies
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {presetAudiences.map(a => (
          <AudienceCard key={a.id} audience={a} total={total}
            onView={() => {}} onSend={() => {}} onEdit={() => {}} />
        ))}
      </div>

      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>
        Audiences personnalisées
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {customAudiences.map(a => (
          <AudienceCard key={a.id} audience={a} total={total}
            onView={() => {}} onSend={() => {}} onEdit={() => {}} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
            Croissance par segment
          </h3>
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

        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>
            Matrice de recouvrement
          </h3>
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
            ⚠ Détection churn : <strong>34 clients inactifs</strong> à risque — campagne de réactivation recommandée.
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
              style={{
                background: '#fff', borderRadius: 16, padding: 28,
                width: 640, maxHeight: '90vh', overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
                  Créer un segment
                </h2>
                <button onClick={() => setShowCreate(false)} style={{
                  background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b',
                }}>×</button>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                  Nom du segment
                </label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Clients premium printemps"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1px solid #e2e8f0', fontSize: 14, color: '#1e293b',
                  }} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                  Description
                </label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez ce segment..."
                  rows={2}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1px solid #e2e8f0', fontSize: 14, color: '#1e293b', resize: 'vertical',
                  }} />
              </div>

              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Combiner avec :</span>
                {(['AND', 'OR'] as const).map(op => (
                  <button key={op} onClick={() => setCombinator(op)} style={{
                    padding: '6px 14px', borderRadius: 8,
                    border: combinator === op ? '1px solid #8b5cf6' : '1px solid #e2e8f0',
                    background: combinator === op ? '#8b5cf615' : '#fff',
                    color: combinator === op ? '#8b5cf6' : '#64748b',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>{op === 'AND' ? 'ET' : 'OU'}</button>
                ))}
              </div>

              <div style={{
                background: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 14,
                border: '1px solid #e2e8f0',
              }}>
                {conditions.map((c, idx) => (
                  <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    {idx > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: '#8b5cf6',
                        background: '#8b5cf615', padding: '3px 8px', borderRadius: 4,
                      }}>{combinator === 'AND' ? 'ET' : 'OU'}</span>
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
                    <button onClick={() => removeCondition(c.id)} style={{
                      padding: '4px 10px', borderRadius: 6, border: 'none',
                      background: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontWeight: 700,
                    }}>×</button>
                  </div>
                ))}
                <button onClick={addCondition} style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px dashed #cbd5e1',
                  background: '#fff', color: '#64748b', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', width: '100%', marginTop: 4,
                }}>+ Ajouter une condition</button>
              </div>

              <motion.div
                key={livePreview}
                initial={{ scale: 0.96 }} animate={{ scale: 1 }}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf615, #6366f115)',
                  border: '1px solid #8b5cf630', borderRadius: 12, padding: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
                }}
              >
                <span style={{ fontSize: 13, color: '#4c1d95', fontWeight: 600 }}>
                  Aperçu en direct
                </span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#6d28d9' }}>
                  {livePreview} clients match
                </span>
              </motion.div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowCreate(false)} style={{
                  padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0',
                  background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer',
                }}>Annuler</button>
                <button onClick={() => setShowCreate(false)} style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                  color: '#fff', fontWeight: 600, cursor: 'pointer',
                }}>Créer le segment</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
