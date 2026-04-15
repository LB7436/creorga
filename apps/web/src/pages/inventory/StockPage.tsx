import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Euro, AlertTriangle, XCircle, Search, Plus, ChevronUp, ChevronDown,
  ShoppingCart, Truck, X, Check, ArrowUpRight,
} from 'lucide-react';

/* ─── animation variants ─── */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

/* ─── shared styles ─── */
const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  padding: '20px 24px',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' }).format(n);

/* ─── types ─── */
type Statut = 'OK' | 'Bas' | 'Rupture';
type Categorie = 'Boissons' | 'Produits laitiers' | 'Épicerie' | 'Légumes' | 'Viande';

interface Ingredient {
  id: string;
  nom: string;
  categorie: Categorie;
  stockActuel: number;
  unite: string;
  seuilMinimum: number;
  valeur: number;
  dernierAppro: string;
  fournisseur: string;
}

/* ─── mock data — Luxembourg café context ─── */
const MOCK_DATA: Ingredient[] = [
  { id: '1',  nom: 'Café en grains',   categorie: 'Boissons',          stockActuel: 2.5,  unite: 'kg',        seuilMinimum: 5,   valeur: 37.50,   dernierAppro: '2026-04-08', fournisseur: 'Bofrost Luxembourg' },
  { id: '2',  nom: 'Lait entier',      categorie: 'Produits laitiers', stockActuel: 8,    unite: 'L',         seuilMinimum: 15,  valeur: 9.60,    dernierAppro: '2026-04-10', fournisseur: 'Luxlait' },
  { id: '3',  nom: 'Beurre',           categorie: 'Produits laitiers', stockActuel: 1.2,  unite: 'kg',        seuilMinimum: 3,   valeur: 10.80,   dernierAppro: '2026-04-07', fournisseur: 'Luxlait' },
  { id: '4',  nom: 'Farine T55',       categorie: 'Épicerie',          stockActuel: 0,    unite: 'kg',        seuilMinimum: 5,   valeur: 0,       dernierAppro: '2026-03-28', fournisseur: 'Metro Luxembourg' },
  { id: '5',  nom: 'Sucre',            categorie: 'Épicerie',          stockActuel: 3,    unite: 'kg',        seuilMinimum: 5,   valeur: 4.50,    dernierAppro: '2026-04-05', fournisseur: 'Metro Luxembourg' },
  { id: '6',  nom: 'Bière Diekirch',   categorie: 'Boissons',          stockActuel: 24,   unite: 'bouteilles',seuilMinimum: 48,  valeur: 38.40,   dernierAppro: '2026-04-09', fournisseur: 'Brasserie de Luxembourg' },
  { id: '7',  nom: 'Vin Moselle',      categorie: 'Boissons',          stockActuel: 6,    unite: 'bouteilles',seuilMinimum: 12,  valeur: 66.00,   dernierAppro: '2026-04-03', fournisseur: 'Domaines Vinsmoselle' },
  { id: '8',  nom: 'Coca-Cola',        categorie: 'Boissons',          stockActuel: 0,    unite: 'canettes',  seuilMinimum: 24,  valeur: 0,       dernierAppro: '2026-03-30', fournisseur: 'Metro Luxembourg' },
  { id: '9',  nom: 'Tomates',          categorie: 'Légumes',           stockActuel: 4,    unite: 'kg',        seuilMinimum: 3,   valeur: 11.60,   dernierAppro: '2026-04-12', fournisseur: 'Marché Gros Luxembourg' },
  { id: '10', nom: 'Oignons',          categorie: 'Légumes',           stockActuel: 3,    unite: 'kg',        seuilMinimum: 2,   valeur: 3.90,    dernierAppro: '2026-04-11', fournisseur: 'Marché Gros Luxembourg' },
  { id: '11', nom: 'Pommes de terre',  categorie: 'Légumes',           stockActuel: 12,   unite: 'kg',        seuilMinimum: 8,   valeur: 14.40,   dernierAppro: '2026-04-10', fournisseur: 'Marché Gros Luxembourg' },
  { id: '12', nom: 'Crème fraîche',    categorie: 'Produits laitiers', stockActuel: 2,    unite: 'L',         seuilMinimum: 1,   valeur: 7.00,    dernierAppro: '2026-04-11', fournisseur: 'Luxlait' },
  { id: '13', nom: 'Huile d\'olive',   categorie: 'Épicerie',          stockActuel: 3,    unite: 'L',         seuilMinimum: 2,   valeur: 23.70,   dernierAppro: '2026-04-06', fournisseur: 'Metro Luxembourg' },
  { id: '14', nom: 'Sel',              categorie: 'Épicerie',          stockActuel: 5,    unite: 'kg',        seuilMinimum: 1,   valeur: 2.50,    dernierAppro: '2026-04-01', fournisseur: 'Metro Luxembourg' },
  { id: '15', nom: 'Poulet',           categorie: 'Viande',            stockActuel: 4,    unite: 'kg',        seuilMinimum: 3,   valeur: 35.60,   dernierAppro: '2026-04-13', fournisseur: 'Bofrost Luxembourg' },
];

