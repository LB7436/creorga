import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Package, Euro, AlertTriangle, Plus, X, Trash2, Eye, Send,
  Save, PackageCheck,
} from 'lucide-react';

/* ─── animations ─── */
const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20,
};

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' }).format(n);

/* ─── types ─── */
type Statut = 'Brouillon' | 'Envoyée' | 'Confirmée' | 'Partielle' | 'Reçue' | 'Annulée';

interface LigneCommande {
  id: string;
  produit: string;
  quantite: number;
  prixUnitaire: number;
  quantiteRecue?: number;
}

interface Commande {
  id: string;
  numero: string;
  fournisseurId: string;
  fournisseur: string;
  dateCommande: string;
  dateLivraisonPrevue: string;
  statut: Statut;
  lignes: LigneCommande[];
  notes?: string;
}

const STATUT_COLORS: Record<Statut, { bg: string; text: string; dot: string }> = {
  Brouillon: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  Envoyée:   { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  Confirmée: { bg: '#e0f2fe', text: '#0369a1', dot: '#0ea5e9' },
  Partielle: { bg: '#fef9c3', text: '#854d0e', dot: '#eab308' },
  Reçue:     { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
  Annulée:   { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
};

const FOURNISSEURS = [
  { id: 'f1', nom: 'Metro Luxembourg' },
  { id: 'f2', nom: 'Bofrost' },
  { id: 'f3', nom: 'Luxlait' },
  { id: 'f4', nom: 'Cave des Vignerons' },
  { id: 'f5', nom: 'Brasserie Nationale' },
  { id: 'f6', nom: 'Ferme Bio Schengen' },
  { id: 'f7', nom: 'Fournisseur Pâtisseries' },
  { id: 'f8', nom: 'Proxi Nettoyage' },
];

const CATALOGUE_PRODUITS = [
  { nom: 'Café en grains (kg)',   prix: 18.50 },
  { nom: 'Lait entier (L)',       prix: 1.20 },
  { nom: 'Beurre (kg)',           prix: 9.00 },
  { nom: 'Farine T55 (kg)',       prix: 2.50 },
  { nom: 'Sucre (kg)',            prix: 1.80 },
  { nom: 'Bière Diekirch (24×)',  prix: 22.80 },
  { nom: 'Vin Moselle (btl)',     prix: 11.00 },
  { nom: 'Coca-Cola (24 canettes)', prix: 18.00 },
  { nom: 'Tomates (kg)',          prix: 2.90 },
  { nom: 'Pommes de terre (kg)',  prix: 1.20 },
  { nom: 'Poulet (kg)',           prix: 8.90 },
  { nom: 'Produit nettoyant (L)', prix: 4.80 },
];

const TVA_RATE = 0.17;

/* ─── mock orders ─── */
const INITIAL: Commande[] = [
  {
    id: 'c1', numero: 'CMD-2026-045', fournisseurId: 'f1', fournisseur: 'Metro Luxembourg',
    dateCommande: '2026-04-14', dateLivraisonPrevue: '2026-04-17', statut: 'Envoyée',
    lignes: [
      { id: 'l1', produit: 'Farine T55 (kg)', quantite: 25, prixUnitaire: 2.50 },
      { id: 'l2', produit: 'Sucre (kg)',      quantite: 15, prixUnitaire: 1.80 },
    ],
  },
  {
    id: 'c2', numero: 'CMD-2026-044', fournisseurId: 'f3', fournisseur: 'Luxlait',
    dateCommande: '2026-04-13', dateLivraisonPrevue: '2026-04-15', statut: 'Reçue',
    lignes: [
      { id: 'l1', produit: 'Lait entier (L)', quantite: 60, prixUnitaire: 1.20, quantiteRecue: 60 },
      { id: 'l2', produit: 'Beurre (kg)',     quantite: 8,  prixUnitaire: 9.00, quantiteRecue: 8 },
    ],
  },
  {
    id: 'c3', numero: 'CMD-2026-043', fournisseurId: 'f2', fournisseur: 'Bofrost',
    dateCommande: '2026-04-12', dateLivraisonPrevue: '2026-04-14', statut: 'Partielle',
    lignes: [
      { id: 'l1', produit: 'Poulet (kg)',           quantite: 20, prixUnitaire: 8.90, quantiteRecue: 15 },
      { id: 'l2', produit: 'Café en grains (kg)',   quantite: 5,  prixUnitaire: 18.50, quantiteRecue: 5 },
    ],
  },
  {
    id: 'c4', numero: 'CMD-2026-042', fournisseurId: 'f5', fournisseur: 'Brasserie Nationale',
    dateCommande: '2026-04-11', dateLivraisonPrevue: '2026-04-13', statut: 'Reçue',
    lignes: [
      { id: 'l1', produit: 'Bière Diekirch (24×)', quantite: 10, prixUnitaire: 22.80, quantiteRecue: 10 },
    ],
  },
  {
    id: 'c5', numero: 'CMD-2026-041', fournisseurId: 'f4', fournisseur: 'Cave des Vignerons',
    dateCommande: '2026-04-09', dateLivraisonPrevue: '2026-04-12', statut: 'Confirmée',
    lignes: [
      { id: 'l1', produit: 'Vin Moselle (btl)', quantite: 24, prixUnitaire: 11.00 },
    ],
  },
  {
    id: 'c6', numero: 'CMD-2026-040', fournisseurId: 'f6', fournisseur: 'Ferme Bio Schengen',
    dateCommande: '2026-04-08', dateLivraisonPrevue: '2026-04-10', statut: 'Reçue',
    lignes: [
      { id: 'l1', produit: 'Tomates (kg)',        quantite: 12, prixUnitaire: 2.90, quantiteRecue: 12 },
      { id: 'l2', produit: 'Pommes de terre (kg)',quantite: 30, prixUnitaire: 1.20, quantiteRecue: 30 },
    ],
  },
  {
    id: 'c7', numero: 'CMD-2026-039', fournisseurId: 'f1', fournisseur: 'Metro Luxembourg',
    dateCommande: '2026-04-05', dateLivraisonPrevue: '2026-04-07', statut: 'Reçue',
    lignes: [
      { id: 'l1', produit: 'Coca-Cola (24 canettes)', quantite: 8, prixUnitaire: 18.00, quantiteRecue: 8 },
    ],
  },
  {
    id: 'c8', numero: 'CMD-2026-038', fournisseurId: 'f8', fournisseur: 'Proxi Nettoyage',
    dateCommande: '2026-04-02', dateLivraisonPrevue: '2026-04-04', statut: 'Envoyée',
    lignes: [
      { id: 'l1', produit: 'Produit nettoyant (L)', quantite: 20, prixUnitaire: 4.80 },
    ],
  },
  {
    id: 'c9', numero: 'CMD-2026-037', fournisseurId: 'f7', fournisseur: 'Fournisseur Pâtisseries',
    dateCommande: '2026-03-30', dateLivraisonPrevue: '2026-04-01', statut: 'Brouillon',
    lignes: [
      { id: 'l1', produit: 'Beurre (kg)', quantite: 10, prixUnitaire: 9.00 },
    ],
  },
  {
    id: 'c10', numero: 'CMD-2026-036', fournisseurId: 'f4', fournisseur: 'Cave des Vignerons',
    dateCommande: '2026-03-26', dateLivraisonPrevue: '2026-03-29', statut: 'Annulée',
    lignes: [
      { id: 'l1', produit: 'Vin Moselle (btl)', quantite: 12, prixUnitaire: 11.00 },
    ],
  },
];

/* ─── totals ─── */
function totalsOf(lignes: LigneCommande[]) {
  const ht = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const tva = ht * TVA_RATE;
  return { ht, tva, ttc: ht + tva };
}

const ALL_STATUTS: (Statut | 'Tous')[] = ['Tous', 'Brouillon', 'Envoyée', 'Confirmée', 'Partielle', 'Reçue', 'Annulée'];

/* ─── overlay ─── */
function Overlay({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,0.45)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 24,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: wide ? 860 : 600,
            maxHeight: '88vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(15,23,42,0.25)',
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── page ─── */
export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>(INITIAL);
  const [filter, setFilter] = useState<Statut | 'Tous'>('Tous');
  const [newOpen, setNewOpen] = useState(false);
  const [receiving, setReceiving] = useState<Commande | null>(null);
  const [viewing, setViewing] = useState<Commande | null>(null);

  const stats = useMemo(() => {
    const enCours = commandes.filter((c) => ['Envoyée', 'Confirmée', 'Partielle'].includes(c.statut)).length;
    const recues = commandes.filter((c) => c.statut === 'Reçue').length;
    const total = commandes
      .filter((c) => c.statut !== 'Annulée' && c.statut !== 'Brouillon')
      .reduce((s, c) => s + totalsOf(c.lignes).ttc, 0);
    const today = new Date();
    const retards = commandes.filter((c) =>
      ['Envoyée', 'Confirmée'].includes(c.statut) && new Date(c.dateLivraisonPrevue) < today,
    ).length;
    return { enCours, recues, total, retards };
  }, [commandes]);

  const filtered = useMemo(() => {
    if (filter === 'Tous') return commandes;
    return commandes.filter((c) => c.statut === filter);
  }, [commandes, filter]);

  const save = (c: Commande) => {
    setCommandes((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = c; return copy; }
      return [c, ...prev];
    });
    setNewOpen(false);
  };

  const handleReceive = (c: Commande) => {
    setCommandes((prev) => prev.map((x) => (x.id === c.id ? c : x)));
    setReceiving(null);
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto', color: '#0f172a' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.3 }}>Commandes d'achat</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Bons de commande, suivi des livraisons et réception des marchandises.
          </p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            background: '#0f172a', color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Nouvelle commande
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard icon={<ShoppingCart size={20} />} label="En cours" value={String(stats.enCours)} tint="#dbeafe" textTint="#1e40af" />
        <StatCard icon={<Package size={20} />} label="Reçues ce mois" value={String(stats.recues)} tint="#dcfce7" textTint="#166534" />
        <StatCard icon={<Euro size={20} />} label="Total achats" value={fmt(stats.total)} tint="#fef3c7" textTint="#92400e" />
        <StatCard icon={<AlertTriangle size={20} />} label="Retards" value={String(stats.retards)} tint="#fee2e2" textTint="#991b1b" />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {ALL_STATUTS.map((s) => {
          const active = filter === s;
          const style = s === 'Tous' ? undefined : STATUT_COLORS[s as Statut];
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                border: active ? '1px solid #0f172a' : '1px solid #e2e8f0',
                background: active ? '#0f172a' : style?.bg ?? '#fff',
                color: active ? '#fff' : style?.text ?? '#334155',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              {s !== 'Tous' && !active && (
                <span style={{ width: 6, height: 6, borderRadius: 99, background: style!.dot }} />
              )}
              {s}
            </button>
          );
        })}
      </div>

      <motion.div variants={fadeIn} initial="hidden" animate="show" style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>N° commande</th>
                <th style={thStyle}>Fournisseur</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Livraison prévue</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>HT</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>TVA</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>TTC</th>
                <th style={thStyle}>Statut</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Aucune commande</td></tr>
              )}
              {filtered.map((c) => {
                const { ht, tva, ttc } = totalsOf(c.lignes);
                const st = STATUT_COLORS[c.statut];
                return (
                  <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}><strong>{c.numero}</strong></td>
                    <td style={tdStyle}>{c.fournisseur}</td>
                    <td style={tdStyle}>{new Date(c.dateCommande).toLocaleDateString('fr-LU')}</td>
                    <td style={tdStyle}>{new Date(c.dateLivraisonPrevue).toLocaleDateString('fr-LU')}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(ht)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#64748b' }}>{fmt(tva)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmt(ttc)}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        background: st.bg, color: st.text,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: 99, background: st.dot }} />
                        {c.statut}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => setViewing(c)}
                        title="Voir"
                        style={iconBtn}
                      >
                        <Eye size={14} />
                      </button>
                      {c.statut === 'Envoyée' && (
                        <button
                          onClick={() => setReceiving(c)}
                          title="Réceptionner"
                          style={{ ...iconBtn, color: '#166534' }}
                        >
                          <PackageCheck size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {newOpen && (
        <Overlay onClose={() => setNewOpen(false)} wide>
          <CommandeForm onSave={save} onCancel={() => setNewOpen(false)} />
        </Overlay>
      )}
      {receiving && (
        <Overlay onClose={() => setReceiving(null)} wide>
          <ReceiveForm commande={receiving} onConfirm={handleReceive} onCancel={() => setReceiving(null)} />
        </Overlay>
      )}
      {viewing && (
        <Overlay onClose={() => setViewing(null)} wide>
          <ViewPanel commande={viewing} onClose={() => setViewing(null)} />
        </Overlay>
      )}
    </div>
  );
}

/* ─── sub components ─── */
function StatCard({
  icon, label, value, tint, textTint,
}: { icon: React.ReactNode; label: string; value: string; tint: string; textTint: string }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: tint, color: textTint,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{icon}</div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── create form ─── */
function CommandeForm({ onSave, onCancel }: { onSave: (c: Commande) => void; onCancel: () => void }) {
  const [fournisseurId, setFournisseurId] = useState(FOURNISSEURS[0].id);
  const [dateLivraison, setDateLivraison] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [lignes, setLignes] = useState<LigneCommande[]>([]);

  const { ht, tva, ttc } = totalsOf(lignes);

  const addLigne = () => {
    const base = CATALOGUE_PRODUITS[0];
    setLignes((ls) => [...ls, { id: Math.random().toString(36).slice(2), produit: base.nom, quantite: 1, prixUnitaire: base.prix }]);
  };
  const updateLigne = (id: string, patch: Partial<LigneCommande>) =>
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLigne = (id: string) => setLignes((ls) => ls.filter((l) => l.id !== id));

  const pickProduit = (id: string, nom: string) => {
    const p = CATALOGUE_PRODUITS.find((x) => x.nom === nom);
    if (p) updateLigne(id, { produit: p.nom, prixUnitaire: p.prix });
  };

  const build = (statut: Statut): Commande => {
    const f = FOURNISSEURS.find((x) => x.id === fournisseurId)!;
    const num = `CMD-2026-${String(Math.floor(Math.random() * 900) + 100)}`;
    return {
      id: Math.random().toString(36).slice(2),
      numero: num, fournisseurId, fournisseur: f.nom,
      dateCommande: new Date().toISOString().slice(0, 10),
      dateLivraisonPrevue: dateLivraison, statut, lignes, notes,
    };
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Nouvelle commande</h2>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
        <Field label="Fournisseur">
          <select value={fournisseurId} onChange={(e) => setFournisseurId(e.target.value)} style={inputStyle}>
            {FOURNISSEURS.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
        </Field>
        <Field label="Date souhaitée de livraison">
          <input type="date" value={dateLivraison} onChange={(e) => setDateLivraison(e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 8px' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Articles</h3>
        <button onClick={addLigne} style={addBtnStyle}><Plus size={13} /> Ajouter un article</button>
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={thStyle}>Produit</th>
              <th style={thStyle}>Qté</th>
              <th style={thStyle}>PU HT</th>
              <th style={thStyle}>Total HT</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {lignes.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Aucun article — cliquez sur « Ajouter »</td></tr>
            )}
            {lignes.map((l) => (
              <tr key={l.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={tdStyle}>
                  <select value={l.produit} onChange={(e) => pickProduit(l.id, e.target.value)} style={miniInput}>
                    {CATALOGUE_PRODUITS.map((p) => <option key={p.nom}>{p.nom}</option>)}
                  </select>
                </td>
                <td style={tdStyle}>
                  <input type="number" min="1" value={l.quantite}
                    onChange={(e) => updateLigne(l.id, { quantite: Number(e.target.value) })}
                    style={{ ...miniInput, width: 80 }} />
                </td>
                <td style={tdStyle}>
                  <input type="number" step="0.01" value={l.prixUnitaire}
                    onChange={(e) => updateLigne(l.id, { prixUnitaire: Number(e.target.value) })}
                    style={{ ...miniInput, width: 100 }} />
                </td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(l.quantite * l.prixUnitaire)}</td>
                <td style={tdStyle}>
                  <button onClick={() => removeLigne(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 12,
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, maxWidth: 360, marginLeft: 'auto',
      }}>
        <div style={{ color: '#64748b', fontSize: 13 }}>Sous-total HT</div><div style={{ textAlign: 'right' }}>{fmt(ht)}</div>
        <div style={{ color: '#64748b', fontSize: 13 }}>TVA 17%</div><div style={{ textAlign: 'right' }}>{fmt(tva)}</div>
        <div style={{ fontWeight: 700 }}>Total TTC</div><div style={{ textAlign: 'right', fontWeight: 700, fontSize: 16 }}>{fmt(ttc)}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Instructions de livraison, remarques, etc." />
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
        <button onClick={onCancel} style={ghostBtn}>Annuler</button>
        <button onClick={() => onSave(build('Brouillon'))} style={{ ...ghostBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Save size={13} /> Enregistrer brouillon
        </button>
        <button onClick={() => onSave(build('Envoyée'))} style={{ ...primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Send size={13} /> Envoyer au fournisseur
        </button>
      </div>
    </div>
  );
}

/* ─── receive form ─── */
function ReceiveForm({
  commande, onConfirm, onCancel,
}: { commande: Commande; onConfirm: (c: Commande) => void; onCancel: () => void }) {
  const [recues, setRecues] = useState<Record<string, number>>(
    Object.fromEntries(commande.lignes.map((l) => [l.id, l.quantite])),
  );

  const updateQty = (id: string, q: number) => setRecues((r) => ({ ...r, [id]: q }));

  const hasEcart = commande.lignes.some((l) => (recues[l.id] ?? 0) !== l.quantite);
  const partiel = commande.lignes.some((l) => (recues[l.id] ?? 0) < l.quantite);

  const confirm = () => {
    const lignes = commande.lignes.map((l) => ({ ...l, quantiteRecue: recues[l.id] ?? 0 }));
    const statut: Statut = partiel ? 'Partielle' : 'Reçue';
    onConfirm({ ...commande, lignes, statut });
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Réceptionner — {commande.numero}</h2>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>
      </div>
      <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: 13 }}>
        Fournisseur : <strong>{commande.fournisseur}</strong> · Comparez les quantités livrées avec les quantités commandées.
      </p>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={thStyle}>Produit</th>
              <th style={thStyle}>Commandé</th>
              <th style={thStyle}>Reçu</th>
              <th style={thStyle}>Écart</th>
            </tr>
          </thead>
          <tbody>
            {commande.lignes.map((l) => {
              const q = recues[l.id] ?? 0;
              const ecart = q - l.quantite;
              return (
                <tr key={l.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>{l.produit}</td>
                  <td style={tdStyle}>{l.quantite}</td>
                  <td style={tdStyle}>
                    <input type="number" min="0" value={q}
                      onChange={(e) => updateQty(l.id, Number(e.target.value))}
                      style={{ ...miniInput, width: 90 }} />
                  </td>
                  <td style={tdStyle}>
                    {ecart === 0 ? (
                      <span style={{ color: '#64748b' }}>—</span>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        background: ecart < 0 ? '#fee2e2' : '#dbeafe',
                        color: ecart < 0 ? '#991b1b' : '#1e40af',
                      }}>
                        {ecart > 0 ? `+${ecart}` : ecart}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasEcart && (
        <div style={{
          marginTop: 14, padding: 12, borderRadius: 10,
          background: '#fef9c3', color: '#854d0e', fontSize: 12,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={14} />
          Des écarts ont été détectés. La commande sera marquée « {partiel ? 'Partielle' : 'Reçue (avec surplus)'} ».
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
        <button onClick={onCancel} style={ghostBtn}>Annuler</button>
        <button onClick={confirm} style={{ ...primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <PackageCheck size={13} /> Confirmer la réception
        </button>
      </div>
    </div>
  );
}

/* ─── view panel ─── */
function ViewPanel({ commande, onClose }: { commande: Commande; onClose: () => void }) {
  const { ht, tva, ttc } = totalsOf(commande.lignes);
  const st = STATUT_COLORS[commande.statut];
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{commande.numero}</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            {commande.fournisseur} · Livraison prévue le {new Date(commande.dateLivraisonPrevue).toLocaleDateString('fr-LU')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
            background: st.bg, color: st.text,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: st.dot }} />
            {commande.statut}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>
      </div>

      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            <th style={thStyle}>Produit</th>
            <th style={thStyle}>Qté cmd.</th>
            <th style={thStyle}>Qté reçue</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>PU HT</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {commande.lignes.map((l) => (
            <tr key={l.id} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={tdStyle}>{l.produit}</td>
              <td style={tdStyle}>{l.quantite}</td>
              <td style={tdStyle}>{l.quantiteRecue ?? '—'}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(l.prixUnitaire)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(l.quantite * l.prixUnitaire)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{
        marginTop: 14, padding: 14, background: '#f8fafc', borderRadius: 12,
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, maxWidth: 320, marginLeft: 'auto',
      }}>
        <div style={{ color: '#64748b', fontSize: 13 }}>Sous-total HT</div><div style={{ textAlign: 'right' }}>{fmt(ht)}</div>
        <div style={{ color: '#64748b', fontSize: 13 }}>TVA 17%</div><div style={{ textAlign: 'right' }}>{fmt(tva)}</div>
        <div style={{ fontWeight: 700 }}>Total TTC</div><div style={{ textAlign: 'right', fontWeight: 700, fontSize: 16 }}>{fmt(ttc)}</div>
      </div>

      {commande.notes && (
        <div style={{ marginTop: 14, padding: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>NOTES</div>
          <div style={{ fontSize: 13 }}>{commande.notes}</div>
        </div>
      )}
    </div>
  );
}

/* ─── helpers ─── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: '#64748b', fontWeight: 500, display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
  borderRadius: 10, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#0f172a',
  boxSizing: 'border-box',
};
const miniInput: React.CSSProperties = { ...inputStyle, padding: '6px 8px', fontSize: 12 };
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 12px', fontSize: 11, color: '#64748b',
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3,
};
const tdStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 13 };
const iconBtn: React.CSSProperties = {
  padding: '6px', background: 'transparent', border: '1px solid #e2e8f0',
  borderRadius: 8, cursor: 'pointer', color: '#334155', marginLeft: 4,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};
const addBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
  background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8,
  cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#334155',
};
const ghostBtn: React.CSSProperties = {
  padding: '10px 18px', background: '#fff', border: '1px solid #e2e8f0',
  borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#334155',
};
const primaryBtn: React.CSSProperties = {
  padding: '10px 18px', background: '#0f172a', color: '#fff', border: 'none',
  borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
};
