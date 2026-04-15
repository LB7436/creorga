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
type SortMode = 'recent' | 'best' | 'worst';

interface Review {
  id: number;
  author: string;
  stars: number;
  platform: Platform;
  date: string;
  comment: string;
  replied: boolean;
}

const mockReviews: Review[] = [
  { id: 1, author: 'Pierre L.', stars: 5, platform: 'Google', date: '12 avr. 2026', comment: 'Excellent restaurant, le service est impeccable et les plats sont délicieux. Je recommande vivement le menu dégustation qui offre un excellent rapport qualité-prix.', replied: true },
  { id: 2, author: 'Marie S.', stars: 4, platform: 'TripAdvisor', date: '10 avr. 2026', comment: 'Très bon brunch du dimanche, ambiance agréable et personnel attentionné. Seul petit bémol, l\'attente était un peu longue.', replied: true },
  { id: 3, author: 'Jean D.', stars: 2, platform: 'Google', date: '8 avr. 2026', comment: 'Déçu par la qualité ce soir. Le plat principal était trop salé et le dessert manquait de fraîcheur. Dommage car le cadre est vraiment sympa.', replied: false },
  { id: 4, author: 'Sophie M.', stars: 5, platform: 'Facebook', date: '6 avr. 2026', comment: 'Soirée parfaite pour notre anniversaire de mariage ! Le chef a même préparé un dessert personnalisé. Merci pour cette attention.', replied: true },
  { id: 5, author: 'Lucas R.', stars: 3, platform: 'Interne', date: '4 avr. 2026', comment: 'Correct dans l\'ensemble. Le rapport qualité-prix pourrait être amélioré, surtout sur les entrées qui sont assez petites.', replied: false },
  { id: 6, author: 'Emma B.', stars: 5, platform: 'Google', date: '2 avr. 2026', comment: 'Coup de cœur pour ce restaurant ! La carte des vins est exceptionnelle et le sommelier de très bon conseil.', replied: true },
  { id: 7, author: 'Thomas K.', stars: 4, platform: 'TripAdvisor', date: '30 mars 2026', comment: 'Deuxième visite et toujours aussi satisfait. Le tartare est un incontournable. Réservez à l\'avance le weekend !', replied: true },
  { id: 8, author: 'Julie F.', stars: 1, platform: 'Facebook', date: '28 mars 2026', comment: 'Très déçue. Réservation non honorée, nous avons attendu 40 minutes debout. Le manager n\'a même pas présenté d\'excuses.', replied: false },
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

export default function AvisPage() {
  const [platformFilter, setPlatformFilter] = useState<'Tous' | Platform>('Tous');
  const [sortMode, setSortMode] = useState<SortMode>('recent');

  const filtered = mockReviews
    .filter((r) => platformFilter === 'Tous' || r.platform === platformFilter)
    .sort((a, b) => {
      if (sortMode === 'best') return b.stars - a.stars;
      if (sortMode === 'worst') return a.stars - b.stars;
      return b.id - a.id;
    });

  const avgRating = 4.6;
  const totalReviews = 127;
  const thisMonth = 12;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', margin: 0 }}>Avis clients</h1>
        <p style={{ color: '#475569', marginTop: 6, fontSize: 15 }}>
          Consultez et gérez tous les avis de vos clients
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {/* Note moyenne */}
        <div style={{
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 20,
          padding: '22px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Note moyenne</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#1e293b' }}>{avgRating}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', gap: 2 }}>{renderStars(Math.round(avgRating))}</div>
              <span style={{ fontSize: 12, color: '#475569' }}>sur 5</span>
            </div>
          </div>
        </div>

        {/* Total avis */}
        <div style={{
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 20,
          padding: '22px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total avis</div>
          <span style={{ fontSize: 34, fontWeight: 800, color: '#1e293b' }}>{totalReviews}</span>
          <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>toutes plateformes</div>
        </div>

        {/* Ce mois */}
        <div style={{
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 20,
          padding: '22px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ce mois</div>
          <span style={{ fontSize: 34, fontWeight: 800, color: '#1e293b' }}>{thisMonth}</span>
          <div style={{ fontSize: 13, color: '#059669', marginTop: 4 }}>+3 vs mois dernier</div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        {/* Platform filter */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['Tous', 'Google', 'TripAdvisor', 'Facebook', 'Interne'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              style={{
                padding: '8px 18px',
                borderRadius: 12,
                border: platformFilter === p ? '1px solid #0369A1' : '1px solid rgba(0,0,0,0.08)',
                background: platformFilter === p ? '#0369A1' : 'rgba(255,255,255,0.8)',
                color: platformFilter === p ? '#fff' : '#475569',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          style={{
            padding: '8px 16px',
            borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.08)',
            background: 'rgba(255,255,255,0.8)',
            color: '#475569',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="recent">Plus récents</option>
          <option value="best">Meilleure note</option>
          <option value="worst">Pire note</option>
        </select>
      </motion.div>

      {/* Reviews list */}
      <motion.div variants={item} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtered.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 20,
              padding: '20px 24px',
              transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
          >
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0369A1, #0ea5e9)',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#475569' }}>{r.date}</span>
                {r.replied && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 8,
                    background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0',
                  }}>
                    Répondu
                  </span>
                )}
              </div>
            </div>

            {/* Comment */}
            <p style={{ fontSize: 14, color: '#475569', margin: '0 0 14px 0', lineHeight: 1.6 }}>
              {r.comment.length > 150 ? r.comment.slice(0, 150) + '...' : r.comment}
            </p>

            {/* Reply button */}
            {!r.replied && (
              <button style={{
                background: '#0369A1',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#025d8f'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#0369A1'; }}
              >
                Répondre
              </button>
            )}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
