import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChefHat, Euro, TrendingUp, Plus, X, Pencil, Trash2, ChevronDown, ChevronUp,
  AlertTriangle, Clock, Calculator,
} from 'lucide-react';

/* ─── animation ─── */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

/* ─── shared style ─── */
const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  padding: 20,
};

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' }).format(n);

/* ─── types ─── */
type Allergene = 'Gluten' | 'Lactose' | 'Œufs' | 'Poisson' | 'Fruits à coque' | 'Soja' | 'Sulfites';

interface IngredientLine {
  id: string;
  nom: string;
  quantite: number;
  unite: string;
  coutUnitaire: number;
}

interface Recette {
  id: string;
  nom: string;
  emoji: string;
  categorie: string;
  ingredients: IngredientLine[];
  prixVente: number;
  tempsPrep: number;
  instructions: string;
  allergenes: Allergene[];
}

/* ─── ingredient catalog (with cost/unit from stock) ─── */
const CATALOGUE = [
  { nom: 'Pain de mie',       unite: 'tranche', cout: 0.15 },
  { nom: 'Jambon',            unite: 'g',       cout: 0.018 },
  { nom: 'Fromage râpé',      unite: 'g',       cout: 0.012 },
  { nom: 'Beurre',            unite: 'g',       cout: 0.009 },
  { nom: 'Salade romaine',    unite: 'g',       cout: 0.006 },
  { nom: 'Parmesan',          unite: 'g',       cout: 0.028 },
  { nom: 'Croûtons',          unite: 'g',       cout: 0.008 },
  { nom: 'Poulet grillé',     unite: 'g',       cout: 0.015 },
  { nom: 'Sauce César',       unite: 'ml',      cout: 0.011 },
  { nom: 'Mascarpone',        unite: 'g',       cout: 0.014 },
  { nom: 'Œufs',              unite: 'unité',   cout: 0.30 },
  { nom: 'Sucre',             unite: 'g',       cout: 0.0015 },
  { nom: 'Café espresso',     unite: 'shot',    cout: 0.22 },
  { nom: 'Cacao',             unite: 'g',       cout: 0.025 },
  { nom: 'Biscuits cuillère', unite: 'g',       cout: 0.018 },
  { nom: 'Café en grains',    unite: 'g',       cout: 0.025 },
  { nom: 'Lait entier',       unite: 'ml',      cout: 0.0012 },
  { nom: 'Poulet entier',     unite: 'g',       cout: 0.012 },
  { nom: 'Vin rouge',         unite: 'ml',      cout: 0.008 },
  { nom: 'Lardons',           unite: 'g',       cout: 0.014 },
  { nom: 'Champignons',       unite: 'g',       cout: 0.010 },
  { nom: 'Oignons',           unite: 'g',       cout: 0.004 },
  { nom: 'Farine T55',        unite: 'g',       cout: 0.0025 },
];

const ALLERGEN_MAP: Record<string, Allergene[]> = {
  'Pain de mie':       ['Gluten'],
  'Fromage râpé':      ['Lactose'],
  'Beurre':            ['Lactose'],
  'Parmesan':          ['Lactose'],
  'Croûtons':          ['Gluten'],
  'Sauce César':       ['Œufs', 'Poisson'],
  'Mascarpone':        ['Lactose'],
  'Œufs':              ['Œufs'],
  'Biscuits cuillère': ['Gluten', 'Œufs'],
  'Lait entier':       ['Lactose'],
  'Farine T55':        ['Gluten'],
  'Vin rouge':         ['Sulfites'],
};

function detectAllergenes(ingredients: IngredientLine[]): Allergene[] {
  const set = new Set<Allergene>();
  ingredients.forEach((i) => (ALLERGEN_MAP[i.nom] ?? []).forEach((a) => set.add(a)));
  return Array.from(set);
}

