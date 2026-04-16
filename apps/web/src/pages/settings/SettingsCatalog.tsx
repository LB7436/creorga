import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  Plus,
  Search,
  Upload,
  Download,
  Trash2,
  GripVertical,
  Save,
  Percent,
  Power,
  FolderOpen,
  Tag,
  Image as ImageIcon,
  CheckSquare,
  Square,
} from 'lucide-react'
import toast from 'react-hot-toast'
import SettingsLayout from './SettingsLayout'

const C = {
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#fff',
  bgSoft: '#f8fafc',
  indigo: '#6366f1',
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
  violet: '#8b5cf6',
}

const card: React.CSSProperties = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontSize: 13,
  color: C.text,
  background: '#fff',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 6,
}

type Category = { id: string; emoji: string; name: string; count: number }
type Product = {
  id: string
  emoji: string
  name: string
  description: string
  price: number
  tva: number
  stock: number
  stockTracking: boolean
  categoryId: string
  active: boolean
  allergens: string[]
  ingredients: string[]
}

const ALLERGENS = ['Gluten', 'Lait', 'Œufs', 'Fruits à coque', 'Poisson', 'Crustacés', 'Soja', 'Sulfites']

const INITIAL_CATEGORIES: Category[] = [
  { id: 'c1', emoji: '🍔', name: 'Burgers', count: 5 },
  { id: 'c2', emoji: '🍕', name: 'Pizzas', count: 4 },
  { id: 'c3', emoji: '🥗', name: 'Salades', count: 3 },
  { id: 'c4', emoji: '🍟', name: 'Accompagnements', count: 3 },
  { id: 'c5', emoji: '🥤', name: 'Boissons', count: 3 },
  { id: 'c6', emoji: '🍰', name: 'Desserts', count: 2 },
]

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', emoji: '🍔', name: 'Cheeseburger classique', description: 'Steak haché, cheddar, salade, tomate', price: 12.5, tva: 17, stock: 45, stockTracking: true, categoryId: 'c1', active: true, allergens: ['Gluten', 'Lait'], ingredients: ['Pain brioche', 'Steak 150g', 'Cheddar', 'Salade', 'Tomate', 'Sauce maison'] },
  { id: 'p2', emoji: '🍔', name: 'Double bacon', description: 'Double steak avec bacon croustillant', price: 15.9, tva: 17, stock: 30, stockTracking: true, categoryId: 'c1', active: true, allergens: ['Gluten', 'Lait'], ingredients: ['Pain', 'Double steak', 'Bacon', 'Cheddar'] },
  { id: 'p3', emoji: '🌱', name: 'Veggie burger', description: 'Galette de légumes et avocat', price: 13.5, tva: 17, stock: 20, stockTracking: true, categoryId: 'c1', active: true, allergens: ['Gluten', 'Soja'], ingredients: ['Pain complet', 'Galette légumes', 'Avocat'] },
  { id: 'p4', emoji: '🍔', name: 'Chicken deluxe', description: 'Poulet croustillant mariné', price: 13.9, tva: 17, stock: 0, stockTracking: true, categoryId: 'c1', active: false, allergens: ['Gluten'], ingredients: ['Pain', 'Poulet'] },
  { id: 'p5', emoji: '🔥', name: 'Spicy burger', description: 'Sauce piquante maison', price: 13.5, tva: 17, stock: 18, stockTracking: true, categoryId: 'c1', active: true, allergens: ['Gluten'], ingredients: ['Pain', 'Steak', 'Sauce piquante'] },
  { id: 'p6', emoji: '🍕', name: 'Margherita', description: 'Tomate, mozzarella, basilic', price: 11.0, tva: 17, stock: 50, stockTracking: true, categoryId: 'c2', active: true, allergens: ['Gluten', 'Lait'], ingredients: ['Pâte', 'Tomate', 'Mozzarella', 'Basilic'] },
  { id: 'p7', emoji: '🍕', name: 'Reine', description: 'Jambon, champignons', price: 13.5, tva: 17, stock: 40, stockTracking: true, categoryId: 'c2', active: true, allergens: ['Gluten', 'Lait'], ingredients: ['Pâte', 'Jambon', 'Champignons'] },
  { id: 'p8', emoji: '🍕', name: 'Quatre fromages', description: 'Mélange de fromages italiens', price: 14.9, tva: 17, stock: 35, stockTracking: true, categoryId: 'c2', active: true, allergens: ['Gluten', 'Lait'], ingredients: ['Pâte', 'Mozzarella', 'Gorgonzola', 'Parmesan'] },
  { id: 'p9', emoji: '🍕', name: 'Diavola', description: 'Chorizo et piments', price: 14.5, tva: 17, stock: 28, stockTracking: true, categoryId: 'c2', active: true, allergens: ['Gluten', 'Lait'], ingredients: ['Pâte', 'Chorizo', 'Piments'] },
  { id: 'p10', emoji: '🥗', name: 'Salade César', description: 'Poulet grillé, parmesan, croûtons', price: 11.5, tva: 17, stock: 25, stockTracking: true, categoryId: 'c3', active: true, allergens: ['Gluten', 'Lait', 'Œufs'], ingredients: ['Salade', 'Poulet', 'Parmesan', 'Croûtons'] },
  { id: 'p11', emoji: '🥙', name: 'Salade grecque', description: 'Feta, olives, concombre', price: 10.9, tva: 17, stock: 22, stockTracking: true, categoryId: 'c3', active: true, allergens: ['Lait'], ingredients: ['Tomate', 'Feta', 'Olives'] },
  { id: 'p12', emoji: '🥗', name: 'Salade niçoise', description: 'Thon, œuf, haricots', price: 12.5, tva: 17, stock: 18, stockTracking: true, categoryId: 'c3', active: true, allergens: ['Œufs', 'Poisson'], ingredients: ['Salade', 'Thon', 'Œuf'] },
  { id: 'p13', emoji: '🍟', name: 'Frites maison', description: 'Pommes de terre fraîches', price: 4.5, tva: 17, stock: 80, stockTracking: true, categoryId: 'c4', active: true, allergens: [], ingredients: ['Pommes de terre', 'Sel'] },
  { id: 'p14', emoji: '🧅', name: 'Onion rings', description: 'Rondelles d\'oignon panées', price: 5.5, tva: 17, stock: 40, stockTracking: true, categoryId: 'c4', active: true, allergens: ['Gluten'], ingredients: ['Oignon', 'Chapelure'] },
  { id: 'p15', emoji: '🥔', name: 'Potatoes', description: 'Quartiers de pommes de terre épicés', price: 5.0, tva: 17, stock: 50, stockTracking: true, categoryId: 'c4', active: true, allergens: [], ingredients: ['Pommes de terre', 'Épices'] },
  { id: 'p16', emoji: '🥤', name: 'Coca-Cola 33cl', description: 'Canette', price: 3.5, tva: 17, stock: 120, stockTracking: true, categoryId: 'c5', active: true, allergens: [], ingredients: [] },
  { id: 'p17', emoji: '💧', name: 'Eau minérale', description: '50cl plate ou gazeuse', price: 2.5, tva: 17, stock: 100, stockTracking: true, categoryId: 'c5', active: true, allergens: [], ingredients: [] },
  { id: 'p18', emoji: '🍺', name: 'Bière pression 25cl', description: 'Bofferding', price: 4.5, tva: 17, stock: 200, stockTracking: true, categoryId: 'c5', active: true, allergens: ['Gluten'], ingredients: [] },
  { id: 'p19', emoji: '🍰', name: 'Tiramisu', description: 'Classique italien', price: 6.5, tva: 17, stock: 15, stockTracking: true, categoryId: 'c6', active: true, allergens: ['Lait', 'Œufs', 'Gluten'], ingredients: ['Mascarpone', 'Café', 'Biscuits'] },
  { id: 'p20', emoji: '🍦', name: 'Café gourmand', description: 'Espresso + 3 mignardises', price: 7.9, tva: 17, stock: 20, stockTracking: true, categoryId: 'c6', active: true, allergens: ['Lait', 'Gluten'], ingredients: ['Café', 'Assortiment'] },
]

