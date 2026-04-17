import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

type CampaignStatus = 'Envoyée' | 'Brouillon' | 'Planifiée' | 'En cours';
type CampaignType = 'EMAIL' | 'SMS' | 'PUSH';

interface Campaign {
  id: number;
  name: string;
  type: CampaignType;
  audience: string;
  audienceCount: number;
  sentDate: string;
  openRate: number;
  clickRate: number;
  revenue: number;
  status: CampaignStatus;
  subject?: string;
  senderName?: string;
  body?: string;
}

const campaigns: Campaign[] = [
  { id: 1, name: 'Promo Saint-Valentin 2026', type: 'EMAIL', audience: 'Clients fidèles', audienceCount: 248, sentDate: '14 fév. 2026', openRate: 42.3, clickRate: 12.8, revenue: 3240, status: 'Envoyée', subject: 'Une soirée romantique vous attend', senderName: 'Café um Rond-Point', body: 'Bonjour {prenom}, réservez votre table Saint-Valentin et profitez de -15%.' },
  { id: 2, name: 'Happy Hour vendredi', type: 'SMS', audience: 'Abonnés SMS', audienceCount: 156, sentDate: '18 avr. 2026', openRate: 94.1, clickRate: 18.5, revenue: 890, status: 'Planifiée' },
  { id: 3, name: 'Newsletter avril', type: 'EMAIL', audience: 'Tous abonnés', audienceCount: 312, sentDate: '—', openRate: 0, clickRate: 0, revenue: 0, status: 'Brouillon' },
  { id: 4, name: 'Rappel fidélité 500 pts', type: 'SMS', audience: 'Membres actifs', audienceCount: 89, sentDate: '10 avr. 2026', openRate: 98.2, clickRate: 24.7, revenue: 1120, status: 'Envoyée' },
  { id: 5, name: 'Carte de printemps', type: 'EMAIL', audience: 'Tous clients', audienceCount: 421, sentDate: '1 avr. 2026', openRate: 38.7, clickRate: 9.4, revenue: 2870, status: 'Envoyée' },
  { id: 6, name: 'Brunch du dimanche', type: 'PUSH', audience: 'App utilisateurs', audienceCount: 134, sentDate: '6 avr. 2026', openRate: 67.3, clickRate: 21.2, revenue: 1560, status: 'Envoyée' },
  { id: 7, name: 'Offre anniversaire restaurant', type: 'EMAIL', audience: 'VIP', audienceCount: 78, sentDate: '12 mars 2026', openRate: 58.9, clickRate: 19.1, revenue: 2450, status: 'Envoyée' },
  { id: 8, name: 'Soirée jazz live', type: 'SMS', audience: 'Segment culture', audienceCount: 203, sentDate: '22 avr. 2026', openRate: 0, clickRate: 0, revenue: 0, status: 'Planifiée' },
  { id: 9, name: 'Promo Fête du Travail', type: 'EMAIL', audience: 'Clients Rumelange', audienceCount: 189, sentDate: '25 avr. 2026', openRate: 0, clickRate: 0, revenue: 0, status: 'Planifiée' },
  { id: 10, name: 'Menu enfants week-end', type: 'PUSH', audience: 'Familles', audienceCount: 97, sentDate: '5 avr. 2026', openRate: 71.2, clickRate: 28.4, revenue: 1780, status: 'Envoyée' },
  { id: 11, name: 'Relance clients inactifs', type: 'EMAIL', audience: 'Inactifs 30j+', audienceCount: 67, sentDate: '8 avr. 2026', openRate: 31.4, clickRate: 7.8, revenue: 620, status: 'Envoyée' },
  { id: 12, name: 'Dégustation vins luxembourgeois', type: 'EMAIL', audience: 'Amateurs vins', audienceCount: 124, sentDate: '3 mai 2026', openRate: 0, clickRate: 0, revenue: 0, status: 'Brouillon' },
];

const statusColors: Record<CampaignStatus, { bg: string; color: string; border: string }> = {
  'Envoyée': { bg: 'rgba(16,185,129,0.12)', color: '#059669', border: 'rgba(16,185,129,0.25)' },
  'Brouillon': { bg: 'rgba(148,163,184,0.12)', color: '#64748b', border: 'rgba(148,163,184,0.25)' },
  'Planifiée': { bg: 'rgba(99,102,241,0.12)', color: '#6366f1', border: 'rgba(99,102,241,0.25)' },
  'En cours': { bg: 'rgba(245,158,11,0.12)', color: '#d97706', border: 'rgba(245,158,11,0.25)' },
};

