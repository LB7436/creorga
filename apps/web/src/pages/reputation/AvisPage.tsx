import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, Search, Filter, MessageSquare, ThumbsUp, ThumbsDown, Share2, Flag,
  X, Send, Download, CheckSquare, Square, ChevronDown, ChevronUp,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Platform = 'Google' | 'TripAdvisor' | 'Facebook' | 'Interne';

interface Review {
  id: string;
  author: string;
  avatarColor: string;
  platform: Platform;
  rating: number;
  date: string;
  relative: string;
  text: string;
  reply?: {
    author: string;
    date: string;
    text: string;
  };
  helpful: number;
  replies: number;
  isHelpful?: 'yes' | 'no' | null;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const platformMeta: Record<Platform, { color: string; bg: string; logo: string }> = {
  Google:      { color: '#4285f4', bg: '#eff6ff', logo: 'G' },
  TripAdvisor: { color: '#00af87', bg: '#ecfdf5', logo: 'T' },
  Facebook:    { color: '#1877f2', bg: '#eff6ff', logo: 'f' },
  Interne:     { color: '#f59e0b', bg: '#fffbeb', logo: 'I' },
};

const reviewsMock: Review[] = [
  {
    id: 'av1', author: 'Marie Dubois', avatarColor: '#f472b6', platform: 'Google', rating: 5,
    date: '14/04/2026', relative: 'il y a 3 jours',
    text: "Excellente expérience ! La cuisine est délicieuse, le service au top et l'ambiance chaleureuse. On reviendra avec plaisir. Le chef est passé nous saluer, petit plus très appréciable.",
    reply: { author: 'Direction', date: '14/04/2026', text: 'Merci beaucoup Marie pour ce retour chaleureux ! Au plaisir de vous revoir bientôt.' },
    helpful: 12, replies: 1,
  },
  {
    id: 'av2', author: 'Jean-Pierre Weber', avatarColor: '#60a5fa', platform: 'TripAdvisor', rating: 4,
    date: '12/04/2026', relative: 'il y a 5 jours',
    text: "Très bon restaurant, cadre agréable. Seul petit bémol : l'attente en cuisine un peu longue un samedi soir. Mais la qualité des plats compense largement.",
    helpful: 8, replies: 0,
  },
  {
    id: 'av3', author: 'Sophie Klein', avatarColor: '#a78bfa', platform: 'Google', rating: 5,
    date: '10/04/2026', relative: 'il y a 1 semaine',
    text: "Une adresse qu'on recommande les yeux fermés. Produits frais, carte qui change régulièrement, accueil impeccable.",
    reply: { author: 'Direction', date: '11/04/2026', text: "Merci Sophie ! Nos équipes seront ravies de lire votre message." },
    helpful: 15, replies: 1,
  },
  {
    id: 'av4', author: 'Thomas Reuter', avatarColor: '#34d399', platform: 'Facebook', rating: 3,
    date: '08/04/2026', relative: 'il y a 9 jours',
    text: "Correct sans plus. Le rapport qualité/prix n'est pas exceptionnel. Décor sympa cependant.",
    helpful: 3, replies: 0,
  },
  {
    id: 'av5', author: 'Laura Schmidt', avatarColor: '#fb923c', platform: 'Google', rating: 5,
    date: '06/04/2026', relative: 'il y a 11 jours',
    text: "Un régal du début à la fin. La carte des vins est particulièrement intéressante et le sommelier de très bon conseil. Service très pro.",
    reply: { author: 'Direction', date: '07/04/2026', text: "Merci Laura, nous transmettrons à notre sommelier qui sera touché !" },
    helpful: 22, replies: 1,
  },
  {
    id: 'av6', author: 'Marc Hoffmann', avatarColor: '#f87171', platform: 'TripAdvisor', rating: 2,
    date: '05/04/2026', relative: 'il y a 12 jours',
    text: "Déçu de mon passage. Plat tiède, serveur pressé. Pour le prix affiché, on attend mieux. Dommage car les avis étaient prometteurs.",
    helpful: 5, replies: 0,
  },
  {
    id: 'av7', author: 'Anne Meyer', avatarColor: '#facc15', platform: 'Interne', rating: 5,
    date: '03/04/2026', relative: 'il y a 2 semaines',
    text: "Dîner d'anniversaire parfait. Attention aux détails, gentillesse du personnel, addition raisonnable. Bravo !",
    reply: { author: 'Direction', date: '03/04/2026', text: "Joyeux anniversaire avec un peu de retard Anne ! À très bientôt." },
    helpful: 9, replies: 1,
  },
  {
    id: 'av8', author: 'Pierre Laurent', avatarColor: '#22d3ee', platform: 'Google', rating: 4,
    date: '01/04/2026', relative: 'il y a 2 semaines',
    text: "Belle découverte. Menu du midi très correct, produits locaux mis en avant. Je reviendrai tester la carte du soir.",
    helpful: 6, replies: 0,
  },
  {
    id: 'av9', author: 'Julie Bernard', avatarColor: '#c084fc', platform: 'Google', rating: 5,
    date: '29/03/2026', relative: 'il y a 3 semaines',
    text: "Un coup de cœur absolu. Le menu dégustation en 7 services est un petit voyage culinaire. Pensez à réserver à l'avance.",
    reply: { author: 'Direction', date: '30/03/2026', text: "Merci infiniment Julie pour ce très beau message !" },
    helpful: 28, replies: 1,
  },
  {
    id: 'av10', author: 'Olivier Gérard', avatarColor: '#38bdf8', platform: 'Facebook', rating: 1,
    date: '27/03/2026', relative: 'il y a 3 semaines',
    text: "Réservation non honorée malgré confirmation. Très mauvaise organisation, on a dû repartir. Expérience frustrante.",
    helpful: 2, replies: 0,
  },
  {
    id: 'av11', author: 'Céline Roth', avatarColor: '#fb7185', platform: 'TripAdvisor', rating: 4,
    date: '25/03/2026', relative: 'il y a 3 semaines',
    text: "Très agréable. Plats bien présentés et goûteux. Terrasse très sympa aux beaux jours.",
    reply: { author: 'Direction', date: '26/03/2026', text: "Merci Céline ! La terrasse est ouverte jusqu'en octobre." },
    helpful: 7, replies: 1,
  },
  {
    id: 'av12', author: 'David Müller', avatarColor: '#4ade80', platform: 'Google', rating: 5,
    date: '22/03/2026', relative: 'il y a 4 semaines',
    text: "Tout simplement parfait. On y va en famille depuis des années et la qualité ne faiblit jamais. Bravo à toute l'équipe.",
    helpful: 18, replies: 0,
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const Stars = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <div style={{ display: 'inline-flex', gap: 1 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Star
        key={i}
        size={size}
        fill={i <= rating ? '#f59e0b' : 'transparent'}
        stroke={i <= rating ? '#f59e0b' : '#cbd5e1'}
      />
    ))}
  </div>
);

const getInitials = (name: string) =>
  name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AvisPage() {
  const [platformFilter, setPlatformFilter] = useState<'all' | Platform>('all');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'replied' | 'unreplied'>('all');
  const [periodFilter, setPeriodFilter] = useState<'7j' | '30j' | '90j' | 'tout'>('tout');
  const [sortBy, setSortBy] = useState<'recent' | 'best' | 'worst' | 'helpful'>('recent');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [helpful, setHelpful] = useState<Record<string, 'yes' | 'no' | null>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailReview, setDetailReview] = useState<Review | null>(null);

