import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';

type Platform = 'Google' | 'TripAdvisor' | 'Facebook' | 'Interne';
type Tone = 'Chaleureux' | 'Professionnel' | 'Excuse' | 'Explicatif';
type Lang = 'fr' | 'en' | 'de' | 'lu' | 'pt' | 'it';
type Tab = 'inbox' | 'templates' | 'analytics' | 'escalation' | 'patterns';

interface PendingReview {
  id: number;
  author: string;
  avatar: string;
  stars: number;
  platform: Platform;
  date: string;
  comment: string;
  lang?: Lang;
  assignee?: string;
  requiresApproval?: boolean;
  followUpUpdated?: boolean;
}

interface SentResponse {
  id: number;
  author: string;
  platform: Platform;
  timestamp: string;
  preview: string;
  sla: number;
  npsBefore: number;
  npsAfter: number;
}

interface Template {
  id: number;
  title: string;
  body: string;
  stars: string;
  usage: number;
  avgResponseScore: number;
}

const platformStyles: Record<Platform, { bg: string; color: string; border: string; logo: string }> = {
  Google: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', logo: 'G' },
  TripAdvisor: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', logo: 'T' },
  Facebook: { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe', logo: 'f' },
  Interne: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe', logo: 'C' },
};

const langLabels: Record<Lang, { flag: string; name: string }> = {
  fr: { flag: 'FR', name: 'Français' },
  en: { flag: 'EN', name: 'English' },
  de: { flag: 'DE', name: 'Deutsch' },
  lu: { flag: 'LU', name: 'Lëtzebuergesch' },
  pt: { flag: 'PT', name: 'Português' },
  it: { flag: 'IT', name: 'Italiano' },
};

const pendingReviews: PendingReview[] = [
  { id: 1, author: 'Camille V.', avatar: 'CV', stars: 5, platform: 'Google', date: '15 avr. 2026', lang: 'fr', assignee: 'Julie (Manager)', comment: "Soirée absolument magique, service aux petits soins et cuisine créative. Le sommelier nous a guidés vers un accord mets-vin parfait. On reviendra sans hésiter !" },
  { id: 2, author: 'Antoine R.', avatar: 'AR', stars: 2, platform: 'TripAdvisor', date: '14 avr. 2026', lang: 'fr', requiresApproval: true, comment: "Réservation à 20h, table donnée à 20h35. Le plat était froid et le serveur débordé. Dommage car la carte était prometteuse." },
  { id: 3, author: 'Léa P.', avatar: 'LP', stars: 4, platform: 'Facebook', date: '13 avr. 2026', lang: 'fr', assignee: 'Marc (Service)', comment: "Très bon rapport qualité-prix pour le menu du midi. L'ambiance est chaleureuse, parfait pour un déjeuner pro. J'aurais aimé plus de choix végétariens." },
  { id: 4, author: 'Marc D.', avatar: 'MD', stars: 1, platform: 'Google', date: '12 avr. 2026', lang: 'fr', requiresApproval: true, comment: "Très déçu, le tartare manquait de fraîcheur et la note finale était 30% plus élevée qu'annoncé. J'attends un retour de la direction." },
  { id: 5, author: 'Nina H.', avatar: 'NH', stars: 5, platform: 'Interne', date: '11 avr. 2026', lang: 'fr', followUpUpdated: true, comment: "Un vrai moment de bonheur. Mention spéciale au chef pâtissier, le dessert signature est une œuvre d'art. Merci à toute l'équipe !" },
  { id: 6, author: 'Paul M.', avatar: 'PM', stars: 3, platform: 'TripAdvisor', date: '10 avr. 2026', lang: 'en', comment: "Overall ok. Food was decent but portions seemed small for the price. Service however was spot on." },
  { id: 7, author: 'Sarah B.', avatar: 'SB', stars: 5, platform: 'Google', date: '9 avr. 2026', lang: 'de', comment: "Wir haben dort meinen Geburtstag gefeiert und das Team hat alles perfekt organisiert. Tolles Ambiente und köstliche Gerichte. Vielen Dank!" },
  { id: 8, author: 'Yanis K.', avatar: 'YK', stars: 2, platform: 'Facebook', date: '8 avr. 2026', lang: 'fr', requiresApproval: true, comment: "Plat végétarien insipide, légumes trop cuits. La carte annonce du bio mais rien ne le confirme. À revoir." },
];

const sentResponses: SentResponse[] = [
  { id: 101, author: 'Pierre L.', platform: 'Google', timestamp: '07 avr. 2026 — 14h22', sla: 1.4, npsBefore: 8, npsAfter: 9, preview: "Merci Pierre pour votre avis chaleureux ! Nous sommes ravis que votre expérience ait été à la hauteur..." },
  { id: 102, author: 'Marie S.', platform: 'TripAdvisor', timestamp: '06 avr. 2026 — 09h47', sla: 3.2, npsBefore: 4, npsAfter: 7, preview: "Bonjour Marie, merci pour votre retour détaillé. Nous prenons bonne note de vos remarques concernant..." },
  { id: 103, author: 'Sophie M.', platform: 'Facebook', timestamp: '04 avr. 2026 — 18h05', sla: 0.8, npsBefore: 9, npsAfter: 10, preview: "Chère Sophie, merci infiniment pour ce magnifique message. Nous sommes touchés d'avoir pu célébrer..." },
  { id: 104, author: 'Emma B.', platform: 'Google', timestamp: '03 avr. 2026 — 11h31', sla: 2.1, npsBefore: 8, npsAfter: 9, preview: "Bonjour Emma, nous vous remercions pour votre retour enthousiaste. Notre sommelier sera ravi..." },
  { id: 105, author: 'Thomas K.', platform: 'TripAdvisor', timestamp: '01 avr. 2026 — 16h18', sla: 1.7, npsBefore: 7, npsAfter: 8, preview: "Merci Thomas de votre fidélité. Le tartare est en effet un classique maison, préparé chaque matin..." },
];

const defaultTemplates: Template[] = [
  { id: 1, title: 'Remerciement 5 étoiles', stars: '5', usage: 47, avgResponseScore: 92, body: "Bonjour {prénom}, un grand merci pour votre avis chaleureux ! Nous sommes ravis que votre expérience chez Creorga vous ait enchanté. Au plaisir de vous revoir très vite." },
  { id: 2, title: 'Retour mitigé 3-4 étoiles', stars: '3-4', usage: 18, avgResponseScore: 78, body: "Bonjour {prénom}, merci pour votre retour constructif. Nous sommes heureux que vous ayez passé un bon moment et prenons note de vos remarques pour continuer à progresser." },
  { id: 3, title: 'Excuse 1-2 étoiles', stars: '1-2', usage: 12, avgResponseScore: 84, body: "Bonjour {prénom}, nous sommes sincèrement désolés que votre visite n'ait pas été à la hauteur. Nous prenons contact avec vous en privé afin de comprendre et de vous proposer une solution." },
  { id: 4, title: 'Événement privé', stars: '5', usage: 9, avgResponseScore: 89, body: "Bonjour {prénom}, merci infiniment d'avoir choisi Creorga pour cet événement. Toute l'équipe a été ravie de contribuer à ce moment unique." },
  { id: 5, title: 'Réservation manquée', stars: '1-2', usage: 6, avgResponseScore: 81, body: "Bonjour {prénom}, nous vous prions de bien vouloir nous excuser pour ce désagrément. Pourriez-vous nous contacter à contact@creorga.lu afin que nous trouvions ensemble un geste commercial adapté ?" },
];

const suggestionFor = (stars: number, author: string): string[] => {
  const firstName = author.split(' ')[0];
  if (stars >= 5) {
    return [
      `Bonjour ${firstName}, un immense merci pour votre excellent avis ! Nous sommes ravis que votre passage ait été à la hauteur de vos attentes. Toute l'équipe sera touchée de lire votre message.`,
      `Cher·ère ${firstName}, merci pour ce retour enthousiasmant. Vos mots sont un carburant précieux pour notre équipe. Au plaisir de vous accueillir à nouveau très bientôt.`,
      `${firstName}, merci pour cette superbe étoile ! Nous transmettons vos félicitations au chef et à la salle. À très vite chez Creorga.`,
    ];
  }
  if (stars >= 3) {
    return [
      `Bonjour ${firstName}, nous sommes ravis que globalement votre expérience ait été positive. Nous prenons note de vos remarques et travaillons à les améliorer pour votre prochaine visite.`,
      `Merci ${firstName} pour votre retour honnête. C'est grâce à ce type de message que nous progressons. N'hésitez pas à revenir, nous aurons à cœur de vous faire vivre un moment sans réserve.`,
      `Bonjour ${firstName}, merci d'avoir pris le temps de partager votre expérience. Nous aimerions échanger avec vous pour mieux comprendre les axes d'amélioration que vous mentionnez.`,
    ];
  }
  return [
    `Bonjour ${firstName}, nous sommes sincèrement désolés que votre expérience n'ait pas été à la hauteur. Nous prenons contact avec vous en privé afin d'en discuter et de vous proposer un geste adapté.`,
    `${firstName}, votre retour nous attriste. Ce que vous décrivez ne correspond pas à nos standards. La direction vous contacte aujourd'hui même pour en discuter.`,
    `Bonjour ${firstName}, toutes nos excuses pour ce désagrément. Pouvez-vous nous écrire à contact@creorga.lu ? Nous souhaitons comprendre ce qui s'est passé et réparer cette mauvaise expérience.`,
  ];
};

const slaData = [
  { semaine: 'S12', heures: 4.8 },
  { semaine: 'S13', heures: 3.9 },
  { semaine: 'S14', heures: 2.7 },
  { semaine: 'S15', heures: 2.3 },
  { semaine: 'S16', heures: 1.8 },
];

const teamPerf = [
  { membre: 'Julie', repondus: 42, sla: 1.4, score: 92 },
  { membre: 'Marc', repondus: 31, sla: 2.1, score: 88 },
  { membre: 'Camille', repondus: 27, sla: 1.7, score: 90 },
  { membre: 'Tom', repondus: 18, sla: 2.8, score: 81 },
];

const repeatedIssues = [
  { issue: 'Temps d\'attente parking', count: 5, trend: '+2', severity: 'high' },
  { issue: 'Options végétariennes limitées', count: 4, trend: '+1', severity: 'medium' },
  { issue: 'Bruit en terrasse', count: 3, trend: '0', severity: 'medium' },
  { issue: 'Wifi instable', count: 2, trend: '-1', severity: 'low' },
];

const renderStars = (count: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <span key={i} style={{ color: i < count ? '#f59e0b' : '#d1d5db', fontSize: 15 }}>★</span>
  ));

