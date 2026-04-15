import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
  Envoyée: { bg: 'rgba(16,185,129,0.12)', color: '#059669', border: 'rgba(16,185,129,0.25)' },
  Brouillon: { bg: 'rgba(148,163,184,0.12)', color: '#64748b', border: 'rgba(148,163,184,0.25)' },
  Planifiée: { bg: 'rgba(99,102,241,0.12)', color: '#6366f1', border: 'rgba(99,102,241,0.25)' },
};

const typeColors: Record<CampaignType, { bg: string; color: string }> = {
  EMAIL: { bg: 'rgba(99,102,241,0.1)', color: '#6366f1' },
  SMS: { bg: 'rgba(245,158,11,0.1)', color: '#d97706' },
};

interface AutoRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const reviews = [
  { id: 1, author: 'Pierre L.', stars: 5, text: 'Excellent café et service impeccable !', date: 'Il y a 2 jours', replied: true },
  { id: 2, author: 'Marie S.', stars: 4, text: 'Très bon brunch, ambiance agréable.', date: 'Il y a 5 jours', replied: true },
  { id: 3, author: 'Jean D.', stars: 3, text: 'Correct mais un peu cher pour la portion.', date: 'Il y a 1 semaine', replied: false },
  { id: 4, author: 'Sophie M.', stars: 5, text: 'Le meilleur café de Rumelange, sans hésitation !', date: 'Il y a 1 semaine', replied: false },
  { id: 5, author: 'Luc R.', stars: 2, text: 'Trop bruyant le samedi soir, difficile de discuter.', date: 'Il y a 2 semaines', replied: false },
];

/* Campaign analytics mock data */
const campaignPerformanceData = [
  { month: 'Jan', envoyees: 5, ouvertures: 38, clics: 9 },
  { month: 'Fév', envoyees: 7, ouvertures: 42, clics: 11 },
  { month: 'Mar', envoyees: 6, ouvertures: 29, clics: 7 },
  { month: 'Avr', envoyees: 5, ouvertures: 34, clics: 9 },
];

/* Social media publication history mock */
const publicationHistory = [
  {
    id: 1,
    platforms: ['google', 'facebook', 'instagram'],
    date: '12 avr. 2026 — 14:30',
    caption: 'Notre nouvelle carte de printemps est arrivée ! Venez découvrir nos créations...',
    likes: 47,
    comments: 12,
    reach: 1240,
  },
  {
    id: 2,
    platforms: ['facebook', 'instagram'],
    date: '8 avr. 2026 — 11:00',
    caption: 'Happy Hour ce vendredi de 17h à 19h — cocktails à moitié prix !',
    likes: 89,
    comments: 23,
    reach: 2100,
  },
  {
    id: 3,
    platforms: ['google', 'facebook'],
    date: '3 avr. 2026 — 09:15',
    caption: 'Merci à tous pour ce week-end record ! Plus de 200 couverts samedi soir.',
    likes: 34,
    comments: 8,
    reach: 870,
  },
  {
    id: 4,
    platforms: ['instagram'],
    date: '28 mars 2026 — 18:45',
    caption: 'Notre chef Paul en pleine préparation du dessert signature...',
    likes: 112,
    comments: 31,
    reach: 3400,
  },
  {
    id: 5,
    platforms: ['google', 'facebook', 'instagram'],
    date: '22 mars 2026 — 12:00',
    caption: 'Nouvelle terrasse ouverte pour la saison ! Réservez votre table en ligne.',
    likes: 67,
    comments: 19,
    reach: 1890,
  },
];

/* Rating distribution data */
const ratingDistribution = [
  { stars: 5, count: 67 },
  { stars: 4, count: 34 },
  { stars: 3, count: 15 },
  { stars: 2, count: 8 },
  { stars: 1, count: 3 },
];
const totalRatings = ratingDistribution.reduce((s, r) => s + r.count, 0);

