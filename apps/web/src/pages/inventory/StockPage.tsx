import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, AreaChart, Area,
} from 'recharts'
import {
  Package, Euro, AlertTriangle, XCircle, Search, Plus, ShoppingCart, Truck, X,
  Check, Upload, ClipboardList, Clock, RotateCcw, Download, Timer, CheckCircle2,
  BarChart3, ScanLine, TrendingDown, CalendarDays, ShieldAlert, Trash2, MapPin,
  Tag, Leaf, Snowflake, Edit3, Zap, FileClock, ArrowRightLeft, PackageCheck,
} from 'lucide-react'

/* ─── animation variants ─── */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

/* ─── shared styles ─── */
const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  padding: '18px 22px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  fontSize: 13,
  color: '#1e293b',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#475569',
  marginBottom: 6,
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}

const smallBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#1e293b',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
}

const fmt = (n: number) => new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' }).format(n)

/* ─── types ─── */
type Statut = 'OK' | 'Bas' | 'Rupture'
type Categorie = 'Boissons' | 'Produits laitiers' | 'Épicerie' | 'Légumes' | 'Viande'
type Location = 'Réserve' | 'Bar' | 'Cuisine'
type Season = 'Aucune' | 'Été' | 'Hiver'

interface Ingredient {
  id: string
  nom: string
  barcode: string
  categorie: Categorie
  stockActuel: number
  unite: string
  seuilMinimum: number
  valeur: number
  dernierAppro: string
  fournisseur: string
  dluo: string
  dluoCritique?: boolean
  location: Location
  saison: Season
  cogs: number
}

interface Movement {
  id: string
  date: string
  time: string
  ingredient: string
  type: 'Entrée' | 'Sortie' | 'Transfert' | 'Perte'
  quantite: number
  user: string
  raison: string
  location?: string
}

interface Waste {
  id: string
  date: string
  ingredient: string
  quantite: number
  unite: string
  raison: 'Expiration' | 'Casse' | 'Avarié' | 'Vol'
  cout: number
}

interface SupplierPrice {
  fournisseur: string
  prix: number
  delai: string
  note: number
}