const StatCard = ({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, flex: 1, minWidth: 180, boxShadow: '0 1px 2px rgba(15,23,42,0.03)' }}
  >
    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: 28, color: '#0f172a', fontWeight: 700, marginTop: 6 }}>{value}</div>
    <div style={{ fontSize: 12, color: accent, marginTop: 4, fontWeight: 600 }}>{sub}</div>
  </motion.div>
);

const analyzeTone = (text: string): { label: string; color: string; score: number } => {
  if (!text.trim()) return { label: 'Neutre', color: '#94a3b8', score: 50 };
  const aggressive = /(inacceptable|scandaleux|honte|nul)/i.test(text);
  const cold = text.length < 40 && !/merci|ravi|désolé/i.test(text);
  const warm = /merci|ravi|heureux|touchés|enchanté/i.test(text);
  if (aggressive) return { label: 'Trop agressif', color: '#dc2626', score: 18 };
  if (cold) return { label: 'Trop froid', color: '#f59e0b', score: 42 };
  if (warm) return { label: 'Chaleureux équilibré', color: '#059669', score: 88 };
  return { label: 'Neutre professionnel', color: '#2563eb', score: 70 };
};

export default function ReponsesPage() {
  const [tab, setTab] = useState<Tab>('inbox');
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [tones, setTones] = useState<Record<number, Tone>>({});
  const [targetLang, setTargetLang] = useState<Record<number, Lang>>({});
  const [templates, setTemplates] = useState<Template[]>(defaultTemplates);
  const [editingTplId, setEditingTplId] = useState<number | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [handled, setHandled] = useState<Record<number, 'sent' | 'draft' | 'pending-approval'>>({});
  const [comments, setComments] = useState<Record<number, string[]>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [generatingId, setGeneratingId] = useState<number | null>(null);

  const totalPending = useMemo(() => pendingReviews.filter(r => !handled[r.id]).length, [handled]);

  const applySuggestion = (id: number, text: string) => setDrafts(d => ({ ...d, [id]: text }));
  const updateDraft = (id: number, text: string) => setDrafts(d => ({ ...d, [id]: text }));
  const setTone = (id: number, tone: Tone) => setTones(t => ({ ...t, [id]: tone }));

  const generateAI = (r: PendingReview) => {
    setGeneratingId(r.id);
    setTimeout(() => {
      const firstName = r.author.split(' ')[0];
      const ai = r.stars >= 4
        ? `Bonjour ${firstName}, merci infiniment pour ce superbe retour ! Nous notons votre enthousiasme concernant notre service et partagerons votre message avec l'équipe cuisine et salle. Au plaisir de vous revoir très bientôt chez Creorga.`
        : r.stars === 3
        ? `Bonjour ${firstName}, merci d'avoir partagé votre expérience. Nous prenons note de vos remarques avec sérieux. Pourriez-vous nous contacter directement à contact@creorga.lu afin que nous puissions échanger et vous proposer un nouveau moment à la hauteur de nos ambitions ?`
        : `Bonjour ${firstName}, nous regrettons sincèrement que votre visite n'ait pas répondu à vos attentes. Votre retour concernant ${r.comment.slice(0, 40)}... est pris très au sérieux. La direction vous contactera aujourd'hui même pour comprendre précisément la situation et vous proposer un geste à la hauteur du désagrément causé.`;
      setDrafts(d => ({ ...d, [r.id]: ai }));
      setGeneratingId(null);
    }, 900);
  };

  const applyTemplate = (id: number, author: string) => {
    const tpl = templates[0];
    const firstName = author.split(' ')[0];
    setDrafts(d => ({ ...d, [id]: tpl.body.replace('{prénom}', firstName) }));
  };

  const sendReply = (id: number, requiresApproval?: boolean) =>
    setHandled(h => ({ ...h, [id]: requiresApproval ? 'pending-approval' : 'sent' }));
  const saveDraft = (id: number) => setHandled(h => ({ ...h, [id]: 'draft' }));
  const updateTemplate = (id: number, body: string) =>
    setTemplates(ts => ts.map(t => (t.id === id ? { ...t, body } : t)));

  const addComment = (id: number) => {
    const txt = (newComment[id] || '').trim();
    if (!txt) return;
    setComments(c => ({ ...c, [id]: [...(c[id] || []), txt] }));
    setNewComment(n => ({ ...n, [id]: '' }));
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'inbox', label: 'Boîte de réception' },
    { key: 'templates', label: 'Templates' },
    { key: 'analytics', label: 'Analytics & SLA' },
    { key: 'escalation', label: 'Escalade' },
    { key: 'patterns', label: 'Patterns récurrents' },
  ];

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', padding: 28, color: '#0f172a' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Réponses aux avis</h1>
            <p style={{ color: '#64748b', marginTop: 6, fontSize: 14 }}>Centralisez, répondez et analysez l'impact de vos réponses publiques.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ background: '#fef3c7', color: '#92400e', padding: '8px 14px', borderRadius: 999, fontWeight: 600, fontSize: 13, border: '1px solid #fde68a' }}>
              2 en attente d'approbation
            </div>
            <div style={{ background: '#eef2ff', color: '#4338ca', padding: '8px 14px', borderRadius: 999, fontWeight: 600, fontSize: 13, border: '1px solid #c7d2fe' }}>
              {totalPending} avis en attente
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
          <StatCard label="Avis sans réponse" value="5" sub="−2 vs semaine passée" accent="#059669" />
          <StatCard label="Temps de réponse moyen" value="1.8h" sub="SLA < 4h respecté" accent="#2563eb" />
          <StatCard label="Taux de réponse" value="94%" sub="+3 pts ce mois" accent="#059669" />
          <StatCard label="Impact NPS moyen" value="+1.4" sub="après réponse" accent="#059669" />
        </div>

        <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 4, width: 'fit-content', marginBottom: 22, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, background: tab === t.key ? '#4f46e5' : 'transparent', color: tab === t.key ? '#fff' : '#475569', border: 'none', borderRadius: 8, cursor: 'pointer' }}>{t.label}</button>
          ))}
        </div>

        {tab === 'inbox' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pendingReviews.map((r, idx) => {
              const ps = platformStyles[r.platform];
              const suggestions = suggestionFor(r.stars, r.author);
              const status = handled[r.id];
              const draft = drafts[r.id] ?? '';
              const toneAnalysis = analyzeTone(draft);
              const tLang = targetLang[r.id] || r.lang || 'fr';
              const rLang = r.lang || 'fr';

              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.35 }}
                  style={{ background: '#ffffff', border: r.requiresApproval ? '1px solid #fcd34d' : '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}
                >
                  <div style={{ padding: 18, display: 'flex', gap: 14, borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                      {r.avatar}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{r.author}</span>
                        <div>{renderStars(r.stars)}</div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: ps.bg, color: ps.color, border: `1px solid ${ps.border}`, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                          <span style={{ width: 16, height: 16, borderRadius: 4, background: ps.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{ps.logo}</span>
                          {r.platform}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '3px 8px', borderRadius: 6 }}>{langLabels[rLang].flag}</span>
                        {r.assignee && <span style={{ fontSize: 11, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>↳ {r.assignee}</span>}
                        {r.followUpUpdated && <span style={{ fontSize: 11, color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>★ Avis ré-évalué +1</span>}
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{r.date}</span>
                        {status && (
                          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: status === 'sent' ? '#059669' : status === 'pending-approval' ? '#b45309' : '#d97706', background: status === 'sent' ? '#ecfdf5' : status === 'pending-approval' ? '#fef3c7' : '#fffbeb', border: `1px solid ${status === 'sent' ? '#a7f3d0' : status === 'pending-approval' ? '#fde68a' : '#fde68a'}`, padding: '3px 10px', borderRadius: 999 }}>
                            {status === 'sent' ? 'Envoyée' : status === 'pending-approval' ? 'En attente manager' : 'Brouillon'}
                          </span>
                        )}
                      </div>
                      <p style={{ marginTop: 10, color: '#334155', lineHeight: 1.55, fontSize: 14 }}>{r.comment}</p>
                    </div>
                  </div>

                  <div style={{ padding: 18, background: '#fafbff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => generateAI(r)}
                        disabled={generatingId === r.id}
                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: generatingId === r.id ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        {generatingId === r.id ? 'Génération...' : '◆ Générer avec IA'}
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                        <span>Traduire en :</span>
                        {(['fr', 'en', 'de', 'lu'] as Lang[]).map(l => (
                          <button key={l} onClick={() => setTargetLang(t => ({ ...t, [r.id]: l }))} style={{ background: tLang === l ? '#4f46e5' : '#fff', color: tLang === l ? '#fff' : '#475569', border: '1px solid #cbd5e1', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{langLabels[l].flag}</button>
                        ))}
                      </div>
                      {rLang !== 'fr' && <span style={{ fontSize: 11, color: '#4f46e5', background: '#eef2ff', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>Auto-détecté : {langLabels[rLang].name} → réponse même langue</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', background: '#eef2ff', border: '1px solid #c7d2fe', padding: '3px 9px', borderRadius: 6 }}>IA</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>Suggestions basées sur le sentiment</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8, marginBottom: 14 }}>
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => applySuggestion(r.id, s)}
                          style={{ textAlign: 'left', background: '#ffffff', border: '1px solid #e0e7ff', borderRadius: 10, padding: 12, fontSize: 13, color: '#1e293b', lineHeight: 1.5, cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e0e7ff'; e.currentTarget.style.background = '#ffffff'; }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Option {i + 1}</div>
                          {s.length > 140 ? s.slice(0, 138) + '…' : s}
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={draft}
                      onChange={e => updateDraft(r.id, e.target.value)}
                      placeholder="Rédigez votre réponse, cliquez sur une suggestion ou générez avec IA..."
                      style={{ width: '100%', minHeight: 110, padding: 12, border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', background: '#fff', color: '#0f172a', lineHeight: 1.55, boxSizing: 'border-box' }}
                    />

                    {draft && (
                      <div style={{ marginTop: 10, padding: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Analyse du ton :</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: toneAnalysis.color }}>{toneAnalysis.label}</span>
                        <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${toneAnalysis.score}%`, height: '100%', background: toneAnalysis.color, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#64748b' }}>{toneAnalysis.score}/100</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: '#64748b', marginRight: 4 }}>Ton :</span>
                        {(['Chaleureux', 'Professionnel', 'Excuse', 'Explicatif'] as Tone[]).map(t => {
                          const active = tones[r.id] === t;
                          return (
                            <button
                              key={t}
                              onClick={() => setTone(r.id, t)}
                              style={{ background: active ? '#0f172a' : '#ffffff', color: active ? '#fff' : '#334155', border: '1px solid #cbd5e1', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {draft.length} caractères
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => applyTemplate(r.id, r.author)} style={{ background: '#fff', color: '#4f46e5', border: '1px solid #c7d2fe', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Template entreprise
                        </button>
                        <button style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Assigner à un membre
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => saveDraft(r.id)} style={{ background: '#fff', color: '#334155', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Brouillon
                        </button>
                        <button
                          onClick={() => sendReply(r.id, r.requiresApproval)}
                          disabled={!draft.trim()}
                          style={{ background: !draft.trim() ? '#c7d2fe' : r.requiresApproval ? '#f59e0b' : '#4f46e5', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: draft.trim() ? 'pointer' : 'not-allowed' }}
                        >
                          {r.requiresApproval ? 'Envoyer pour approbation manager' : 'Envoyer la réponse'}
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 14, padding: 12, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Commentaires équipe ({(comments[r.id] || []).length})</div>
                      {(comments[r.id] || []).map((c, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#334155', padding: '6px 10px', background: '#f8fafc', borderRadius: 6, marginBottom: 4 }}>{c}</div>
                      ))}
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <input
                          value={newComment[r.id] || ''}
                          onChange={e => setNewComment(n => ({ ...n, [r.id]: e.target.value }))}
                          placeholder="Ajouter un commentaire interne..."
                          style={{ flex: 1, padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, outline: 'none', color: '#0f172a' }}
                        />
                        <button onClick={() => addComment(r.id)} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {tab === 'templates' && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Bibliothèque de templates</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Variables supportées : {'{prénom}'}, {'{restaurant}'}, {'{date}'}, {'{table}'}. Classées par efficacité mesurée.</p>
              </div>
              <button style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Nouveau template</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {templates.map(t => (
                <div key={t.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#fafbff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{t.title}</div>
                    <span style={{ fontSize: 11, fontWeight: 600, background: '#eef2ff', color: '#4338ca', padding: '2px 8px', borderRadius: 6 }}>{t.stars} ★</span>
                  </div>
                  {editingTplId === t.id ? (
                    <textarea
                      value={t.body}
                      onChange={e => updateTemplate(t.id, e.target.value)}
                      style={{ width: '100%', minHeight: 90, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
                    />
                  ) : (
                    <p style={{ margin: 0, color: '#334155', fontSize: 13, lineHeight: 1.5 }}>{t.body}</p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                      <span style={{ color: '#64748b' }}>Utilisé <strong style={{ color: '#0f172a' }}>{t.usage}×</strong></span>
                      <span style={{ color: '#059669' }}>Score moyen <strong>{t.avgResponseScore}%</strong></span>
                    </div>
                    <button onClick={() => setEditingTplId(editingTplId === t.id ? null : t.id)} style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {editingTplId === t.id ? 'Terminé' : 'Modifier'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>SLA - Temps de réponse</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={slaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="semaine" stroke="#64748b" style={{ fontSize: 12 }} />
                    <YAxis stroke="#64748b" style={{ fontSize: 12 }} unit="h" />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="heures" stroke="#4f46e5" strokeWidth={2.5} name="Heures moyennes" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 10, padding: 10, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, fontSize: 12, color: '#065f46' }}>
                  Objectif SLA : répondre sous 4h. Performance actuelle : <strong>1.8h</strong>, dans l'objectif.
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Impact NPS avant/après réponse</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sentResponses.map(r => ({ name: r.author, avant: r.npsBefore, apres: r.npsAfter }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 11 }} />
                    <YAxis stroke="#64748b" style={{ fontSize: 12 }} domain={[0, 10]} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="avant" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="NPS avant" />
                    <Bar dataKey="apres" fill="#4f46e5" radius={[4, 4, 0, 0]} name="NPS après" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Performance équipe</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, fontSize: 12, fontWeight: 700, color: '#64748b', padding: '0 12px 10px', borderBottom: '1px solid #f1f5f9' }}>
                <div>Membre</div>
                <div>Avis répondus</div>
                <div>SLA moyen</div>
                <div>Score qualité</div>
              </div>
              {teamPerf.map(m => (
                <div key={m.membre} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, fontSize: 13, padding: '12px', borderBottom: '1px solid #f8fafc', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{m.membre}</div>
                  <div style={{ color: '#334155' }}>{m.repondus}</div>
                  <div style={{ color: m.sla < 2 ? '#059669' : '#f59e0b', fontWeight: 600 }}>{m.sla}h</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                        <div style={{ width: `${m.score}%`, height: '100%', background: m.score >= 85 ? '#10b981' : '#f59e0b', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{m.score}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Flow de demande d'avis cross-platform</h3>
              <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: 13 }}>Après chaque réponse envoyée, proposez au client de partager son avis sur d'autres plateformes.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[
                  { p: 'Google', sent: 142, conv: 68 },
                  { p: 'TripAdvisor', sent: 98, conv: 42 },
                  { p: 'Facebook', sent: 67, conv: 31 },
                  { p: 'TheFork', sent: 54, conv: 29 },
                ].map(x => (
                  <div key={x.p} style={{ padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{x.p}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#4f46e5', marginTop: 4 }}>{x.conv}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>nouveaux avis / {x.sent} demandes</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'escalation' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Règles d'escalade automatique</h3>
              <p style={{ margin: '4px 0 16px', color: '#64748b', fontSize: 13 }}>Alertes envoyées au propriétaire par SMS</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { cond: 'Avis 1 étoile sur Google', action: 'SMS propriétaire + assignation Manager', active: true },
                  { cond: 'Mention "intoxication" / "hygiène"', action: 'SMS urgent propriétaire', active: true },
                  { cond: 'Mention "avocat" / "remboursement"', action: 'Alerte direction + rendez-vous auto', active: true },
                  { cond: '3 avis <= 2★ en moins de 48h', action: 'Réunion crise convoquée', active: true },
                  { cond: 'Avis viral (>50 partages)', action: 'Équipe communication alertée', active: false },
                ].map(r => (
                  <div key={r.cond} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, background: '#fafbff', borderRadius: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{r.cond}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>→ {r.action}</div>
                    </div>
                    <div style={{ width: 42, height: 22, borderRadius: 11, background: r.active ? '#4f46e5' : '#cbd5e1', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 2, left: r.active ? 22 : 2, width: 18, height: 18, borderRadius: 9, background: '#fff', transition: 'left 0.2s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Workflow d'approbation manager</h3>
              <p style={{ margin: '4px 0 16px', color: '#64748b', fontSize: 13 }}>Les réponses aux avis 1-2★ nécessitent une validation avant publication</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pendingReviews.filter(r => r.requiresApproval).map(r => (
                  <div key={r.id} style={{ padding: 14, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{r.author} · {renderStars(r.stars)}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{r.platform} · {r.date}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, background: '#b45309', color: '#fff', padding: '3px 8px', borderRadius: 6 }}>À valider</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#78350f', margin: '8px 0 0', lineHeight: 1.4 }}>{r.comment.slice(0, 120)}...</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button style={{ flex: 1, background: '#10b981', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Approuver</button>
                      <button style={{ flex: 1, background: '#fff', color: '#475569', border: '1px solid #cbd5e1', padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Renvoyer</button>
                      <button style={{ background: 'transparent', color: '#b91c1c', border: 'none', padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Refuser</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'patterns' && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Problèmes récurrents détectés</h3>
            <p style={{ margin: '4px 0 18px', color: '#64748b', fontSize: 13 }}>L'IA analyse vos avis et détecte les sujets qui reviennent. Une auto-excuse enrichie est proposée pour chaque motif.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {repeatedIssues.map(p => {
                const sev = p.severity === 'high' ? { bg: '#fef2f2', bd: '#fecaca', c: '#991b1b' } : p.severity === 'medium' ? { bg: '#fffbeb', bd: '#fde68a', c: '#92400e' } : { bg: '#eff6ff', bd: '#bfdbfe', c: '#1d4ed8' };
                return (
                  <div key={p.issue} style={{ padding: 16, background: sev.bg, border: `1px solid ${sev.bd}`, borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: sev.c }}>{p.issue}</div>
                        <div style={{ fontSize: 12, color: sev.c, marginTop: 4 }}>Mentionné <strong>{p.count} fois</strong> dans les 30 derniers jours · Tendance {p.trend}</div>
                      </div>
                      <button style={{ background: sev.c, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Voir les avis concernés</button>
                    </div>
                    <div style={{ marginTop: 10, padding: 10, background: '#fff', borderRadius: 8, fontSize: 12, color: '#334155', lineHeight: 1.5, fontStyle: 'italic' }}>
                      Auto-excuse suggérée : "Nous comprenons votre frustration concernant {p.issue.toLowerCase()}. C'est un point que nous travaillons activement — travaux en cours, partenariat en place..."
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
          <button
            onClick={() => setArchiveOpen(o => !o)}
            style={{ width: '100%', background: 'transparent', border: 'none', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: '#0f172a' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Archive des réponses envoyées</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>({sentResponses.length} réponses)</span>
            </div>
            <span style={{ fontSize: 18, color: '#64748b', transform: archiveOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
          </button>
          <AnimatePresence initial={false}>
            {archiveOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ borderTop: '1px solid #f1f5f9' }}>
                  {sentResponses.map(s => {
                    const ps = platformStyles[s.platform];
                    return (
                      <div key={s.id} style={{ padding: '14px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ width: 28, height: 28, borderRadius: 8, background: ps.bg, color: ps.color, border: `1px solid ${ps.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{ps.logo}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{s.author}</span>
                            <span style={{ fontSize: 12, color: '#94a3b8' }}>{s.timestamp}</span>
                            <span style={{ fontSize: 11, background: '#ecfdf5', color: '#065f46', padding: '2px 7px', borderRadius: 5, fontWeight: 600 }}>SLA {s.sla}h</span>
                            <span style={{ fontSize: 11, background: '#eef2ff', color: '#3730a3', padding: '2px 7px', borderRadius: 5, fontWeight: 600 }}>NPS {s.npsBefore} → {s.npsAfter}</span>
                          </div>
                          <div style={{ color: '#475569', fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.preview}</div>
                        </div>
                        <button style={{ background: 'transparent', border: '1px solid #e5e7eb', color: '#475569', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Voir</button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
