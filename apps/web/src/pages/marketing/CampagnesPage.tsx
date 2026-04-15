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

type CampaignStatus = 'Envoyée' | 'Brouillon' | 'Planifiée';
type CampaignType = 'EMAIL' | 'SMS';

interface Campaign {
  id: number;
  name: string;
  type: CampaignType;
  audience: string;
  status: CampaignStatus;
  date: string;
}

const campaigns: Campaign[] = [
  { id: 1, name: 'Promo Saint-Valentin', type: 'EMAIL', audience: '248 clients', status: 'Envoyée', date: '14 fév. 2026' },
  { id: 2, name: 'Happy Hour vendredi', type: 'SMS', audience: '156 abonnés', status: 'Planifiée', date: '18 avr. 2026' },
  { id: 3, name: 'Newsletter avril', type: 'EMAIL', audience: '312 abonnés', status: 'Brouillon', date: '—' },
  { id: 4, name: 'Rappel fidélité', type: 'SMS', audience: '89 clients', status: 'Envoyée', date: '10 avr. 2026' },
];

const statusColors: Record<CampaignStatus, { bg: string; color: string; border: string }> = {
  Envoyée: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.2)' },
  Brouillon: { bg: 'rgba(148,163,184,0.15)', color: '#475569', border: 'rgba(148,163,184,0.2)' },
  Planifiée: { bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: 'rgba(99,102,241,0.2)' },
};

