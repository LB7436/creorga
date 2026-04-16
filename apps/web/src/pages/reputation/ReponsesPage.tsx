import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Platform = 'Google' | 'TripAdvisor' | 'Facebook' | 'Interne';
type Tone = 'Chaleureux' | 'Professionnel' | 'Excuse' | 'Explicatif';

interface PendingReview {
  id: number;
  author: string;
  avatar: string;
  stars: number;
  platform: Platform;
  date: string;
  comment: string;
}

interface SentResponse {
  id: number;
  author: string;
  platform: Platform;
  timestamp: string;
  preview: string;
}

interface Template {
  id: number;
  title: string;
  body: string;
}

const platformStyles: Record<Platform, { bg: string; color: string; border: string; logo: string }> = {
  Google: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', logo: 'G' },
  TripAdvisor: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', logo: 'T' },
  Facebook: { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe', logo: 'f' },
  Interne: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe', logo: 'C' },
};

const pendingReviews: PendingReview[] = [
  { id: 1, author: 'Camille V.', avatar: 'CV', stars: 5, platform: 'Google', date: '15 avr. 2026', comment: "Soirée absolument magique, service aux petits soins et cuisine créative. Le sommelier nous a guidés vers un accord mets-vin parfait. On reviendra sans hésiter !" },
  { id: 2, author: 'Antoine R.', avatar: 'AR', stars: 2, platform: 'TripAdvisor', date: '14 avr. 2026', comment: "Réservation à 20h, table donnée à 20h35. Le plat était froid et le serveur débordé. Dommage car la carte était prometteuse." },
  { id: 3, author: 'Léa P.', avatar: 'LP', stars: 4, platform: 'Facebook', date: '13 avr. 2026', comment: "Très bon rapport qualité-prix pour le menu du midi. L'ambiance est chaleureuse, parfait pour un déjeuner pro. J'aurais aimé plus de choix végétariens." },
  { id: 4, author: 'Marc D.', avatar: 'MD', stars: 1, platform: 'Google', date: '12 avr. 2026', comment: "Très déçu, le tartare manquait de fraîcheur et la note finale était 30% plus élevée qu'annoncé. J'attends un retour de la direction." },
  { id: 5, author: 'Nina H.', avatar: 'NH', stars: 5, platform: 'Interne', date: '11 avr. 2026', comment: "Un vrai moment de bonheur. Mention spéciale au chef pâtissier, le dessert signature est une œuvre d'art. Merci à toute l'équipe !" },
  { id: 6, author: 'Paul M.', avatar: 'PM', stars: 3, platform: 'TripAdvisor', date: '10 avr. 2026', comment: "Correct sans plus. Les plats sont bons mais les portions sont petites pour le prix. Le service est en revanche impeccable." },
  { id: 7, author: 'Sarah B.', avatar: 'SB', stars: 5, platform: 'Google', date: '9 avr. 2026', comment: "Fête d'anniversaire organisée avec le restaurant, ils ont tout géré à la perfection. Cadre magnifique et plats délicieux. Un grand merci !" },
  { id: 8, author: 'Yanis K.', avatar: 'YK', stars: 2, platform: 'Facebook', date: '8 avr. 2026', comment: "Plat végétarien insipide, légumes trop cuits. La carte annonce du bio mais rien ne le confirme. À revoir." },
];

const sentResponses: SentResponse[] = [
  { id: 101, author: 'Pierre L.', platform: 'Google', timestamp: '07 avr. 2026 — 14h22', preview: "Merci Pierre pour votre avis chaleureux ! Nous sommes ravis que votre expérience ait été à la hauteur…" },
  { id: 102, author: 'Marie S.', platform: 'TripAdvisor', timestamp: '06 avr. 2026 — 09h47', preview: "Bonjour Marie, merci pour votre retour détaillé. Nous prenons bonne note de vos remarques concernant…" },
  { id: 103, author: 'Sophie M.', platform: 'Facebook', timestamp: '04 avr. 2026 — 18h05', preview: "Chère Sophie, merci infiniment pour ce magnifique message. Nous sommes touchés d'avoir pu célébrer…" },
  { id: 104, author: 'Emma B.', platform: 'Google', timestamp: '03 avr. 2026 — 11h31', preview: "Bonjour Emma, nous vous remercions pour votre retour enthousiaste. Notre sommelier sera ravi…" },
  { id: 105, author: 'Thomas K.', platform: 'TripAdvisor', timestamp: '01 avr. 2026 — 16h18', preview: "Merci Thomas de votre fidélité. Le tartare est en effet un classique maison, préparé chaque matin…" },
];

const defaultTemplates: Template[] = [
  { id: 1, title: 'Remerciement 5 étoiles', body: "Bonjour {prénom}, un grand merci pour votre avis chaleureux ! Nous sommes ravis que votre expérience chez Creorga vous ait enchanté. Au plaisir de vous revoir très vite." },
  { id: 2, title: 'Retour mitigé 3-4 étoiles', body: "Bonjour {prénom}, merci pour votre retour constructif. Nous sommes heureux que vous ayez passé un bon moment et prenons note de vos remarques pour continuer à progresser." },
  { id: 3, title: 'Excuse 1-2 étoiles', body: "Bonjour {prénom}, nous sommes sincèrement désolés que votre visite n'ait pas été à la hauteur. Nous prenons contact avec vous en privé afin de comprendre et de vous proposer une solution." },
  { id: 4, title: 'Événement privé', body: "Bonjour {prénom}, merci infiniment d'avoir choisi Creorga pour cet événement. Toute l'équipe a été ravie de contribuer à ce moment unique." },
  { id: 5, title: 'Réservation manquée', body: "Bonjour {prénom}, nous vous prions de bien vouloir nous excuser pour ce désagrément. Pourriez-vous nous contacter à contact@creorga.lu afin que nous trouvions ensemble un geste commercial adapté ?" },
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

export default function ReponsesPage() {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [tones, setTones] = useState<Record<number, Tone>>({});
  const [templates, setTemplates] = useState<Template[]>(defaultTemplates);
  const [editingTplId, setEditingTplId] = useState<number | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [handled, setHandled] = useState<Record<number, 'sent' | 'draft'>>({});

  const totalPending = useMemo(() => pendingReviews.filter(r => !handled[r.id]).length, [handled]);

  const applySuggestion = (id: number, text: string) => setDrafts(d => ({ ...d, [id]: text }));
  const updateDraft = (id: number, text: string) => setDrafts(d => ({ ...d, [id]: text }));
  const setTone = (id: number, tone: Tone) => setTones(t => ({ ...t, [id]: tone }));
  const applyTemplate = (id: number, author: string) => {
    const tpl = templates[0];
    const firstName = author.split(' ')[0];
    setDrafts(d => ({ ...d, [id]: tpl.body.replace('{prénom}', firstName) }));
  };
  const sendReply = (id: number) => setHandled(h => ({ ...h, [id]: 'sent' }));
  const saveDraft = (id: number) => setHandled(h => ({ ...h, [id]: 'draft' }));
  const updateTemplate = (id: number, body: string) =>
    setTemplates(ts => ts.map(t => (t.id === id ? { ...t, body } : t)));

  return (
    <div style={{ background: '#f8fafc', minHeight: '100%', padding: 28, color: '#0f172a' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Réponses aux avis</h1>
            <p style={{ color: '#64748b', marginTop: 6, fontSize: 14 }}>Gérez vos réponses publiques avec l'aide de suggestions IA contextuelles.</p>
          </div>
          <div style={{ background: '#eef2ff', color: '#4338ca', padding: '8px 14px', borderRadius: 999, fontWeight: 600, fontSize: 13, border: '1px solid #c7d2fe' }}>
            {totalPending} avis en attente
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
          <StatCard label="Avis sans réponse" value="5" sub="−2 vs semaine passée" accent="#059669" />
          <StatCard label="Temps de réponse moyen" value="2.3h" sub="Objectif < 4h" accent="#2563eb" />
          <StatCard label="Taux de réponse" value="94%" sub="+3 pts ce mois" accent="#059669" />
          <StatCard label="Sentiment moyen" value="4.6/5" sub="+0.2 vs mois précédent" accent="#059669" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pendingReviews.map((r, idx) => {
            const ps = platformStyles[r.platform];
            const suggestions = suggestionFor(r.stars, r.author);
            const status = handled[r.id];
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.35 }}
                style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}
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
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{r.date}</span>
                      {status && (
                        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: status === 'sent' ? '#059669' : '#d97706', background: status === 'sent' ? '#ecfdf5' : '#fffbeb', border: `1px solid ${status === 'sent' ? '#a7f3d0' : '#fde68a'}`, padding: '3px 10px', borderRadius: 999 }}>
                          {status === 'sent' ? 'Envoyée' : 'Brouillon sauvegardé'}
                        </span>
                      )}
                    </div>
                    <p style={{ marginTop: 10, color: '#334155', lineHeight: 1.55, fontSize: 14 }}>{r.comment}</p>
                  </div>
                </div>

                <div style={{ padding: 18, background: '#fafbff' }}>
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
                    value={drafts[r.id] ?? ''}
                    onChange={e => updateDraft(r.id, e.target.value)}
                    placeholder="Rédigez votre réponse ou cliquez sur une suggestion IA…"
                    style={{ width: '100%', minHeight: 110, padding: 12, border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', background: '#fff', color: '#0f172a', lineHeight: 1.55 }}
                  />

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
                      {(drafts[r.id] ?? '').length} caractères
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
                    <button
                      onClick={() => applyTemplate(r.id, r.author)}
                      style={{ background: '#fff', color: '#4f46e5', border: '1px solid #c7d2fe', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Utiliser template entreprise
                    </button>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => saveDraft(r.id)}
                        style={{ background: '#fff', color: '#334155', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Enregistrer comme brouillon
                      </button>
                      <button
                        onClick={() => sendReply(r.id)}
                        disabled={!(drafts[r.id] ?? '').trim()}
                        style={{ background: (drafts[r.id] ?? '').trim() ? '#4f46e5' : '#c7d2fe', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: (drafts[r.id] ?? '').trim() ? 'pointer' : 'not-allowed' }}
                      >
                        Envoyer la réponse
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div style={{ marginTop: 32, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Templates entreprise</h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Modèles de réponses personnalisables — utilisez {'{prénom}'} comme variable.</p>
            </div>
            <span style={{ fontSize: 12, color: '#64748b' }}>{templates.length} modèles</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {templates.map(t => (
              <div key={t.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#fafbff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{t.title}</div>
                  <button
                    onClick={() => setEditingTplId(editingTplId === t.id ? null : t.id)}
                    style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {editingTplId === t.id ? 'Terminé' : 'Modifier'}
                  </button>
                </div>
                {editingTplId === t.id ? (
                  <textarea
                    value={t.body}
                    onChange={e => updateTemplate(t.id, e.target.value)}
                    style={{ width: '100%', minHeight: 90, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', color: '#0f172a', background: '#fff' }}
                  />
                ) : (
                  <p style={{ margin: 0, color: '#334155', fontSize: 13, lineHeight: 1.5 }}>{t.body}</p>
                )}
              </div>
            ))}
          </div>
        </div>

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
