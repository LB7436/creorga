import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Urgency = 'amiable' | 'relance1' | 'relance2' | 'demeure';

interface OverdueInvoice {
  id: string;
  numero: string;
  client: string;
  email: string;
  emission: string;
  echeance: string;
  retard: number;
  montant: number;
  relancesEnvoyees: number;
  derniereRelance: string | null;
  statut: string;
  history: { date: string; type: string; note: string }[];
}

const palette = {
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#1e293b',
  subtle: '#64748b',
  muted: '#94a3b8',
  primary: '#6366f1',
  success: '#10b981',
  amiable: '#fbbf24',
  relance1: '#f97316',
  relance2: '#ef4444',
  demeure: '#991b1b',
};

const urgencyFor = (retard: number): Urgency => {
  if (retard <= 15) return 'amiable';
  if (retard <= 30) return 'relance1';
  if (retard <= 60) return 'relance2';
  return 'demeure';
};

const urgencyMeta: Record<Urgency, { label: string; color: string; bg: string; badge: string }> = {
  amiable: { label: 'Rappel amiable', color: '#92400e', bg: '#fef3c7', badge: palette.amiable },
  relance1: { label: 'Relance 1', color: '#9a3412', bg: '#ffedd5', badge: palette.relance1 },
  relance2: { label: 'Relance 2', color: '#991b1b', bg: '#fee2e2', badge: palette.relance2 },
  demeure: { label: 'Mise en demeure', color: '#fff', bg: '#991b1b', badge: palette.demeure },
};

const mockInvoices: OverdueInvoice[] = [
  { id: '1', numero: 'F-2026-0412', client: 'Restaurant Le Chêne', email: 'compta@lechene.lu', emission: '2026-03-01', echeance: '2026-03-15', retard: 33, montant: 1240, relancesEnvoyees: 2, derniereRelance: '2026-04-10', statut: 'Relance 1',
    history: [
      { date: '2026-03-20', type: 'Email', note: 'Rappel amiable envoyé' },
      { date: '2026-04-10', type: 'Email', note: 'Relance 1 envoyée' },
    ] },
  { id: '2', numero: 'F-2026-0398', client: 'Bistrot du Coin', email: 'paul@bistrotducoin.lu', emission: '2026-02-10', echeance: '2026-02-28', retard: 48, montant: 890, relancesEnvoyees: 3, derniereRelance: '2026-04-12', statut: 'Relance 2',
    history: [
      { date: '2026-03-05', type: 'Email', note: 'Rappel amiable' },
      { date: '2026-03-25', type: 'Téléphone', note: 'Client promet paiement sous 7j' },
      { date: '2026-04-12', type: 'Email', note: 'Relance 2 envoyée' },
    ] },
  { id: '3', numero: 'F-2026-0420', client: 'Café Lumière', email: 'direction@cafelumiere.lu', emission: '2026-03-18', echeance: '2026-04-02', retard: 15, montant: 420, relancesEnvoyees: 1, derniereRelance: '2026-04-15', statut: 'Rappel amiable',
    history: [ { date: '2026-04-15', type: 'Email', note: 'Rappel amiable envoyé' } ] },
  { id: '4', numero: 'F-2026-0355', client: 'Brasserie Étoile', email: 'admin@brasserie-etoile.lu', emission: '2026-01-15', echeance: '2026-01-31', retard: 76, montant: 2180, relancesEnvoyees: 4, derniereRelance: '2026-04-14', statut: 'Mise en demeure',
    history: [
      { date: '2026-02-05', type: 'Email', note: 'Rappel amiable' },
      { date: '2026-02-20', type: 'Email', note: 'Relance 1' },
      { date: '2026-03-15', type: 'Téléphone', note: 'Aucune réponse' },
      { date: '2026-04-14', type: 'Courrier', note: 'Mise en demeure envoyée' },
    ] },
  { id: '5', numero: 'F-2026-0431', client: 'Pizzeria Roma', email: 'roma@pizzeriaroma.lu', emission: '2026-03-25', echeance: '2026-04-08', retard: 9, montant: 315, relancesEnvoyees: 0, derniereRelance: null, statut: 'Aucune relance',
    history: [] },
  { id: '6', numero: 'F-2026-0388', client: 'Gastronomie Vallée', email: 'contact@gastrovallee.lu', emission: '2026-02-01', echeance: '2026-02-20', retard: 56, montant: 1890, relancesEnvoyees: 2, derniereRelance: '2026-04-05', statut: 'Relance 2',
    history: [
      { date: '2026-03-10', type: 'Email', note: 'Relance 1' },
      { date: '2026-04-05', type: 'Email', note: 'Relance 2' },
    ] },
  { id: '7', numero: 'F-2026-0442', client: 'Tapas Bar Centro', email: 'centro@tapasbar.lu', emission: '2026-03-30', echeance: '2026-04-13', retard: 4, montant: 540, relancesEnvoyees: 0, derniereRelance: null, statut: 'Aucune relance',
    history: [] },
  { id: '8', numero: 'F-2026-0365', client: 'Sushi Kyoto', email: 'kyoto@sushiresto.lu', emission: '2026-01-28', echeance: '2026-02-15', retard: 61, montant: 980, relancesEnvoyees: 3, derniereRelance: '2026-04-11', statut: 'Mise en demeure',
    history: [
      { date: '2026-02-25', type: 'Email', note: 'Rappel amiable' },
      { date: '2026-03-15', type: 'Email', note: 'Relance 1' },
      { date: '2026-04-11', type: 'Courrier', note: 'Mise en demeure' },
    ] },
  { id: '9', numero: 'F-2026-0405', client: 'Brasserie Nord', email: 'brasserienord@mail.lu', emission: '2026-02-22', echeance: '2026-03-10', retard: 38, montant: 1120, relancesEnvoyees: 2, derniereRelance: '2026-04-08', statut: 'Relance 2',
    history: [
      { date: '2026-03-22', type: 'Email', note: 'Relance 1' },
      { date: '2026-04-08', type: 'Email', note: 'Relance 2' },
    ] },
  { id: '10', numero: 'F-2026-0415', client: 'Crêperie Bretonne', email: 'creperie@breton.lu', emission: '2026-03-12', echeance: '2026-03-26', retard: 22, montant: 640, relancesEnvoyees: 1, derniereRelance: '2026-04-10', statut: 'Relance 1',
    history: [ { date: '2026-04-10', type: 'Email', note: 'Relance 1 envoyée' } ] },
];