/* ─── mock recipes ─── */
const SEED: Omit<Recette, 'allergenes'>[] = [
  {
    id: 'r1', nom: 'Croque-monsieur', emoji: '🥪', categorie: 'Plat',
    ingredients: [
      { id: 'i1', nom: 'Pain de mie',    quantite: 2,   unite: 'tranche', coutUnitaire: 0.15 },
      { id: 'i2', nom: 'Jambon',         quantite: 40,  unite: 'g',       coutUnitaire: 0.018 },
      { id: 'i3', nom: 'Fromage râpé',   quantite: 50,  unite: 'g',       coutUnitaire: 0.012 },
      { id: 'i4', nom: 'Beurre',         quantite: 15,  unite: 'g',       coutUnitaire: 0.009 },
    ],
    prixVente: 8.50, tempsPrep: 10,
    instructions: 'Beurrer les tranches, garnir de jambon et fromage, passer au four 8 min à 200°C.',
  },
  {
    id: 'r2', nom: 'Salade César', emoji: '🥗', categorie: 'Entrée',
    ingredients: [
      { id: 'i1', nom: 'Salade romaine', quantite: 200, unite: 'g',  coutUnitaire: 0.006 },
      { id: 'i2', nom: 'Poulet grillé',  quantite: 120, unite: 'g',  coutUnitaire: 0.015 },
      { id: 'i3', nom: 'Parmesan',       quantite: 30,  unite: 'g',  coutUnitaire: 0.028 },
      { id: 'i4', nom: 'Croûtons',       quantite: 40,  unite: 'g',  coutUnitaire: 0.008 },
      { id: 'i5', nom: 'Sauce César',    quantite: 40,  unite: 'ml', coutUnitaire: 0.011 },
    ],
    prixVente: 12.90, tempsPrep: 12,
    instructions: 'Couper la salade, ajouter le poulet tiède, parsemer de parmesan et croûtons, lier avec la sauce.',
  },
  {
    id: 'r3', nom: 'Tiramisu', emoji: '🍰', categorie: 'Dessert',
    ingredients: [
      { id: 'i1', nom: 'Mascarpone',        quantite: 250, unite: 'g',    coutUnitaire: 0.014 },
      { id: 'i2', nom: 'Œufs',              quantite: 3,   unite: 'unité',coutUnitaire: 0.30 },
      { id: 'i3', nom: 'Sucre',             quantite: 80,  unite: 'g',    coutUnitaire: 0.0015 },
      { id: 'i4', nom: 'Café espresso',     quantite: 2,   unite: 'shot', coutUnitaire: 0.22 },
      { id: 'i5', nom: 'Cacao',             quantite: 15,  unite: 'g',    coutUnitaire: 0.025 },
      { id: 'i6', nom: 'Biscuits cuillère', quantite: 150, unite: 'g',    coutUnitaire: 0.018 },
    ],
    prixVente: 7.50, tempsPrep: 25,
    instructions: 'Battre jaunes+sucre, incorporer mascarpone. Monter blancs en neige. Tremper biscuits dans café. Alterner couches, saupoudrer de cacao.',
  },
  {
    id: 'r4', nom: 'Café crème', emoji: '☕', categorie: 'Boisson',
    ingredients: [
      { id: 'i1', nom: 'Café en grains', quantite: 8,   unite: 'g',  coutUnitaire: 0.025 },
      { id: 'i2', nom: 'Lait entier',    quantite: 120, unite: 'ml', coutUnitaire: 0.0012 },
    ],
    prixVente: 3.20, tempsPrep: 3,
    instructions: 'Extraire un double espresso, faire mousser le lait et verser en cœur.',
  },
  {
    id: 'r5', nom: 'Coq au vin', emoji: '🍷', categorie: 'Plat',
    ingredients: [
      { id: 'i1', nom: 'Poulet entier', quantite: 400, unite: 'g',  coutUnitaire: 0.012 },
      { id: 'i2', nom: 'Vin rouge',     quantite: 200, unite: 'ml', coutUnitaire: 0.008 },
      { id: 'i3', nom: 'Lardons',       quantite: 80,  unite: 'g',  coutUnitaire: 0.014 },
      { id: 'i4', nom: 'Champignons',   quantite: 120, unite: 'g',  coutUnitaire: 0.010 },
      { id: 'i5', nom: 'Oignons',       quantite: 100, unite: 'g',  coutUnitaire: 0.004 },
      { id: 'i6', nom: 'Farine T55',    quantite: 20,  unite: 'g',  coutUnitaire: 0.0025 },
    ],
    prixVente: 18.50, tempsPrep: 75,
    instructions: 'Faire revenir le poulet, ajouter lardons et oignons. Déglacer au vin, mijoter 1h. Ajouter champignons 15 min avant la fin.',
  },
];

const INITIAL: Recette[] = SEED.map((r) => ({ ...r, allergenes: detectAllergenes(r.ingredients) }));

/* ─── cost helpers ─── */
function coutTotal(r: Recette) {
  return r.ingredients.reduce((s, i) => s + i.quantite * i.coutUnitaire, 0);
}
function margeBrute(r: Recette) {
  const c = coutTotal(r);
  if (r.prixVente === 0) return 0;
  return ((r.prixVente - c) / r.prixVente) * 100;
}
function margeNette(r: Recette) {
  return r.prixVente - coutTotal(r);
}

const ALLERGEN_STYLE: Record<Allergene, { bg: string; text: string }> = {
  Gluten:           { bg: '#fef3c7', text: '#92400e' },
  Lactose:          { bg: '#dbeafe', text: '#1e40af' },
  Œufs:             { bg: '#fef9c3', text: '#854d0e' },
  Poisson:          { bg: '#cffafe', text: '#0e7490' },
  'Fruits à coque': { bg: '#fde68a', text: '#78350f' },
  Soja:             { bg: '#dcfce7', text: '#166534' },
  Sulfites:         { bg: '#fce7f3', text: '#9d174d' },
};

