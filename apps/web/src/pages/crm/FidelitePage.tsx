import { useState } from 'react';
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const statsData = [
  { label: 'Total clients', value: '248', icon: '👥', gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' },
  { label: 'Points distribués', value: '12 450', icon: '⭐', gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' },
  { label: 'Taux de rétention', value: '73%', icon: '📈', gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' },
];

const tiers = [
  {
    name: 'Bronze',
    range: '0 – 100 pts',
    discount: '5% remise',
    perks: [],
    gradient: 'linear-gradient(135deg, #92400e 0%, #b45309 100%)',
    color: '#d97706',
  },
  {
    name: 'Silver',
    range: '100 – 500 pts',
    discount: '10% remise',
    perks: ['Boisson offerte'],
    gradient: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
    color: '#9ca3af',
  },
  {
    name: 'Gold',
    range: '500+ pts',
    discount: '15% remise',
    perks: ['Dessert offert'],
    gradient: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
    color: '#fbbf24',
  },
];

interface PointRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export default function FidelitePage() {
  const [rules, setRules] = useState<PointRule[]>([
    { id: 'euro', label: '1 point par euro dépensé', description: 'Chaque euro dépensé rapporte 1 point de fidélité', enabled: true },
    { id: 'birthday', label: 'Bonus anniversaire', description: 'Points doublés le jour de l\'anniversaire du client', enabled: true },
    { id: 'referral', label: 'Bonus parrainage', description: '50 points offerts pour chaque nouveau client parrainé', enabled: false },
  ]);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 28 }}
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0 }}>
          Programme de fidélité
        </h1>
        <p style={{ color: '#475569', marginTop: 6, fontSize: 15 }}>
          Gérez vos cartes de fidélité et récompenses clients
        </p>
      </motion.div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {statsData.map((s) => (
          <motion.div
            key={s.label}
            variants={item}
            style={{
              background: s.gradient,
              borderRadius: 20,
              padding: '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 26 }}>{s.icon}</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{s.value}</span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{s.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Loyalty card preview */}
      <motion.div variants={item}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
          Aperçu de la carte
        </h2>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.18) 100%)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 24,
            padding: '32px 36px',
            maxWidth: 420,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -40,
              right: -40,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(99,102,241,0.15)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 90,
              height: 90,
              borderRadius: '50%',
              background: 'rgba(139,92,246,0.1)',
            }}
          />
          <div style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Carte Fidélité
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginTop: 8 }}>
            Café um Rond-Point
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 12, color: '#475569' }}>Membre</div>
              <div style={{ fontSize: 16, color: '#1e293b', fontWeight: 500, marginTop: 2 }}>Jean Dupont</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#475569' }}>Points</div>
              <div style={{ fontSize: 22, color: '#a5b4fc', fontWeight: 700, marginTop: 2 }}>340</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 16,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(156,163,175,0.2)',
              borderRadius: 12,
              padding: '4px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: '#9ca3af',
            }}
          >
            ✦ Silver
          </div>
        </div>
      </motion.div>

      {/* Tiers */}
      <motion.div variants={item}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
          Paliers de fidélité
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {tiers.map((t) => (
            <motion.div
              key={t.name}
              variants={item}
              whileHover={{ scale: 1.02 }}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  background: t.gradient,
                  padding: '18px 22px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{t.name}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{t.range}</span>
              </div>
              <div style={{ padding: '18px 22px' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: t.color }}>{t.discount}</div>
                {t.perks.map((p) => (
                  <div key={p} style={{ fontSize: 14, color: '#475569', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#10b981' }}>+</span> {p}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Points rules */}
      <motion.div variants={item}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
          Règles de points
        </h2>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 20,
            padding: 4,
          }}
        >
          {rules.map((rule, i) => (
            <div
              key={rule.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 22px',
                borderBottom: i < rules.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{rule.label}</div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{rule.description}</div>
              </div>
              <button
                onClick={() => toggleRule(rule.id)}
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 14,
                  border: 'none',
                  cursor: 'pointer',
                  background: rule.enabled ? '#6366f1' : 'rgba(255,255,255,0.1)',
                  position: 'relative',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: 3,
                    left: rule.enabled ? 23 : 3,
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