const defaultTemplates = [
  { id: 't1', name: 'Relance douce (amicale)', content: 'Bonjour {client_nom},\n\nNous nous permettons de vous rappeler très amicalement que la facture {facture_num} d\'un montant de {montant}€ est échue depuis {retard_jours} jours.\n\nPeut-être s\'agit-il d\'un oubli ? Nous restons à votre écoute.\n\nCordialement,\nL\'équipe Creorga' },
  { id: 't2', name: 'Relance formelle', content: 'Madame, Monsieur {client_nom},\n\nSauf erreur de notre part, la facture {facture_num} d\'un montant de {montant}€ reste impayée à ce jour, soit {retard_jours} jours de retard.\n\nNous vous prions de bien vouloir régulariser votre situation sous 8 jours.\n\nVeuillez agréer nos salutations distinguées.' },
  { id: 't3', name: 'Mise en demeure', content: 'MISE EN DEMEURE DE PAYER\n\nMadame, Monsieur {client_nom},\n\nMalgré nos précédentes relances, la facture {facture_num} d\'un montant de {montant}€ demeure impayée ({retard_jours} jours de retard).\n\nConformément à l\'article 1139 du Code Civil, nous vous mettons en demeure de régler cette somme sous HUIT (8) JOURS.\n\nÀ défaut, nous engagerons toute action en justice sans autre avis.' },
  { id: 't4', name: 'Dernier avis avant contentieux', content: 'Cher {client_nom},\n\nDernier rappel avant transmission du dossier à notre service contentieux. Facture {facture_num} - {montant}€ - {retard_jours} jours.\n\nMerci de régulariser immédiatement.' },
  { id: 't5', name: 'Accord de paiement échelonné', content: 'Bonjour {client_nom},\n\nConcernant la facture {facture_num} ({montant}€, {retard_jours} jours de retard), nous vous proposons un échelonnement sur 3 mois.\n\nMerci de nous confirmer votre accord.' },
];

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: palette.card, border: `1px solid ${palette.border}`, borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(15,23,42,0.04)', ...style }}>{children}</div>
);

