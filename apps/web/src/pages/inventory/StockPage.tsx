import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Euro, AlertTriangle, XCircle, Search, Plus, ChevronUp, ChevronDown,
  ShoppingCart, Truck, X, Check, ArrowUpRight, Upload, FileText, ClipboardList,
  Clock, RotateCcw, Download, Timer, CheckCircle2, BarChart3,
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

/* ─── invoice types ─── */
interface InvoiceLine {
  ingredientId: string;
  quantite: number;
  prixUnitaire: number;
}

interface ImportRecord {
  id: string;
  date: string;
  fournisseur: string;
  montant: number;
  articlesCount: number;
  numero: string;
}

/* ─── stock count types ─── */
interface CountLine {
  ingredientId: string;
  nom: string;
  unite: string;
  stockTheorique: number;
  stockReel: number | null;
}

interface CountRecord {
  id: string;
  date: string;
  compteur: string;
  totalArticles: number;
  articlesAvecEcart: number;
  valeurEcart: number;
}

/* ─── mock data — Luxembourg café context ─── */
const INITIAL_DATA: Ingredient[] = [
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

const FOURNISSEURS_FACTURE = ['Metro', 'Bofrost', 'Ferme Bio', 'Boissons du Grand-Duché'];

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
function Overlay({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
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
            background: '#ffffff', borderRadius: 20, width: '100%',
            maxWidth: wide ? 900 : 640,
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

/* ─── timer hook ─── */
function useTimer(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      setSeconds(0);
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const display = h > 0
    ? `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
    : `${m}m ${String(s).padStart(2, '0')}s`;

  return display;
}

/* ═══════════════════════════════════════════════════════════════ */
export default function StockPage() {
  const [data, setData] = useState<Ingredient[]>(INITIAL_DATA);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Categorie | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('nom');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  /* ─── form state ─── */
  const [formNom, setFormNom] = useState('');
  const [formCategorie, setFormCategorie] = useState<Categorie>('Épicerie');
  const [formStock, setFormStock] = useState('');
  const [formUnite, setFormUnite] = useState('kg');
  const [formSeuil, setFormSeuil] = useState('');
  const [formValeur, setFormValeur] = useState('');
  const [formFournisseur, setFormFournisseur] = useState('');

  /* ═══ FEATURE 1: Invoice import state ═══ */
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceManual, setInvoiceManual] = useState(true);
  const [invoiceFournisseur, setInvoiceFournisseur] = useState(FOURNISSEURS_FACTURE[0]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumero, setInvoiceNumero] = useState('');
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([
    { ingredientId: '', quantite: 0, prixUnitaire: 0 },
  ]);
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([
    { id: 'imp-1', date: '2026-04-14', fournisseur: 'Metro', montant: 245.80, articlesCount: 6, numero: 'FAC-2026-0412' },
    { id: 'imp-2', date: '2026-04-10', fournisseur: 'Bofrost', montant: 189.50, articlesCount: 4, numero: 'FAC-2026-0398' },
    { id: 'imp-3', date: '2026-04-07', fournisseur: 'Ferme Bio', montant: 92.30, articlesCount: 3, numero: 'FAC-2026-0385' },
  ]);
  const [dragOver, setDragOver] = useState(false);

  /* ═══ FEATURE 2: Stock counting mode state ═══ */
  const [countingMode, setCountingMode] = useState(false);
  const [countLines, setCountLines] = useState<CountLine[]>([]);
  const [showCountSummary, setShowCountSummary] = useState(false);
  const [countHistory, setCountHistory] = useState<CountRecord[]>([
    { id: 'cnt-1', date: '2026-04-01', compteur: 'Marc D.', totalArticles: 15, articlesAvecEcart: 3, valeurEcart: 12.40 },
    { id: 'cnt-2', date: '2026-03-15', compteur: 'Sophie L.', totalArticles: 15, articlesAvecEcart: 5, valeurEcart: 28.90 },
    { id: 'cnt-3', date: '2026-03-01', compteur: 'Marc D.', totalArticles: 14, articlesAvecEcart: 2, valeurEcart: 6.20 },
  ]);
  const timerDisplay = useTimer(countingMode && !showCountSummary);

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

  /* ─── invoice computed ─── */
  const invoiceTotal = useMemo(() => {
    return invoiceLines.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);
  }, [invoiceLines]);

  /* ─── counting computed ─── */
  const countProgress = useMemo(() => {
    const counted = countLines.filter((l) => l.stockReel !== null).length;
    return { counted, total: countLines.length };
  }, [countLines]);

  const countSummaryData = useMemo(() => {
    const counted = countLines.filter((l) => l.stockReel !== null);
    const withEcart = counted.filter((l) => l.stockReel !== l.stockTheorique);
    const valeurEcart = withEcart.reduce((sum, l) => {
      const ing = data.find((d) => d.id === l.ingredientId);
      if (!ing || ing.stockActuel === 0) return sum;
      const cpu = ing.valeur / ing.stockActuel;
      return sum + Math.abs((l.stockReel ?? 0) - l.stockTheorique) * cpu;
    }, 0);
    return {
      totalComptes: counted.length,
      articlesAvecEcart: withEcart.length,
      valeurEcart: Math.round(valeurEcart * 100) / 100,
    };
  }, [countLines, data]);

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

  /* ─── flash animation on stock update ─── */
  const triggerFlash = useCallback((ids: string[]) => {
    setFlashIds(new Set(ids));
    setTimeout(() => setFlashIds(new Set()), 1800);
  }, []);

  /* ═══ INVOICE HANDLERS ═══ */
  function addInvoiceLine() {
    setInvoiceLines([...invoiceLines, { ingredientId: '', quantite: 0, prixUnitaire: 0 }]);
  }

  function updateInvoiceLine(idx: number, field: keyof InvoiceLine, value: string | number) {
    const updated = [...invoiceLines];
    if (field === 'ingredientId') {
      updated[idx] = { ...updated[idx], ingredientId: value as string };
    } else {
      updated[idx] = { ...updated[idx], [field]: Number(value) || 0 };
    }
    setInvoiceLines(updated);
  }

  function removeInvoiceLine(idx: number) {
    if (invoiceLines.length <= 1) return;
    setInvoiceLines(invoiceLines.filter((_, i) => i !== idx));
  }

  function submitInvoice() {
    const validLines = invoiceLines.filter((l) => l.ingredientId && l.quantite > 0);
    if (validLines.length === 0) return;

    const affectedIds: string[] = [];
    const updatedData = data.map((ing) => {
      const line = validLines.find((l) => l.ingredientId === ing.id);
      if (line) {
        affectedIds.push(ing.id);
        const newStock = ing.stockActuel + line.quantite;
        const cpu = line.prixUnitaire;
        return {
          ...ing,
          stockActuel: Math.round(newStock * 100) / 100,
          valeur: Math.round(newStock * cpu * 100) / 100,
          dernierAppro: invoiceDate,
        };
      }
      return ing;
    });

    setData(updatedData);
    triggerFlash(affectedIds);

    const record: ImportRecord = {
      id: `imp-${Date.now()}`,
      date: invoiceDate,
      fournisseur: invoiceFournisseur,
      montant: Math.round(invoiceTotal * 100) / 100,
      articlesCount: validLines.length,
      numero: invoiceNumero || `FAC-${Date.now()}`,
    };
    setImportHistory((prev) => [record, ...prev].slice(0, 5));

    setShowInvoiceModal(false);
    setInvoiceLines([{ ingredientId: '', quantite: 0, prixUnitaire: 0 }]);
    setInvoiceNumero('');
  }

  /* ═══ COUNTING HANDLERS ═══ */
  function startCounting() {
    setCountLines(
      data.map((ing) => ({
        ingredientId: ing.id,
        nom: ing.nom,
        unite: ing.unite,
        stockTheorique: ing.stockActuel,
        stockReel: null,
      }))
    );
    setCountingMode(true);
    setShowCountSummary(false);
  }

  function updateCountReel(ingredientId: string, value: string) {
    setCountLines((prev) =>
      prev.map((l) =>
        l.ingredientId === ingredientId
          ? { ...l, stockReel: value === '' ? null : parseFloat(value) || 0 }
          : l
      )
    );
  }

  function validateAll() {
    setCountLines((prev) =>
      prev.map((l) => (l.stockReel === null ? { ...l, stockReel: l.stockTheorique } : l))
    );
  }

  function resetCount() {
    setCountLines((prev) => prev.map((l) => ({ ...l, stockReel: null })));
  }

  function finishCounting() {
    setShowCountSummary(true);
  }

  function applyCountResults() {
    const affectedIds: string[] = [];
    const updatedData = data.map((ing) => {
      const cl = countLines.find((l) => l.ingredientId === ing.id);
      if (cl && cl.stockReel !== null && cl.stockReel !== cl.stockTheorique) {
        affectedIds.push(ing.id);
        const cpu = ing.stockActuel > 0 ? ing.valeur / ing.stockActuel : costPerUnit(ing);
        return {
          ...ing,
          stockActuel: cl.stockReel,
          valeur: Math.round(cl.stockReel * cpu * 100) / 100,
        };
      }
      return ing;
    });
    setData(updatedData);
    triggerFlash(affectedIds);

    const record: CountRecord = {
      id: `cnt-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      compteur: 'Utilisateur',
      totalArticles: countSummaryData.totalComptes,
      articlesAvecEcart: countSummaryData.articlesAvecEcart,
      valeurEcart: countSummaryData.valeurEcart,
    };
    setCountHistory((prev) => [record, ...prev].slice(0, 3));

    setCountingMode(false);
    setShowCountSummary(false);
  }

  function exportCountCSV() {
    const header = 'Ingrédient;Unité;Stock théorique;Stock réel;Écart\n';
    const rows = countLines
      .filter((l) => l.stockReel !== null)
      .map((l) => `${l.nom};${l.unite};${l.stockTheorique};${l.stockReel};${(l.stockReel ?? 0) - l.stockTheorique}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comptage-stock-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

  /* ═══════════════════════════════════════════════════════════════ */
  /* ═══ COUNTING MODE FULL SCREEN ═══ */
  /* ═══════════════════════════════════════════════════════════════ */
  if (countingMode) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, minHeight: '100vh' }}
      >
        {/* Header */}
        <div style={{
          ...cardStyle,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1px solid #93c5fd',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 50, height: 50, borderRadius: 14,
              background: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ClipboardList size={26} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                Mode Comptage — {new Date().toLocaleDateString('fr-LU', { day: '2-digit', month: 'long', year: 'numeric' })}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Timer size={14} color="#0369a1" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#0369a1' }}>{timerDisplay}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={resetCount}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid #e2e8f0', background: '#ffffff', color: '#64748b', cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} /> Réinitialiser
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={validateAll}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: 'none', background: '#059669', color: '#fff', cursor: 'pointer',
              }}
            >
              <Check size={14} /> Tout valider
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setCountingMode(false); setShowCountSummary(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer',
              }}
            >
              <X size={14} /> Annuler
            </motion.button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ ...cardStyle, padding: '16px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
              {countProgress.counted}/{countProgress.total} articles comptés
            </span>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              {countProgress.total > 0 ? Math.round((countProgress.counted / countProgress.total) * 100) : 0}%
            </span>
          </div>
          <div style={{ width: '100%', height: 10, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${countProgress.total > 0 ? (countProgress.counted / countProgress.total) * 100 : 0}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #0369a1, #0ea5e9)', borderRadius: 10 }}
            />
          </div>
        </div>

        {/* Counting table */}
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', flex: 1 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Ingrédient
                  </th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Unité
                  </th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Stock théorique
                  </th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 180 }}>
                    Stock réel
                  </th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Écart
                  </th>
                </tr>
              </thead>
              <tbody>
                {countLines.map((cl) => {
                  const ecart = cl.stockReel !== null ? Math.round((cl.stockReel - cl.stockTheorique) * 100) / 100 : null;
                  const pctDiff = cl.stockTheorique > 0 && ecart !== null
                    ? Math.abs(ecart / cl.stockTheorique) * 100
                    : 0;
                  let rowBg = '#ffffff';
                  if (cl.stockReel !== null) {
                    if (ecart === 0) rowBg = '#f0fdf4';
                    else if (pctDiff <= 10) rowBg = '#fefce8';
                    else rowBg = '#fef2f2';
                  }
                  let ecartColor = '#94a3b8';
                  if (ecart !== null) {
                    if (ecart > 0) ecartColor = '#16a34a';
                    else if (ecart < 0) ecartColor = '#dc2626';
                    else ecartColor = '#94a3b8';
                  }

                  return (
                    <tr
                      key={cl.ingredientId}
                      style={{
                        background: rowBg,
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.2s',
                      }}
                    >
                      <td style={{ padding: '12px 20px', fontWeight: 700, color: '#1e293b', fontSize: 16 }}>
                        {cl.nom}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                        {cl.unite}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'center', fontWeight: 600, color: '#475569', fontSize: 16 }}>
                        {cl.stockTheorique}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                        <input
                          type="number"
                          step="0.1"
                          value={cl.stockReel === null ? '' : cl.stockReel}
                          onChange={(e) => updateCountReel(cl.ingredientId, e.target.value)}
                          placeholder="—"
                          style={{
                            width: '100%',
                            maxWidth: 160,
                            height: 60,
                            border: '2px solid #cbd5e1',
                            borderRadius: 14,
                            padding: '8px 16px',
                            fontSize: 22,
                            fontWeight: 700,
                            color: '#1e293b',
                            textAlign: 'center',
                            outline: 'none',
                            background: cl.stockReel !== null ? '#f0f9ff' : '#ffffff',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = '#0369a1';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(3,105,161,0.15)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                        {ecart !== null ? (
                          <span style={{
                            display: 'inline-block',
                            padding: '6px 16px',
                            borderRadius: 10,
                            fontSize: 16,
                            fontWeight: 800,
                            color: ecartColor,
                            background: ecart === 0 ? '#f1f5f9' : ecart > 0 ? '#dcfce7' : '#fee2e2',
                          }}>
                            {ecart > 0 ? '+' : ''}{ecart}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: 14 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Finish counting button */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={finishCounting}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '16px 40px', borderRadius: 14, fontSize: 16, fontWeight: 700,
              border: 'none', background: '#0369a1', color: '#fff', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(3,105,161,0.3)',
            }}
          >
            <CheckCircle2 size={20} /> Terminer le comptage
          </motion.button>
        </div>

        {/* ═══ COUNT SUMMARY MODAL ═══ */}
        <AnimatePresence>
          {showCountSummary && (
            <Overlay onClose={() => setShowCountSummary(false)}>
              <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, background: '#0369a1',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <BarChart3 size={22} color="#fff" />
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    Résumé du comptage
                  </h2>
                </div>
                <button
                  onClick={() => setShowCountSummary(false)}
                  style={{
                    border: 'none', background: '#f1f5f9', borderRadius: 10,
                    width: 36, height: 36, cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={18} color="#64748b" />
                </button>
              </div>
              <div style={{ padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: 20, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#166534' }}>{countSummaryData.totalComptes}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', marginTop: 4 }}>Articles comptés</div>
                  </div>
                  <div style={{
                    background: countSummaryData.articlesAvecEcart > 0 ? '#fef2f2' : '#f0fdf4',
                    border: `1px solid ${countSummaryData.articlesAvecEcart > 0 ? '#fecaca' : '#bbf7d0'}`,
                    borderRadius: 14, padding: 20, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: countSummaryData.articlesAvecEcart > 0 ? '#dc2626' : '#166534' }}>
                      {countSummaryData.articlesAvecEcart}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: countSummaryData.articlesAvecEcart > 0 ? '#b91c1c' : '#16a34a', marginTop: 4 }}>
                      Articles avec écart
                    </div>
                  </div>
                  <div style={{
                    background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: 20, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#1d4ed8' }}>{fmt(countSummaryData.valeurEcart)}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', marginTop: 4 }}>Valeur de l'écart</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8 }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={exportCountCSV}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '12px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                      border: '1px solid #e2e8f0', background: '#ffffff', color: '#475569', cursor: 'pointer',
                    }}
                  >
                    <Download size={16} /> Exporter le rapport
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={applyCountResults}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '12px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                      border: 'none', background: '#0369a1', color: '#fff', cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(3,105,161,0.25)',
                    }}
                  >
                    <Check size={16} /> Valider et mettre à jour
                  </motion.button>
                </div>
              </div>
            </Overlay>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════ */
  /* ═══ NORMAL MODE (original + invoice import) ═══ */
  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* ═══ HEADER ═══ */}
      <motion.div variants={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Gestion du stock
          </h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>
            Suivi en temps réel de votre inventaire — Café um Rond-Point
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowInvoiceModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#7c3aed', color: '#fff', border: 'none',
              borderRadius: 12, padding: '12px 22px', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
            }}
          >
            <FileText size={18} /> Importer une facture
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={startCounting}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#059669', color: '#fff', border: 'none',
              borderRadius: 12, padding: '12px 22px', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(5,150,105,0.25)',
            }}
          >
            <ClipboardList size={18} /> Comptage de stock
          </motion.button>
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
        </div>
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
                const isFlashing = flashIds.has(ing.id);
                return (
                  <motion.tr
                    key={ing.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      backgroundColor: isFlashing
                        ? ['rgba(34,197,94,0.25)', 'rgba(34,197,94,0.05)', 'rgba(34,197,94,0.20)', 'rgba(34,197,94,0.0)']
                        : ROW_TINTS[statut],
                    }}
                    transition={isFlashing
                      ? { backgroundColor: { duration: 1.8, times: [0, 0.3, 0.6, 1] } }
                      : { duration: 0.25, delay: idx * 0.02 }
                    }
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!isFlashing) (e.currentTarget as HTMLElement).style.background = '#f0f9ff'; }}
                    onMouseLeave={(e) => { if (!isFlashing) (e.currentTarget as HTMLElement).style.background = ROW_TINTS[statut]; }}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {ing.nom}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 12px', borderRadius: 8,
                        fontSize: 12, fontWeight: 600,
                        background: catColor.bg, color: catColor.text,
                      }}>
                        {ing.categorie}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1e293b' }}>
                      {ing.stockActuel} <span style={{ fontWeight: 400, color: '#94a3b8' }}>{ing.unite}</span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>
                      {ing.seuilMinimum} {ing.unite}
                    </td>
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
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {fmt(ing.valeur)}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: 13 }}>
                      {formatDate(ing.dernierAppro)}
                    </td>
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

          {suggestions.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
              <Check size={36} style={{ marginBottom: 12, color: '#22c55e' }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>Tous les stocks sont au-dessus du seuil minimum</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Aucun réapprovisionnement nécessaire pour le moment</div>
            </div>
          ) : (
            <div>
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

      {/* ═══ IMPORT HISTORY ═══ */}
      {importHistory.length > 0 && (
        <motion.div variants={item}>
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '18px 24px',
              background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
              borderBottom: '1px solid #ddd6fe',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FileText size={18} color="#fff" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                Historique des importations
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#faf5ff', borderBottom: '1px solid #ede9fe' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5 }}>Numéro</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5 }}>Fournisseur</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5 }}>Montant</th>
                  <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5 }}>Articles</th>
                </tr>
              </thead>
              <tbody>
                {importHistory.map((rec) => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid #f5f3ff' }}>
                    <td style={{ padding: '12px 20px', color: '#475569' }}>{formatDate(rec.date)}</td>
                    <td style={{ padding: '12px 20px', color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}>{rec.numero}</td>
                    <td style={{ padding: '12px 20px', fontWeight: 600, color: '#1e293b' }}>{rec.fournisseur}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>{fmt(rec.montant)}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 12px', borderRadius: 8,
                        background: '#ede9fe', color: '#7c3aed', fontWeight: 700, fontSize: 12,
                      }}>
                        {rec.articlesCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ═══ COUNT HISTORY ═══ */}
      {countHistory.length > 0 && (
        <motion.div variants={item}>
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '18px 24px',
              background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              borderBottom: '1px solid #a7f3d0',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ClipboardList size={18} color="#fff" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                Historique des comptages
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>Compteur</th>
                  <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>Articles</th>
                  <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>Écarts</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>Valeur écart</th>
                </tr>
              </thead>
              <tbody>
                {countHistory.map((rec) => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid #ecfdf5' }}>
                    <td style={{ padding: '12px 20px', color: '#475569' }}>{formatDate(rec.date)}</td>
                    <td style={{ padding: '12px 20px', fontWeight: 600, color: '#1e293b' }}>{rec.compteur}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'center', color: '#1e293b' }}>{rec.totalArticles}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 12px', borderRadius: 8,
                        background: rec.articlesAvecEcart > 0 ? '#fee2e2' : '#dcfce7',
                        color: rec.articlesAvecEcart > 0 ? '#dc2626' : '#16a34a',
                        fontWeight: 700, fontSize: 12,
                      }}>
                        {rec.articlesAvecEcart}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>{fmt(rec.valeurEcart)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

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

      {/* ═══ INVOICE IMPORT MODAL ═══ */}
      <AnimatePresence>
        {showInvoiceModal && (
          <Overlay onClose={() => setShowInvoiceModal(false)} wide>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, background: '#7c3aed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={22} color="#fff" />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  Importer une facture fournisseur
                </h2>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
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

              {/* Upload / Manual toggle */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setInvoiceManual(false)}
                  style={{
                    padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    border: !invoiceManual ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                    background: !invoiceManual ? '#f5f3ff' : '#fff',
                    color: !invoiceManual ? '#7c3aed' : '#64748b', cursor: 'pointer',
                  }}
                >
                  <Upload size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Téléverser un fichier
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setInvoiceManual(true)}
                  style={{
                    padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    border: invoiceManual ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                    background: invoiceManual ? '#f5f3ff' : '#fff',
                    color: invoiceManual ? '#7c3aed' : '#64748b', cursor: 'pointer',
                  }}
                >
                  Saisir manuellement
                </motion.button>
              </div>

              {/* Upload zone */}
              {!invoiceManual && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); setInvoiceManual(true); }}
                  style={{
                    border: `3px dashed ${dragOver ? '#7c3aed' : '#cbd5e1'}`,
                    borderRadius: 16,
                    padding: '48px 24px',
                    textAlign: 'center',
                    background: dragOver ? '#f5f3ff' : '#fafafa',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                >
                  <Upload size={40} color={dragOver ? '#7c3aed' : '#94a3b8'} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>
                    Glissez-déposez votre facture ici
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                    PDF ou image (JPG, PNG) — max 10 Mo
                  </div>
                  <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 12, fontWeight: 600 }}>
                    Ou saisir manuellement
                  </div>
                </motion.div>
              )}

              {/* Manual form */}
              {invoiceManual && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                        Fournisseur
                      </label>
                      <select
                        value={invoiceFournisseur}
                        onChange={(e) => setInvoiceFournisseur(e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        {FOURNISSEURS_FACTURE.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                        Date facture
                      </label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                        Numéro facture
                      </label>
                      <input
                        value={invoiceNumero}
                        onChange={(e) => setInvoiceNumero(e.target.value)}
                        placeholder="FAC-2026-XXXX"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Line items */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                      Lignes de la facture
                    </label>
                    <div style={{
                      border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden',
                    }}>
                      <div style={{
                        display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 40px',
                        padding: '10px 16px', background: '#f8fafc', gap: 10,
                        borderBottom: '1px solid #e2e8f0', fontSize: 11, fontWeight: 700,
                        color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5,
                      }}>
                        <span>Ingrédient</span>
                        <span>Quantité</span>
                        <span>Prix unit.</span>
                        <span>Total</span>
                        <span />
                      </div>
                      {invoiceLines.map((line, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 40px',
                            padding: '8px 16px', gap: 10, alignItems: 'center',
                            borderBottom: idx < invoiceLines.length - 1 ? '1px solid #f1f5f9' : 'none',
                          }}
                        >
                          <select
                            value={line.ingredientId}
                            onChange={(e) => updateInvoiceLine(idx, 'ingredientId', e.target.value)}
                            style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }}
                          >
                            <option value="">— Sélectionner —</option>
                            {data.map((ing) => (
                              <option key={ing.id} value={ing.id}>{ing.nom} ({ing.unite})</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.1"
                            value={line.quantite || ''}
                            onChange={(e) => updateInvoiceLine(idx, 'quantite', e.target.value)}
                            placeholder="0"
                            style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }}
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={line.prixUnitaire || ''}
                            onChange={(e) => updateInvoiceLine(idx, 'prixUnitaire', e.target.value)}
                            placeholder="0.00"
                            style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }}
                          />
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, paddingLeft: 4 }}>
                            {fmt(line.quantite * line.prixUnitaire)}
                          </div>
                          <button
                            onClick={() => removeInvoiceLine(idx)}
                            disabled={invoiceLines.length <= 1}
                            style={{
                              border: 'none', background: 'none', cursor: invoiceLines.length <= 1 ? 'default' : 'pointer',
                              opacity: invoiceLines.length <= 1 ? 0.3 : 1, padding: 4,
                            }}
                          >
                            <X size={16} color="#ef4444" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addInvoiceLine}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, marginTop: 10,
                        padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                        border: '1px dashed #cbd5e1', background: '#fafafa', color: '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={14} /> Ajouter une ligne
                    </motion.button>
                  </div>

                  {/* Total */}
                  <div style={{
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16,
                    padding: '16px 20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0',
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>Total facture :</span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{fmt(invoiceTotal)}</span>
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowInvoiceModal(false)}
                  style={{
                    padding: '12px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                    border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer',
                  }}
                >
                  Annuler
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={submitInvoice}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                    border: 'none', background: '#7c3aed', color: '#fff', cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
                  }}
                >
                  <Check size={16} /> Valider et mettre à jour le stock
                </motion.button>
              </div>
            </div>
          </Overlay>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