/* ─── mock data (kept for fallback if backend offline) ─── */
const INITIAL_DATA: Ingredient[] = []
// Demo data — moved to fallback only:
const _DEMO_DATA: Ingredient[] = [
  { id: '1',  nom: 'Café en grains',   barcode: '3560070891234', categorie: 'Boissons', stockActuel: 2.5,  unite: 'kg',         seuilMinimum: 5,  valeur: 37.50, dernierAppro: '2026-04-08', fournisseur: 'Bofrost Luxembourg', dluo: '2026-10-15', location: 'Bar',      saison: 'Aucune', cogs: 15.0 },
  { id: '2',  nom: 'Lait entier',           barcode: '3228021400019', categorie: 'Produits laitiers', stockActuel: 8,    unite: 'L',          seuilMinimum: 15, valeur: 9.60,  dernierAppro: '2026-04-10', fournisseur: 'Luxlait', dluo: '2026-04-22', dluoCritique: true, location: 'Cuisine', saison: 'Aucune', cogs: 1.20 },
  { id: '3',  nom: 'Beurre',                barcode: '3228021500108', categorie: 'Produits laitiers', stockActuel: 1.2,  unite: 'kg',         seuilMinimum: 3,  valeur: 10.80, dernierAppro: '2026-04-07', fournisseur: 'Luxlait', dluo: '2026-05-03', location: 'Cuisine', saison: 'Aucune', cogs: 9.0 },
  { id: '4',  nom: 'Farine T55',            barcode: '3017620422003', categorie: 'Épicerie', stockActuel: 0,    unite: 'kg',         seuilMinimum: 5,  valeur: 0,     dernierAppro: '2026-03-28', fournisseur: 'Metro Luxembourg', dluo: '2026-12-01', location: 'Réserve', saison: 'Aucune', cogs: 1.5 },
  { id: '5',  nom: 'Sucre',                 barcode: '3258561024567', categorie: 'Épicerie', stockActuel: 3,    unite: 'kg',         seuilMinimum: 5,  valeur: 4.50,  dernierAppro: '2026-04-05', fournisseur: 'Metro Luxembourg', dluo: '2027-06-01', location: 'Réserve', saison: 'Aucune', cogs: 1.5 },
  { id: '6',  nom: 'Bière Diekirch',   barcode: '5420005671234', categorie: 'Boissons', stockActuel: 24,   unite: 'bouteilles', seuilMinimum: 48, valeur: 38.40, dernierAppro: '2026-04-09', fournisseur: 'Brasserie de Luxembourg', dluo: '2026-09-30', location: 'Bar',      saison: 'Été', cogs: 1.60 },
  { id: '7',  nom: 'Vin Moselle',           barcode: '3760123456789', categorie: 'Boissons', stockActuel: 6,    unite: 'bouteilles', seuilMinimum: 12, valeur: 66.00, dernierAppro: '2026-04-03', fournisseur: 'Domaines Vinsmoselle', dluo: '2028-12-31', location: 'Bar', saison: 'Aucune', cogs: 11.0 },
  { id: '8',  nom: 'Coca-Cola',             barcode: '5449000131805', categorie: 'Boissons', stockActuel: 0,    unite: 'canettes',   seuilMinimum: 24, valeur: 0,     dernierAppro: '2026-03-30', fournisseur: 'Metro Luxembourg', dluo: '2026-08-15', location: 'Bar', saison: 'Été', cogs: 0.8 },
  { id: '9',  nom: 'Tomates',               barcode: '2000010010001', categorie: 'Légumes', stockActuel: 4,    unite: 'kg',         seuilMinimum: 3,  valeur: 11.60, dernierAppro: '2026-04-12', fournisseur: 'Marché Gros Luxembourg', dluo: '2026-04-20', dluoCritique: true, location: 'Cuisine', saison: 'Été', cogs: 2.90 },
  { id: '10', nom: 'Oignons',               barcode: '2000010020002', categorie: 'Légumes', stockActuel: 3,    unite: 'kg',         seuilMinimum: 2,  valeur: 3.90,  dernierAppro: '2026-04-11', fournisseur: 'Marché Gros Luxembourg', dluo: '2026-05-10', location: 'Réserve', saison: 'Aucune', cogs: 1.30 },
  { id: '11', nom: 'Pommes de terre',       barcode: '2000010030003', categorie: 'Légumes', stockActuel: 12,   unite: 'kg',         seuilMinimum: 8,  valeur: 14.40, dernierAppro: '2026-04-10', fournisseur: 'Marché Gros Luxembourg', dluo: '2026-06-01', location: 'Réserve', saison: 'Hiver', cogs: 1.20 },
  { id: '12', nom: 'Crème fraîche', barcode: '3228021400224', categorie: 'Produits laitiers', stockActuel: 2,    unite: 'L',          seuilMinimum: 1,  valeur: 7.00,  dernierAppro: '2026-04-11', fournisseur: 'Luxlait', dluo: '2026-04-28', location: 'Cuisine', saison: 'Aucune', cogs: 3.50 },
  { id: '13', nom: 'Huile d\'olive',        barcode: '8410188012003', categorie: 'Épicerie', stockActuel: 3,    unite: 'L',          seuilMinimum: 2,  valeur: 23.70, dernierAppro: '2026-04-06', fournisseur: 'Metro Luxembourg', dluo: '2027-03-15', location: 'Cuisine', saison: 'Aucune', cogs: 7.90 },
  { id: '14', nom: 'Sel',                   barcode: '3166330114567', categorie: 'Épicerie', stockActuel: 5,    unite: 'kg',         seuilMinimum: 1,  valeur: 2.50,  dernierAppro: '2026-04-01', fournisseur: 'Metro Luxembourg', dluo: '2030-01-01', location: 'Cuisine', saison: 'Aucune', cogs: 0.50 },
  { id: '15', nom: 'Poulet',                barcode: '2000200010005', categorie: 'Viande', stockActuel: 4,    unite: 'kg',         seuilMinimum: 3,  valeur: 35.60, dernierAppro: '2026-04-13', fournisseur: 'Bofrost Luxembourg', dluo: '2026-04-19', dluoCritique: true, location: 'Cuisine', saison: 'Aucune', cogs: 8.90 },
  { id: '16', nom: 'Soupe potiron',         barcode: '3017620100123', categorie: 'Épicerie', stockActuel: 15,   unite: 'boîtes', seuilMinimum: 20, valeur: 22.50, dernierAppro: '2026-04-01', fournisseur: 'Metro Luxembourg', dluo: '2027-10-01', location: 'Réserve', saison: 'Hiver', cogs: 1.50 },
]

