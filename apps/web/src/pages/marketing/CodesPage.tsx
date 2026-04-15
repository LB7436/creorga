import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

type CodeType = 'PERCENT' | 'FIXED';

interface PromoCode {
  id: number;
  code: string;
  type: CodeType;
  value: number;
  uses: number;
  limit: number;
  expiration: string;
  active: boolean;
}

const initialCodes: PromoCode[] = [
  { id: 1, code: 'ETE2026', type: 'PERCENT', value: 10, uses: 12, limit: 50, expiration: '30 juin 2026', active: true },
  { id: 2, code: 'BIENVENUE', type: 'FIXED', value: 5, uses: 8, limit: 100, expiration: '31 déc. 2026', active: true },
  { id: 3, code: 'FIDELE15', type: 'PERCENT', value: 15, uses: 6, limit: 30, expiration: '15 mai 2026', active: true },
  { id: 4, code: 'LUNCH5', type: 'FIXED', value: 5, uses: 4, limit: 20, expiration: '30 avr. 2026', active: true },
  { id: 5, code: 'WEEKEND20', type: 'PERCENT', value: 20, uses: 2, limit: 15, expiration: '31 mai 2026', active: true },
  { id: 6, code: 'ANCIEN10', type: 'PERCENT', value: 10, uses: 2, limit: 10, expiration: '15 mars 2026', active: false },
];

