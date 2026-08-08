import { toastSuccess, toastError, toastInfo } from '@/lib/toast'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Minus, Trash2, Search, Send, CreditCard,
  Users, UserPlus, StickyNote, X, Check, Receipt as ReceiptIcon, Heart, AlertOctagon, RotateCcw,
} from 'lucide-react'
import { SplitBillModal, TipSelector, AllergiesPanel } from '@/components/pos/PosEnhancements'
import QuickEntryBar from '@/components/pos/QuickEntryBar'
import FavoritesGrid, { recordSale } from '@/components/pos/FavoritesGrid'
import { queuedFetch } from '@/lib/offlineQueue'

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */
type CategoryKey = 'entrees' | 'plats' | 'desserts' | 'boissons' | 'vins' | 'cafes'

interface Product {
  id: string
  name: string
  price: number
  category: CategoryKey
  emoji: string
}

interface CartItem {
  product: Product
  qty: number
  note?: string
}

interface Client {
  id: string
  name: string
  email?: string
  points?: number
}

/* ------------------------------------------------------------------ */
/*  CATEGORIES                                                         */
/* ------------------------------------------------------------------ */
const categories: { key: CategoryKey | 'all'; label: string; emoji: string }[] = [
  { key: 'all',      label: 'Tous',      emoji: '✨' },
  { key: 'entrees',  label: 'Entrées',   emoji: '🥗' },
  { key: 'plats',    label: 'Plats',     emoji: '🍽️' },
  { key: 'desserts', label: 'Desserts',  emoji: '🍰' },
  { key: 'boissons', label: 'Boissons',  emoji: '🧃' },
  { key: 'vins',     label: 'Vins',      emoji: '🍷' },
  { key: 'cafes',    label: 'Cafés',     emoji: '☕' },
]

/* ------------------------------------------------------------------ */
/*  MOCK PRODUCTS (20)                                                 */
/* ------------------------------------------------------------------ */
const products: Product[] = [
  { id: 'p1',  name: 'Salade César',        price: 12.00, category: 'entrees',  emoji: '🥗' },
  { id: 'p2',  name: 'Soupe du jour',       price:  7.50, category: 'entrees',  emoji: '🍲' },
  { id: 'p3',  name: 'Carpaccio de bœuf',   price: 14.00, category: 'entrees',  emoji: '🥩' },
  { id: 'p4',  name: 'Entrecôte grillée',   price: 24.00, category: 'plats',    emoji: '🥩' },
  { id: 'p5',  name: 'Saumon mi-cuit',      price: 22.00, category: 'plats',    emoji: '🐟' },
  { id: 'p6',  name: 'Burger maison',       price: 18.50, category: 'plats',    emoji: '🍔' },
  { id: 'p7',  name: 'Risotto truffe',      price: 21.00, category: 'plats',    emoji: '🍚' },
  { id: 'p8',  name: 'Pizza margherita',    price: 14.00, category: 'plats',    emoji: '🍕' },
  { id: 'p9',  name: 'Crème brûlée',        price:  8.00, category: 'desserts', emoji: '🍮' },
  { id: 'p10', name: 'Tiramisu',            price:  7.50, category: 'desserts', emoji: '🍰' },
  { id: 'p11', name: 'Mousse au chocolat',  price:  6.50, category: 'desserts', emoji: '🍫' },
  { id: 'p12', name: 'Coca-Cola 33cl',      price:  3.50, category: 'boissons', emoji: '🥤' },
  { id: 'p13', name: 'Eau plate 50cl',      price:  3.00, category: 'boissons', emoji: '💧' },
  { id: 'p14', name: 'Jus orange pressé',   price:  5.00, category: 'boissons', emoji: '🍊' },
  { id: 'p15', name: 'Bière pression 50cl', price:  5.50, category: 'boissons', emoji: '🍺' },
  { id: 'p16', name: 'Verre vin rouge',     price:  6.50, category: 'vins',     emoji: '🍷' },
  { id: 'p17', name: 'Verre vin blanc',     price:  6.50, category: 'vins',     emoji: '🥂' },
  { id: 'p18', name: 'Bouteille Bordeaux',  price: 32.00, category: 'vins',     emoji: '🍷' },
  { id: 'p19', name: 'Espresso',            price:  2.50, category: 'cafes',    emoji: '☕' },
  { id: 'p20', name: 'Cappuccino',          price:  4.00, category: 'cafes',    emoji: '☕' },
]