const MOVEMENTS: Movement[] = [
  { id: 'm1', date: '2026-04-17', time: '09:14', ingredient: 'Lait entier',     type: 'Sortie',    quantite: 2,   user: 'Sophie', raison: 'Service petit-déj', location: 'Cuisine' },
  { id: 'm2', date: '2026-04-17', time: '08:45', ingredient: 'Café en grains', type: 'Sortie', quantite: 0.5, user: 'Marc',   raison: 'Service matin',       location: 'Bar' },
  { id: 'm3', date: '2026-04-16', time: '17:30', ingredient: 'Bière Diekirch', type: 'Entrée', quantite: 24, user: 'Paul', raison: 'Réception cde',    location: 'Bar' },
  { id: 'm4', date: '2026-04-16', time: '14:22', ingredient: 'Tomates',         type: 'Transfert', quantite: 2,   user: 'Sophie', raison: 'Réserve → Cuisine' },
  { id: 'm5', date: '2026-04-16', time: '11:02', ingredient: 'Beurre',          type: 'Perte',     quantite: 0.3, user: 'Marc',   raison: 'DLUO dépassée' },
  { id: 'm6', date: '2026-04-15', time: '16:45', ingredient: 'Poulet',          type: 'Entrée', quantite: 5,  user: 'Paul',   raison: 'Livraison Bofrost' },
  { id: 'm7', date: '2026-04-15', time: '10:18', ingredient: 'Vin Moselle',     type: 'Sortie',    quantite: 3,   user: 'Sophie', raison: 'Consommation' },
]

const WASTE_LOG: Waste[] = [
  { id: 'w1', date: '2026-04-16', ingredient: 'Beurre',  quantite: 0.3, unite: 'kg', raison: 'Expiration', cout: 2.70 },
  { id: 'w2', date: '2026-04-14', ingredient: 'Tomates', quantite: 1.2, unite: 'kg', raison: 'Avarié', cout: 3.48 },
  { id: 'w3', date: '2026-04-12', ingredient: 'Lait entier', quantite: 2, unite: 'L', raison: 'Expiration', cout: 2.40 },
  { id: 'w4', date: '2026-04-10', ingredient: 'Vin Moselle', quantite: 1, unite: 'bt', raison: 'Casse', cout: 11.00 },
]

const SUPPLIER_COMPARE: Record<string, SupplierPrice[]> = {
  default: [
    { fournisseur: 'Metro Luxembourg', prix: 12.50, delai: '24h', note: 4.5 },
    { fournisseur: 'Bofrost Luxembourg', prix: 13.20, delai: '48h', note: 4.7 },
    { fournisseur: 'Marché Gros',   prix: 11.90, delai: '24h', note: 4.2 },
  ],
}

const CATEGORIES: Categorie[] = ['Boissons', 'Produits laitiers', 'Épicerie', 'Légumes', 'Viande']
const LOCATIONS: Location[] = ['Réserve', 'Bar', 'Cuisine']

const CATEGORY_COLORS: Record<Categorie, { bg: string; text: string }> = {
  'Boissons':          { bg: '#dbeafe', text: '#1d4ed8' },
  'Produits laitiers': { bg: '#fce7f3', text: '#be185d' },
  'Épicerie':     { bg: '#fef3c7', text: '#92400e' },
  'Légumes':      { bg: '#dcfce7', text: '#166534' },
  'Viande':            { bg: '#fee2e2', text: '#991b1b' },
}

const STATUT_STYLES: Record<Statut, { bg: string; text: string; dot: string }> = {
  OK:      { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
  Bas:     { bg: '#fef9c3', text: '#854d0e', dot: '#eab308' },
  Rupture: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
}

function getStatut(ing: Ingredient): Statut {
  if (ing.stockActuel === 0) return 'Rupture'
  if (ing.stockActuel < ing.seuilMinimum) return 'Bas'
  return 'OK'
}

function daysUntil(date: string): number {
  const t = new Date(date).getTime()
  return Math.floor((t - Date.now()) / (1000 * 60 * 60 * 24))
}

function predictRunout(ing: Ingredient): number {
  // Mock ML prediction: based on stock / average daily consumption
  const dailyConsumption = ing.cogs > 5 ? 1.2 : 0.6
  if (ing.stockActuel === 0) return 0
  return Math.round(ing.stockActuel / dailyConsumption)
}

const consumptionHistory = [
  { jour: 'L', entrees: 12, sorties: 18 },
  { jour: 'M', entrees: 8,  sorties: 22 },
  { jour: 'M', entrees: 24, sorties: 19 },
  { jour: 'J', entrees: 6,  sorties: 25 },
  { jour: 'V', entrees: 18, sorties: 32 },
  { jour: 'S', entrees: 4,  sorties: 38 },
  { jour: 'D', entrees: 2,  sorties: 15 },
]

const cogsMonthly = [
  { mois: 'Nov', cogs: 3200, ventes: 12500 },
  { mois: 'Déc', cogs: 4100, ventes: 16200 },
  { mois: 'Jan', cogs: 2900, ventes: 11000 },
  { mois: 'Fév', cogs: 3300, ventes: 12800 },
  { mois: 'Mar', cogs: 3700, ventes: 14400 },
  { mois: 'Avr', cogs: 2200, ventes: 8900 },
]

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
  backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex',
  alignItems: 'center', justifyContent: 'center', padding: 24,
}

