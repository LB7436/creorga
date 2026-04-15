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

interface Audience {
  id: number;
  name: string;
  count: number;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const audiences: Audience[] = [
  {
    id: 1,
    name: 'Tous les clients',
    count: 248,
    description: 'L\'ensemble de votre base de clients enregistrés, incluant tous les segments et niveaux de fidélité.',
    icon: '👥',
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  {
    id: 2,
    name: 'Clients fidèles',
    count: 67,
    description: 'Clients avec le statut Gold ou Silver dans le programme de fidélité. Visiteurs réguliers avec un fort engagement.',
    icon: '⭐',
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  {
    id: 3,
    name: 'Clients inactifs',
    count: 34,
    description: 'Clients sans visite depuis plus de 30 jours. Cible idéale pour des campagnes de réactivation.',
    icon: '💤',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  {
    id: 4,
    name: 'Anniversaire ce mois',
    count: 8,
    description: 'Clients dont l\'anniversaire tombe ce mois-ci. Opportunité d\'offrir une attention personnalisée.',
    icon: '🎂',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
  },
  {
    id: 5,
    name: 'Nouveaux clients',
    count: 15,
    description: 'Clients inscrits depuis moins de 30 jours. Nécessitent un onboarding et des offres de bienvenue.',
    icon: '🆕',
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
];

export default function AudiencesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const totalClients = 248;
  const segments = audiences.length;

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
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', margin: 0 }}>Audiences</h1>
          <p style={{ color: '#475569', marginTop: 6, fontSize: 15 }}>
            Segmentez vos clients pour des campagnes ciblées
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
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
          <span style={{ fontSize: 18 }}>+</span> Créer un segment
        </button>
      </motion.div>

      {/* Summary stats */}
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <div style={{
          background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 20, padding: '22px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total clients</div>
          <span style={{ fontSize: 34, fontWeight: 800, color: '#1e293b' }}>{totalClients}</span>
          <div style={{ fontSize: 13, color: '#059669', marginTop: 4 }}>+15 ce mois</div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 20, padding: '22px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Segments actifs</div>
          <span style={{ fontSize: 34, fontWeight: 800, color: '#1e293b' }}>{segments}</span>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>segments configurés</div>
        </div>
      </motion.div>

      {/* Audience cards grid */}
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {audiences.map((a) => (
          <motion.div
            key={a.id}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'rgba(255,255,255,0.7)',
              border: selectedId === a.id ? `2px solid ${a.color}` : '1px solid rgba(0,0,0,0.06)',
              borderRadius: 20,
              padding: '24px 26px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
          >
            {/* Icon + header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: a.bgColor, border: `1px solid ${a.borderColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>
                {a.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{a.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: a.color }}>{a.count}</span>
                  <span style={{ fontSize: 13, color: '#475569' }}>clients</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 16px 0', lineHeight: 1.6 }}>
              {a.description}
            </p>

            {/* Progress bar (proportion of total) */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>Part de la base</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{Math.round((a.count / totalClients) * 100)}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.06)' }}>
                <div style={{
                  width: `${Math.round((a.count / totalClients) * 100)}%`,
                  height: '100%', borderRadius: 3, background: a.color,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>

            {/* Action button */}
            <button
              style={{
                width: '100%',
                background: a.bgColor,
                color: a.color,
                border: `1px solid ${a.borderColor}`,
                borderRadius: 12,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = a.color;
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = a.bgColor;
                (e.currentTarget as HTMLButtonElement).style.color = a.color;
              }}
            >
              Voir les clients
            </button>
          </motion.div>
        ))}
      </motion.div>

      {/* Create segment modal */}
      <AnimatePresence>
        {createOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, }}
            onClick={() => setCreateOpen(false)}
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
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>Créer un segment</h3>
              <p style={{ color: '#475569', fontSize: 14, marginTop: 8, marginBottom: 24 }}>
                Définissez les critères de votre nouveau segment client
              </p>

              {/* Segment name */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>Nom du segment</label>
                <input
                  type="text"
                  placeholder="Ex : Clients VIP"
                  style={{
                    width: '100%', padding: '12px 16px', fontSize: 15,
                    background: '#f8fafc', border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 14, color: '#1e293b', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Condition */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>Condition</label>
                <select style={{
                  width: '100%', padding: '12px 16px', fontSize: 15,
                  background: '#f8fafc', border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: 14, color: '#1e293b', outline: 'none', boxSizing: 'border-box',
                  cursor: 'pointer',
                }}>
                  <option>Dernière visite il y a plus de X jours</option>
                  <option>Nombre de visites supérieur à X</option>
                  <option>Dépenses totales supérieures à X€</option>
                  <option>Niveau de fidélité</option>
                  <option>Anniversaire dans X jours</option>
                </select>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>Description</label>
                <textarea
                  placeholder="Description du segment..."
                  style={{
                    width: '100%', minHeight: 80, padding: '12px 16px', fontSize: 14,
                    background: '#f8fafc', border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: 14, color: '#1e293b', outline: 'none', resize: 'vertical',
                    boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setCreateOpen(false)}
                  style={{
                    background: '#f1f5f9', color: '#475569',
                    border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12,
                    padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => setCreateOpen(false)}
                  style={{
                    background: '#6366f1', color: '#fff',
                    border: 'none', borderRadius: 12,
                    padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Créer le segment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