const typeConfig: Record<CodeType, { label: string; bg: string; color: string; border: string }> = {
  PERCENT: { label: 'POURCENT', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  FIXED: { label: 'FIXE', bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
};

export default function CodesPage() {
  const [codes, setCodes] = useState(initialCodes);
  const [modalOpen, setModalOpen] = useState(false);
  const [newCode, setNewCode] = useState({ code: '', type: 'PERCENT' as CodeType, value: '', limit: '', expiry: '' });

  const activeCodes = codes.filter((c) => c.active).length;
  const monthUses = 34;
  const totalSavings = 890;

  const toggleActive = (id: number) => {
    setCodes((prev) => prev.map((c) => c.id === id ? { ...c, active: !c.active } : c));
  };

  const handleCreate = () => {
    if (!newCode.code.trim() || !newCode.value) return;
    setCodes((prev) => [
      ...prev,
      {
        id: Date.now(),
        code: newCode.code.toUpperCase(),
        type: newCode.type,
        value: Number(newCode.value),
        uses: 0,
        limit: Number(newCode.limit) || 50,
        expiration: newCode.expiry || '31 déc. 2026',
        active: true,
      },
    ]);
    setNewCode({ code: '', type: 'PERCENT', value: '', limit: '', expiry: '' });
    setModalOpen(false);
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* Header */}
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', margin: 0 }}>Codes promo</h1>
          <p style={{ color: '#475569', marginTop: 6, fontSize: 15 }}>
            Créez et gérez vos codes de réduction
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          style={{
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#5558e6'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#6366f1'; }}
        >
          <span style={{ fontSize: 18 }}>+</span> Créer un code
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div style={{
          background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 20, padding: '22px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Codes actifs</div>
          <span style={{ fontSize: 34, fontWeight: 800, color: '#1e293b' }}>{activeCodes}</span>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 20, padding: '22px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Utilisations ce mois</div>
          <span style={{ fontSize: 34, fontWeight: 800, color: '#1e293b' }}>{monthUses}</span>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 20, padding: '22px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Économies clients</div>
          <span style={{ fontSize: 34, fontWeight: 800, color: '#1e293b' }}>{totalSavings}€</span>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={item} style={{
        background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 20, overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '140px 100px 90px 130px 130px 80px',
          padding: '14px 24px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          {['Code', 'Type', 'Valeur', 'Utilisations', 'Expiration', 'Actif'].map((h) => (
            <span key={h} style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {h}
            </span>
          ))}
        </div>

        {/* Table rows */}
        {codes.map((c, i) => (
          <div
            key={c.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 100px 90px 130px 130px 80px',
              padding: '16px 24px',
              alignItems: 'center',
              background: i % 2 === 1 ? 'rgba(0,0,0,0.015)' : 'transparent',
              transition: 'background 0.15s',
              opacity: c.active ? 1 : 0.5,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(99,102,241,0.04)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = i % 2 === 1 ? 'rgba(0,0,0,0.015)' : 'transparent'; }}
          >
            {/* Code */}
            <span style={{
              fontSize: 14, fontWeight: 700, color: '#1e293b',
              fontFamily: 'monospace', background: 'rgba(0,0,0,0.04)',
              padding: '4px 10px', borderRadius: 8, display: 'inline-block', width: 'fit-content',
            }}>
              {c.code}
            </span>

            {/* Type badge */}
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
              background: typeConfig[c.type].bg, color: typeConfig[c.type].color,
              border: `1px solid ${typeConfig[c.type].border}`,
              display: 'inline-block', width: 'fit-content', letterSpacing: 0.3,
            }}>
              {typeConfig[c.type].label}
            </span>

            {/* Value */}
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
              {c.type === 'PERCENT' ? `-${c.value}%` : `-${c.value}€`}
            </span>

            {/* Uses */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.06)', maxWidth: 70 }}>
                <div style={{
                  width: `${Math.min((c.uses / c.limit) * 100, 100)}%`,
                  height: '100%', borderRadius: 3,
                  background: c.uses / c.limit > 0.8 ? '#dc2626' : '#6366f1',
                }} />
              </div>
              <span style={{ fontSize: 13, color: '#475569' }}>{c.uses}/{c.limit}</span>
            </div>

            {/* Expiration */}
            <span style={{ fontSize: 13, color: '#475569' }}>{c.expiration}</span>

            {/* Toggle */}
            <button
              onClick={() => toggleActive(c.id)}
              style={{
                width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                background: c.active ? '#6366f1' : 'rgba(0,0,0,0.12)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3,
                left: c.active ? 21 : 3, transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        ))}
      </motion.div>

      {/* Create modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 24,
                padding: 32,
                minWidth: 460,
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>Créer un code promo</h3>
              <p style={{ color: '#475569', fontSize: 14, marginTop: 8, marginBottom: 24 }}>
                Configurez votre nouveau code de réduction
              </p>

              {/* Code input */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>Code</label>
                <input
                  type="text"
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                  placeholder="Ex : PROMO2026"
                  style={{
                    width: '100%', padding: '12px 16px', fontSize: 15,
                    background: '#f8fafc', border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 14, color: '#1e293b', outline: 'none',
                    boxSizing: 'border-box', fontFamily: 'monospace', textTransform: 'uppercase',
                  }}
                />
              </div>

              {/* Type selector */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>Type de réduction</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {([{ type: 'PERCENT' as CodeType, label: 'Pourcentage (%)' }, { type: 'FIXED' as CodeType, label: 'Montant fixe (€)' }]).map((t) => (
                    <button
                      key={t.type}
                      onClick={() => setNewCode({ ...newCode, type: t.type })}
                      style={{
                        flex: 1, padding: '12px 16px', fontSize: 14, fontWeight: 600,
                        background: newCode.type === t.type ? 'rgba(99,102,241,0.1)' : '#f8fafc',
                        border: `1px solid ${newCode.type === t.type ? 'rgba(99,102,241,0.3)' : 'rgba(0,0,0,0.08)'}`,
                        borderRadius: 12, color: newCode.type === t.type ? '#6366f1' : '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Value */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>
                  Valeur {newCode.type === 'PERCENT' ? '(%)' : '(€)'}
                </label>
                <input
                  type="number"
                  value={newCode.value}
                  onChange={(e) => setNewCode({ ...newCode, value: e.target.value })}
                  placeholder={newCode.type === 'PERCENT' ? '10' : '5'}
                  style={{
                    width: '100%', padding: '12px 16px', fontSize: 15,
                    background: '#f8fafc', border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 14, color: '#1e293b', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Limit + Expiry row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>Limite d'utilisation</label>
                  <input
                    type="number"
                    value={newCode.limit}
                    onChange={(e) => setNewCode({ ...newCode, limit: e.target.value })}
                    placeholder="50"
                    style={{
                      width: '100%', padding: '12px 16px', fontSize: 15,
                      background: '#f8fafc', border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: 14, color: '#1e293b', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>Date d'expiration</label>
                  <input
                    type="date"
                    value={newCode.expiry}
                    onChange={(e) => setNewCode({ ...newCode, expiry: e.target.value })}
                    style={{
                      width: '100%', padding: '12px 16px', fontSize: 15,
                      background: '#f8fafc', border: '1px solid rgba(0,0,0,0.1)',
                      borderRadius: 14, color: '#1e293b', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: '#f1f5f9', color: '#475569',
                    border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12,
                    padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  style={{
                    background: '#6366f1', color: '#fff',
                    border: 'none', borderRadius: 12,
                    padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Créer le code
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
