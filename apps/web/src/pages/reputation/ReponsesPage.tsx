import { useState } from 'react';
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

type Platform = 'Google' | 'TripAdvisor' | 'Facebook' | 'Interne';

interface PendingReview {
  id: number;
  author: string;
  stars: number;
  platform: Platform;
  date: string;
  comment: string;
}

const pendingReviews: PendingReview[] = [
  { id: 1, author: 'Jean D.', stars: 2, platform: 'Google', date: '8 avr. 2026', comment: 'Déçu par la qualité ce soir. Le plat principal était trop salé et le dessert manquait de fraîcheur. Dommage car le cadre est vraiment sympa.' },
  { id: 2, author: 'Lucas R.', stars: 3, platform: 'Interne', date: '4 avr. 2026', comment: 'Correct dans l\'ensemble. Le rapport qualité-prix pourrait être amélioré, surtout sur les entrées qui sont assez petites.' },
  { id: 3, author: 'Julie F.', stars: 1, platform: 'Facebook', date: '28 mars 2026', comment: 'Très déçue. Réservation non honorée, nous avons attendu 40 minutes debout. Le manager n\'a même pas présenté d\'excuses.' },
  { id: 4, author: 'Marc T.', stars: 3, platform: 'TripAdvisor', date: '25 mars 2026', comment: 'Le cadre est magnifique mais le service laisse à désirer. Nous avons dû appeler le serveur plusieurs fois. La nourriture était bonne cependant.' },
  { id: 5, author: 'Claire V.', stars: 2, platform: 'Google', date: '22 mars 2026', comment: 'Commande en ligne mal gérée, il manquait deux plats dans notre livraison et aucune réponse du support après trois tentatives de contact.' },
];

const templates = [
  'Merci pour votre visite et votre retour. Nous sommes ravis que votre expérience ait été positive et espérons vous revoir très bientôt.',
  'Nous sommes désolés d\'apprendre que votre expérience n\'a pas été à la hauteur de vos attentes. Nous prenons votre retour très au sérieux.',
  'Nous prenons note de vos remarques et allons les transmettre à notre équipe. Votre satisfaction est notre priorité.',
];

const platformColors: Record<Platform, { bg: string; color: string; border: string }> = {
  Google: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  TripAdvisor: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  Facebook: { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' },
  Interne: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
};

const renderStars = (count: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <span key={i} style={{ color: i < count ? '#f59e0b' : '#d1d5db', fontSize: 16 }}>★</span>
  ));

export default function ReponsesPage() {
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [sentIds, setSentIds] = useState<number[]>([]);

  const handleReply = (id: number) => {
    if (replies[id]?.trim()) {
      setSentIds((prev) => [...prev, id]);
    }
  };

  const applyTemplate = (id: number, template: string) => {
    setReplies((prev) => ({ ...prev, [id]: template }));
  };

  const pendingCount = pendingReviews.length - sentIds.length;
  const repliedCount = 89 + sentIds.length;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', margin: 0 }}>Réponses aux avis</h1>
        <p style={{ color: '#475569', marginTop: 6, fontSize: 15 }}>
          Gérez vos réponses et maintenez un dialogue avec vos clients
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <div style={{
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 20,
          padding: '22px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>En attente de réponse</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#dc2626' }}>{pendingCount}</span>
            <span style={{ fontSize: 14, color: '#dc2626', fontWeight: 500 }}>avis non répondus</span>
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 20,
          padding: '22px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Répondu</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#059669' }}>{repliedCount}</span>
            <span style={{ fontSize: 14, color: '#059669', fontWeight: 500 }}>avis avec réponse</span>
          </div>
        </div>
      </motion.div>

      {/* Template suggestions */}
      <motion.div variants={item}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 10 }}>Modèles de réponse rapide</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {templates.map((t, idx) => (
            <div key={idx} style={{
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 14,
              padding: '10px 16px',
              fontSize: 12,
              color: '#475569',
              maxWidth: 280,
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {t.slice(0, 60)}...
            </div>
          ))}
        </div>
      </motion.div>

      {/* Pending reviews */}
      <motion.div variants={item} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>Avis en attente de réponse</div>

        {pendingReviews.filter((r) => !sentIds.includes(r.id)).map((r) => (
          <motion.div
            key={r.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 20,
              padding: '22px 26px',
            }}
          >
            {/* Review header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #dc2626, #f87171)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 15,
                }}>
                  {r.author.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{r.author}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <div style={{ display: 'flex', gap: 1 }}>{renderStars(r.stars)}</div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 8,
                      background: platformColors[r.platform].bg,
                      color: platformColors[r.platform].color,
                      border: `1px solid ${platformColors[r.platform].border}`,
                    }}>
                      {r.platform}
                    </span>
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 13, color: '#475569' }}>{r.date}</span>
            </div>

            {/* Comment */}
            <p style={{ fontSize: 14, color: '#475569', margin: '0 0 18px 0', lineHeight: 1.6 }}>
              {r.comment}
            </p>

            {/* Template quick-apply */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {templates.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => applyTemplate(r.id, t)}
                  style={{
                    background: 'rgba(3,105,161,0.08)',
                    color: '#0369A1',
                    border: '1px solid rgba(3,105,161,0.15)',
                    borderRadius: 10,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(3,105,161,0.15)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(3,105,161,0.08)'; }}
                >
                  {idx === 0 ? 'Merci pour votre visite...' : idx === 1 ? 'Nous sommes désolés...' : 'Nous prenons note...'}
                </button>
              ))}
            </div>

            {/* Reply textarea */}
            <textarea
              value={replies[r.id] || ''}
              onChange={(e) => setReplies((prev) => ({ ...prev, [r.id]: e.target.value }))}
              placeholder="Rédigez votre réponse..."
              style={{
                width: '100%',
                minHeight: 80,
                padding: '14px 18px',
                fontSize: 14,
                background: 'rgba(0,0,0,0.02)',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 14,
                color: '#1e293b',
                outline: 'none',
                resize: 'vertical',
                marginBottom: 12,
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                lineHeight: 1.6,
              }}
              onFocus={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#0369A1'; }}
              onBlur={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'rgba(0,0,0,0.08)'; }}
            />

            {/* Send button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleReply(r.id)}
                disabled={!replies[r.id]?.trim()}
                style={{
                  background: replies[r.id]?.trim() ? '#0369A1' : '#94a3b8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: replies[r.id]?.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s',
                  opacity: replies[r.id]?.trim() ? 1 : 0.6,
                }}
                onMouseEnter={(e) => { if (replies[r.id]?.trim()) (e.currentTarget as HTMLButtonElement).style.background = '#025d8f'; }}
                onMouseLeave={(e) => { if (replies[r.id]?.trim()) (e.currentTarget as HTMLButtonElement).style.background = '#0369A1'; }}
              >
                Envoyer la réponse
              </button>
            </div>
          </motion.div>
        ))}

        {pendingCount === 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 20,
            padding: '40px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>&#10003;</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#059669' }}>Tous les avis ont reçu une réponse !</div>
            <div style={{ fontSize: 14, color: '#475569', marginTop: 6 }}>Bravo, continuez à maintenir un bon dialogue avec vos clients.</div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