export default function RelancesPage() {
  const [invoices] = useState(mockInvoices);
  const [selected, setSelected] = useState<OverdueInvoice | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortDesc, setSortDesc] = useState(true);
  const [templates, setTemplates] = useState(defaultTemplates);
  const [activeTemplate, setActiveTemplate] = useState(templates[0]);
  const [showPreview, setShowPreview] = useState(false);
  const [autoOn, setAutoOn] = useState(true);
  const [editingTpl, setEditingTpl] = useState<string | null>(null);

  const sorted = useMemo(() => [...invoices].sort((a, b) => sortDesc ? b.retard - a.retard : a.retard - b.retard), [invoices, sortDesc]);

  const toggleId = (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const renderPreview = (tpl: string, inv: OverdueInvoice) =>
    tpl.replaceAll('{client_nom}', inv.client).replaceAll('{facture_num}', inv.numero).replaceAll('{montant}', inv.montant.toLocaleString('fr-FR')).replaceAll('{retard_jours}', String(inv.retard));

  const stats = [
    { label: 'Factures en retard', value: '8', hint: 'En cours', color: palette.relance2 },
    { label: 'Montant total impayé', value: '4 230€', hint: '+12% vs mois dernier', color: palette.demeure },
    { label: 'Relances envoyées ce mois', value: '15', hint: '+3 cette semaine', color: palette.primary },
    { label: 'Taux de recouvrement', value: '72%', hint: 'Objectif 85%', color: palette.success },
  ];

  return (
    <div style={{ background: palette.bg, minHeight: '100vh', padding: 32, color: palette.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Relances clients</h1>
        <p style={{ margin: '6px 0 0', color: palette.subtle }}>Gestion des paiements en retard et automatisation des relances</p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <div style={{ color: palette.subtle, fontSize: 13, fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color, margin: '8px 0 4px' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: palette.muted }}>{s.hint}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1.4fr 1fr' : '1fr', gap: 20 }}>
        <div>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottom: `1px solid ${palette.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Factures en retard</h2>
                <span style={{ background: '#f1f5f9', padding: '2px 10px', borderRadius: 12, fontSize: 12, color: palette.subtle }}>{invoices.length}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {selectedIds.length > 0 && (
                  <button onClick={() => alert(`Relancer ${selectedIds.length} facture(s)`)} style={{ padding: '8px 14px', background: palette.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Relancer tout ({selectedIds.length})
                  </button>
                )}
                <button onClick={() => setSortDesc(s => !s)} style={{ padding: '8px 12px', background: '#fff', border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: palette.text }}>
                  Tri : {sortDesc ? 'Retard ↓' : 'Retard ↑'}
                </button>
                <button style={{ padding: '8px 12px', background: '#fff', border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: palette.text }}>
                  Export huissier
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: 12, width: 36 }}></th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', color: palette.subtle, fontWeight: 600 }}>N° facture</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', color: palette.subtle, fontWeight: 600 }}>Client</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', color: palette.subtle, fontWeight: 600 }}>Échéance</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right', color: palette.subtle, fontWeight: 600 }}>Retard</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right', color: palette.subtle, fontWeight: 600 }}>Montant</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center', color: palette.subtle, fontWeight: 600 }}>Relances</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', color: palette.subtle, fontWeight: 600 }}>Dernière</th>
                    <th style={{ padding: '12px 10px', textAlign: 'left', color: palette.subtle, fontWeight: 600 }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(inv => {
                    const u = urgencyFor(inv.retard);
                    const meta = urgencyMeta[u];
                    const isActive = selected?.id === inv.id;
                    return (
                      <tr key={inv.id} onClick={() => setSelected(inv)} style={{
                        cursor: 'pointer',
                        background: isActive ? '#eef2ff' : u === 'demeure' ? '#fef2f2' : u === 'relance2' ? '#fff5f5' : u === 'relance1' ? '#fffbeb' : 'transparent',
                        borderTop: `1px solid ${palette.border}`,
                        borderLeft: `3px solid ${meta.badge}`,
                      }}>
                        <td style={{ padding: 12, textAlign: 'center' }} onClick={e => { e.stopPropagation(); toggleId(inv.id); }}>
                          <input type="checkbox" checked={selectedIds.includes(inv.id)} onChange={() => {}} />
                        </td>
                        <td style={{ padding: '12px 10px', fontWeight: 600, color: palette.text }}>{inv.numero}</td>
                        <td style={{ padding: '12px 10px' }}>{inv.client}</td>
                        <td style={{ padding: '12px 10px', color: palette.subtle }}>{inv.echeance}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600, color: meta.badge }}>{inv.retard}j</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600 }}>{inv.montant.toLocaleString('fr-FR')}€</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>{inv.relancesEnvoyees}</span>
                        </td>
                        <td style={{ padding: '12px 10px', color: palette.subtle, fontSize: 12 }}>{inv.derniereRelance || '—'}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{ background: meta.bg, color: meta.color, padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{meta.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Relances automatiques</h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, color: palette.subtle }}>{autoOn ? 'Activé' : 'Désactivé'}</span>
                  <div onClick={() => setAutoOn(v => !v)} style={{ width: 42, height: 22, background: autoOn ? palette.success : palette.border, borderRadius: 12, position: 'relative', transition: '0.2s' }}>
                    <div style={{ width: 18, height: 18, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: autoOn ? 22 : 2, transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </label>
              </div>
              {[
                { day: 'J+15', label: 'Rappel amiable automatique', color: palette.amiable },
                { day: 'J+30', label: 'Relance 1 formelle', color: palette.relance1 },
                { day: 'J+60', label: 'Relance 2 + SMS', color: palette.relance2 },
              ].map(r => (
                <div key={r.day} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${palette.border}` }}>
                  <div style={{ width: 52, background: r.color, color: '#fff', textAlign: 'center', padding: '4px 0', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>{r.day}</div>
                  <div style={{ fontSize: 13 }}>{r.label}</div>
                </div>
              ))}
            </Card>

            <Card>
              <h3 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600 }}>Légende urgence</h3>
              {(['amiable', 'relance1', 'relance2', 'demeure'] as Urgency[]).map(u => {
                const m = urgencyMeta[u];
                const range = u === 'amiable' ? '0-15 jours' : u === 'relance1' ? '15-30 jours' : u === 'relance2' ? '30-60 jours' : '60+ jours';
                return (
                  <div key={u} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: `1px solid ${palette.border}` }}>
                    <div style={{ width: 12, height: 12, background: m.badge, borderRadius: 3 }} />
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: palette.subtle }}>{range}</div>
                  </div>
                );
              })}
            </Card>
          </div>

          <Card style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Templates de relance</h3>
              <span style={{ fontSize: 12, color: palette.subtle }}>{templates.length} modèles</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {templates.map(t => (
                <div key={t.id} style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: 14, background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                    <button onClick={() => setEditingTpl(editingTpl === t.id ? null : t.id)} style={{ background: 'none', border: 'none', color: palette.primary, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                      {editingTpl === t.id ? 'Fermer' : 'Modifier'}
                    </button>
                  </div>
                  {editingTpl === t.id ? (
                    <textarea value={t.content} onChange={e => setTemplates(arr => arr.map(x => x.id === t.id ? { ...x, content: e.target.value } : x))} style={{ width: '100%', minHeight: 120, padding: 8, fontSize: 12, border: `1px solid ${palette.border}`, borderRadius: 6, fontFamily: 'inherit', color: palette.text, background: '#fff' }} />
                  ) : (
                    <div style={{ fontSize: 12, color: palette.subtle, whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'hidden' }}>{t.content.slice(0, 180)}…</div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, color: palette.subtle }}>{selected.numero}</div>
                    <h3 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600 }}>{selected.client}</h3>
                    <div style={{ fontSize: 12, color: palette.subtle }}>{selected.email}</div>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, color: palette.muted, cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { k: 'Émission', v: selected.emission },
                    { k: 'Échéance', v: selected.echeance },
                    { k: 'Retard', v: `${selected.retard} jours` },
                    { k: 'Montant', v: `${selected.montant.toLocaleString('fr-FR')}€` },
                  ].map(x => (
                    <div key={x.k} style={{ background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: palette.subtle }}>{x.k}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{x.v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Historique des contacts</div>
                  <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                    {selected.history.length === 0 ? (
                      <div style={{ color: palette.muted, fontSize: 13, padding: 12, textAlign: 'center', background: '#f8fafc', borderRadius: 8 }}>Aucun contact enregistré</div>
                    ) : selected.history.map((h, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: i > 0 ? `1px solid ${palette.border}` : 'none', fontSize: 12 }}>
                        <div style={{ color: palette.subtle, width: 80 }}>{h.date}</div>
                        <div style={{ fontWeight: 600, width: 70 }}>{h.type}</div>
                        <div style={{ color: palette.text, flex: 1 }}>{h.note}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Template</div>
                  <select value={activeTemplate.id} onChange={e => setActiveTemplate(templates.find(t => t.id === e.target.value)!)} style={{ width: '100%', padding: 10, border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, background: '#fff', color: palette.text }}>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                {showPreview && (
                  <div style={{ background: '#f8fafc', border: `1px solid ${palette.border}`, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 220, overflowY: 'auto' }}>
                    {renderPreview(activeTemplate.content, selected)}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowPreview(v => !v)} style={{ flex: 1, padding: 11, background: '#fff', border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: palette.text }}>
                    {showPreview ? 'Masquer' : 'Prévisualiser'}
                  </button>
                  <button onClick={() => { alert('Relance envoyée à ' + selected.email); setShowPreview(false); }} style={{ flex: 1, padding: 11, background: palette.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Envoyer la relance
                  </button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
