import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Plus, Search, Edit2, Trash2, GripVertical, Percent,
  Tag, Package, X, Check, AlertCircle,
} from 'lucide-react'

type Tab = 'categories' | 'products' | 'taxes'

interface Category {
  id: string
  name: string
  emoji: string
  color: string
  productCount: number
}

interface Product {
  id: string
  name: string
  category: string
  price: number
  tva: number
  stock: number
  active: boolean
  allergens: string[]
}

interface TvaRate {
  rate: number
  label: string
  description: string
  active: boolean
}

const INITIAL_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Entrées',      emoji: '🥗', color: '#10b981', productCount: 8  },
  { id: 'c2', name: 'Plats',        emoji: '🍽️', color: '#3b82f6', productCount: 14 },
  { id: 'c3', name: 'Desserts',     emoji: '🍰', color: '#ec4899', productCount: 6  },
  { id: 'c4', name: 'Boissons',     emoji: '🥤', color: '#f59e0b', productCount: 22 },
  { id: 'c5', name: 'Vins',         emoji: '🍷', color: '#8b5cf6', productCount: 18 },
  { id: 'c6', name: 'Formules midi', emoji: '⏱️', color: '#06b6d4', productCount: 4  },
]

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1',  name: 'Bouchée à la reine',      category: 'Entrées',       price: 12.50, tva: 3,  stock: 24, active: true,  allergens: ['Gluten', 'Lait', 'Œuf'] },
  { id: 'p2',  name: 'Salade Luxembourgeoise',  category: 'Entrées',       price: 14.00, tva: 3,  stock: 18, active: true,  allergens: ['Œuf'] },
  { id: 'p3',  name: 'Carpaccio de bœuf',       category: 'Entrées',       price: 16.50, tva: 3,  stock: 12, active: true,  allergens: ['Gluten'] },
  { id: 'p4',  name: 'Judd mat Gaardebounen',   category: 'Plats',         price: 22.00, tva: 3,  stock: 8,  active: true,  allergens: [] },
  { id: 'p5',  name: 'Friture de la Moselle',   category: 'Plats',         price: 24.50, tva: 3,  stock: 6,  active: true,  allergens: ['Poisson', 'Gluten'] },
  { id: 'p6',  name: 'Entrecôte grillée 300g',  category: 'Plats',         price: 28.00, tva: 3,  stock: 14, active: true,  allergens: [] },
  { id: 'p7',  name: 'Bouneschlupp',            category: 'Plats',         price: 14.50, tva: 3,  stock: 20, active: true,  allergens: ['Céleri'] },
  { id: 'p8',  name: 'Risotto aux cèpes',       category: 'Plats',         price: 19.50, tva: 3,  stock: 10, active: false, allergens: ['Lait'] },
  { id: 'p9',  name: 'Tarte aux quetsches',     category: 'Desserts',      price: 7.50,  tva: 3,  stock: 16, active: true,  allergens: ['Gluten', 'Œuf'] },
  { id: 'p10', name: 'Crème brûlée',            category: 'Desserts',      price: 8.00,  tva: 3,  stock: 22, active: true,  allergens: ['Lait', 'Œuf'] },
  { id: 'p11', name: 'Mousse au chocolat',      category: 'Desserts',      price: 7.00,  tva: 3,  stock: 18, active: true,  allergens: ['Lait', 'Œuf'] },
  { id: 'p12', name: 'Coca-Cola 33 cl',         category: 'Boissons',      price: 3.50,  tva: 17, stock: 84, active: true,  allergens: [] },
  { id: 'p13', name: 'Eau plate Rosport',       category: 'Boissons',      price: 3.00,  tva: 3,  stock: 120,active: true,  allergens: [] },
  { id: 'p14', name: 'Café expresso',           category: 'Boissons',      price: 2.80,  tva: 17, stock: 999,active: true,  allergens: [] },
  { id: 'p15', name: 'Cappuccino',              category: 'Boissons',      price: 3.80,  tva: 17, stock: 999,active: true,  allergens: ['Lait'] },
  { id: 'p16', name: 'Riesling Mosel 75 cl',    category: 'Vins',          price: 32.00, tva: 14, stock: 28, active: true,  allergens: ['Sulfites'] },
  { id: 'p17', name: 'Crémant Poll-Fabaire',    category: 'Vins',          price: 28.00, tva: 14, stock: 22, active: true,  allergens: ['Sulfites'] },
  { id: 'p18', name: 'Pinot Gris',              category: 'Vins',          price: 26.00, tva: 14, stock: 18, active: true,  allergens: ['Sulfites'] },
  { id: 'p19', name: 'Menu midi 2 plats',       category: 'Formules midi', price: 19.90, tva: 3,  stock: 0,  active: true,  allergens: [] },
  { id: 'p20', name: 'Menu midi 3 plats',       category: 'Formules midi', price: 24.90, tva: 3,  stock: 0,  active: true,  allergens: [] },
]