/* ─── overlay ─── */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
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
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 760,
            maxHeight: '88vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(15,23,42,0.25)',
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── main page ─── */
export default function RecettesPage() {
  const [recettes, setRecettes] = useState<Recette[]>(INITIAL);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Recette | null>(null);

  const stats = useMemo(() => {
    if (recettes.length === 0) return { n: 0, avgCout: 0, avgMarge: 0 };
    const avgCout = recettes.reduce((s, r) => s + coutTotal(r), 0) / recettes.length;
    const avgMarge = recettes.reduce((s, r) => s + margeBrute(r), 0) / recettes.length;
    return { n: recettes.length, avgCout, avgMarge };
  }, [recettes]);

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (r: Recette) => { setEditing(r); setModalOpen(true); };

  const saveRecette = (r: Recette) => {
    const withAllergenes = { ...r, allergenes: detectAllergenes(r.ingredients) };
    setRecettes((prev) => {
      const idx = prev.findIndex((x) => x.id === r.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = withAllergenes;
        return copy;
      }
      return [...prev, withAllergenes];
    });
    setModalOpen(false);
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto', color: '#0f172a' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.3 }}>Recettes & food cost</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Gérez vos fiches recettes, calculez vos marges et détectez les allergènes.
          </p>
        </div>
        <button
          onClick={openNew}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            background: '#0f172a', color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Nouvelle recette
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard icon={<ChefHat size={20} />} label="Nombre de recettes" value={String(stats.n)} tint="#eef2ff" textTint="#4338ca" />
        <StatCard icon={<Euro size={20} />} label="Coût moyen" value={fmt(stats.avgCout)} tint="#fef3c7" textTint="#92400e" />
        <StatCard icon={<TrendingUp size={20} />} label="Marge moyenne" value={`${stats.avgMarge.toFixed(0)}%`} tint="#dcfce7" textTint="#166534" />
      </div>

      <motion.div
        variants={container} initial="hidden" animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}
      >
        {recettes.map((r) => {
          const c = coutTotal(r);
          const mb = margeBrute(r);
          const mn = margeNette(r);
          const isOpen = expanded === r.id;
          return (
            <motion.div key={r.id} variants={item} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 36, lineHeight: 1 }}>{r.emoji}</div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{r.nom}</div>
                    <div style={{ fontSize: 12, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: 999 }}>{r.categorie}</span>
                      <Clock size={12} /> {r.tempsPrep} min
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openEdit(r)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
                    cursor: 'pointer', fontSize: 12, color: '#334155', fontWeight: 500,
                  }}
                >
                  <Pencil size={12} /> Modifier
                </button>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <CostLine label="Coût ingrédients" value={fmt(c)} />
                <CostLine label="Prix de vente" value={fmt(r.prixVente)} strong />
                <CostLine label="Marge brute" value={`${mb.toFixed(1)}%`} tint={mb > 60 ? '#16a34a' : mb > 40 ? '#ca8a04' : '#dc2626'} />
                <CostLine label="Marge nette" value={fmt(mn)} tint={mn > 0 ? '#16a34a' : '#dc2626'} />
              </div>

              {r.allergenes.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  <AlertTriangle size={13} color="#b45309" />
                  <span style={{ fontSize: 11, color: '#78350f', fontWeight: 600, marginRight: 4 }}>Allergènes:</span>
                  {r.allergenes.map((a) => (
                    <span key={a} style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                      background: ALLERGEN_STYLE[a].bg, color: ALLERGEN_STYLE[a].text,
                    }}>{a}</span>
                  ))}
                </div>
              )}

              <button
                onClick={() => setExpanded(isOpen ? null : r.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: '#0f172a', alignSelf: 'flex-start',
                }}
              >
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {r.ingredients.length} ingrédients
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                      <tbody>
                        {r.ingredients.map((i) => (
                          <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 0' }}>{i.nom}</td>
                            <td style={{ padding: '6px 0', textAlign: 'right', color: '#64748b' }}>
                              {i.quantite} {i.unite}
                            </td>
                            <td style={{ padding: '6px 0', textAlign: 'right', width: 70 }}>
                              {fmt(i.quantite * i.coutUnitaire)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>

      {modalOpen && (
        <Overlay onClose={() => setModalOpen(false)}>
          <RecetteForm initial={editing} onSave={saveRecette} onCancel={() => setModalOpen(false)} />
        </Overlay>
      )}
    </div>
  );
}

/* ─── stat card ─── */
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

function CostLine({ label, value, tint, strong }: { label: string; value: string; tint?: string; strong?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: strong ? 700 : 600, color: tint ?? '#0f172a', marginTop: 2 }}>{value}</div>
    </div>
  );
}