  const filteredReviews = useMemo(() => {
    let list = [...reviewsMock];
    if (platformFilter !== 'all') list = list.filter(r => r.platform === platformFilter);
    if (ratingFilter !== 'all') list = list.filter(r => r.rating === ratingFilter);
    if (statusFilter === 'replied') list = list.filter(r => !!r.reply);
    if (statusFilter === 'unreplied') list = list.filter(r => !r.reply);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(r => r.text.toLowerCase().includes(s) || r.author.toLowerCase().includes(s));
    }
    switch (sortBy) {
      case 'best':    list.sort((a, b) => b.rating - a.rating); break;
      case 'worst':   list.sort((a, b) => a.rating - b.rating); break;
      case 'helpful': list.sort((a, b) => b.helpful - a.helpful); break;
      default:        break;
    }
    return list;
  }, [platformFilter, ratingFilter, statusFilter, periodFilter, sortBy, search]);

  const stats = {
    avg: 4.6,
    total: reviewsMock.length + 115,
    thisMonth: 12,
    unreplied: reviewsMock.filter(r => !r.reply).length,
  };

  const toggleExpand = (id: string) => {
    const copy = new Set(expanded);
    copy.has(id) ? copy.delete(id) : copy.add(id);
    setExpanded(copy);
  };

  const toggleSelect = (id: string) => {
    const copy = new Set(selected);
    copy.has(id) ? copy.delete(id) : copy.add(id);
    setSelected(copy);
  };

  const submitReply = (id: string) => {
    setReplyOpen(null);
    setReplyText('');
  };

  return (
    <div style={{ padding: '32px 40px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0 }}>Tous les avis</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
            Suivi et gestion des avis clients multi-plateformes
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {selected.size > 0 && (
            <>
              <button style={btnGhost}>
                <CheckSquare size={16} /> Marquer comme répondu ({selected.size})
              </button>
              <button style={btnGhost}>
                <Download size={16} /> Exporter sélection
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 22 }}>
        <StatCard
          label="Note moyenne"
          value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{stats.avg}<span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>/ 5</span></span>}
          sub={<Stars rating={Math.round(stats.avg)} />}
          accent="#f59e0b"
        />
        <StatCard label="Total avis" value={stats.total} sub="Toutes plateformes" accent="#0369a1" />
        <StatCard label="Ce mois" value={stats.thisMonth} sub="+18% vs. mois dernier" accent="#10b981" />
        <StatCard label="Sans réponse" value={stats.unreplied} sub="À traiter" accent="#ef4444" />
      </div>

      {/* Filters */}
      <div style={{ ...cardStyle, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Filter size={16} color="#64748b" />
          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>Filtres</span>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher dans les avis..."
              style={{
                width: '100%', padding: '8px 12px 8px 34px', border: '1px solid #e2e8f0',
                borderRadius: 8, fontSize: 13, outline: 'none', color: '#1e293b', background: '#fff',
                boxSizing: 'border-box' as const,
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <FilterGroup label="Plateforme">
            {(['all', 'Google', 'TripAdvisor', 'Facebook', 'Interne'] as const).map(p => (
              <Chip key={p} active={platformFilter === p} onClick={() => setPlatformFilter(p)}>
                {p === 'all' ? 'Tous' : p}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="Note">
            <Chip active={ratingFilter === 'all'} onClick={() => setRatingFilter('all')}>Tous</Chip>
            {[5, 4, 3, 2, 1].map(r => (
              <Chip key={r} active={ratingFilter === r} onClick={() => setRatingFilter(r)}>
                {r}★
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="Statut">
            <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Tous</Chip>
            <Chip active={statusFilter === 'replied'} onClick={() => setStatusFilter('replied')}>Répondu</Chip>
            <Chip active={statusFilter === 'unreplied'} onClick={() => setStatusFilter('unreplied')}>Non répondu</Chip>
          </FilterGroup>
          <FilterGroup label="Période">
            {(['7j', '30j', '90j', 'tout'] as const).map(p => (
              <Chip key={p} active={periodFilter === p} onClick={() => setPeriodFilter(p)}>
                {p === 'tout' ? 'Tout' : p}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="Tri">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              style={selectStyle}
            >
              <option value="recent">Plus récents</option>
              <option value="best">Meilleure note</option>
              <option value="worst">Pire note</option>
              <option value="helpful">Plus utile</option>
            </select>
          </FilterGroup>
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
        {filteredReviews.length} avis affichés
      </div>

      {/* Reviews */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <AnimatePresence>
          {filteredReviews.map((r, i) => {
            const meta = platformMeta[r.platform];
            const isExpanded = expanded.has(r.id);
            const longText = r.text.length > 180;
            const displayText = longText && !isExpanded ? r.text.slice(0, 180) + '…' : r.text;
            const userRating = helpful[r.id];
            const isSelected = selected.has(r.id);

            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setDetailReview(r)}
                style={{
                  background: '#fff',
                  border: `1px solid ${isSelected ? '#93c5fd' : '#e2e8f0'}`,
                  borderRadius: 12,
                  padding: 20,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Checkbox */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleSelect(r.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSelected ? '#3b82f6' : '#cbd5e1', padding: 0, marginTop: 2 }}
                  >
                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>

                  {/* Avatar */}
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', background: r.avatarColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 600, fontSize: 14, flexShrink: 0,
                  }}>
                    {getInitials(r.author)}
                  </div>

                  {/* Main */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{r.author}</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '2px 8px', background: meta.bg, color: meta.color,
                        borderRadius: 12, fontSize: 11, fontWeight: 600,
                      }}>
                        <span style={{
                          width: 16, height: 16, borderRadius: '50%', background: meta.color,
                          color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700,
                        }}>{meta.logo}</span>
                        {r.platform}
                      </span>
                      <Stars rating={r.rating} />
                      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{r.rating}.0</span>
                    </div>

                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
                      {r.date} • {r.relative}
                    </div>

                    <div style={{ color: '#334155', fontSize: 14, lineHeight: 1.55, marginBottom: 10 }}>
                      {displayText}
                      {longText && (
                        <button
                          onClick={e => { e.stopPropagation(); toggleExpand(r.id); }}
                          style={{
                            background: 'none', border: 'none', color: '#3b82f6',
                            cursor: 'pointer', fontSize: 13, marginLeft: 6, padding: 0, fontWeight: 500,
                          }}
                        >
                          {isExpanded ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                              <ChevronUp size={13} /> Réduire
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                              <ChevronDown size={13} /> Voir plus
                            </span>
                          )}
                        </button>
                      )}
                    </div>

                    {r.reply && (
                      <div style={{
                        background: '#f1f5f9', borderLeft: '3px solid #0369a1',
                        padding: '12px 14px', borderRadius: 8, marginBottom: 10,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, color: '#0369a1', fontSize: 12 }}>↳ Réponse du propriétaire</span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.reply.date}</span>
                        </div>
                        <div style={{ color: '#334155', fontSize: 13, lineHeight: 1.5 }}>{r.reply.text}</div>
                      </div>
                    )}

                    {/* Inline reply */}
                    {replyOpen === r.id && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          background: '#f8fafc', border: '1px solid #e2e8f0',
                          borderRadius: 8, padding: 12, marginBottom: 10,
                        }}
                      >
                        <textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="Votre réponse..."
                          rows={3}
                          style={{
                            width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 6,
                            fontSize: 13, fontFamily: 'inherit', resize: 'vertical' as const,
                            outline: 'none', color: '#1e293b', background: '#fff', boxSizing: 'border-box' as const,
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                          <button onClick={() => { setReplyOpen(null); setReplyText(''); }} style={{ ...btnGhost, padding: '6px 12px', fontSize: 12 }}>
                            Annuler
                          </button>
                          <button onClick={() => submitReply(r.id)} style={{ ...btnPrimary, padding: '6px 12px', fontSize: 12 }}>
                            <Send size={12} /> Envoyer
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {!r.reply && (
                        <button
                          onClick={e => { e.stopPropagation(); setReplyOpen(replyOpen === r.id ? null : r.id); }}
                          style={actionBtn}
                        >
                          <MessageSquare size={13} /> Répondre
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); setHelpful({ ...helpful, [r.id]: userRating === 'yes' ? null : 'yes' }); }}
                        style={{ ...actionBtn, color: userRating === 'yes' ? '#10b981' : '#64748b' }}
                      >
                        <ThumbsUp size={13} /> Utile ({r.helpful + (userRating === 'yes' ? 1 : 0)})
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setHelpful({ ...helpful, [r.id]: userRating === 'no' ? null : 'no' }); }}
                        style={{ ...actionBtn, color: userRating === 'no' ? '#ef4444' : '#64748b' }}
                      >
                        <ThumbsDown size={13} />
                      </button>
                      <button onClick={e => e.stopPropagation()} style={actionBtn}>
                        <Share2 size={13} /> Partager
                      </button>
                      <button onClick={e => e.stopPropagation()} style={actionBtn}>
                        <Flag size={13} /> Signaler
                      </button>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
                        {r.replies} réponse{r.replies > 1 ? 's' : ''} • {r.helpful} utile{r.helpful > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {detailReview && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDetailReview(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 14, width: '100%', maxWidth: 620,
                padding: 28, boxShadow: '0 20px 60px rgba(15,23,42,0.25)',
                maxHeight: '90vh', overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: 18 }}>Détail de l'avis</h3>
                <button onClick={() => setDetailReview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', background: detailReview.avatarColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 600, fontSize: 18, flexShrink: 0,
                }}>
                  {getInitials(detailReview.author)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 16 }}>{detailReview.author}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Stars rating={detailReview.rating} size={16} />
                    <span style={{ fontSize: 13, color: '#64748b' }}>{detailReview.rating}.0 • {detailReview.platform}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    {detailReview.date} • {detailReview.relative}
                  </div>
                </div>
              </div>

              <div style={{ color: '#334155', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                {detailReview.text}
              </div>

              {detailReview.reply && (
                <div style={{
                  background: '#f1f5f9', borderLeft: '3px solid #0369a1',
                  padding: 14, borderRadius: 8, marginBottom: 16,
                }}>
                  <div style={{ fontWeight: 600, color: '#0369a1', fontSize: 12, marginBottom: 4 }}>
                    ↳ Votre réponse — {detailReview.reply.date}
                  </div>
                  <div style={{ color: '#334155', fontSize: 13, lineHeight: 1.5 }}>{detailReview.reply.text}</div>
                </div>
              )}

              {!detailReview.reply && (
                <div>
                  <label style={labelStyle}>Répondre à cet avis</label>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Votre réponse..."
                    rows={4}
                    style={{
                      width: '100%', padding: 12, border: '1px solid #e2e8f0', borderRadius: 8,
                      fontSize: 13, fontFamily: 'inherit', resize: 'vertical' as const,
                      outline: 'none', color: '#1e293b', background: '#fff', boxSizing: 'border-box' as const,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                    <button onClick={() => setDetailReview(null)} style={btnGhost}>Annuler</button>
                    <button onClick={() => { submitReply(detailReview.id); setDetailReview(null); }} style={btnPrimary}>
                      <Send size={14} /> Publier
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components & styles                                            */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, borderTop: `3px solid ${accent}` }}>
      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 11px', borderRadius: 14,
        border: `1px solid ${active ? '#0369a1' : '#e2e8f0'}`,
        background: active ? '#0369a1' : '#fff',
        color: active ? '#fff' : '#334155',
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18,
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 16px', border: 'none', borderRadius: 8,
  background: '#0369A1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 8,
  background: '#fff', color: '#334155', fontWeight: 500, fontSize: 13, cursor: 'pointer',
};

const actionBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6,
  background: '#fff', color: '#64748b', fontSize: 12, cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6,
  fontSize: 12, color: '#334155', background: '#fff', cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6,
};