const INITIAL_TVA: TvaRate[] = [
  { rate: 3,  label: 'Taux super-réduit', description: 'Alimentation, restauration sur place (hors alcool)', active: true },
  { rate: 8,  label: 'Taux réduit',       description: 'Certains biens et services culturels',                active: true },
  { rate: 14, label: 'Taux intermédiaire', description: 'Vins, services spécifiques',                         active: true },
  { rate: 17, label: 'Taux normal',       description: 'Alcools, sodas, tabac, services généraux',            active: true },
]

const EMOJIS = ['🥗','🍽️','🍰','🥤','🍷','⏱️','🍕','🍔','🌮','🍣','🥐','☕','🍺','🧀','🐟','🥩','🍱','🍜']
const COLORS = ['#3b82f6','#10b981','#ec4899','#f59e0b','#8b5cf6','#06b6d4','#ef4444','#14b8a6','#f97316','#a855f7']
const ALLERGENS_ALL = ['Gluten','Lait','Œuf','Poisson','Crustacés','Arachide','Soja','Fruits à coque','Céleri','Moutarde','Sulfites','Sésame','Mollusques','Lupin']

export default function AdminCatalog() {
  const [tab, setTab] = useState<Tab>('categories')
  const [categories, setCategories] = useState(INITIAL_CATEGORIES)
  const [products, setProducts] = useState(INITIAL_PRODUCTS)
  const [taxes, setTaxes] = useState(INITIAL_TVA)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showCatModal, setShowCatModal] = useState(false)
  const [showProdModal, setShowProdModal] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const [newCat, setNewCat] = useState({ name: '', emoji: '🍽️', color: '#3b82f6' })
  const [newProd, setNewProd] = useState({ name: '', category: 'Plats', price: 0, tva: 3 })

  // Drag reorder
  const handleDragStart = (i: number) => setDragIndex(i)
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  const handleDrop = (i: number) => {
    if (dragIndex === null || dragIndex === i) return
    setCategories((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(i, 0, moved)
      return next
    })
    setDragIndex(null)
    toast.success('Catégorie réordonnée')
  }

  const filteredProducts = products.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()),
  )

  const toggleProduct = (id: string) => setProducts((p) => p.map((x) => x.id === id ? { ...x, active: !x.active } : x))

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const bulkMultiply = () => {
    const raw = prompt('Coefficient multiplicateur (ex: 1.05 pour +5%)')
    if (!raw) return
    const mult = parseFloat(raw)
    if (isNaN(mult) || mult <= 0) { toast.error('Coefficient invalide'); return }
    setProducts((p) => p.map((x) => selected.has(x.id) ? { ...x, price: Math.round(x.price * mult * 100) / 100 } : x))
    toast.success(`Prix mis à jour pour ${selected.size} produit(s)`)
    setSelected(new Set())
  }

  const bulkDisable = () => {
    setProducts((p) => p.map((x) => selected.has(x.id) ? { ...x, active: false } : x))
    toast.success(`${selected.size} produit(s) désactivé(s)`)
    setSelected(new Set())
  }

  const createCategory = () => {
    if (!newCat.name) { toast.error('Nom requis'); return }
    setCategories((c) => [...c, { id: `c${Date.now()}`, name: newCat.name, emoji: newCat.emoji, color: newCat.color, productCount: 0 }])
    toast.success('Catégorie créée')
    setShowCatModal(false)
    setNewCat({ name: '', emoji: '🍽️', color: '#3b82f6' })
  }

  const createProduct = () => {
    if (!newProd.name || newProd.price <= 0) { toast.error('Nom et prix requis'); return }
    setProducts((p) => [...p, { id: `p${Date.now()}`, name: newProd.name, category: newProd.category, price: newProd.price, tva: newProd.tva, stock: 0, active: true, allergens: [] }])
    toast.success('Produit créé')
    setShowProdModal(false)
    setNewProd({ name: '', category: 'Plats', price: 0, tva: 3 })
  }

  const deleteCategory = (id: string) => {
    setCategories((c) => c.filter((x) => x.id !== id))
    toast.success('Catégorie supprimée')
  }

  const TabBtn = ({ id, label, icon }: { id: Tab; label: string; icon: React.ReactNode }) => (
    <button onClick={() => setTab(id)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9,
        border: 'none', background: tab === id ? '#fff' : 'transparent',
        color: tab === id ? '#1e293b' : '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        boxShadow: tab === id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.15s',
      }}>
      {icon} {label}
    </button>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ color: '#1e293b', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Catalogue</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Gérez vos catégories, produits et taux de TVA</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 11, marginBottom: 20, width: 'fit-content' }}>
        <TabBtn id="categories" label="Catégories" icon={<Tag size={14} />} />
        <TabBtn id="products" label="Produits" icon={<Package size={14} />} />
        <TabBtn id="taxes" label="Taxes" icon={<Percent size={14} />} />
      </div>

      {/* CATEGORIES */}
      {tab === 'categories' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button onClick={() => setShowCatModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={15} /> Nouvelle catégorie
            </button>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
            {categories.map((cat, i) => (
              <motion.div key={cat.id}
                draggable onDragStart={() => handleDragStart(i)}
                onDragOver={handleDragOver} onDrop={() => handleDrop(i)}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                  borderBottom: i === categories.length - 1 ? 'none' : '1px solid #f1f5f9',
                  background: dragIndex === i ? '#eff6ff' : '#fff', cursor: 'grab',
                  transition: 'background 0.15s',
                }}>
                <GripVertical size={18} color="#cbd5e1" />
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${cat.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {cat.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{cat.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{cat.productCount} produit{cat.productCount > 1 ? 's' : ''}</div>
                </div>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: cat.color }} />
                <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', padding: 6 }}>
                  <Edit2 size={15} />
                </button>
                <button onClick={() => deleteCategory(cat.id)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', padding: 6 }}>
                  <Trash2 size={15} />
                </button>
              </motion.div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <GripVertical size={12} /> Glissez-déposez pour réordonner les catégories
          </p>
        </motion.div>
      )}

      {/* PRODUCTS */}
      {tab === 'products' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
              <input
                placeholder="Rechercher un produit ou catégorie..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none' }}
              />
            </div>
            {selected.size > 0 && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
                <button onClick={bulkMultiply}
                  style={{ padding: '7px 12px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Mettre à jour les prix
                </button>
                <button onClick={bulkDisable}
                  style={{ padding: '7px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Désactiver sélection
                </button>
              </motion.div>
            )}
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowProdModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={15} /> Nouveau produit
            </button>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 2.2fr 1.2fr 90px 70px 80px 1.6fr 70px 80px', gap: 10, padding: '11px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <div></div><div>Produit</div><div>Catégorie</div><div>Prix</div><div>TVA</div><div>Stock</div><div>Allergènes</div><div>Actif</div><div></div>
            </div>
            {filteredProducts.map((p, i) => (
              <motion.div key={p.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                style={{
                  display: 'grid', gridTemplateColumns: '40px 2.2fr 1.2fr 90px 70px 80px 1.6fr 70px 80px', gap: 10, padding: '12px 18px',
                  borderBottom: i === filteredProducts.length - 1 ? 'none' : '1px solid #f1f5f9',
                  alignItems: 'center', opacity: p.active ? 1 : 0.55,
                  background: selected.has(p.id) ? '#eff6ff' : '#fff',
                }}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#475569' }}>{p.category}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{p.price.toFixed(2)} €</div>
                <div><span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', background: '#f1f5f9', borderRadius: 5, color: '#475569' }}>{p.tva}%</span></div>
                <div style={{ fontSize: 12, color: p.stock < 10 ? '#dc2626' : '#475569', fontWeight: p.stock < 10 ? 600 : 400 }}>
                  {p.stock === 999 ? '∞' : p.stock === 0 ? '—' : p.stock}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {p.allergens.slice(0, 3).map((a) => (
                    <span key={a} style={{ fontSize: 10, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 5, fontWeight: 600 }}>{a}</span>
                  ))}
                  {p.allergens.length > 3 && <span style={{ fontSize: 10, color: '#94a3b8' }}>+{p.allergens.length - 3}</span>}
                </div>
                <button onClick={() => toggleProduct(p.id)}
                  style={{
                    width: 34, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: p.active ? '#10b981' : '#cbd5e1', position: 'relative', transition: 'background 0.2s',
                  }}>
                  <div style={{ position: 'absolute', top: 2, left: p.active ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </button>
                <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', padding: 4, justifySelf: 'end' }}>
                  <Edit2 size={14} />
                </button>
              </motion.div>
            ))}
            {filteredProducts.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Aucun produit trouvé</div>
            )}
          </div>
        </motion.div>
      )}

      {/* TAXES */}
      {tab === 'taxes' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)', border: '1px solid #bfdbfe',
            borderRadius: 12, padding: 16, marginBottom: 18, display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <AlertCircle size={18} color="#3b82f6" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
              Les taux de TVA en vigueur au Luxembourg. Les modifications s'appliqueront à tous les nouveaux produits.
              Consultez l'Administration des contributions directes pour les évolutions légales.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {taxes.map((t, i) => (
              <motion.div key={t.rate}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.02em' }}>
                    {t.rate}<span style={{ fontSize: 20, color: '#64748b' }}>%</span>
                  </div>
                  <button
                    onClick={() => setTaxes((x) => x.map((r) => r.rate === t.rate ? { ...r, active: !r.active } : r))}
                    style={{
                      width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                      background: t.active ? '#10b981' : '#cbd5e1', position: 'relative', transition: 'background 0.2s',
                    }}>
                    <div style={{ position: 'absolute', top: 2, left: t.active ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </button>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{t.description}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Category Modal */}
      <AnimatePresence>
        {showCatModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowCatModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 16, padding: 26, width: 440, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Nouvelle catégorie</h2>
                <button onClick={() => setShowCatModal(false)} style={{ border: 'none', background: '#f1f5f9', width: 30, height: 30, borderRadius: 8, cursor: 'pointer' }}>
                  <X size={15} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nom</label>
                  <input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                    style={{ marginTop: 5, width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Emoji</label>
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {EMOJIS.map((e) => (
                      <button key={e} onClick={() => setNewCat({ ...newCat, emoji: e })}
                        style={{
                          width: 34, height: 34, borderRadius: 8, fontSize: 18,
                          border: newCat.emoji === e ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                          background: newCat.emoji === e ? '#eff6ff' : '#fff', cursor: 'pointer',
                        }}>{e}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Couleur</label>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                    {COLORS.map((c) => (
                      <button key={c} onClick={() => setNewCat({ ...newCat, color: c })}
                        style={{
                          width: 28, height: 28, borderRadius: '50%', background: c,
                          border: newCat.color === c ? '3px solid #1e293b' : '2px solid #fff',
                          boxShadow: '0 0 0 1px #e2e8f0', cursor: 'pointer',
                        }} />
                    ))}
                  </div>
                </div>
                <button onClick={createCategory}
                  style={{ marginTop: 6, padding: '11px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Check size={15} /> Créer la catégorie
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Modal */}
      <AnimatePresence>
        {showProdModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowProdModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 16, padding: 26, width: 480, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Nouveau produit</h2>
                <button onClick={() => setShowProdModal(false)} style={{ border: 'none', background: '#f1f5f9', width: 30, height: 30, borderRadius: 8, cursor: 'pointer' }}>
                  <X size={15} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nom</label>
                  <input value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    style={{ marginTop: 5, width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Catégorie</label>
                    <select value={newProd.category} onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                      style={{ marginTop: 5, width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                      {categories.map((c) => <option key={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TVA</label>
                    <select value={newProd.tva} onChange={(e) => setNewProd({ ...newProd, tva: parseInt(e.target.value) })}
                      style={{ marginTop: 5, width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                      {taxes.map((t) => <option key={t.rate} value={t.rate}>{t.rate}% — {t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prix (€)</label>
                  <input type="number" step="0.01" value={newProd.price}
                    onChange={(e) => setNewProd({ ...newProd, price: parseFloat(e.target.value) || 0 })}
                    style={{ marginTop: 5, width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <button onClick={createProduct}
                  style={{ marginTop: 6, padding: '11px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Check size={15} /> Créer le produit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