/* ------------------------------------------------------------------ */
/*  MOCK CLIENTS                                                       */
/* ------------------------------------------------------------------ */
const mockClients: Client[] = [
  { id: 'c1', name: 'Jean Dupont',      email: 'j.dupont@mail.com',      points: 245 },
  { id: 'c2', name: 'Marie Leblanc',    email: 'marie.leblanc@mail.com', points: 820 },
  { id: 'c3', name: 'Thomas Muller',    email: 't.muller@mail.com',      points: 110 },
  { id: 'c4', name: 'Sophie Laurent',   email: 's.laurent@mail.com',     points: 1240 },
]

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */
const TVA_RATE = 0.17 // Luxembourg standard TVA
function fmtEuro(v: number) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
export default function OrderPage() {
  const [activeCat, setActiveCat] = useState<CategoryKey | 'all'>('all')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([
    { product: products[3], qty: 1 }, // Entrecôte
    { product: products[15], qty: 2 }, // Vin rouge
  ])
  const [client, setClient] = useState<Client | null>(null)
  const [showClientModal, setShowClientModal] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [coverCount] = useState(3)
  const tableName = 'Table T4'
  const tableId = 'T4'
  const [sending, setSending] = useState(false)
  const lastAddedRef = useRef<string | null>(null)
  // v3.18.6 — POS Enhancements state
  const [showSplit, setShowSplit] = useState(false)
  const [tipAmount, setTipAmount] = useState(0)
  const [showTip, setShowTip] = useState(false)
  const [allergies, setAllergies] = useState<string[]>([])
  const [showAllergies, setShowAllergies] = useState(false)

  /* ---- filter products ---- */
  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (activeCat !== 'all' && p.category !== activeCat) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [activeCat, search])

  /* ---- totals ---- */
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0)
  const tva = subtotal * TVA_RATE
  const total = subtotal + tva

  /* ---- cart ops ---- */
  const addToCart = (p: Product, qty = 1) => {
    setCart((prev) => {
      const found = prev.find((c) => c.product.id === p.id)
      if (found) return prev.map((c) => (c.product.id === p.id ? { ...c, qty: c.qty + qty } : c))
      return [...prev, { product: p, qty }]
    })
    recordSale(p.id, qty)
    lastAddedRef.current = p.id
  }
  const addById = useCallback((productId: string, qty = 1) => {
    const p = products.find((prod) => prod.id === productId)
    if (p) addToCart(p, qty)
  }, [])
  const changeQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.product.id === id ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0),
    )
  }
  const removeItem = (id: string) => setCart((prev) => prev.filter((c) => c.product.id !== id))
  const updateNote = (id: string, note: string) => setCart((prev) => prev.map((c) => (c.product.id === id ? { ...c, note } : c)))

  /* ---- client filter ---- */
  const filteredClients = mockClients.filter((c) => c.name.toLowerCase().includes(clientSearch.toLowerCase()))

  /* ---- v4.8 — répéter la dernière commande ---- */
  const [hasLastOrder, setHasLastOrder] = useState(false)
  useEffect(() => {
    try { setHasLastOrder(!!localStorage.getItem(`creorga.pos.lastOrder.${tableId}`)) } catch { /* */ }
  }, [])

  const repeatLastOrder = () => {
    try {
      const raw = localStorage.getItem(`creorga.pos.lastOrder.${tableId}`)
      if (!raw) return
      const items: { productId: string; qty: number }[] = JSON.parse(raw)
      items.forEach((i) => addById(i.productId, i.qty))
    } catch { /* */ }
  }

  /* ---- v4.8 — envoi cuisine (offline-safe) ---- */
  const sendToKitchen = async () => {
    if (cart.length === 0 || sending) return
    setSending(true)
    try {
      const items = cart.map((c) => ({ productId: c.product.id, quantity: c.qty, notes: c.note || null }))
      const result = await queuedFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, items, notes: null }),
      })
      try {
        localStorage.setItem(
          `creorga.pos.lastOrder.${tableId}`,
          JSON.stringify(cart.map((c) => ({ productId: c.product.id, qty: c.qty }))),
        )
        setHasLastOrder(true)
      } catch { /* */ }
      if (result.queued) {
        alert('📴 Hors-ligne : la commande a été mise en attente, elle partira dès le retour du réseau.')
      }
    } finally {
      setSending(false)
    }
  }

  /* ---- v4.8 — raccourcis clavier POS ---- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')

      if (e.key === 'F1') {
        e.preventDefault()
        sendToKitchen()
        return
      }
      if (e.key === 'F2') {
        e.preventDefault()
        setCart([])
        setClient(null)
        return
      }
      if (isTyping) return
      if (e.key === 'Escape') {
        setEditingNote(null)
        setShowClientModal(false)
        return
      }
      if (e.key === '+' && lastAddedRef.current) {
        e.preventDefault()
        changeQty(lastAddedRef.current, 1)
        return
      }
      if (e.key === '-' && lastAddedRef.current) {
        e.preventDefault()
        changeQty(lastAddedRef.current, -1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sending])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* =============== TOP BAR =============== */}
      <div style={{
        padding: '14px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <button style={iconBtn} onClick={() => window.history.back()}>
          <ArrowLeft size={18} color="#475569" />
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>{tableName}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', marginTop: 2 }}>
            <Users size={12} /> {coverCount} couverts
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          style={client ? { ...btnSecondary, background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' } : btnSecondary}
          onClick={() => setShowClientModal(true)}
        >
          <UserPlus size={14} />
          {client ? client.name : 'Lier un client'}
        </button>
      </div>

      {/* =============== MAIN CONTENT (30/70) =============== */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '30% 70%', minHeight: 0 }}>

        {/* =========== LEFT: TICKET =========== */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          background: '#fff', borderRight: '1px solid #e2e8f0', minHeight: 0,
        }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Ticket en cours
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
              {cart.length} article{cart.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* items list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📝</div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>Aucun article. Sélectionnez un produit.</div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {cart.map((item) => (
                  <motion.div
                    key={item.product.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    style={{
                      padding: '10px 12px', borderRadius: 10,
                      border: '1px solid #e2e8f0', background: '#fff',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{item.product.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.product.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
                          {fmtEuro(item.product.price)} / unité
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        style={{ ...iconBtn, width: 26, height: 26 }}
                      >
                        <Trash2 size={12} color="#dc2626" />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                      {/* qty controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#f1f5f9', borderRadius: 8, padding: 2 }}>
                        <button onClick={() => changeQty(item.product.id, -1)} style={qtyBtn}>
                          <Minus size={12} />
                        </button>
                        <span style={{ minWidth: 24, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          {item.qty}
                        </span>
                        <button onClick={() => changeQty(item.product.id, 1)} style={qtyBtn}>
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        onClick={() => setEditingNote(editingNote === item.product.id ? null : item.product.id)}
                        style={{ ...iconBtn, width: 28, height: 28, background: item.note ? '#fef3c7' : '#f1f5f9' }}
                      >
                        <StickyNote size={12} color={item.note ? '#b45309' : '#64748b'} />
                      </button>
                      <div style={{ flex: 1 }} />
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
                        {fmtEuro(item.product.price * item.qty)}
                      </div>
                    </div>

                    {/* note editor */}
                    {editingNote === item.product.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        style={{ marginTop: 8, overflow: 'hidden' }}
                      >
                        <input
                          type="text"
                          autoFocus
                          placeholder="Ex: cuisson bleue, sans oignons..."
                          value={item.note ?? ''}
                          onChange={(e) => updateNote(item.product.id, e.target.value)}
                          style={{
                            width: '100%', padding: '8px 10px', fontSize: 12,
                            border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none',
                            background: '#f8fafc',
                          }}
                        />
                      </motion.div>
                    )}
                    {item.note && editingNote !== item.product.id && (
                      <div style={{ marginTop: 6, fontSize: 11, color: '#b45309', fontStyle: 'italic' }}>
                        ✎ {item.note}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* v3.18.6 — Toolbar enhancements POS : Split / Tip / Allergies */}
          <div style={{ padding: '8px 20px', display: 'flex', gap: 6, borderTop: '1px solid #f1f5f9', background: '#fafbfc' }}>
            <button onClick={() => setShowSplit(true)} style={{
              flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #c7d2fe',
              background: '#eef2ff', color: '#4338ca', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }} title="Diviser l'addition entre plusieurs clients">
              <ReceiptIcon size={12} /> Diviser
            </button>
            <button onClick={() => setShowTip((v) => !v)} style={{
              flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #fbcfe8',
              background: showTip ? '#fce7f3' : '#fff', color: '#9d174d', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }} title="Suggérer un pourboire">
              <Heart size={12} /> Pourboire
            </button>
            <button onClick={() => setShowAllergies((v) => !v)} style={{
              flex: 1, padding: '8px 10px', borderRadius: 8,
              border: allergies.length > 0 ? '1px solid #ef4444' : '1px solid #fecaca',
              background: allergies.length > 0 ? '#fee2e2' : '#fff',
              color: allergies.length > 0 ? '#dc2626' : '#991b1b',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }} title="Allergies du client (alerte cuisine)">
              <AlertOctagon size={12} /> Allergies {allergies.length > 0 && `(${allergies.length})`}
            </button>
          </div>

          {/* Allergies panel (collapsible) */}
          {showAllergies && (
            <div style={{ padding: '0 20px 8px' }}>
              <AllergiesPanel
                current={allergies}
                onChange={setAllergies}
                onAlertKitchen={(a) => alert(`🚨 Alerte cuisine envoyée : ${a.join(', ')}`)}
              />
            </div>
          )}

          {/* Tip panel (collapsible) */}
          {showTip && (
            <div style={{ padding: '0 20px 8px' }}>
              <TipSelector baseAmount={total} onChange={(tip) => setTipAmount(tip)} />
            </div>
          )}

          {/* totals */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
              <span>Sous-total HT</span>
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>{fmtEuro(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 10 }}>
              <span>TVA (17 %)</span>
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>{fmtEuro(tva)}</span>
            </div>
            {tipAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9d174d', marginBottom: 4 }}>
                <span>Pourboire</span>
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>{fmtEuro(tipAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Total TTC</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
                {fmtEuro(total + tipAmount)}
              </span>
            </div>
          </div>

          {/* footer actions */}
          <div style={{
            padding: 16, borderTop: '1px solid #e2e8f0', background: '#fff',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {hasLastOrder && (
              <button onClick={repeatLastOrder} style={{ ...btnSecondary, width: '100%', justifyContent: 'center' }}>
                <RotateCcw size={13} /> Répéter la dernière commande
              </button>
            )}
            <button onClick={sendToKitchen} disabled={sending || cart.length === 0} style={{
              ...btnPrimary, width: '100%', justifyContent: 'center', padding: '11px 14px',
              opacity: sending || cart.length === 0 ? 0.6 : 1, cursor: sending || cart.length === 0 ? 'default' : 'pointer',
            }}>
              <Send size={15} /> {sending ? 'Envoi…' : 'Envoyer en cuisine'}{allergies.length > 0 ? ` ⚠️ (${allergies.length} allergies)` : ''}
            </button>
            <button onClick={() => toastInfo('Ajoutez au moins un article avant de payer.')} style={{ ...btnAccent, width: '100%', justifyContent: 'center', padding: '11px 14px' }}>
              <CreditCard size={15} /> Aller au paiement
            </button>
            <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 2 }}>
              F1 Encaisser · F2 Nouvelle table · +/− Quantité · Esc Annuler
            </div>
          </div>

          {/* Split bill modal */}
          <AnimatePresence>
            {showSplit && (
              <SplitBillModal
                items={cart.map((c) => ({
                  id: c.product.id, name: c.product.name, price: c.product.price, qty: c.qty,
                }))}
                total={total + tipAmount}
                onClose={() => setShowSplit(false)}
                onConfirm={(result) => {
                  alert(`✅ Addition divisée :\n${result.parts.map((p) => `${p.label} : ${p.amount.toFixed(2)} €`).join('\n')}`)
                  setShowSplit(false)
                }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* =========== RIGHT: CATALOG =========== */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: '#f8fafc' }}>
          {/* v4.8 — saisie clavier express */}
          <QuickEntryBar products={products} onAdd={(id, qty) => addById(id, qty)} />

          {/* v4.8 — favoris (12 plus vendus) */}
          <FavoritesGrid
            products={products.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, price: p.price }))}
            onAdd={(id) => addById(id, 1)}
          />

          {/* search */}
          <div style={{ padding: '14px 20px 0 20px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px 10px 36px',
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
                  fontSize: 14, outline: 'none', color: '#0f172a',
                }}
              />
            </div>
          </div>

          {/* category tabs */}
          <div style={{
            padding: '12px 20px', display: 'flex', gap: 6, overflowX: 'auto',
            scrollbarWidth: 'thin',
          }}>
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setActiveCat(c.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 999,
                  border: c.key === activeCat ? '1px solid #1E3A5F' : '1px solid #e2e8f0',
                  background: c.key === activeCat ? '#1E3A5F' : '#fff',
                  color: c.key === activeCat ? '#fff' : '#1e293b',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                }}
              >
                <span>{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>

          {/* product grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 12,
            }}>
              {filtered.map((p) => {
                const inCart = cart.find((c) => c.product.id === p.id)
                return (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.96 }}
                    whileHover={{ y: -2 }}
                    onClick={() => addToCart(p)}
                    style={{
                      position: 'relative',
                      background: '#fff',
                      border: inCart ? '2px solid #1E3A5F' : '1px solid #e2e8f0',
                      borderRadius: 12, padding: 14,
                      cursor: 'pointer', textAlign: 'left',
                      display: 'flex', flexDirection: 'column', gap: 6,
                      transition: 'box-shadow 0.15s ease',
                      boxShadow: inCart ? '0 4px 12px rgba(30,58,95,0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ fontSize: 36, lineHeight: 1 }}>{p.emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', minHeight: 34 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1E3A5F', fontFamily: 'ui-monospace, monospace' }}>
                      {fmtEuro(p.price)}
                    </div>
                    {inCart && (
                      <span style={{
                        position: 'absolute', top: -8, right: -8,
                        width: 24, height: 24, borderRadius: '50%',
                        background: '#1E3A5F', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800,
                        boxShadow: '0 2px 6px rgba(30,58,95,0.4)',
                      }}>
                        {inCart.qty}
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </div>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                Aucun produit trouvé.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =============== CLIENT MODAL =============== */}
      <AnimatePresence>
        {showClientModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowClientModal(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 40 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: 420, maxWidth: 'calc(100% - 32px)', maxHeight: '80vh',
                background: '#fff', borderRadius: 16, zIndex: 50,
                boxShadow: '0 24px 48px rgba(15,23,42,0.25)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}
            >
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Lier un client</h3>
                <button onClick={() => setShowClientModal(false)} style={{ ...iconBtn, width: 30, height: 30 }}>
                  <X size={14} color="#64748b" />
                </button>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text" autoFocus placeholder="Rechercher par nom ou email..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    style={{ width: '100%', padding: '10px 10px 10px 34px', border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', fontSize: 13 }}
                  />
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
                {filteredClients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setClient(c); setShowClientModal(false) }}
                    style={{
                      width: '100%', textAlign: 'left', padding: 12, borderRadius: 10,
                      background: client?.id === c.id ? '#eef2ff' : '#f8fafc',
                      border: client?.id === c.id ? '1px solid #6366f1' : '1px solid #e2e8f0',
                      marginBottom: 6, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: '#1E3A5F',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                    }}>
                      {c.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{c.email}</div>
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: '#b45309',
                      background: '#fef3c7', padding: '3px 7px', borderRadius: 6,
                    }}>
                      {c.points} pts
                    </div>
                    {client?.id === c.id && <Check size={16} color="#4338ca" />}
                  </button>
                ))}
              </div>
              {client && (
                <div style={{ padding: 12, borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <button
                    onClick={() => { setClient(null); setShowClientModal(false) }}
                    style={{ ...btnSecondary, width: '100%', justifyContent: 'center' }}
                  >
                    Retirer le client
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SHARED STYLES                                                      */
/* ------------------------------------------------------------------ */
const iconBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: 'none',
  background: '#f1f5f9', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const qtyBtn: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 6, border: 'none',
  background: '#fff', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#475569',
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
}
const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8, border: 'none',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  transition: 'all 0.15s ease',
}
const btnPrimary: React.CSSProperties = { ...btnBase, background: '#1E3A5F', color: '#fff' }
const btnAccent: React.CSSProperties = { ...btnBase, background: '#10b981', color: '#fff' }
const btnSecondary: React.CSSProperties = { ...btnBase, background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0' }