/* ─── form ─── */
function RecetteForm({
  initial, onSave, onCancel,
}: { initial: Recette | null; onSave: (r: Recette) => void; onCancel: () => void }) {
  const [nom, setNom] = useState(initial?.nom ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🍽️');
  const [categorie, setCategorie] = useState(initial?.categorie ?? 'Plat');
  const [prixVente, setPrixVente] = useState(initial?.prixVente ?? 10);
  const [tempsPrep, setTempsPrep] = useState(initial?.tempsPrep ?? 15);
  const [instructions, setInstructions] = useState(initial?.instructions ?? '');
  const [lines, setLines] = useState<IngredientLine[]>(initial?.ingredients ?? []);

  const total = lines.reduce((s, l) => s + l.quantite * l.coutUnitaire, 0);
  const marge = prixVente > 0 ? ((prixVente - total) / prixVente) * 100 : 0;

  const addLine = () => {
    const base = CATALOGUE[0];
    setLines((l) => [...l, { id: Math.random().toString(36).slice(2), nom: base.nom, quantite: 1, unite: base.unite, coutUnitaire: base.cout }]);
  };
  const updateLine = (id: string, patch: Partial<IngredientLine>) => {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };
  const removeLine = (id: string) => setLines((ls) => ls.filter((l) => l.id !== id));

  const pickIngredient = (id: string, nom: string) => {
    const cat = CATALOGUE.find((c) => c.nom === nom);
    if (cat) updateLine(id, { nom: cat.nom, unite: cat.unite, coutUnitaire: cat.cout });
  };

  const submit = () => {
    onSave({
      id: initial?.id ?? Math.random().toString(36).slice(2),
      nom: nom || 'Recette sans nom', emoji, categorie, prixVente, tempsPrep, instructions,
      ingredients: lines, allergenes: [],
    });
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          {initial ? 'Modifier la recette' : 'Nouvelle recette'}
        </h2>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <Field label="Emoji"><input value={emoji} onChange={(e) => setEmoji(e.target.value)} style={inputStyle} /></Field>
        <Field label="Nom du plat"><input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex: Quiche lorraine" style={inputStyle} /></Field>
        <Field label="Catégorie">
          <select value={categorie} onChange={(e) => setCategorie(e.target.value)} style={inputStyle}>
            <option>Entrée</option><option>Plat</option><option>Dessert</option><option>Boisson</option>
          </select>
        </Field>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 10px' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Ingrédients</h3>
        <button onClick={addLine} style={addBtnStyle}><Plus size={13} /> Ajouter</button>
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={thStyle}>Ingrédient</th>
              <th style={thStyle}>Qté</th>
              <th style={thStyle}>Unité</th>
              <th style={thStyle}>Coût/u</th>
              <th style={thStyle}>Total</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Aucun ingrédient — cliquez sur « Ajouter »</td></tr>
            )}
            {lines.map((l) => (
              <tr key={l.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={tdStyle}>
                  <select value={l.nom} onChange={(e) => pickIngredient(l.id, e.target.value)} style={miniInput}>
                    {CATALOGUE.map((c) => <option key={c.nom}>{c.nom}</option>)}
                  </select>
                </td>
                <td style={tdStyle}>
                  <input type="number" step="0.1" value={l.quantite}
                    onChange={(e) => updateLine(l.id, { quantite: Number(e.target.value) })} style={{ ...miniInput, width: 70 }} />
                </td>
                <td style={tdStyle}>{l.unite}</td>
                <td style={tdStyle}>{fmt(l.coutUnitaire)}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(l.quantite * l.coutUnitaire)}</td>
                <td style={tdStyle}>
                  <button onClick={() => removeLine(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: 16, padding: 14, background: '#f8fafc', borderRadius: 12,
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, alignItems: 'end',
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calculator size={11} /> Coût total
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(total)}</div>
        </div>
        <Field label="Prix de vente (€)">
          <input type="number" step="0.1" value={prixVente} onChange={(e) => setPrixVente(Number(e.target.value))} style={inputStyle} />
        </Field>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Marge brute</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: marge > 60 ? '#16a34a' : marge > 40 ? '#ca8a04' : '#dc2626' }}>
            {marge.toFixed(1)}%
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
        <Field label="Temps de préparation (min)">
          <input type="number" value={tempsPrep} onChange={(e) => setTempsPrep(Number(e.target.value))} style={inputStyle} />
        </Field>
        <Field label="Instructions">
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
        <button onClick={onCancel} style={ghostBtn}>Annuler</button>
        <button onClick={submit} style={primaryBtn}>Enregistrer</button>
      </div>
    </div>
  );
}

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
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 };
const tdStyle: React.CSSProperties = { padding: '8px 10px', fontSize: 13 };
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