const CATEGORIES: Categorie[] = ['Boissons', 'Produits laitiers', 'Épicerie', 'Légumes', 'Viande'];

const CATEGORY_COLORS: Record<Categorie, { bg: string; text: string }> = {
  'Boissons':          { bg: '#dbeafe', text: '#1d4ed8' },
  'Produits laitiers': { bg: '#fce7f3', text: '#be185d' },
  'Épicerie':          { bg: '#fef3c7', text: '#92400e' },
  'Légumes':           { bg: '#dcfce7', text: '#166534' },
  'Viande':            { bg: '#fee2e2', text: '#991b1b' },
};

function getStatut(ing: Ingredient): Statut {
  if (ing.stockActuel === 0) return 'Rupture';
  if (ing.stockActuel < ing.seuilMinimum) return 'Bas';
  return 'OK';
}

const STATUT_STYLES: Record<Statut, { bg: string; text: string; dot: string }> = {
  OK:      { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
  Bas:     { bg: '#fef9c3', text: '#854d0e', dot: '#eab308' },
  Rupture: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
};

const ROW_TINTS: Record<Statut, string> = {
  OK:      'rgba(34,197,94,0.04)',
  Bas:     'rgba(234,179,8,0.06)',
  Rupture: 'rgba(239,68,68,0.06)',
};

type SortKey = 'nom' | 'categorie' | 'stockActuel' | 'seuilMinimum' | 'statut' | 'valeur' | 'dernierAppro' | 'fournisseur';

/* ─── cost per unit helper for suggestions ─── */
function costPerUnit(ing: Ingredient): number {
  if (ing.stockActuel === 0) return ing.valeur > 0 ? ing.valeur : 1.50;
  return ing.valeur / ing.stockActuel;
}

/* ─── modal backdrop ─── */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#ffffff', borderRadius: 20, width: '100%', maxWidth: 640,
            maxHeight: '90vh', overflow: 'auto',
            boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function StockPage() {
  const [data] = useState<Ingredient[]>(MOCK_DATA);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Categorie | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('nom');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  /* ─── form state ─── */
  const [formNom, setFormNom] = useState('');
  const [formCategorie, setFormCategorie] = useState<Categorie>('Épicerie');
  const [formStock, setFormStock] = useState('');
  const [formUnite, setFormUnite] = useState('kg');
  const [formSeuil, setFormSeuil] = useState('');
  const [formValeur, setFormValeur] = useState('');
  const [formFournisseur, setFormFournisseur] = useState('');

  /* ─── computed ─── */
  const stats = useMemo(() => {
    const total = data.length;
    const valeur = data.reduce((s, i) => s + i.valeur, 0);
    const bas = data.filter((i) => getStatut(i) === 'Bas').length;
    const rupture = data.filter((i) => getStatut(i) === 'Rupture').length;
    return { total, valeur, bas, rupture, alertes: bas + rupture };
  }, [data]);

  const filtered = useMemo(() => {
    let list = [...data];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.nom.toLowerCase().includes(q) ||
        i.fournisseur.toLowerCase().includes(q) ||
        i.categorie.toLowerCase().includes(q)
      );
    }
    if (categoryFilter) list = list.filter((i) => i.categorie === categoryFilter);

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'nom':          cmp = a.nom.localeCompare(b.nom); break;
        case 'categorie':    cmp = a.categorie.localeCompare(b.categorie); break;
        case 'stockActuel':  cmp = a.stockActuel - b.stockActuel; break;
        case 'seuilMinimum': cmp = a.seuilMinimum - b.seuilMinimum; break;
        case 'statut':       cmp = getStatut(a).localeCompare(getStatut(b)); break;
        case 'valeur':       cmp = a.valeur - b.valeur; break;
        case 'dernierAppro': cmp = a.dernierAppro.localeCompare(b.dernierAppro); break;
        case 'fournisseur':  cmp = a.fournisseur.localeCompare(b.fournisseur); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [data, search, categoryFilter, sortKey, sortDir]);

  const suggestions = useMemo(() => {
    return data
      .filter((i) => i.stockActuel < i.seuilMinimum)
      .map((i) => {
        const deficit = i.seuilMinimum - i.stockActuel;
        const buffer = Math.ceil(deficit * 1.2 * 10) / 10;
        const cpu = costPerUnit(i);
        return {
          ...i,
          quantiteSuggérée: buffer,
          coûtEstimé: Math.round(buffer * cpu * 100) / 100,
        };
      });
  }, [data]);

  const totalSuggestionCost = suggestions.reduce((s, i) => s + i.coûtEstimé, 0);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp size={12} style={{ opacity: 0.25 }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color: '#0369a1' }} />
      : <ChevronDown size={12} style={{ color: '#0369a1' }} />;
  }

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('fr-LU', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  /* ─── stat card component ─── */
  function StatCard({ icon, label, value, accent, sub }: {
    icon: React.ReactNode; label: string; value: string | number; accent?: string; sub?: string;
  }) {
    return (
      <motion.div variants={item} style={{
        ...cardStyle,
        display: 'flex', alignItems: 'flex-start', gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: accent ? `${accent}15` : '#f0f9ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: accent || '#1e293b', marginTop: 2 }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
        </div>
      </motion.div>
    );
  }

  /* ─── input style helper ─── */
  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #e2e8f0', borderRadius: 12,
    padding: '10px 14px', fontSize: 14, color: '#1e293b', outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* ═══ HEADER ═══ */}
      <motion.div variants={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Gestion du stock
          </h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>
            Suivi en temps réel de votre inventaire — Café um Rond-Point
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#0369a1', color: '#fff', border: 'none',
            borderRadius: 12, padding: '12px 22px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(3,105,161,0.25)',
          }}
        >
          <Plus size={18} /> Ajouter un ingrédient
        </motion.button>
      </motion.div>

      {/* ═══ STAT CARDS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          icon={<Package size={22} color="#0369a1" />}
          label="Références totales"
          value={stats.total}
          sub="Ingrédients enregistrés"
        />
        <StatCard
          icon={<Euro size={22} color="#059669" />}
          label="Valeur du stock"
          value={fmt(stats.valeur)}
          accent="#059669"
          sub="Coût total actuel"
        />
        <StatCard
          icon={<AlertTriangle size={22} color="#dc2626" />}
          label="Alertes stock bas"
          value={stats.bas}
          accent="#dc2626"
          sub="Sous le seuil minimum"
        />
        <StatCard
          icon={<XCircle size={22} color="#7f1d1d" />}
          label="Ruptures de stock"
          value={stats.rupture}
          accent="#7f1d1d"
          sub="Stock à zéro"
        />
      </div>

      {/* ═══ ALERT BANNER ═══ */}
      {stats.alertes > 0 && (
        <motion.div
          variants={item}
          style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%)',
            border: '1px solid #fecaca',
            borderRadius: 14, padding: '16px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#991b1b' }}>
                {stats.alertes} article{stats.alertes > 1 ? 's' : ''} sous le seuil minimum
              </div>
              <div style={{ fontSize: 13, color: '#b91c1c', marginTop: 2 }}>
                {stats.rupture} rupture{stats.rupture > 1 ? 's' : ''} de stock — réapprovisionnement urgent recommandé
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAlerts(!showAlerts)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#dc2626', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <AlertTriangle size={14} />
            {showAlerts ? 'Masquer les alertes' : 'Voir les alertes'}
          </motion.button>
        </motion.div>
      )}

      {/* ═══ SEARCH & FILTERS ═══ */}
      <motion.div variants={item} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Rechercher un ingrédient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              ...inputStyle,
              paddingLeft: 42, background: '#ffffff', border: '1px solid #e2e8f0',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setCategoryFilter(null)}
            style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: categoryFilter === null ? '2px solid #0369a1' : '1px solid #e2e8f0',
              background: categoryFilter === null ? '#e0f2fe' : '#ffffff',
              color: categoryFilter === null ? '#0369a1' : '#64748b',
              cursor: 'pointer',
            }}
          >
            Tous
          </motion.button>
          {CATEGORIES.map((cat) => {
            const active = categoryFilter === cat;
            const colors = CATEGORY_COLORS[cat];
            return (
              <motion.button
                key={cat}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setCategoryFilter(active ? null : cat)}
                style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  border: active ? `2px solid ${colors.text}` : '1px solid #e2e8f0',
                  background: active ? colors.bg : '#ffffff',
                  color: active ? colors.text : '#64748b',
                  cursor: 'pointer',
                }}
              >
                {cat}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ═══ STOCK TABLE ═══ */}
      <motion.div variants={item} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {([
                  ['nom', 'Ingrédient'],
                  ['categorie', 'Catégorie'],
                  ['stockActuel', 'Stock actuel'],
                  ['seuilMinimum', 'Seuil minimum'],
                  ['statut', 'Statut'],
                  ['valeur', 'Valeur'],
                  ['dernierAppro', 'Dernier appro.'],
                  ['fournisseur', 'Fournisseur'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    style={{
                      padding: '14px 16px', textAlign: 'left', fontSize: 12,
                      fontWeight: 700, color: '#64748b', textTransform: 'uppercase',
                      letterSpacing: 0.5, cursor: 'pointer', userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {label}
                      <SortIcon col={key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ing, idx) => {
                const statut = getStatut(ing);
                const sStyles = STATUT_STYLES[statut];
                const catColor = CATEGORY_COLORS[ing.categorie];
                return (
                  <motion.tr
                    key={ing.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.02 }}
                    style={{
                      background: ROW_TINTS[statut],
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f0f9ff'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ROW_TINTS[statut]; }}
                  >
                    {/* Ingrédient */}
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {ing.nom}
                    </td>
                    {/* Catégorie */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 12px', borderRadius: 8,
                        fontSize: 12, fontWeight: 600,
                        background: catColor.bg, color: catColor.text,
                      }}>
                        {ing.categorie}
                      </span>
                    </td>
                    {/* Stock actuel */}
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1e293b' }}>
                      {ing.stockActuel} <span style={{ fontWeight: 400, color: '#94a3b8' }}>{ing.unite}</span>
                    </td>
                    {/* Seuil minimum */}
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>
                      {ing.seuilMinimum} {ing.unite}
                    </td>
                    {/* Statut */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '5px 14px', borderRadius: 20,
                        fontSize: 12, fontWeight: 700,
                        background: sStyles.bg, color: sStyles.text,
                      }}>
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%', background: sStyles.dot,
                        }} />
                        {statut}
                      </span>
                    </td>
                    {/* Valeur */}
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {fmt(ing.valeur)}
                    </td>
                    {/* Dernier approvisionnement */}
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: 13 }}>
                      {formatDate(ing.dernierAppro)}
                    </td>
                    {/* Fournisseur */}
                    <td style={{ padding: '14px 16px', color: '#475569', fontSize: 13 }}>
                      {ing.fournisseur}
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 15 }}>
                    Aucun ingrédient trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#f8fafc', fontSize: 13, color: '#64748b',
        }}>
          <span>{filtered.length} ingrédient{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}</span>
          <span>Valeur totale : <strong style={{ color: '#1e293b' }}>{fmt(stats.valeur)}</strong></span>
        </div>
      </motion.div>

      {/* ═══ AUTO-REORDER SUGGESTIONS PANEL ═══ */}
      <motion.div variants={item}>
        <div style={{
          ...cardStyle, padding: 0, overflow: 'hidden',
          border: suggestions.length > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            borderBottom: '1px solid #fde68a',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShoppingCart size={22} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                  Suggestions de réapprovisionnement
                </div>
                <div style={{ fontSize: 13, color: '#92400e', marginTop: 2 }}>
                  {suggestions.length} article{suggestions.length > 1 ? 's' : ''} à commander — Coût estimé total : <strong>{fmt(totalSuggestionCost)}</strong>
                </div>
              </div>
            </div>
            {suggestions.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#f59e0b', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
                }}
              >
                <Truck size={16} /> Commander tout
              </motion.button>
            )}
          </div>

          {/* Suggestion rows */}
          {suggestions.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
              <Check size={36} style={{ marginBottom: 12, color: '#22c55e' }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>Tous les stocks sont au-dessus du seuil minimum</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Aucun réapprovisionnement nécessaire pour le moment</div>
            </div>
          ) : (
            <div>
              {/* Column labels */}
              <div style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1fr 1.5fr 120px',
                padding: '12px 24px', background: '#fffbeb',
                borderBottom: '1px solid #fef3c7', fontSize: 11, fontWeight: 700,
                color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                <span>Ingrédient</span>
                <span>Stock actuel</span>
                <span>Minimum</span>
                <span>Qté suggérée</span>
                <span>Coût estimé</span>
                <span>Fournisseur</span>
                <span />
              </div>
              {suggestions.map((sug, idx) => (
                <motion.div
                  key={sug.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1fr 1.5fr 120px',
                    padding: '16px 24px', alignItems: 'center',
                    borderBottom: '1px solid #fef9c3',
                    background: getStatut(sug) === 'Rupture' ? 'rgba(239,68,68,0.04)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: getStatut(sug) === 'Rupture' ? '#ef4444' : '#eab308',
                    }} />
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{sug.nom}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{sug.categorie}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: getStatut(sug) === 'Rupture' ? '#dc2626' : '#854d0e', fontSize: 14 }}>
                    {sug.stockActuel} {sug.unite}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>
                    {sug.seuilMinimum} {sug.unite}
                  </div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: '#dbeafe', color: '#1d4ed8', padding: '4px 12px',
                    borderRadius: 8, fontWeight: 700, fontSize: 14, width: 'fit-content',
                  }}>
                    <ArrowUpRight size={14} />
                    +{sug.quantiteSuggérée} {sug.unite}
                  </div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>
                    {fmt(sug.coûtEstimé)}
                  </div>
                  <div style={{ color: '#475569', fontSize: 13 }}>
                    {sug.fournisseur}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: '#0369a1', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', width: 'fit-content',
                    }}
                  >
                    <ShoppingCart size={13} /> Commander
                  </motion.button>
                </motion.div>
              ))}
              {/* Total bar */}
              <div style={{
                display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 24,
                padding: '16px 24px', background: '#fffbeb', borderTop: '1px solid #fde68a',
              }}>
                <div style={{ fontSize: 14, color: '#92400e' }}>
                  Total estimé pour {suggestions.length} article{suggestions.length > 1 ? 's' : ''} :
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>
                  {fmt(totalSuggestionCost)}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══ ADD INGREDIENT MODAL ═══ */}
      <AnimatePresence>
        {showAddModal && (
          <Overlay onClose={() => setShowAddModal(false)}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                Ajouter un ingrédient
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  border: 'none', background: '#f1f5f9', borderRadius: 10,
                  width: 36, height: 36, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Nom */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    Nom de l'ingrédient
                  </label>
                  <input
                    value={formNom}
                    onChange={(e) => setFormNom(e.target.value)}
                    placeholder="ex. Café en grains"
                    style={inputStyle}
                  />
                </div>
                {/* Catégorie */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    Catégorie
                  </label>
                  <select
                    value={formCategorie}
                    onChange={(e) => setFormCategorie(e.target.value as Categorie)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {/* Stock actuel */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    Stock actuel
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
                {/* Unité */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    Unité
                  </label>
                  <select
                    value={formUnite}
                    onChange={(e) => setFormUnite(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {['kg', 'L', 'pièces', 'bouteilles', 'canettes', 'paquets'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                {/* Seuil minimum */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    Seuil minimum
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formSeuil}
                    onChange={(e) => setFormSeuil(e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </div>
                {/* Valeur */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    Valeur totale (EUR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formValeur}
                    onChange={(e) => setFormValeur(e.target.value)}
                    placeholder="0.00"
                    style={inputStyle}
                  />
                </div>
              </div>
              {/* Fournisseur — full width */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  Fournisseur
                </label>
                <input
                  value={formFournisseur}
                  onChange={(e) => setFormFournisseur(e.target.value)}
                  placeholder="ex. Metro Luxembourg"
                  style={inputStyle}
                />
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8 }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                    border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer',
                  }}
                >
                  Annuler
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowAddModal(false);
                    setFormNom(''); setFormStock(''); setFormSeuil(''); setFormValeur(''); setFormFournisseur('');
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                    border: 'none', background: '#0369a1', color: '#fff', cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(3,105,161,0.25)',
                  }}
                >
                  <Plus size={16} /> Ajouter
                </motion.button>
              </div>
            </div>
          </Overlay>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
