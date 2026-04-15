import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  { label: 'Cartes actives', value: '34', icon: '🎁', gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' },
  { label: 'Valeur en circulation', value: '2 150 €', icon: '💶', gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' },
  { label: 'Cartes expirées', value: '8', icon: '⏰', gradient: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)' },
];

const giftCards = [
  { id: 1, code: 'GIFT-4A7B', initialValue: 50, currentBalance: 35.20, expiry: '30 juin 2026', status: 'Active' as const },
  { id: 2, code: 'GIFT-9C2D', initialValue: 100, currentBalance: 100.00, expiry: '15 juil. 2026', status: 'Active' as const },
  { id: 3, code: 'GIFT-1E5F', initialValue: 25, currentBalance: 0, expiry: '01 mars 2026', status: 'Expirée' as const },
  { id: 4, code: 'GIFT-8G3H', initialValue: 50, currentBalance: 12.50, expiry: '22 août 2026', status: 'Active' as const },
  { id: 5, code: 'GIFT-2K6L', initialValue: 10, currentBalance: 10.00, expiry: '05 sept. 2026', status: 'Active' as const },
  { id: 6, code: 'GIFT-7M0N', initialValue: 25, currentBalance: 0, expiry: '18 fév. 2026', status: 'Expirée' as const },
];

const presets = [10, 25, 50, 100];

export default function CartesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(50);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 28 }}
    >
      {/* Header */}
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Cartes cadeaux
          </h1>
          <p style={{ color: '#475569', marginTop: 6, fontSize: 15 }}>
            Créez et gérez vos cartes cadeaux
          </p>
        </div>
        <button
          onClick={() => { setModalOpen(true); setSelectedPreset(50); }}
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
          <span style={{ fontSize: 18 }}>+</span> Créer une carte cadeau
        </button>
      </motion.div>

      {/* Stats */}
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

      {/* Gift cards grid */}
      <motion.div variants={item}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
          Toutes les cartes
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {giftCards.map((card) => {
            const pct = card.initialValue > 0 ? (card.currentBalance / card.initialValue) * 100 : 0;
            const isExpired = card.status === 'Expirée';
            return (
              <motion.div
                key={card.id}
                variants={item}
                whileHover={{ scale: 1.02 }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 20,
                  padding: '22px 24px',
                  opacity: isExpired ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', fontFamily: 'monospace', letterSpacing: 1 }}>
                    {card.code}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 12px',
                      borderRadius: 10,
                      background: isExpired ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                      color: isExpired ? '#f87171' : '#34d399',
                      border: `1px solid ${isExpired ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                    }}
                  >
                    {card.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#475569' }}>Valeur initiale</span>
                  <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{card.initialValue.toFixed(2)} €</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: '#475569' }}>Solde restant</span>
                  <span style={{ fontSize: 15, color: '#a5b4fc', fontWeight: 700 }}>{card.currentBalance.toFixed(2)} €</span>
                </div>
                {/* Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: 6,
                    borderRadius: 3,
                    background: '#ffffff',
                    marginBottom: 14,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      borderRadius: 3,
                      background: isExpired
                        ? 'linear-gradient(90deg, #ef4444, #f87171)'
                        : 'linear-gradient(90deg, #6366f1, #818cf8)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 13, color: '#475569' }}>
                  Expire le {card.expiry}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Create modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(30,30,40,0.98)',
                border: '1px solid #e2e8f0',
                borderRadius: 24,
                padding: 32,
                minWidth: 460,
                }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                Créer une carte cadeau
              </h3>
              <p style={{ color: '#475569', fontSize: 14, marginTop: 8, marginBottom: 24 }}>
                Sélectionnez la valeur de la carte
              </p>

              {/* Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
                {presets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPreset(p)}
                    style={{
                      background: selectedPreset === p ? '#6366f1' : 'rgba(255,255,255,0.05)',
                      color: selectedPreset === p ? '#fff' : '#94a3b8',
                      border: `1px solid ${selectedPreset === p ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 14,
                      padding: '16px 8px',
                      fontSize: 20,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {p} €
                  </button>
                ))}
              </div>

              {/* Card preview */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.15) 100%)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: 20,
                  padding: '24px 28px',
                  marginBottom: 28,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: -30,
                    right: -30,
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'rgba(99,102,241,0.12)',
                  }}
                />
                <div style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Carte Cadeau
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginTop: 6 }}>
                  Café um Rond-Point
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 20 }}>
                  <div style={{ fontSize: 14, fontFamily: 'monospace', color: '#475569', letterSpacing: 1.5 }}>
                    GIFT-XXXX
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#a5b4fc' }}>
                    {selectedPreset ?? 0} €
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: '#ffffff',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '10px 22px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '10px 22px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Créer la carte
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
