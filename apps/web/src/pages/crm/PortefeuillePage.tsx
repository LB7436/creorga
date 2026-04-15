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
  { label: 'Total en circulation', value: '3 240 €', icon: '💰', gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' },
  { label: 'Rechargements ce mois', value: '890 €', icon: '📥', gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' },
  { label: 'Dépenses ce mois', value: '650 €', icon: '📤', gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' },
];

const customers = [
  { id: 1, name: 'Marie Schmit', initials: 'MS', color: '#6366f1', balance: 85.50, lastActivity: '12 avr. 2026' },
  { id: 2, name: 'Luc Müller', initials: 'LM', color: '#10b981', balance: 120.00, lastActivity: '11 avr. 2026' },
  { id: 3, name: 'Sophie Weber', initials: 'SW', color: '#f59e0b', balance: 45.20, lastActivity: '10 avr. 2026' },
  { id: 4, name: 'Pierre Hoffmann', initials: 'PH', color: '#ef4444', balance: 200.00, lastActivity: '9 avr. 2026' },
  { id: 5, name: 'Claire Reuter', initials: 'CR', color: '#8b5cf6', balance: 30.00, lastActivity: '8 avr. 2026' },
  { id: 6, name: 'Jean-Marc Biver', initials: 'JB', color: '#ec4899', balance: 67.80, lastActivity: '7 avr. 2026' },
];

interface ModalState {
  open: boolean;
  type: 'recharger' | 'deduire';
  customer: typeof customers[0] | null;
}

export default function PortefeuillePage() {
  const [modal, setModal] = useState<ModalState>({ open: false, type: 'recharger', customer: null });
  const [amount, setAmount] = useState('');

  const openModal = (type: 'recharger' | 'deduire', customer: typeof customers[0]) => {
    setModal({ open: true, type, customer });
    setAmount('');
  };

  const closeModal = () => {
    setModal({ open: false, type: 'recharger', customer: null });
    setAmount('');
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
          Portefeuille numérique
        </h1>
        <p style={{ color: '#475569', marginTop: 6, fontSize: 15 }}>
          Gérez les portefeuilles clients et les transactions
        </p>
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

      {/* Customer table */}
      <motion.div variants={item}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
          Comptes clients
        </h2>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr 180px',
              padding: '14px 22px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Client</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Solde</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>Dernière activité</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Actions</span>
          </div>
          {/* Rows */}
          {customers.map((c, i) => (
            <div
              key={c.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 180px',
                padding: '16px 22px',
                alignItems: 'center',
                background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(99,102,241,0.05)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: c.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {c.initials}
                </div>
                <span style={{ fontSize: 15, fontWeight: 500, color: '#1e293b' }}>{c.name}</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#a5b4fc' }}>
                {c.balance.toFixed(2)} €
              </span>
              <span style={{ fontSize: 14, color: '#475569' }}>{c.lastActivity}</span>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => openModal('recharger', c)}
                  style={{
                    background: 'rgba(16,185,129,0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 10,
                    padding: '6px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.25)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.15)'; }}
                >
                  Recharger
                </button>
                <button
                  onClick={() => openModal('deduire', c)}
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 10,
                    padding: '6px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.25)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; }}
                >
                  Déduire
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modal.open && (
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
            onClick={closeModal}
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
                minWidth: 400,
                }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                {modal.type === 'recharger' ? 'Recharger le portefeuille' : 'Déduire du portefeuille'}
              </h3>
              <p style={{ color: '#475569', fontSize: 14, marginTop: 8 }}>
                Client : <span style={{ color: '#1e293b', fontWeight: 500 }}>{modal.customer?.name}</span>
              </p>
              <p style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>
                Solde actuel : <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{modal.customer?.balance.toFixed(2)} €</span>
              </p>

              <div style={{ marginTop: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>
                  Montant (€)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 18,
                    fontWeight: 600,
                    background: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 28, justifyContent: 'flex-end' }}>
                <button
                  onClick={closeModal}
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
                  onClick={closeModal}
                  style={{
                    background: modal.type === 'recharger' ? '#10b981' : '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '10px 22px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {modal.type === 'recharger' ? 'Confirmer le rechargement' : 'Confirmer la déduction'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