const typeColors: Record<CampaignType, { bg: string; color: string }> = {
  EMAIL: { bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
  SMS: { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  PUSH: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
};

interface AutoRule {
  id: string;
  label: string;
  description: string;
  template: string;
  nextRun: string;
  enabled: boolean;
  icon: string;
}

const initialAutoRules: AutoRule[] = [
  { id: 'birthday', label: 'Anniversaire client', description: 'Offre -10% envoyée le jour de l\'anniversaire', template: 'Joyeux anniversaire {prenom} ! Profitez de -10% sur votre prochaine visite.', nextRun: 'Demain — 3 clients', enabled: true, icon: '🎂' },
  { id: 'inactive', label: 'Client inactif 30 jours', description: 'Coupon de retour pour réengager les clients dormants', template: 'Bonjour {prenom}, vous nous manquez ! Revenez avec -15% sur votre addition.', nextRun: 'Chaque jour 10h00', enabled: true, icon: '💤' },
  { id: 'welcome', label: 'Nouveau client', description: 'Message de bienvenue avec offre de découverte', template: 'Bienvenue {prenom} ! Voici votre boisson offerte pour votre prochaine visite.', nextRun: 'Déclenchement immédiat', enabled: true, icon: '👋' },
  { id: 'postvisit', label: 'Post-visite', description: 'Remerciement et demande d\'avis 24h après la visite', template: 'Merci {prenom} pour votre visite ! Partagez votre expérience sur Google.', nextRun: 'Chaque jour 18h00', enabled: true, icon: '⭐' },
  { id: 'loyalty', label: 'Rappel carte fidélité', description: 'Alerte quand le client atteint 500 points', template: 'Félicitations {prenom} ! Vous avez {points} points — échangeables contre un plat offert.', nextRun: 'Déclenchement automatique', enabled: false, icon: '🎁' },
  { id: 'anniversary', label: 'Anniversaire restaurant', description: 'Promotion spéciale pour célébrer le restaurant', template: 'Le Café um Rond-Point fête ses 3 ans ! Menu spécial à -20% cette semaine.', nextRun: '12 juin 2026', enabled: true, icon: '🎉' },
];

const monthlyPerformance = [
  { month: 'Nov', ouverture: 31.2, clic: 7.8, revenue: 2140 },
  { month: 'Déc', ouverture: 38.4, clic: 10.2, revenue: 4320 },
  { month: 'Jan', ouverture: 34.8, clic: 8.9, revenue: 3180 },
  { month: 'Fév', ouverture: 42.3, clic: 12.8, revenue: 5240 },
  { month: 'Mar', ouverture: 39.1, clic: 9.7, revenue: 4670 },
  { month: 'Avr', ouverture: 37.5, clic: 10.4, revenue: 3890 },
];

const bestDaysData = [
  { jour: 'Lun', score: 42 },
  { jour: 'Mar', score: 51 },
  { jour: 'Mer', score: 48 },
  { jour: 'Jeu', score: 78 },
  { jour: 'Ven', score: 62 },
  { jour: 'Sam', score: 71 },
  { jour: 'Dim', score: 38 },
];

type SortKey = 'name' | 'type' | 'audienceCount' | 'sentDate' | 'openRate' | 'clickRate' | 'revenue' | 'status';

export default function CampagnesPage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'Toutes'>('Toutes');
  const [sortKey, setSortKey] = useState<SortKey>('sentDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [autoRules, setAutoRules] = useState<AutoRule[]>(initialAutoRules);
  const [abModalOpen, setAbModalOpen] = useState(false);

  /* Wizard form state */
  const [wizType, setWizType] = useState<CampaignType>('EMAIL');
  const [wizSegment, setWizSegment] = useState('Clients fidèles');
  const [wizExclusions, setWizExclusions] = useState<string[]>([]);
  const [wizSender, setWizSender] = useState('Café um Rond-Point');
  const [wizSubject, setWizSubject] = useState('');
  const [wizBody, setWizBody] = useState('Bonjour {prenom},\n\nDécouvrez notre nouvelle offre...\n\nÀ bientôt,\nL\'équipe');
  const [wizTiming, setWizTiming] = useState<'now' | 'schedule' | 'recurring'>('now');
  const [wizDate, setWizDate] = useState('');
  const [wizTime, setWizTime] = useState('');
  const [wizRecurrence, setWizRecurrence] = useState<'weekly' | 'monthly'>('weekly');

  const toggleAutoRule = (id: string) => {
    setAutoRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const filteredCampaigns = useMemo(() => {
    const base = statusFilter === 'Toutes' ? campaigns : campaigns.filter((c) => c.status === statusFilter);
    return [...base].sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [statusFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  /* Compute KPIs */
  const sent = campaigns.filter((c) => c.status === 'Envoyée');
  const avgOpen = sent.length ? sent.reduce((s, c) => s + c.openRate, 0) / sent.length : 0;
  const avgClick = sent.length ? sent.reduce((s, c) => s + c.clickRate, 0) / sent.length : 0;
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const activeCount = campaigns.filter((c) => c.status === 'Envoyée' || c.status === 'Planifiée' || c.status === 'En cours').length;
  const sentThisMonth = campaigns.filter((c) => c.status === 'Envoyée' && c.sentDate.includes('avr.')).length;
  const roi = Math.round((totalRevenue / 450) * 100);

  const stats = [
    { label: 'Campagnes actives', value: activeCount.toString(), sub: 'En cours ou planifiées', color: '#6366f1', icon: '📢' },
    { label: 'Envoyées ce mois', value: sentThisMonth.toString(), sub: 'Avril 2026', color: '#0ea5e9', icon: '📤' },
    { label: "Taux d'ouverture moyen", value: `${avgOpen.toFixed(1)}%`, sub: '+2,1 pts vs mois dernier', color: '#10b981', icon: '👁' },
    { label: 'Taux de clic moyen', value: `${avgClick.toFixed(1)}%`, sub: '+0,6 pts vs mois dernier', color: '#f59e0b', icon: '🔗' },
    { label: 'ROI global', value: `${roi}%`, sub: `${totalRevenue.toLocaleString('fr-FR')} € générés`, color: '#ef4444', icon: '💰' },
  ];

  const resetWizard = () => {
    setWizardStep(1);
    setWizType('EMAIL');
    setWizSegment('Clients fidèles');
    setWizExclusions([]);
    setWizSender('Café um Rond-Point');
    setWizSubject('');
    setWizBody('Bonjour {prenom},\n\nDécouvrez notre nouvelle offre...\n\nÀ bientôt,\nL\'équipe');
    setWizTiming('now');
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setTimeout(resetWizard, 200);
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* Header */}
      <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', margin: 0 }}>Campagnes marketing</h1>
          <p style={{ color: '#64748b', marginTop: 6, fontSize: 15 }}>
            Email, SMS et notifications push — pilotez vos campagnes et mesurez leur ROI
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'Toutes')}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 500,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              color: '#1e293b',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option>Toutes</option>
            <option>Envoyée</option>
            <option>Brouillon</option>
            <option>Planifiée</option>
            <option>En cours</option>
          </select>
          <button
            onClick={() => setWizardOpen(true)}
            style={{
              background: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '12px 22px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 6px 18px rgba(99,102,241,0.25)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#4f46e5'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#6366f1'; }}
          >
            <span style={{ fontSize: 18 }}>+</span> Nouvelle campagne
          </button>
        </div>
      </motion.div>

      {/* Stats row — 5 cards */}
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {stats.map((s, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + idx * 0.06 }}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 18,
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${s.color}14`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              {s.icon}
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: '#64748b' }}>{s.label}</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', lineHeight: 1, marginTop: 2 }}>{s.value}</span>
            <span style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>{s.sub}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Performance trend chart */}
      <motion.div variants={item} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1e293b', margin: 0 }}>Évolution des performances</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>6 derniers mois — taux d'ouverture et de clic</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                fontSize: 13,
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="ouverture" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} name="Taux ouverture (%)" />
            <Line type="monotone" dataKey="clic" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} name="Taux clic (%)" />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Campaign list table */}
      <motion.div variants={item}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: 0 }}>
            Campagnes ({filteredCampaigns.length})
          </h2>
          <button
            onClick={() => setAbModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '9px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⚡</span> Créer un test A/B
          </button>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {([
                    { key: 'name', label: 'Nom campagne' },
                    { key: 'type', label: 'Type' },
                    { key: 'audienceCount', label: 'Audience' },
                    { key: 'sentDate', label: 'Date envoi' },
                    { key: 'openRate', label: 'Ouverture' },
                    { key: 'clickRate', label: 'Clic' },
                    { key: 'revenue', label: 'Revenu' },
                    { key: 'status', label: 'Statut' },
                  ] as { key: SortKey; label: string }[]).map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      style={{
                        padding: '13px 18px',
                        textAlign: 'left',
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        cursor: 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span style={{ marginLeft: 5, color: '#6366f1' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((c, i) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCampaign(c)}
                    style={{
                      borderBottom: i < filteredCampaigns.length - 1 ? '1px solid #f1f5f9' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#fafbfc'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '14px 18px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{c.name}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 8,
                          background: typeColors[c.type].bg,
                          color: typeColors[c.type].color,
                          letterSpacing: 0.5,
                        }}
                      >
                        {c.type}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 13, color: '#475569' }}>
                      <div style={{ fontWeight: 500 }}>{c.audience}</div>
                      <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{c.audienceCount} contacts</div>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 13, color: '#64748b' }}>{c.sentDate}</td>
                    <td style={{ padding: '14px 18px', fontSize: 13, color: '#1e293b', fontWeight: 600 }}>
                      {c.openRate > 0 ? `${c.openRate.toFixed(1)}%` : '—'}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 13, color: '#1e293b', fontWeight: 600 }}>
                      {c.clickRate > 0 ? `${c.clickRate.toFixed(1)}%` : '—'}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 600, color: c.revenue > 0 ? '#059669' : '#94a3b8' }}>
                      {c.revenue > 0 ? `${c.revenue.toLocaleString('fr-FR')} €` : '—'}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '4px 11px',
                          borderRadius: 9,
                          background: statusColors[c.status].bg,
                          color: statusColors[c.status].color,
                          border: `1px solid ${statusColors[c.status].border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Performance insights + best days chart */}
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)',
            border: '1px solid #e2e8f0',
            borderRadius: 20,
            padding: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              💡
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: 0 }}>Insights de performance</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 14, background: 'rgba(255,255,255,0.7)', borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>🏆 Meilleurs jours d'envoi</div>
              <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600 }}>Jeudi 10h, Samedi 18h</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>+32% d'ouverture en moyenne</div>
            </div>
            <div style={{ padding: 14, background: 'rgba(255,255,255,0.7)', borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>🎯 Segment le plus engagé</div>
              <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600 }}>Clients fidèles (+500 pts)</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>58,9% d'ouverture moyenne</div>
            </div>
            <div style={{ padding: 14, background: 'rgba(255,255,255,0.7)', borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>📱 Canal le plus performant</div>
              <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600 }}>SMS — 96,1% d'ouverture</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Privilégier pour annonces urgentes</div>
            </div>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1e293b', margin: '0 0 4px 0' }}>Score d'engagement par jour</h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>Moyenne sur les 3 derniers mois</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bestDaysData}>
              <XAxis dataKey="jour" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 13 }}
                cursor={{ fill: 'rgba(99,102,241,0.05)' }}
              />
              <Bar dataKey="score" fill="#6366f1" radius={[8, 8, 0, 0]} name="Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Automated campaigns — 6 rules */}
      <motion.div variants={item}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 14 }}>Campagnes automatiques</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {autoRules.map((rule) => (
            <div
              key={rule.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 18,
                padding: 20,
                opacity: rule.enabled ? 1 : 0.7,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: rule.enabled ? 'rgba(99,102,241,0.12)' : '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                    }}
                  >
                    {rule.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{rule.label}</div>
                    <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>{rule.description}</div>
                  </div>
                </div>
                <button
                  onClick={() => toggleAutoRule(rule.id)}
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 13,
                    border: 'none',
                    cursor: 'pointer',
                    background: rule.enabled ? '#6366f1' : '#cbd5e1',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background 0.2s',
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#fff',
                      position: 'absolute',
                      top: 3,
                      left: rule.enabled ? 21 : 3,
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    }}
                  />
                </button>
              </div>
              <div
                style={{
                  padding: '10px 14px',
                  background: '#fafbfc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  fontSize: 12.5,
                  color: '#475569',
                  fontStyle: 'italic',
                  marginBottom: 10,
                  lineHeight: 1.5,
                }}
              >
                "{rule.template}"
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  <span style={{ marginRight: 5 }}>⏰</span>
                  {rule.nextRun}
                </span>
                <button
                  style={{
                    background: 'transparent',
                    color: '#6366f1',
                    border: 'none',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Modifier le modèle →
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════
          Campaign detail panel (side drawer)
          ═══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCampaign(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.35)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 480,
                maxWidth: '95vw',
                height: '100%',
                background: '#ffffff',
                borderLeft: '1px solid #e2e8f0',
                padding: 28,
                overflowY: 'auto',
                boxShadow: '-16px 0 40px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 8,
                        background: typeColors[selectedCampaign.type].bg,
                        color: typeColors[selectedCampaign.type].color,
                      }}
                    >
                      {selectedCampaign.type}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: 8,
                        background: statusColors[selectedCampaign.status].bg,
                        color: statusColors[selectedCampaign.status].color,
                      }}
                    >
                      {selectedCampaign.status}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>{selectedCampaign.name}</h2>
                </div>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: 10,
                    width: 34,
                    height: 34,
                    cursor: 'pointer',
                    fontSize: 18,
                    color: '#64748b',
                  }}
                >
                  ×
                </button>
              </div>

              {/* Key metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Audience', value: `${selectedCampaign.audienceCount}`, color: '#6366f1' },
                  { label: 'Date envoi', value: selectedCampaign.sentDate, color: '#64748b' },
                  { label: "Taux d'ouverture", value: `${selectedCampaign.openRate.toFixed(1)}%`, color: '#10b981' },
                  { label: 'Taux de clic', value: `${selectedCampaign.clickRate.toFixed(1)}%`, color: '#f59e0b' },
                  { label: 'Revenu généré', value: `${selectedCampaign.revenue.toLocaleString('fr-FR')} €`, color: '#059669' },
                  { label: 'Désabonnements', value: '2', color: '#ef4444' },
                ].map((m, i) => (
                  <div key={i} style={{ padding: 14, background: '#fafbfc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                    <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>{m.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: m.color, marginTop: 4 }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Funnel */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>Entonnoir d'engagement</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Envoyés', value: selectedCampaign.audienceCount, pct: 100, color: '#6366f1' },
                    { label: 'Délivrés', value: Math.round(selectedCampaign.audienceCount * 0.98), pct: 98, color: '#0ea5e9' },
                    { label: 'Ouverts', value: Math.round(selectedCampaign.audienceCount * (selectedCampaign.openRate / 100)), pct: selectedCampaign.openRate, color: '#10b981' },
                    { label: 'Cliqués', value: Math.round(selectedCampaign.audienceCount * (selectedCampaign.clickRate / 100)), pct: selectedCampaign.clickRate, color: '#f59e0b' },
                  ].map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 70, fontSize: 12, color: '#475569', fontWeight: 500 }}>{f.label}</div>
                      <div style={{ flex: 1, height: 28, background: '#f1f5f9', borderRadius: 8, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${f.pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 }}
                          style={{
                            height: '100%',
                            background: f.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            paddingRight: 10,
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {f.value}
                        </motion.div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content preview */}
              {selectedCampaign.subject && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>Contenu envoyé</div>
                  <div style={{ padding: 16, background: '#fafbfc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>De : {selectedCampaign.senderName}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 10 }}>Objet : {selectedCampaign.subject}</div>
                    <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.6 }}>{selectedCampaign.body}</p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════
          Create campaign wizard (3-step)
          ═══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {wizardOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeWizard}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.4)',
              backdropFilter: 'blur(5px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 14 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: 22,
                width: 880,
                maxWidth: '100%',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              }}
            >
              {/* Wizard header with progress */}
              <div style={{ padding: '22px 28px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>Nouvelle campagne</h2>
                  <button
                    onClick={closeWizard}
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: 10,
                      width: 34,
                      height: 34,
                      cursor: 'pointer',
                      fontSize: 18,
                      color: '#64748b',
                    }}
                  >
                    ×
                  </button>
                </div>
                {/* Progress indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {[
                    { n: 1, label: 'Type & Audience' },
                    { n: 2, label: 'Contenu' },
                    { n: 3, label: 'Envoi' },
                  ].map((step, idx) => (
                    <div key={step.n} style={{ display: 'flex', alignItems: 'center', flex: idx < 2 ? 1 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: wizardStep >= step.n ? '#6366f1' : '#f1f5f9',
                            color: wizardStep >= step.n ? '#fff' : '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 700,
                            transition: 'all 0.2s',
                          }}
                        >
                          {wizardStep > step.n ? '✓' : step.n}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: wizardStep >= step.n ? '#1e293b' : '#94a3b8' }}>
                          {step.label}
                        </span>
                      </div>
                      {idx < 2 && (
                        <div style={{ flex: 1, height: 2, background: wizardStep > step.n ? '#6366f1' : '#e2e8f0', margin: '0 14px', transition: 'background 0.2s' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Wizard body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
                <AnimatePresence mode="wait">
                  {wizardStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                    >
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 10 }}>
                        Type de campagne
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                        {([
                          { t: 'EMAIL' as CampaignType, icon: '✉', desc: 'Taux ouverture moyen 37%' },
                          { t: 'SMS' as CampaignType, icon: '💬', desc: 'Taux ouverture 94%' },
                          { t: 'PUSH' as CampaignType, icon: '🔔', desc: 'App uniquement' },
                        ]).map((opt) => (
                          <button
                            key={opt.t}
                            onClick={() => setWizType(opt.t)}
                            style={{
                              padding: 18,
                              borderRadius: 14,
                              border: `2px solid ${wizType === opt.t ? typeColors[opt.t].color : '#e2e8f0'}`,
                              background: wizType === opt.t ? typeColors[opt.t].bg : '#ffffff',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ fontSize: 26, marginBottom: 6 }}>{opt.icon}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{opt.t}</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{opt.desc}</div>
                          </button>
                        ))}
                      </div>

                      <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>
                        Segment cible
                      </label>
                      <select
                        value={wizSegment}
                        onChange={(e) => setWizSegment(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          fontSize: 14,
                          background: '#fafbfc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          color: '#1e293b',
                          outline: 'none',
                          marginBottom: 20,
                          boxSizing: 'border-box',
                        }}
                      >
                        <option>Clients fidèles (248)</option>
                        <option>Tous abonnés (421)</option>
                        <option>VIP +500 pts (78)</option>
                        <option>Inactifs 30j+ (67)</option>
                        <option>Nouveaux clients (45)</option>
                        <option>Familles (97)</option>
                        <option>Amateurs vins (124)</option>
                      </select>

                      <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>
                        Exclusions
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {['Désabonnés', 'Clients bloqués', 'Déjà contactés cette semaine', 'Employés'].map((exc) => (
                          <button
                            key={exc}
                            onClick={() =>
                              setWizExclusions((prev) =>
                                prev.includes(exc) ? prev.filter((e) => e !== exc) : [...prev, exc]
                              )
                            }
                            style={{
                              padding: '7px 14px',
                              fontSize: 12.5,
                              fontWeight: 500,
                              borderRadius: 10,
                              border: `1px solid ${wizExclusions.includes(exc) ? '#6366f1' : '#e2e8f0'}`,
                              background: wizExclusions.includes(exc) ? 'rgba(99,102,241,0.08)' : '#ffffff',
                              color: wizExclusions.includes(exc) ? '#6366f1' : '#64748b',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {wizExclusions.includes(exc) ? '✓ ' : ''}{exc}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {wizardStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}
                    >
                      {/* Left — content editor */}
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>
                          Nom de l'expéditeur
                        </label>
                        <input
                          value={wizSender}
                          onChange={(e) => setWizSender(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            fontSize: 14,
                            background: '#fafbfc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 12,
                            color: '#1e293b',
                            outline: 'none',
                            marginBottom: 16,
                            boxSizing: 'border-box',
                          }}
                        />

                        {wizType === 'EMAIL' && (
                          <>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>
                              Objet du mail
                            </label>
                            <input
                              value={wizSubject}
                              onChange={(e) => setWizSubject(e.target.value)}
                              placeholder="Ex : Votre réduction de printemps vous attend"
                              style={{
                                width: '100%',
                                padding: '11px 14px',
                                fontSize: 14,
                                background: '#fafbfc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 12,
                                color: '#1e293b',
                                outline: 'none',
                                marginBottom: 16,
                                boxSizing: 'border-box',
                              }}
                            />
                          </>
                        )}

                        <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>
                          Message {wizType === 'SMS' && <span style={{ color: '#94a3b8', fontWeight: 400 }}>(max 160 car.)</span>}
                        </label>
                        <textarea
                          value={wizBody}
                          onChange={(e) => setWizBody(e.target.value)}
                          maxLength={wizType === 'SMS' ? 160 : 5000}
                          style={{
                            width: '100%',
                            minHeight: 180,
                            padding: '12px 14px',
                            fontSize: 13.5,
                            lineHeight: 1.6,
                            background: '#fafbfc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 12,
                            color: '#1e293b',
                            outline: 'none',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box',
                            marginBottom: 10,
                          }}
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {['{prenom}', '{nom}', '{points}', '{derniere_visite}'].map((v) => (
                            <button
                              key={v}
                              onClick={() => setWizBody((b) => b + ' ' + v)}
                              style={{
                                padding: '5px 10px',
                                fontSize: 11.5,
                                fontFamily: 'monospace',
                                borderRadius: 8,
                                border: '1px solid #e2e8f0',
                                background: '#ffffff',
                                color: '#6366f1',
                                cursor: 'pointer',
                              }}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right — preview */}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>Aperçu</div>
                        {wizType === 'EMAIL' ? (
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', background: '#ffffff' }}>
                            <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>De : {wizSender}</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginTop: 4 }}>
                                {wizSubject || '(objet du mail)'}
                              </div>
                            </div>
                            <div style={{ padding: 20 }}>
                              <div
                                style={{
                                  height: 80,
                                  background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                                  borderRadius: 10,
                                  marginBottom: 14,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#fff',
                                  fontSize: 16,
                                  fontWeight: 700,
                                }}
                              >
                                Café um Rond-Point
                              </div>
                              <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                                {wizBody || '(votre message apparaîtra ici)'}
                              </p>
                              <button
                                style={{
                                  marginTop: 16,
                                  background: '#6366f1',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 10,
                                  padding: '10px 22px',
                                  fontSize: 13,
                                  fontWeight: 600,
                                }}
                              >
                                En profiter
                              </button>
                            </div>
                          </div>
                        ) : wizType === 'SMS' ? (
                          <div
                            style={{
                              maxWidth: 260,
                              margin: '0 auto',
                              padding: 18,
                              background: '#f1f5f9',
                              borderRadius: 22,
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginBottom: 10 }}>
                              Aujourd'hui
                            </div>
                            <div
                              style={{
                                background: '#ffffff',
                                padding: '12px 14px',
                                borderRadius: 16,
                                borderTopLeftRadius: 4,
                                fontSize: 13,
                                color: '#1e293b',
                                lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {wizBody || '(votre SMS apparaîtra ici)'}
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 4 }}>
                              {wizBody.length}/160
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              background: 'linear-gradient(135deg, #1e293b, #334155)',
                              borderRadius: 14,
                              padding: 16,
                              color: '#fff',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                                🔔
                              </div>
                              <div>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>CREORGA POS</div>
                                <div style={{ fontSize: 11, opacity: 0.5 }}>maintenant</div>
                              </div>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{wizSender}</div>
                            <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                              {wizBody || '(notification apparaîtra ici)'}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {wizardStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                    >
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 10 }}>
                        Quand envoyer ?
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                        {([
                          { k: 'now' as const, label: 'Envoyer immédiatement', desc: 'La campagne part dès la création' },
                          { k: 'schedule' as const, label: 'Programmer', desc: 'Choisir une date et une heure précise' },
                          { k: 'recurring' as const, label: 'Récurrent', desc: 'Envoi automatique hebdomadaire ou mensuel' },
                        ]).map((opt) => (
                          <button
                            key={opt.k}
                            onClick={() => setWizTiming(opt.k)}
                            style={{
                              padding: '14px 18px',
                              borderRadius: 12,
                              border: `2px solid ${wizTiming === opt.k ? '#6366f1' : '#e2e8f0'}`,
                              background: wizTiming === opt.k ? 'rgba(99,102,241,0.06)' : '#ffffff',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{opt.label}</div>
                            <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>{opt.desc}</div>
                          </button>
                        ))}
                      </div>

                      {wizTiming === 'schedule' && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{ display: 'flex', gap: 12 }}
                        >
                          <input
                            type="date"
                            value={wizDate}
                            onChange={(e) => setWizDate(e.target.value)}
                            style={{
                              flex: 1,
                              padding: '11px 14px',
                              fontSize: 14,
                              background: '#fafbfc',
                              border: '1px solid #e2e8f0',
                              borderRadius: 12,
                              color: '#1e293b',
                              outline: 'none',
                              fontFamily: 'inherit',
                            }}
                          />
                          <input
                            type="time"
                            value={wizTime}
                            onChange={(e) => setWizTime(e.target.value)}
                            style={{
                              width: 140,
                              padding: '11px 14px',
                              fontSize: 14,
                              background: '#fafbfc',
                              border: '1px solid #e2e8f0',
                              borderRadius: 12,
                              color: '#1e293b',
                              outline: 'none',
                              fontFamily: 'inherit',
                            }}
                          />
                        </motion.div>
                      )}

                      {wizTiming === 'recurring' && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                            {(['weekly', 'monthly'] as const).map((r) => (
                              <button
                                key={r}
                                onClick={() => setWizRecurrence(r)}
                                style={{
                                  flex: 1,
                                  padding: '11px 16px',
                                  fontSize: 14,
                                  fontWeight: 600,
                                  borderRadius: 12,
                                  border: `1px solid ${wizRecurrence === r ? '#6366f1' : '#e2e8f0'}`,
                                  background: wizRecurrence === r ? 'rgba(99,102,241,0.08)' : '#ffffff',
                                  color: wizRecurrence === r ? '#6366f1' : '#64748b',
                                  cursor: 'pointer',
                                }}
                              >
                                {r === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}
                              </button>
                            ))}
                          </div>
                          <div style={{ padding: 14, background: '#fafbfc', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 13, color: '#475569' }}>
                            {wizRecurrence === 'weekly'
                              ? 'La campagne sera envoyée chaque jeudi à 10h00 (recommandé)'
                              : 'La campagne sera envoyée le 1er de chaque mois à 09h00'}
                          </div>
                        </motion.div>
                      )}

                      <div
                        style={{
                          marginTop: 20,
                          padding: 18,
                          background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                          border: '1px solid rgba(16,185,129,0.25)',
                          borderRadius: 14,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#047857', marginBottom: 6 }}>Récapitulatif</div>
                        <div style={{ fontSize: 13, color: '#065f46', lineHeight: 1.7 }}>
                          <div><strong>Type :</strong> {wizType}</div>
                          <div><strong>Audience :</strong> {wizSegment}</div>
                          {wizExclusions.length > 0 && <div><strong>Exclusions :</strong> {wizExclusions.join(', ')}</div>}
                          <div><strong>Expéditeur :</strong> {wizSender}</div>
                          {wizType === 'EMAIL' && <div><strong>Objet :</strong> {wizSubject || '(non défini)'}</div>}
                          <div>
                            <strong>Envoi :</strong>{' '}
                            {wizTiming === 'now'
                              ? 'Immédiatement'
                              : wizTiming === 'schedule'
                              ? `${wizDate || '—'} à ${wizTime || '—'}`
                              : wizRecurrence === 'weekly'
                              ? 'Chaque semaine'
                              : 'Chaque mois'}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Wizard footer */}
              <div
                style={{
                  padding: '18px 28px',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  background: '#fafbfc',
                }}
              >
                <button
                  onClick={() => (wizardStep === 1 ? closeWizard() : setWizardStep((s) => s - 1))}
                  style={{
                    background: '#ffffff',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '11px 22px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {wizardStep === 1 ? 'Annuler' : '← Précédent'}
                </button>
                <button
                  onClick={() => (wizardStep === 3 ? closeWizard() : setWizardStep((s) => s + 1))}
                  style={{
                    background: wizardStep === 3 ? 'linear-gradient(135deg, #10b981, #059669)' : '#6366f1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '11px 24px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {wizardStep === 3 ? 'Créer la campagne' : 'Suivant →'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════
          A/B test modal
          ═══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {abModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAbModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: 22,
                width: 640,
                maxWidth: '100%',
                padding: 28,
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>Test A/B</h2>
                <button
                  onClick={() => setAbModalOpen(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#64748b' }}
                >
                  ×
                </button>
              </div>
              <p style={{ fontSize: 14, color: '#64748b', marginTop: 0, marginBottom: 22 }}>
                Testez deux versions pour comparer les performances. L'audience sera divisée automatiquement en 50/50.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                {(['A', 'B'] as const).map((v) => (
                  <div
                    key={v}
                    style={{
                      padding: 16,
                      background: '#fafbfc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: v === 'A' ? '#6366f1' : '#10b981',
                        marginBottom: 8,
                        letterSpacing: 1,
                      }}
                    >
                      VERSION {v} — 50%
                    </div>
                    <input
                      placeholder={`Objet version ${v}`}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: 13,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        marginBottom: 8,
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                    <textarea
                      placeholder={`Message version ${v}`}
                      style={{
                        width: '100%',
                        minHeight: 90,
                        padding: '9px 12px',
                        fontSize: 13,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        boxSizing: 'border-box',
                        outline: 'none',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div
                style={{
                  padding: 14,
                  background: 'rgba(99,102,241,0.06)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 12,
                  fontSize: 12.5,
                  color: '#4338ca',
                  marginBottom: 20,
                }}
              >
                <strong>Gagnant automatique :</strong> après 24h, la version avec le meilleur taux d'ouverture sera envoyée au reste de l'audience.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setAbModalOpen(false)}
                  style={{
                    background: '#ffffff',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => setAbModalOpen(false)}
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '10px 22px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Lancer le test
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