export default function SettingsCatalog() {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES)
  const [products, setProducts] = useState(INITIAL_PRODUCTS)
  const [selectedCatId, setSelectedCatId] = useState('c1')
  const [selectedProdId, setSelectedProdId] = useState<string | null>('p1')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [dragCat, setDragCat] = useState<string | null>(null)
  const [dragProd, setDragProd] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'name' | 'price' } | null>(null)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkPercent, setBulkPercent] = useState('')

  const filteredProducts = useMemo(
    () => products.filter((p) => p.categoryId === selectedCatId && p.name.toLowerCase().includes(search.toLowerCase())),
    [products, selectedCatId, search],
  )
  const selectedProduct = products.find((p) => p.id === selectedProdId) || null

  const handleDragCatStart = (id: string) => setDragCat(id)
  const handleDragCatOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (!dragCat || dragCat === id) return
    const a = categories.findIndex((c) => c.id === dragCat)
    const b = categories.findIndex((c) => c.id === id)
    const next = [...categories]
    next.splice(b, 0, next.splice(a, 1)[0])
    setCategories(next)
  }

  const handleDragProdStart = (id: string) => setDragProd(id)
  const handleDragProdOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (!dragProd || dragProd === id) return
    const a = products.findIndex((p) => p.id === dragProd)
    const b = products.findIndex((p) => p.id === id)
    const next = [...products]
    next.splice(b, 0, next.splice(a, 1)[0])
    setProducts(next)
  }

  const toggleSelect = (id: string) =>
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const toggleAll = () => {
    if (selectedIds.length === filteredProducts.length) setSelectedIds([])
    else setSelectedIds(filteredProducts.map((p) => p.id))
  }

  const updateProduct = (id: string, patch: Partial<Product>) => {
    setProducts((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const applyBulkPercent = () => {
    const pct = parseFloat(bulkPercent)
    if (isNaN(pct)) {
      toast.error('Pourcentage invalide')
      return
    }
    setProducts((list) =>
      list.map((p) =>
        selectedIds.includes(p.id) ? { ...p, price: Math.round(p.price * (1 + pct / 100) * 100) / 100 } : p,
      ),
    )
    toast.success(`Prix ajustés de ${pct > 0 ? '+' : ''}${pct}%`)
    setShowBulkModal(false)
    setBulkPercent('')
    setSelectedIds([])
  }

  const bulkDisable = () => {
    setProducts((list) => list.map((p) => (selectedIds.includes(p.id) ? { ...p, active: false } : p)))
    toast.success(`${selectedIds.length} produit(s) désactivé(s)`)
    setSelectedIds([])
  }

  const totalProducts = products.length
  const totalCategories = categories.length

  return (
    <SettingsLayout>
      <div style={{ maxWidth: 1400, margin: '0 auto', color: C.text }}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}
        >
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Package size={26} color={C.indigo} /> Catalogue produits
            </h1>
            <p style={{ color: C.muted, margin: '6px 0 0', fontSize: 14 }}>
              {totalProducts} produits · {totalCategories} catégories
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => toast.success('Import CSV/Excel (mock)')} style={btnGhost}>
              <Upload size={15} /> Importer un menu
            </button>
            <button onClick={() => toast.success('Catalogue exporté')} style={btnPrimary}>
              <Download size={15} /> Export catalogue
            </button>
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 16 }}>
          {/* CATEGORIES */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Catégories</h3>
              <button
                onClick={() => {
                  const id = `c${Date.now()}`
                  setCategories((c) => [...c, { id, emoji: '📦', name: 'Nouvelle catégorie', count: 0 }])
                }}
                style={{ ...btnTiny, background: C.indigo, color: '#fff', border: 'none' }}
              >
                <Plus size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {categories.map((cat) => {
                const active = cat.id === selectedCatId
                return (
                  <motion.div
                    key={cat.id}
                    draggable
                    onDragStart={() => handleDragCatStart(cat.id)}
                    onDragOver={(e) => handleDragCatOver(e, cat.id)}
                    onClick={() => setSelectedCatId(cat.id)}
                    whileHover={{ x: 2 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 10px',
                      borderRadius: 10,
                      background: active ? '#eef2ff' : 'transparent',
                      border: `1px solid ${active ? C.indigo : 'transparent'}`,
                      cursor: 'pointer',
                    }}
                  >
                    <GripVertical size={14} color={C.muted} style={{ cursor: 'grab' }} />
                    <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{cat.name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {products.filter((p) => p.categoryId === cat.id).length} produits
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* PRODUCTS TABLE */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={card}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} color={C.muted} style={{ position: 'absolute', left: 10, top: 10 }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un produit…"
                  style={{ ...inputStyle, paddingLeft: 30 }}
                />
              </div>
              {selectedIds.length > 0 && (
                <>
                  <span style={{ fontSize: 12, color: C.muted }}>{selectedIds.length} sélectionné(s)</span>
                  <button onClick={() => setShowBulkModal(true)} style={btnGhost}>
                    <Percent size={14} /> Prix ±%
                  </button>
                  <button onClick={bulkDisable} style={{ ...btnGhost, color: C.red, borderColor: '#fecaca' }}>
                    <Power size={14} /> Désactiver
                  </button>
                </>
              )}
            </div>

            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: C.bgSoft }}>
                  <tr>
                    <th style={th}>
                      <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                          <CheckSquare size={15} color={C.indigo} />
                        ) : (
                          <Square size={15} color={C.muted} />
                        )}
                      </button>
                    </th>
                    <th style={th}>Produit</th>
                    <th style={th}>Prix</th>
                    <th style={th}>TVA</th>
                    <th style={th}>Stock</th>
                    <th style={th}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const checked = selectedIds.includes(p.id)
                    const editName = editingCell?.id === p.id && editingCell.field === 'name'
                    const editPrice = editingCell?.id === p.id && editingCell.field === 'price'
                    return (
                      <tr
                        key={p.id}
                        draggable
                        onDragStart={() => handleDragProdStart(p.id)}
                        onDragOver={(e) => handleDragProdOver(e, p.id)}
                        onClick={() => setSelectedProdId(p.id)}
                        style={{
                          borderTop: `1px solid ${C.border}`,
                          background: selectedProdId === p.id ? '#f5f3ff' : '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <td style={td} onClick={(e) => { e.stopPropagation(); toggleSelect(p.id) }}>
                          {checked ? <CheckSquare size={15} color={C.indigo} /> : <Square size={15} color={C.muted} />}
                        </td>
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>{p.emoji}</span>
                            {editName ? (
                              <input
                                autoFocus
                                defaultValue={p.name}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={(e) => { updateProduct(p.id, { name: e.target.value }); setEditingCell(null) }}
                                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                style={{ ...inputStyle, padding: '4px 8px' }}
                              />
                            ) : (
                              <span
                                onDoubleClick={(e) => { e.stopPropagation(); setEditingCell({ id: p.id, field: 'name' }) }}
                                style={{ fontWeight: 600 }}
                              >
                                {p.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={td}>
                          {editPrice ? (
                            <input
                              autoFocus
                              type="number"
                              step="0.1"
                              defaultValue={p.price}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={(e) => { updateProduct(p.id, { price: parseFloat(e.target.value) || 0 }); setEditingCell(null) }}
                              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                              style={{ ...inputStyle, padding: '4px 8px', width: 80 }}
                            />
                          ) : (
                            <span onDoubleClick={(e) => { e.stopPropagation(); setEditingCell({ id: p.id, field: 'price' }) }}>
                              {p.price.toFixed(2)} €
                            </span>
                          )}
                        </td>
                        <td style={td}>{p.tva}%</td>
                        <td style={td}>
                          <span style={{ color: p.stock === 0 ? C.red : p.stock < 10 ? C.amber : C.text }}>
                            {p.stock}
                          </span>
                        </td>
                        <td style={td}>
                          <span
                            style={{
                              padding: '3px 9px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 600,
                              background: p.active ? '#d1fae5' : '#fee2e2',
                              color: p.active ? '#065f46' : '#991b1b',
                            }}
                          >
                            {p.active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ ...td, textAlign: 'center', color: C.muted, padding: 28 }}>
                        Aucun produit dans cette catégorie
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => {
                const id = `p${Date.now()}`
                const np: Product = {
                  id, emoji: '🍽️', name: 'Nouveau produit', description: '', price: 10, tva: 17, stock: 0,
                  stockTracking: false, categoryId: selectedCatId, active: true, allergens: [], ingredients: [],
                }
                setProducts((pp) => [...pp, np])
                setSelectedProdId(id)
              }}
              style={{ ...btnGhost, marginTop: 12, width: '100%', justifyContent: 'center' }}
            >
              <Plus size={14} /> Ajouter un produit
            </button>
          </motion.div>

          {/* PRODUCT DETAIL */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} style={card}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={15} /> Détail produit
            </h3>
            <AnimatePresence mode="wait">
              {selectedProduct ? (
                <motion.div
                  key={selectedProduct.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 12, background: C.bgSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, border: `1px solid ${C.border}` }}>
                      {selectedProduct.emoji}
                    </div>
                    <button style={{ ...btnGhost, fontSize: 12 }}>
                      <ImageIcon size={13} /> Changer photo
                    </button>
                  </div>

                  <div>
                    <label style={labelStyle}>Nom</label>
                    <input
                      value={selectedProduct.name}
                      onChange={(e) => updateProduct(selectedProduct.id, { name: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      value={selectedProduct.description}
                      onChange={(e) => updateProduct(selectedProduct.id, { description: e.target.value })}
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>Prix (€)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedProduct.price}
                        onChange={(e) => updateProduct(selectedProduct.id, { price: parseFloat(e.target.value) || 0 })}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>TVA</label>
                      <select
                        value={selectedProduct.tva}
                        onChange={(e) => updateProduct(selectedProduct.id, { tva: parseInt(e.target.value) })}
                        style={inputStyle}
                      >
                        <option value={3}>3%</option>
                        <option value={8}>8%</option>
                        <option value={14}>14%</option>
                        <option value={17}>17%</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>
                      <FolderOpen size={12} style={{ display: 'inline', marginRight: 4 }} /> Catégorie
                    </label>
                    <select
                      value={selectedProduct.categoryId}
                      onChange={(e) => updateProduct(selectedProduct.id, { categoryId: e.target.value })}
                      style={inputStyle}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.emoji} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>Allergènes</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ALLERGENS.map((al) => {
                        const on = selectedProduct.allergens.includes(al)
                        return (
                          <button
                            key={al}
                            onClick={() =>
                              updateProduct(selectedProduct.id, {
                                allergens: on
                                  ? selectedProduct.allergens.filter((a) => a !== al)
                                  : [...selectedProduct.allergens, al],
                              })
                            }
                            style={{
                              padding: '4px 10px',
                              borderRadius: 14,
                              fontSize: 11,
                              fontWeight: 600,
                              border: `1px solid ${on ? C.amber : C.border}`,
                              background: on ? '#fef3c7' : '#fff',
                              color: on ? '#92400e' : C.muted,
                              cursor: 'pointer',
                            }}
                          >
                            {al}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedProduct.stockTracking}
                      onChange={(e) => updateProduct(selectedProduct.id, { stockTracking: e.target.checked })}
                    />
                    Suivi de stock
                  </label>

                  {selectedProduct.ingredients.length > 0 && (
                    <div>
                      <label style={labelStyle}>Ingrédients (recette)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {selectedProduct.ingredients.map((ing) => (
                          <span key={ing} style={{ padding: '3px 8px', borderRadius: 10, background: C.bgSoft, fontSize: 11, color: C.muted }}>
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button
                      onClick={() => toast.success('Produit enregistré')}
                      style={{ ...btnPrimary, flex: 1 }}
                    >
                      <Save size={14} /> Enregistrer
                    </button>
                    <button
                      onClick={() => {
                        setProducts((pp) => pp.filter((p) => p.id !== selectedProduct.id))
                        setSelectedProdId(null)
                        toast.success('Produit supprimé')
                      }}
                      style={{ ...btnGhost, color: C.red, borderColor: '#fecaca' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: 32 }}>
                  Sélectionnez un produit
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* BULK MODAL */}
        <AnimatePresence>
          {showBulkModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBulkModal(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            >
              <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                style={{ ...card, width: 360 }}
              >
                <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>Ajuster les prix</h3>
                <p style={{ margin: '0 0 14px', color: C.muted, fontSize: 12 }}>
                  {selectedIds.length} produit(s). Entrez un pourcentage (ex: -10 ou 15).
                </p>
                <input
                  autoFocus
                  type="number"
                  value={bulkPercent}
                  onChange={(e) => setBulkPercent(e.target.value)}
                  placeholder="Ex: -10"
                  style={inputStyle}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => setShowBulkModal(false)} style={{ ...btnGhost, flex: 1, justifyContent: 'center' }}>
                    Annuler
                  </button>
                  <button onClick={applyBulkPercent} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}>
                    Appliquer
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SettingsLayout>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: C.muted,
  padding: '10px 12px',
  letterSpacing: 0.3,
}
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' }

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  color: '#fff',
  background: C.indigo,
  border: 'none',
  cursor: 'pointer',
}

const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  color: C.text,
  background: '#fff',
  border: `1px solid ${C.border}`,
  cursor: 'pointer',
}

const btnTiny: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 6,
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: '#fff',
  cursor: 'pointer',
}