/* ─── Toast ─── */
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      style={{
        position: 'fixed', bottom: 32, right: 32, background: '#1e293b', color: '#fff',
        padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 500,
        boxShadow: '0 8px 28px rgba(0,0,0,0.18)', zIndex: 10001,
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      <CheckCircle2 size={15} style={{ color: '#34d399' }} />
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, marginLeft: 6 }}>
        <X size={13} />
      </button>
    </motion.div>
  )
}

/* ─── Barcode scan modal ─── */
function BarcodeScanner({ onClose, onScan }: { onClose: () => void; onScan: (code: string) => void }) {
  const [code, setCode] = useState('')
  const [scanning, setScanning] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => {
      setCode('3228021400019')
      setScanning(false)
    }, 2200)
    return () => clearTimeout(t)
  }, [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={overlay}>
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, maxWidth: 460, width: '100%', padding: 28 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ScanLine size={18} /> Scanner un produit
          </h2>
          <button onClick={onClose} style={{ ...smallBtnStyle, padding: '6px 10px' }}><X size={14} /></button>
        </div>
        <div style={{
          height: 200, background: '#0f172a', borderRadius: 14, position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: '80%', height: 2, background: '#ef4444', position: 'absolute', boxShadow: '0 0 20px #ef4444' }}
               className="scan-line">
            <motion.div
              animate={{ y: [-60, 60, -60] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: '100%', height: 2, background: '#ef4444', boxShadow: '0 0 14px #ef4444' }}
            />
          </div>
          <div style={{ color: '#94a3b8', fontSize: 11, position: 'absolute', bottom: 10, left: 16 }}>
            {scanning ? 'Recherche en cours...' : 'Code détecté'}
          </div>
        </div>
        {!scanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 16, padding: 14, background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 11, color: '#166534', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Produit identifié</div>
            <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#1e293b', marginTop: 6 }}>{code}</div>
            <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Lait entier • Luxlait • Brique 1L</div>
            <button
              onClick={() => { onScan(code); onClose() }}
              style={{ marginTop: 12, width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
            >
              Ajouter au stock
            </button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}

/* ─── Supplier comparison modal ─── */
function SupplierModal({ ingredient, onClose }: { ingredient: Ingredient; onClose: () => void }) {
  const prices = SUPPLIER_COMPARE.default.map((s, i) => ({ ...s, prix: ingredient.cogs * (0.85 + i * 0.1) }))
  const best = prices.reduce((a, b) => a.prix < b.prix ? a : b)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={overlay}>
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, maxWidth: 620, width: '100%', padding: 28 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1e293b' }}>Comparer les fournisseurs</h2>
          <button onClick={onClose} style={{ ...smallBtnStyle, padding: '6px 10px' }}><X size={14} /></button>
        </div>
        <div style={{ marginBottom: 14, fontSize: 13, color: '#475569' }}>
          <strong>{ingredient.nom}</strong> • {ingredient.unite} • commande pour atteindre le seuil
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {prices.map(p => (
            <div key={p.fournisseur} style={{
              padding: 14, borderRadius: 12, border: p.fournisseur === best.fournisseur ? '2px solid #10b981' : '1px solid #e2e8f0',
              background: p.fournisseur === best.fournisseur ? '#f0fdf4' : '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {p.fournisseur}
                  {p.fournisseur === best.fournisseur && (
                    <span style={{ fontSize: 10, padding: '2px 8px', background: '#10b981', color: '#fff', borderRadius: 10, fontWeight: 800 }}>MEILLEUR PRIX</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Livraison : {p.delai} • Note : {p.note}/5 ⭐</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{fmt(p.prix)}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>/ {ingredient.unite}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Waste log modal ─── */
function WasteModal({ onClose, onToast }: { onClose: () => void; onToast: (m: string) => void }) {
  const [list, setList] = useState<Waste[]>(WASTE_LOG)
  const [ingredient, setIngredient] = useState('')
  const [quantite, setQuantite] = useState('')
  const [raison, setRaison] = useState<Waste['raison']>('Expiration')
  const total = list.reduce((s, w) => s + w.cout, 0)

  const add = () => {
    if (!ingredient || !quantite) return
    const w: Waste = {
      id: `w${Date.now()}`, date: new Date().toISOString().slice(0, 10),
      ingredient, quantite: parseFloat(quantite), unite: 'u', raison,
      cout: parseFloat(quantite) * 5,
    }
    setList([w, ...list])
    setIngredient(''); setQuantite('')
    onToast(`Perte enregistrée : ${ingredient}`)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={overlay}>
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, maxWidth: 720, width: '100%', maxHeight: '86vh', overflow: 'auto', padding: 28 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trash2 size={17} /> Journal des pertes
          </h2>
          <button onClick={onClose} style={{ ...smallBtnStyle, padding: '6px 10px' }}><X size={14} /></button>
        </div>
        <div style={{ padding: 14, background: '#fef2f2', borderRadius: 12, marginBottom: 16, border: '1px solid #fecaca' }}>
          <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Coût total pertes ce mois</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#dc2626', marginTop: 4 }}>{fmt(total)}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 16 }}>
          <input style={inputStyle} placeholder="Ingrédient" value={ingredient} onChange={e => setIngredient(e.target.value)} />
          <input style={inputStyle} placeholder="Qté" type="number" value={quantite} onChange={e => setQuantite(e.target.value)} />
          <select style={inputStyle} value={raison} onChange={e => setRaison(e.target.value as Waste['raison'])}>
            <option>Expiration</option><option>Casse</option><option>Avarié</option><option>Vol</option>
          </select>
          <button onClick={add} style={{ ...smallBtnStyle, background: '#065F46', color: '#fff', border: 'none' }}>
            <Plus size={13} /> Ajouter
          </button>
        </div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Date', 'Ingrédient', 'Qté', 'Raison', 'Coût'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map(w => (
                <tr key={w.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{w.date}</td>
                  <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 600 }}>{w.ingredient}</td>
                  <td style={{ padding: '10px 14px', color: '#475569' }}>{w.quantite} {w.unite}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#991b1b' }}>{w.raison}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#dc2626', fontWeight: 700 }}>{fmt(w.cout)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Movements log modal ─── */
function MovementsModal({ onClose }: { onClose: () => void }) {
  const [filter, setFilter] = useState<string>('all')
  const filtered = MOVEMENTS.filter(m => filter === 'all' || m.type === filter)

  const typeColors: Record<string, { bg: string; fg: string }> = {
    'Entrée':   { bg: '#dcfce7', fg: '#166534' },
    'Sortie':    { bg: '#dbeafe', fg: '#1d4ed8' },
    'Transfert': { bg: '#ede9fe', fg: '#6d28d9' },
    'Perte':     { bg: '#fee2e2', fg: '#991b1b' },
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={overlay}>
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, maxWidth: 860, width: '100%', maxHeight: '86vh', overflow: 'auto', padding: 28 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileClock size={17} /> Journal des mouvements
          </h2>
          <button onClick={onClose} style={{ ...smallBtnStyle, padding: '6px 10px' }}><X size={14} /></button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {['all', 'Entrée', 'Sortie', 'Transfert', 'Perte'].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: '6px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: filter === t ? '1px solid #4338ca' : '1px solid #e2e8f0',
              background: filter === t ? '#eef2ff' : '#fff',
              color: filter === t ? '#4338ca' : '#475569',
            }}>{t === 'all' ? 'Tous' : t}</button>
          ))}
        </div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Date', 'Heure', 'Type', 'Ingrédient', 'Qté', 'Utilisateur', 'Raison'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const c = typeColors[m.type]
                return (
                  <tr key={m.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{m.date}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{m.time}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: c.bg, color: c.fg }}>{m.type}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 600 }}>{m.ingredient}</td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>{m.quantite}</td>
                    <td style={{ padding: '10px 14px', color: '#475569' }}>{m.user}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b', fontStyle: 'italic' }}>{m.raison}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Bulk price update modal ─── */
function BulkPriceModal({ onClose, onToast }: { onClose: () => void; onToast: (m: string) => void }) {
  const [supplier, setSupplier] = useState<string>('Metro Luxembourg')
  const [adjust, setAdjust] = useState<string>('5')
  const [direction, setDirection] = useState<'up' | 'down'>('up')

  const apply = () => {
    onToast(`Prix mis à jour pour ${supplier} : ${direction === 'up' ? '+' : '-'}${adjust}%`)
    onClose()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={overlay}>
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, maxWidth: 480, width: '100%', padding: 28 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Edit3 size={17} /> Mise à jour prix en masse
          </h2>
          <button onClick={onClose} style={{ ...smallBtnStyle, padding: '6px 10px' }}><X size={14} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Fournisseur</label>
            <select style={inputStyle} value={supplier} onChange={e => setSupplier(e.target.value)}>
              <option>Metro Luxembourg</option>
              <option>Luxlait</option>
              <option>Bofrost Luxembourg</option>
              <option>Marché Gros Luxembourg</option>
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Direction</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setDirection('up')} style={{
                  flex: 1, padding: 10, borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  border: direction === 'up' ? '1px solid #dc2626' : '1px solid #e2e8f0',
                  background: direction === 'up' ? '#fef2f2' : '#fff', color: direction === 'up' ? '#dc2626' : '#64748b',
                }}>+ Hausse</button>
                <button onClick={() => setDirection('down')} style={{
                  flex: 1, padding: 10, borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  border: direction === 'down' ? '1px solid #16a34a' : '1px solid #e2e8f0',
                  background: direction === 'down' ? '#f0fdf4' : '#fff', color: direction === 'down' ? '#16a34a' : '#64748b',
                }}>− Baisse</button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Pourcentage</label>
              <input style={inputStyle} type="number" value={adjust} onChange={e => setAdjust(e.target.value)} />
            </div>
          </div>
          <div style={{ padding: 12, background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#475569' }}>
            Cette action appliquera un ajustement de <strong>{direction === 'up' ? '+' : '-'}{adjust}%</strong> sur tous les articles du fournisseur <strong>{supplier}</strong>.
          </div>
          <button onClick={apply} style={{ padding: '12px 18px', borderRadius: 12, border: 'none', background: '#065F46', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Appliquer
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

// Map backend StockEntry → UI Ingredient
function backendToIngredient(b: any): Ingredient {
  return {
    id: b.id,
    nom: b.name,
    barcode: b.barcode || '',
    categorie: (b.category || 'Épicerie') as Categorie,
    stockActuel: b.quantity || 0,
    unite: (b.unit || 'unité') as Unite,
    seuilMinimum: b.lowStockThreshold || 0,
    valeur: (b.quantity || 0) * (b.avgUnitPrice || 0),
    dernierAppro: new Date(b.lastUpdated || Date.now()).toISOString().slice(0, 10),
    fournisseur: b.lastSupplier || 'Inconnu',
    dluo: undefined,
    location: 'Réserve' as Location,
    saison: 'Aucune' as Saison,
    cogs: b.avgUnitPrice || 0,
  }
}

export default function StockPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch from persistent backend on mount + every 3 s (live sync after OCR)
  useEffect(() => {
    let alive = true
    const fetchStock = async () => {
      try {
        const r = await fetch(`${BACKEND}/api/inventory-ocr/stock`)
        if (!r.ok) throw new Error('fetch failed')
        const j = await r.json()
        if (!alive) return
        setData((j.stock || []).map(backendToIngredient))
        setLoading(false)
      } catch {
        if (alive) setLoading(false)
      }
    }
    fetchStock()
    const id = setInterval(fetchStock, 3000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  // Manual delete one item (persisted)
  const deleteItem = async (id: string) => {
    if (!confirm('Supprimer cet article du stock ?')) return
    await fetch(`${BACKEND}/api/inventory-ocr/stock/${id}`, { method: 'DELETE' })
    setData((d) => d.filter((i) => i.id !== id))
  }

  // Manual reset all (persisted)
  const resetAll = async () => {
    if (!confirm('⚠ Vider TOUT le stock ? Cette action est irréversible.')) return
    await fetch(`${BACKEND}/api/inventory-ocr/stock`, { method: 'DELETE' })
    setData([])
  }

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<Categorie | null>(null)
  const [locationFilter, setLocationFilter] = useState<Location | null>(null)
  const [statusFilter, setStatusFilter] = useState<Statut | null>(null)

  const [showScanner, setShowScanner] = useState(false)
  const [supplierCompare, setSupplierCompare] = useState<Ingredient | null>(null)
  const [showWaste, setShowWaste] = useState(false)
  const [showMovements, setShowMovements] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2800)
  }

  const stats = useMemo(() => {
    const total = data.length
    const ok = data.filter(i => getStatut(i) === 'OK').length
    const bas = data.filter(i => getStatut(i) === 'Bas').length
    const rupture = data.filter(i => getStatut(i) === 'Rupture').length
    const valeur = data.reduce((s, i) => s + i.valeur, 0)
    const dluoCritiques = data.filter(i => daysUntil(i.dluo) <= 7 && i.stockActuel > 0).length
    return { total, ok, bas, rupture, valeur, dluoCritiques }
  }, [data])

  const filtered = useMemo(() => {
    return data.filter(i => {
      if (search && !i.nom.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter && i.categorie !== categoryFilter) return false
      if (locationFilter && i.location !== locationFilter) return false
      if (statusFilter && getStatut(i) !== statusFilter) return false
      return true
    })
  }, [data, search, categoryFilter, locationFilter, statusFilter])

  const predictions = useMemo(() => {
    return data
      .map(i => ({ ing: i, days: predictRunout(i) }))
      .filter(p => p.days > 0 && p.days <= 7)
      .sort((a, b) => a.days - b.days)
      .slice(0, 4)
  }, [data])

  const fifoAlerts = useMemo(() => {
    return data
      .filter(i => daysUntil(i.dluo) <= 7 && i.stockActuel > 0)
      .sort((a, b) => daysUntil(a.dluo) - daysUntil(b.dluo))
  }, [data])

  const handleScan = (code: string) => {
    const ing = data.find(i => i.barcode === code)
    if (ing) {
      setData(prev => prev.map(i => i.id === ing.id ? { ...i, stockActuel: i.stockActuel + 1 } : i))
      showToast(`+1 ${ing.unite} de ${ing.nom} ajouté`)
    }
  }

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show" style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <motion.div variants={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: 0 }}>Stock & inventaire</h1>
            <p style={{ fontSize: 14, color: '#475569', margin: '4px 0 0' }}>Suivi temps réel, DLUO, coûts et prédictions ML</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              onClick={() => navigate('/inventory/ocr')}
              style={{
                ...smallBtnStyle,
                background: 'linear-gradient(135deg,#10b981,#059669)',
                color: '#fff', border: 'none',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
              }}>
              📸 OCR Reçu IA
            </button>
            {data.length > 0 && (
              <button
                onClick={resetAll}
                style={{
                  ...smallBtnStyle,
                  background: 'rgba(239,68,68,0.1)',
                  color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)',
                }}>
                🗑 Vider tout
              </button>
            )}
            <button onClick={() => setShowScanner(true)} style={{ ...smallBtnStyle, background: '#4338ca', color: '#fff', border: 'none' }}>
              <ScanLine size={13} /> Scanner
            </button>
            <button onClick={() => setShowMovements(true)} style={smallBtnStyle}>
              <FileClock size={13} /> Mouvements
            </button>
            <button onClick={() => setShowWaste(true)} style={smallBtnStyle}>
              <Trash2 size={13} /> Pertes
            </button>
            <button onClick={() => setShowBulk(true)} style={smallBtnStyle}>
              <Edit3 size={13} /> Prix en masse
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total articles', value: stats.total, icon: Package, color: '#4338ca' },
            { label: 'Stock OK', value: stats.ok, icon: CheckCircle2, color: '#10b981' },
            { label: 'Stock bas', value: stats.bas, icon: AlertTriangle, color: '#eab308' },
            { label: 'Ruptures', value: stats.rupture, icon: XCircle, color: '#ef4444' },
            { label: 'Valeur stock', value: fmt(stats.valeur), icon: Euro, color: '#8b5cf6' },
            { label: 'DLUO < 7j', value: stats.dluoCritiques, icon: CalendarDays, color: '#f97316' },
          ].map(s => (
            <div key={s.label} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={14} style={{ color: s.color }} />
                </div>
                <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
            </div>
          ))}
        </motion.div>

        {/* Charts row */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px', color: '#1e293b' }}>Entrées / Sorties cette semaine</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={consumptionHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="jour" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="entrees" stroke="#10b981" fill="#10b98130" strokeWidth={2} />
                <Area type="monotone" dataKey="sorties" stroke="#ef4444" fill="#ef444430" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 size={14} /> Coût des marchandises (COGS)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cogsMonthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mois" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cogs" fill="#ef4444" name="COGS" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ventes" fill="#10b981" name="Ventes" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Predictions + FIFO alerts */}
        <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 14px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={14} style={{ color: '#8b5cf6' }} /> Prédictions rupture (ML)
            </h3>
            {predictions.length === 0 ? (
              <div style={{ fontSize: 12, color: '#64748b', padding: 16, textAlign: 'center' }}>Aucune rupture prévue</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {predictions.map(p => (
                  <div key={p.ing.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#faf5ff', borderRadius: 10, border: '1px solid #e9d5ff' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{p.ing.nom}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Stock : {p.ing.stockActuel} {p.ing.unite}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#8b5cf6' }}>J+{p.days}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>rupture estimée</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 14px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldAlert size={14} style={{ color: '#f97316' }} /> DLUO &amp; alertes FIFO
            </h3>
            {fifoAlerts.length === 0 ? (
              <div style={{ fontSize: 12, color: '#64748b', padding: 16, textAlign: 'center' }}>Aucune DLUO critique</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fifoAlerts.map(i => {
                  const days = daysUntil(i.dluo)
                  return (
                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: days <= 3 ? '#fef2f2' : '#fff7ed', borderRadius: 10, border: `1px solid ${days <= 3 ? '#fecaca' : '#fed7aa'}` }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{i.nom}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>DLUO : {i.dluo} • {i.stockActuel} {i.unite}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: days <= 3 ? '#dc2626' : '#f97316' }}>J{days >= 0 ? `+${days}` : days}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{days <= 3 ? 'URGENT' : 'attention'}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={item} style={{ ...cardStyle, padding: 14, marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input style={{ ...inputStyle, paddingLeft: 34 }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', alignSelf: 'center', fontWeight: 700, letterSpacing: 1 }}>Cat.</span>
            <button onClick={() => setCategoryFilter(null)} style={{
              padding: '6px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: categoryFilter === null ? '#1e293b' : '#f1f5f9', color: categoryFilter === null ? '#fff' : '#475569',
            }}>Toutes</button>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)} style={{
                padding: '6px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: 'none',
                background: categoryFilter === c ? CATEGORY_COLORS[c].bg : '#f1f5f9',
                color: categoryFilter === c ? CATEGORY_COLORS[c].text : '#475569',
              }}>{c}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', alignSelf: 'center', fontWeight: 700, letterSpacing: 1 }}>Lieu</span>
            <button onClick={() => setLocationFilter(null)} style={{
              padding: '6px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: locationFilter === null ? '#1e293b' : '#f1f5f9', color: locationFilter === null ? '#fff' : '#475569',
            }}>Tous</button>
            {LOCATIONS.map(l => (
              <button key={l} onClick={() => setLocationFilter(l)} style={{
                padding: '6px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: 'none',
                background: locationFilter === l ? '#e0e7ff' : '#f1f5f9',
                color: locationFilter === l ? '#4338ca' : '#475569',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <MapPin size={10} /> {l}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div variants={item} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Article', 'Catégorie', 'Lieu', 'Stock', 'Seuil', 'DLUO', 'COGS/u', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => {
                  const statut = getStatut(i)
                  const s = STATUT_STYLES[statut]
                  const dluoDays = daysUntil(i.dluo)
                  const cat = CATEGORY_COLORS[i.categorie]
                  return (
                    <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{i.nom}</span>
                          {i.saison === 'Été' && <Leaf size={11} style={{ color: '#16a34a' }} />}
                          {i.saison === 'Hiver' && <Snowflake size={11} style={{ color: '#0ea5e9' }} />}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>{i.barcode}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: cat.bg, color: cat.text }}>{i.categorie}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#475569', padding: '3px 8px', borderRadius: 6, background: '#f1f5f9' }}>
                          <MapPin size={10} /> {i.location}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#1e293b', fontWeight: 700 }}>
                        {i.stockActuel} <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>{i.unite}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>{i.seuilMinimum} {i.unite}</td>
                      <td style={{ padding: '12px 14px', fontSize: 11 }}>
                        <div style={{ color: dluoDays <= 3 ? '#dc2626' : dluoDays <= 7 ? '#f97316' : '#64748b', fontWeight: dluoDays <= 7 ? 700 : 500 }}>
                          {i.dluo}
                        </div>
                        {dluoDays <= 14 && i.stockActuel > 0 && (
                          <div style={{ fontSize: 10, color: dluoDays <= 3 ? '#dc2626' : '#f97316', marginTop: 2 }}>
                            J{dluoDays >= 0 ? `+${dluoDays}` : dluoDays}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#1e293b', fontWeight: 600 }}>{fmt(i.cogs)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: s.bg, color: s.text }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
                          {statut}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setSupplierCompare(i)} title="Comparer fournisseurs" style={{ ...smallBtnStyle, padding: '5px 8px' }}>
                            <ArrowRightLeft size={11} />
                          </button>
                          <button onClick={() => showToast(`Commande lancée : ${i.nom}`)} title="Commander" style={{ ...smallBtnStyle, padding: '5px 8px', background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                            <ShoppingCart size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showScanner && <BarcodeScanner onClose={() => setShowScanner(false)} onScan={handleScan} />}
        {supplierCompare && <SupplierModal ingredient={supplierCompare} onClose={() => setSupplierCompare(null)} />}
        {showWaste && <WasteModal onClose={() => setShowWaste(false)} onToast={showToast} />}
        {showMovements && <MovementsModal onClose={() => setShowMovements(false)} />}
        {showBulk && <BulkPriceModal onClose={() => setShowBulk(false)} onToast={showToast} />}
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </>
  )
}