const typeColors: Record<CampaignType, { bg: string; color: string }> = {
  EMAIL: { bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc' },
  SMS: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
};

interface AutoRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const reviews = [
  { id: 1, author: 'Pierre L.', stars: 5, text: 'Excellent café et service impeccable !', date: 'Il y a 2 jours' },
  { id: 2, author: 'Marie S.', stars: 4, text: 'Très bon brunch, ambiance agréable.', date: 'Il y a 5 jours' },
  { id: 3, author: 'Jean D.', stars: 3, text: 'Correct mais un peu cher pour la portion.', date: 'Il y a 1 semaine' },
];

export default function CampagnesPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [autoRules, setAutoRules] = useState<AutoRule[]>([
    { id: 'inactive', label: 'Client inactif 30 jours', description: 'Envoyer automatiquement un coupon de -10% aux clients inactifs depuis 30 jours', enabled: true },
    { id: 'birthday', label: 'Anniversaire', description: 'Envoyer une offre spéciale le jour de l\'anniversaire du client', enabled: true },
    { id: 'welcome', label: 'Nouveau client', description: 'Envoyer un message de bienvenue avec une offre de découverte', enabled: false },
  ]);
  const [platforms, setPlatforms] = useState({ google: true, facebook: true, instagram: false });
  const [caption, setCaption] = useState('');

  const toggleAutoRule = (id: string) => {
    setAutoRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const togglePlatform = (key: keyof typeof platforms) => {
    setPlatforms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < count ? '#fbbf24' : '#374151', fontSize: 16 }}>
        ★
      </span>
    ));
  };

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
            Campagnes marketing
          </h1>
          <p style={{ color: '#475569', marginTop: 6, fontSize: 15 }}>
            Gérez vos campagnes, réseaux sociaux et e-réputation
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
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
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#5558e6'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#6366f1'; }}
        >
          <span style={{ fontSize: 18 }}>+</span> Nouvelle campagne
        </button>
      </motion.div>

      {/* Campaign list */}
      <motion.div variants={item}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
          Campagnes récentes
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
              gridTemplateColumns: '2fr 80px 1fr 100px 120px',
              padding: '14px 22px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {['Campagne', 'Type', 'Audience', 'Statut', 'Date'].map((h) => (
              <span key={h} style={{ fontSize: 13, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {h}
              </span>
            ))}
          </div>
          {campaigns.map((c, i) => (
            <div
              key={c.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 80px 1fr 100px 120px',
                padding: '16px 22px',
                alignItems: 'center',
                background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(99,102,241,0.05)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent'; }}
            >
              <span style={{ fontSize: 15, fontWeight: 500, color: '#1e293b' }}>{c.name}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 8,
                  background: typeColors[c.type].bg,
                  color: typeColors[c.type].color,
                  display: 'inline-block',
                  width: 'fit-content',
                  letterSpacing: 0.5,
                }}
              >
                {c.type}
              </span>
              <span style={{ fontSize: 14, color: '#475569' }}>{c.audience}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: 10,
                  background: statusColors[c.status].bg,
                  color: statusColors[c.status].color,
                  border: `1px solid ${statusColors[c.status].border}`,
                  display: 'inline-block',
                  width: 'fit-content',
                }}
              >
                {c.status}
              </span>
              <span style={{ fontSize: 14, color: '#475569' }}>{c.date}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Automatic campaigns */}
      <motion.div variants={item}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
          Campagnes automatiques
        </h2>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 20,
            padding: 4,
          }}
        >
          {autoRules.map((rule, i) => (
            <div
              key={rule.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 22px',
                borderBottom: i < autoRules.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{rule.label}</div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{rule.description}</div>
              </div>
              <button
                onClick={() => toggleAutoRule(rule.id)}
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

      {/* Social media */}
      <motion.div variants={item}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
          Réseaux sociaux
        </h2>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 20,
            padding: 28,
          }}
        >
          {/* Upload zone */}
          <div
            style={{
              border: '2px dashed rgba(255,255,255,0.1)',
              borderRadius: 16,
              padding: '36px 24px',
              textAlign: 'center',
              marginBottom: 22,
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.4)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
            <div style={{ fontSize: 15, color: '#475569', fontWeight: 500 }}>
              Glissez une image ici ou cliquez pour sélectionner
            </div>
            <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
              PNG, JPG jusqu'à 10 MB
            </div>
          </div>

          {/* Caption */}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Écrivez votre légende..."
            style={{
              width: '100%',
              minHeight: 80,
              padding: '14px 18px',
              fontSize: 14,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              color: '#1e293b',
              outline: 'none',
              resize: 'vertical',
              marginBottom: 18,
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />

          {/* Platform checkboxes */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
            {([
              { key: 'google' as const, label: 'Google', color: '#4285f4' },
              { key: 'facebook' as const, label: 'Facebook', color: '#1877f2' },
              { key: 'instagram' as const, label: 'Instagram', color: '#e4405f' },
            ]).map((p) => (
              <label
                key={p.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  padding: '10px 18px',
                  borderRadius: 12,
                  background: platforms[p.key] ? `${p.color}15` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${platforms[p.key] ? `${p.color}40` : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.15s',
                }}
              >
                <div
                  onClick={() => togglePlatform(p.key)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    border: `2px solid ${platforms[p.key] ? p.color : 'rgba(255,255,255,0.2)'}`,
                    background: platforms[p.key] ? p.color : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    color: '#fff',
                    fontWeight: 700,
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                >
                  {platforms[p.key] ? '✓' : ''}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: platforms[p.key] ? '#e2e8f0' : '#94a3b8' }}>
                  {p.label}
                </span>
              </label>
            ))}
          </div>

          <button
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '12px 28px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Publier partout
          </button>
        </div>
      </motion.div>

      {/* E-Reputation */}
      <motion.div variants={item}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
          E-Réputation
        </h2>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 20,
            padding: 28,
          }}
        >
          {/* Google Reviews summary */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              marginBottom: 24,
              padding: '18px 22px',
              background: '#ffffff',
              borderRadius: 16,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', letterSpacing: 0.5 }}>
              Google Reviews
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: '#fbbf24' }}>4.6</span>
              <div style={{ display: 'flex', gap: 2 }}>
                {renderStars(5)}
              </div>
            </div>
            <span style={{ fontSize: 14, color: '#475569' }}>127 avis</span>
          </div>

          {/* Recent reviews */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '18px 22px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{r.author}</span>
                    <div style={{ display: 'flex', gap: 1 }}>{renderStars(r.stars)}</div>
                  </div>
                  <span style={{ fontSize: 13, color: '#475569' }}>{r.date}</span>
                </div>
                <p style={{ fontSize: 14, color: '#475569', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                  {r.text}
                </p>
                <button
                  style={{
                    background: 'rgba(99,102,241,0.1)',
                    color: '#a5b4fc',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 10,
                    padding: '6px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Répondre
                </button>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Create campaign modal */}
      <AnimatePresence>
        {createModalOpen && (
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
            onClick={() => setCreateModalOpen(false)}
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
                minWidth: 480,
                }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                Nouvelle campagne
              </h3>
              <p style={{ color: '#475569', fontSize: 14, marginTop: 8, marginBottom: 24 }}>
                Configurez votre nouvelle campagne marketing
              </p>

              {/* Name */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>
                  Nom de la campagne
                </label>
                <input
                  type="text"
                  placeholder="Ex : Promo été 2026"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 15,
                    background: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Type */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>
                  Type
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {(['EMAIL', 'SMS'] as CampaignType[]).map((t) => (
                    <button
                      key={t}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        fontSize: 14,
                        fontWeight: 600,
                        background: t === 'EMAIL' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${t === 'EMAIL' ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 12,
                        color: t === 'EMAIL' ? '#a5b4fc' : '#94a3b8',
                        cursor: 'pointer',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>
                  Objet / Message
                </label>
                <textarea
                  placeholder="Contenu de votre campagne..."
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: '12px 16px',
                    fontSize: 14,
                    background: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    color: '#1e293b',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setCreateModalOpen(false)}
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
                  onClick={() => setCreateModalOpen(false)}
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
                  Créer la campagne
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