/* Response templates */
const responseTemplates = [
  'Merci pour votre avis positif ! Nous sommes ravis que vous ayez apprécié votre expérience.',
  'Nous sommes désolés que votre expérience n\'ait pas été à la hauteur de vos attentes.',
  'Nous prenons note de votre retour et travaillons à nous améliorer.',
  'Merci de votre fidélité, au plaisir de vous revoir bientôt !',
];

const platformIcons: Record<string, { icon: string; color: string }> = {
  google: { icon: 'G', color: '#4285f4' },
  facebook: { icon: 'f', color: '#1877f2' },
  instagram: { icon: 'Ig', color: '#e4405f' },
};

export default function CampagnesPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [autoRules, setAutoRules] = useState<AutoRule[]>([
    { id: 'inactive', label: 'Client inactif 30 jours', description: 'Envoyer automatiquement un coupon de -10% aux clients inactifs depuis 30 jours', enabled: true },
    { id: 'birthday', label: 'Anniversaire', description: 'Envoyer une offre spéciale le jour de l\'anniversaire du client', enabled: true },
    { id: 'welcome', label: 'Nouveau client', description: 'Envoyer un message de bienvenue avec une offre de découverte', enabled: false },
  ]);
  const [platforms, setPlatforms] = useState({ google: true, facebook: true, instagram: false });
  const [caption, setCaption] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

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
      <span key={i} style={{ color: i < count ? '#f59e0b' : '#cbd5e1', fontSize: 16 }}>
        ★
      </span>
    ));
  };

  /* Character limit based on the most restrictive selected platform */
  const getCharLimit = () => {
    const limits: { key: keyof typeof platforms; limit: number; label: string }[] = [
      { key: 'google', limit: 1500, label: 'Google' },
      { key: 'instagram', limit: 2200, label: 'Instagram' },
      { key: 'facebook', limit: 63206, label: 'Facebook' },
    ];
    const active = limits.filter((l) => platforms[l.key]);
    if (active.length === 0) return { limit: 2200, label: 'aucun réseau' };
    const most = active.reduce((min, l) => (l.limit < min.limit ? l : min), active[0]);
    return { limit: most.limit, label: most.label };
  };

  const charInfo = getCharLimit();
  const unrepliedCount = reviews.filter((r) => !r.replied).length;

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
          <p style={{ color: '#64748b', marginTop: 6, fontSize: 15 }}>
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
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#4f46e5'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#6366f1'; }}
        >
          <span style={{ fontSize: 18 }}>+</span> Nouvelle campagne
        </button>
      </motion.div>

      {/* ═══════════════════════════════════════════════════
          SECTION 1: Campaign Analytics Dashboard
          ═══════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
          Tableau de bord
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          {([
            { label: 'Campagnes envoyées', value: '23', trend: '+12%', up: true, color: '#6366f1' },
            { label: "Taux d'ouverture", value: '34,2%', trend: '+2,1%', up: true, color: '#10b981' },
            { label: 'Taux de clic', value: '8,7%', trend: '-0,4%', up: false, color: '#f59e0b' },
            { label: 'Désabonnements', value: '0,3%', trend: '-0,1%', up: false, color: '#ef4444' },
          ] as const).map((kpi, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.08, duration: 0.4 }}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 18,
                padding: '22px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>{kpi.label}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 30, fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{kpi.value}</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: kpi.label === 'Désabonnements' ? (kpi.up ? '#ef4444' : '#10b981') : (kpi.up ? '#10b981' : '#ef4444'),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: 14 }}>
                    {kpi.label === 'Désabonnements' ? (kpi.up ? '▲' : '▼') : (kpi.up ? '▲' : '▼')}
                  </span>
                  {kpi.trend}
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>vs mois dernier</span>
            </motion.div>
          ))}
        </div>

        {/* Mini performance chart */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 20,
            padding: '22px 24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>Performance des campagnes</span>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#6366f1', display: 'inline-block' }} />
                Envoyées
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#10b981', display: 'inline-block' }} />
                Taux ouverture (%)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#f59e0b', display: 'inline-block' }} />
                Taux clic (%)
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={campaignPerformanceData} barGap={4}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  fontSize: 13,
                  color: '#1e293b',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                }}
              />
              <Bar dataKey="envoyees" fill="#6366f1" radius={[6, 6, 0, 0]} name="Envoyées" />
              <Bar dataKey="ouvertures" fill="#10b981" radius={[6, 6, 0, 0]} name="Ouvertures %" />
              <Bar dataKey="clics" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Clics %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════
          Campaign list
          ═══════════════════════════════════════════════════ */}
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
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
            }}
          >
            {['Campagne', 'Type', 'Audience', 'Statut', 'Date'].map((h) => (
              <span key={h} style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
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
                borderBottom: i < campaigns.length - 1 ? '1px solid #f1f5f9' : 'none',
                transition: 'background 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
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
              <span style={{ fontSize: 14, color: '#64748b' }}>{c.audience}</span>
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
              <span style={{ fontSize: 14, color: '#64748b' }}>{c.date}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════
          Automatic campaigns
          ═══════════════════════════════════════════════════ */}
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
                borderBottom: i < autoRules.length - 1 ? '1px solid #f1f5f9' : 'none',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{rule.label}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{rule.description}</div>
              </div>
              <button
                onClick={() => toggleAutoRule(rule.id)}
                style={{
                  width: 48,
                  height: 28,
                  borderRadius: 14,
                  border: 'none',
                  cursor: 'pointer',
                  background: rule.enabled ? '#6366f1' : '#cbd5e1',
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
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════
          SECTION 2: Social Media Publisher Studio
          ═══════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
          Studio de publication
        </h2>
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 20,
            padding: 28,
          }}
        >
          {/* Two-column: Editor + Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            {/* LEFT: Composer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Image upload zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
                style={{
                  border: `2px dashed ${dragOver ? '#6366f1' : '#e2e8f0'}`,
                  borderRadius: 16,
                  height: 300,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: dragOver ? 'rgba(99,102,241,0.04)' : '#fafbfc',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: 'rgba(99,102,241,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                  }}
                >
                  📸
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                  Glissez une image ici
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  ou cliquez pour sélectionner (PNG, JPG, max 10 MB)
                </div>
                <button
                  style={{
                    marginTop: 4,
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '8px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Ajouter une image
                </button>
              </div>

              {/* Caption editor with char counter */}
              <div style={{ position: 'relative' }}>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Écrivez votre légende ici..."
                  maxLength={charInfo.limit}
                  style={{
                    width: '100%',
                    minHeight: 120,
                    padding: '16px 18px',
                    paddingBottom: 36,
                    fontSize: 14,
                    lineHeight: 1.6,
                    background: '#fafbfc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    color: '#1e293b',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 16,
                    fontSize: 12,
                    fontWeight: 500,
                    color: caption.length > charInfo.limit * 0.9 ? '#ef4444' : '#94a3b8',
                  }}
                >
                  {caption.length.toLocaleString('fr-FR')} / {charInfo.limit.toLocaleString('fr-FR')}
                  <span style={{ marginLeft: 6, color: '#cbd5e1' }}>({charInfo.label})</span>
                </div>
              </div>

              {/* Platform cards */}
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10, display: 'block' }}>
                  Plateformes
                </span>
                <div style={{ display: 'flex', gap: 12 }}>
                  {([
                    { key: 'google' as const, label: 'Google Business', icon: 'G', color: '#4285f4', bgGrad: 'linear-gradient(135deg, #4285f4, #34a853)', followers: '127 avis' },
                    { key: 'facebook' as const, label: 'Facebook', icon: 'f', color: '#1877f2', bgGrad: 'linear-gradient(135deg, #1877f2, #0d65d9)', followers: '1.2k abonnés' },
                    { key: 'instagram' as const, label: 'Instagram', icon: 'Ig', color: '#e4405f', bgGrad: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)', followers: '892 abonnés' },
                  ]).map((p) => (
                    <div
                      key={p.key}
                      onClick={() => togglePlatform(p.key)}
                      style={{
                        flex: 1,
                        padding: '16px 14px',
                        borderRadius: 16,
                        border: `2px solid ${platforms[p.key] ? p.color : '#e2e8f0'}`,
                        background: platforms[p.key] ? `${p.color}08` : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        position: 'relative',
                      }}
                    >
                      {/* Toggle dot */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          background: platforms[p.key] ? p.color : '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          color: '#fff',
                          fontWeight: 700,
                          transition: 'all 0.2s',
                        }}
                      >
                        {platforms[p.key] ? '✓' : ''}
                      </div>
                      {/* Icon circle */}
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          background: p.bgGrad,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 800,
                          fontFamily: 'system-ui',
                        }}
                      >
                        {p.icon}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{p.label}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{p.followers}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule / Publish */}
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10, display: 'block' }}>
                  Publication
                </span>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <button
                    onClick={() => setScheduleMode('now')}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      borderRadius: 12,
                      border: `1px solid ${scheduleMode === 'now' ? '#6366f1' : '#e2e8f0'}`,
                      background: scheduleMode === 'now' ? 'rgba(99,102,241,0.08)' : '#ffffff',
                      color: scheduleMode === 'now' ? '#6366f1' : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    Publier maintenant
                  </button>
                  <button
                    onClick={() => setScheduleMode('later')}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      borderRadius: 12,
                      border: `1px solid ${scheduleMode === 'later' ? '#6366f1' : '#e2e8f0'}`,
                      background: scheduleMode === 'later' ? 'rgba(99,102,241,0.08)' : '#ffffff',
                      color: scheduleMode === 'later' ? '#6366f1' : '#64748b',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    Planifier
                  </button>
                </div>
                {scheduleMode === 'later' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', gap: 10, marginBottom: 14 }}
                  >
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        fontSize: 14,
                        background: '#fafbfc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        color: '#1e293b',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      style={{
                        width: 130,
                        padding: '10px 14px',
                        fontSize: 14,
                        background: '#fafbfc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        color: '#1e293b',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </motion.div>
                )}
                <button
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 14,
                    padding: '14px 28px',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                >
                  {scheduleMode === 'now' ? 'Publier maintenant' : 'Planifier la publication'}
                </button>
              </div>
            </div>

            {/* RIGHT: Preview panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>Aperçu</span>

              {/* Show preview for each selected platform */}
              {([
                { key: 'google' as const, label: 'Google Business', color: '#4285f4', icon: 'G' },
                { key: 'facebook' as const, label: 'Facebook', color: '#1877f2', icon: 'f' },
                { key: 'instagram' as const, label: 'Instagram', color: '#e4405f', icon: 'Ig' },
              ]).filter(p => platforms[p.key]).map((p) => (
                <motion.div
                  key={p.key}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: '#ffffff',
                  }}
                >
                  {/* Platform header bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: p.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {p.icon}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{p.label}</span>
                  </div>
                  {/* Mock post body */}
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        CR
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Café um Rond-Point</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Maintenant</div>
                      </div>
                    </div>
                    {/* Image placeholder */}
                    <div
                      style={{
                        height: 120,
                        borderRadius: 10,
                        background: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 10,
                        color: '#cbd5e1',
                        fontSize: 28,
                      }}
                    >
                      🖼
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: '#475569',
                        margin: 0,
                        lineHeight: 1.5,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {caption || 'Votre légende apparaîtra ici...'}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* If no platform selected */}
              {!platforms.google && !platforms.facebook && !platforms.instagram && (
                <div
                  style={{
                    border: '2px dashed #e2e8f0',
                    borderRadius: 16,
                    padding: 40,
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: 14,
                  }}
                >
                  Sélectionnez au moins une plateforme pour voir l'aperçu
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════
          Publication history
          ═══════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
          Historique des publications
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
              gridTemplateColumns: '100px 130px 1fr 80px 90px 80px',
              padding: '14px 22px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
            }}
          >
            {['Plateformes', 'Date', 'Légende', 'Likes', 'Commentaires', 'Portée'].map((h) => (
              <span key={h} style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {h}
              </span>
            ))}
          </div>
          {publicationHistory.map((pub, i) => (
            <motion.div
              key={pub.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 130px 1fr 80px 90px 80px',
                padding: '16px 22px',
                alignItems: 'center',
                borderBottom: i < publicationHistory.length - 1 ? '1px solid #f1f5f9' : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              {/* Platform icons */}
              <div style={{ display: 'flex', gap: 6 }}>
                {pub.platforms.map((pk) => (
                  <div
                    key={pk}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      background: platformIcons[pk].color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {platformIcons[pk].icon}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 13, color: '#64748b' }}>{pub.date}</span>
              <span
                style={{
                  fontSize: 14,
                  color: '#1e293b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  paddingRight: 12,
                }}
              >
                {pub.caption}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, color: '#64748b' }}>
                <span style={{ color: '#ef4444', fontSize: 13 }}>♥</span> {pub.likes}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, color: '#64748b' }}>
                <span style={{ fontSize: 13 }}>💬</span> {pub.comments}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, color: '#64748b' }}>
                <span style={{ fontSize: 13 }}>👁</span> {pub.reach.toLocaleString('fr-FR')}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════
          SECTION 3: Enhanced E-Reputation
          ═══════════════════════════════════════════════════ */}
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
          {/* Top row: Google Reviews summary + Reply tracker */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
            {/* Rating summary card */}
            <div
              style={{
                flex: 1,
                padding: '22px 24px',
                background: '#fafbfc',
                borderRadius: 16,
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                <div>
                  <span style={{ fontSize: 42, fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>4,6</span>
                  <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                    {renderStars(5)}
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>Google Reviews</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginTop: 2 }}>{totalRatings} avis</div>
                </div>
              </div>

              {/* Rating distribution bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ratingDistribution.map((r) => (
                  <div key={r.stars} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', width: 20, textAlign: 'right' }}>{r.stars}★</span>
                    <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(r.count / totalRatings) * 100}%` }}
                        transition={{ duration: 0.8, delay: (5 - r.stars) * 0.1 }}
                        style={{
                          height: '100%',
                          borderRadius: 5,
                          background: r.stars >= 4 ? '#10b981' : r.stars === 3 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 12, color: '#94a3b8', width: 28, textAlign: 'right' }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: sentiment + reply tracker */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Reply status tracker */}
              <div
                style={{
                  padding: '18px 22px',
                  background: unrepliedCount > 5 ? 'rgba(239,68,68,0.06)' : unrepliedCount > 0 ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.06)',
                  borderRadius: 14,
                  border: `1px solid ${unrepliedCount > 5 ? 'rgba(239,68,68,0.2)' : unrepliedCount > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Avis sans réponse</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {unrepliedCount === 0 ? 'Tous les avis ont une réponse' : `${unrepliedCount} avis en attente de réponse`}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: unrepliedCount > 5 ? '#ef4444' : unrepliedCount > 0 ? '#d97706' : '#10b981',
                  }}
                >
                  {unrepliedCount}
                </div>
              </div>

              {/* Sentiment tags */}
              <div
                style={{
                  padding: '18px 22px',
                  background: '#fafbfc',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981', marginBottom: 8 }}>Points forts</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {['Service rapide', 'Ambiance agréable', 'Bon rapport qualité-prix', 'Personnel accueillant'].map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 500,
                        borderRadius: 8,
                        background: 'rgba(16,185,129,0.08)',
                        color: '#059669',
                        border: '1px solid rgba(16,185,129,0.15)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>Points à améliorer</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Parking', 'Bruit le week-end'].map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 500,
                        borderRadius: 8,
                        background: 'rgba(245,158,11,0.08)',
                        color: '#d97706',
                        border: '1px solid rgba(245,158,11,0.15)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Response templates */}
              <div
                style={{
                  padding: '18px 22px',
                  background: '#fafbfc',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>Réponses rapides</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {responseTemplates.map((tpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setReplyText(tpl)}
                      style={{
                        padding: '8px 14px',
                        fontSize: 12,
                        fontWeight: 500,
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        color: '#475569',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        lineHeight: 1.4,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1';
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0';
                        (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
                      }}
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent reviews with enhanced reply UI */}
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 14 }}>
            Avis récents
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  padding: '20px 22px',
                  background: '#fafbfc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Avatar */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: r.stars >= 4 ? 'linear-gradient(135deg, #10b981, #34d399)' : r.stars === 3 ? 'linear-gradient(135deg, #f59e0b, #fbbf24)' : 'linear-gradient(135deg, #ef4444, #f87171)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {r.author.charAt(0)}
                    </div>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{r.author}</span>
                      <div style={{ display: 'flex', gap: 1, marginTop: 2 }}>{renderStars(r.stars)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {r.replied && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: 8,
                          background: 'rgba(16,185,129,0.1)',
                          color: '#059669',
                          border: '1px solid rgba(16,185,129,0.2)',
                        }}
                      >
                        Répondu
                      </span>
                    )}
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>{r.date}</span>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: '#475569', margin: '0 0 14px 0', lineHeight: 1.6, paddingLeft: 48 }}>
                  {r.text}
                </p>

                {/* Reply section */}
                {!r.replied && (
                  <div style={{ paddingLeft: 48 }}>
                    {replyingTo === r.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Écrivez votre réponse..."
                          style={{
                            width: '100%',
                            minHeight: 70,
                            padding: '12px 14px',
                            fontSize: 13,
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: 12,
                            color: '#1e293b',
                            outline: 'none',
                            resize: 'vertical',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            lineHeight: 1.5,
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                            style={{
                              background: '#ffffff',
                              color: '#64748b',
                              border: '1px solid #e2e8f0',
                              borderRadius: 10,
                              padding: '7px 16px',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                            style={{
                              background: '#6366f1',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 10,
                              padding: '7px 16px',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Envoyer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReplyingTo(r.id)}
                        style={{
                          background: 'rgba(99,102,241,0.08)',
                          color: '#6366f1',
                          border: '1px solid rgba(99,102,241,0.2)',
                          borderRadius: 10,
                          padding: '7px 18px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.14)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.08)'; }}
                      >
                        Répondre
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════
          Create campaign modal (preserved)
          ═══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {createModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
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
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 24,
                padding: 32,
                minWidth: 480,
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              }}
            >
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                Nouvelle campagne
              </h3>
              <p style={{ color: '#64748b', fontSize: 14, marginTop: 8, marginBottom: 24 }}>
                Configurez votre nouvelle campagne marketing
              </p>

              {/* Name */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>
                  Nom de la campagne
                </label>
                <input
                  type="text"
                  placeholder="Ex : Promo été 2026"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 15,
                    background: '#fafbfc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Type */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>
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
                        background: t === 'EMAIL' ? 'rgba(99,102,241,0.08)' : '#fafbfc',
                        border: `1px solid ${t === 'EMAIL' ? 'rgba(99,102,241,0.3)' : '#e2e8f0'}`,
                        borderRadius: 12,
                        color: t === 'EMAIL' ? '#6366f1' : '#64748b',
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
                <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>
                  Objet / Message
                </label>
                <textarea
                  placeholder="Contenu de votre campagne..."
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: '12px 16px',
                    fontSize: 14,
                    background: '#fafbfc',
                    border: '1px solid #e2e8f0',
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
                    color: '#64748b',
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
