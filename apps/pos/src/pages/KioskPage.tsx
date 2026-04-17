import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePOS, type MenuItem, MENU_CATEGORIES } from '../store/posStore'

interface CartItem {
  menuItem: MenuItem
  qty: number
  modifiers: string[]
  size?: 'M' | 'L' | 'XL'
}
type OrderStep = 'browse' | 'customize' | 'confirm' | 'tracking' | 'success'
type Lang = 'FR' | 'DE' | 'EN' | 'PT' | 'LU'
type Diet = 'vege' | 'vegan' | 'glutenfree' | 'lactofree'

const DRINK_CATS = ['Boissons', 'Bières', 'Vins', 'Cocktails']
const CAT_EMOJIS: Record<string, string> = {
  Boissons: '☕', Bières: '🍺', Vins: '🍷', Cocktails: '🍹', Cuisine: '🍔', Desserts: '🍮',
}
const CAT_GRADIENTS: Record<string, string> = {
  Boissons:  'linear-gradient(135deg, #92400e, #d97706)',
  Bières:    'linear-gradient(135deg, #a16207, #ca8a04)',
  Vins:      'linear-gradient(135deg, #7f1d1d, #b91c1c)',
  Cocktails: 'linear-gradient(135deg, #86198f, #c026d3)',
  Cuisine:   'linear-gradient(135deg, #78350f, #c2410c)',
  Desserts:  'linear-gradient(135deg, #9f1239, #e11d48)',
}

const ALLERGENS = ['gluten', 'lactose', 'œufs', 'fruits à coque', 'poisson', 'arachides', 'soja']
const DIETS: { id: Diet; label: string; emoji: string }[] = [
  { id: 'vege',        label: 'Végétarien',   emoji: '🥗' },
  { id: 'vegan',       label: 'Vegan',        emoji: '🌱' },
  { id: 'glutenfree',  label: 'Sans gluten',  emoji: '🌾' },
  { id: 'lactofree',   label: 'Sans lactose', emoji: '🥛' },
]

const MODIFIERS: Record<string, { label: string; price: number }[]> = {
  Cuisine: [
    { label: 'Sans oignons', price: 0 },
    { label: 'Extra fromage', price: 1.5 },
    { label: 'Sauce supplémentaire', price: 0.5 },
    { label: 'Bien cuit', price: 0 },
  ],
  Boissons: [
    { label: 'Sans sucre', price: 0 },
    { label: 'Lait d\'avoine', price: 0.3 },
    { label: 'Shot espresso', price: 0.8 },
  ],
  Desserts: [
    { label: 'Chantilly', price: 0.5 },
    { label: 'Sans noix', price: 0 },
  ],
}

const I18N: Record<Lang, Record<string, string>> = {
  FR: { welcome: 'Commandez ici', order: 'Votre commande', total: 'Total', checkout: 'Commander', dineIn: 'Sur place', takeaway: 'À emporter', empty: 'Ajoutez des articles pour commencer', tableNum: 'Numéro de table', pickup: 'Heure de retrait', confirmed: 'Commande confirmée !', queue: 'Position dans la file', allergen: 'Contient des allergènes', tutorial: 'Appuyez sur un article pour l\'ajouter' },
  DE: { welcome: 'Hier bestellen', order: 'Ihre Bestellung', total: 'Summe', checkout: 'Bestellen', dineIn: 'Im Lokal', takeaway: 'Mitnehmen', empty: 'Fügen Sie Artikel hinzu, um zu beginnen', tableNum: 'Tischnummer', pickup: 'Abholzeit', confirmed: 'Bestellung bestätigt!', queue: 'Warteschlangenposition', allergen: 'Enthält Allergene', tutorial: 'Tippen Sie auf einen Artikel, um ihn hinzuzufügen' },
  EN: { welcome: 'Order here', order: 'Your order', total: 'Total', checkout: 'Checkout', dineIn: 'Dine in', takeaway: 'Takeaway', empty: 'Add items to get started', tableNum: 'Table number', pickup: 'Pickup time', confirmed: 'Order confirmed!', queue: 'Queue position', allergen: 'Contains allergens', tutorial: 'Tap an item to add it' },
  PT: { welcome: 'Peça aqui', order: 'Seu pedido', total: 'Total', checkout: 'Finalizar', dineIn: 'No local', takeaway: 'Para levar', empty: 'Adicione itens para começar', tableNum: 'Número da mesa', pickup: 'Hora de retirada', confirmed: 'Pedido confirmado!', queue: 'Posição na fila', allergen: 'Contém alergénios', tutorial: 'Toque num item para adicionar' },
  LU: { welcome: 'Bestellt hei', order: 'Är Bestellung', total: 'Total', checkout: 'Bestellen', dineIn: 'Op der Plaz', takeaway: 'Zum Matthuelen', empty: 'Artikelen derbäi fir ze starten', tableNum: 'Dëschnummer', pickup: 'Ofhuelzäit', confirmed: 'Bestellung confirméiert!', queue: 'Positioun an der Schläin', allergen: 'Enthält Allergener', tutorial: 'Klickt op een Artikel fir derbäizefügen' },
}

function getFakeAllergens(itemId: string): string[] {
  const hash = itemId.charCodeAt(0) + itemId.charCodeAt(itemId.length - 1)
  const count = hash % 3
  const picked: string[] = []
  for (let i = 0; i < count; i++) picked.push(ALLERGENS[(hash + i) % ALLERGENS.length])
  return picked
}

function getFakeDiets(itemId: string): Diet[] {
  const hash = itemId.charCodeAt(0)
  const all: Diet[] = ['vege', 'vegan', 'glutenfree', 'lactofree']
  return all.filter((_, i) => (hash + i) % 3 === 0)
}

function calcTax(cart: CartItem[]) {
  let foodSub = 0, drinkSub = 0
  cart.forEach(c => {
    const sizeAdj = c.size === 'L' ? 1 : c.size === 'XL' ? 2 : 0
    const line = (c.menuItem.price + sizeAdj) * c.qty
    if (DRINK_CATS.includes(c.menuItem.category)) drinkSub += line
    else foodSub += line
  })
  return { foodSub, drinkSub, foodTax: foodSub * 0.08, drinkTax: drinkSub * 0.17, subtotal: foodSub + drinkSub }
}

export default function KioskPage({ onExit }: { onExit: () => void }) {
  const menu = usePOS(s => s.menu).filter(m => m.active)
  const settings = usePOS(s => s.settings)
  const [activeCat, setActiveCat] = useState(MENU_CATEGORIES[0])
  const [cart, setCart] = useState<CartItem[]>([])
  const [step, setStep] = useState<OrderStep>('browse')
  const [dineIn, setDineIn] = useState<boolean | null>(null)
  const [orderNum] = useState(() => Math.floor(Math.random() * 900) + 100)
  const [addedId, setAddedId] = useState<string | null>(null)
  const [lang, setLang] = useState<Lang>('FR')
  const [customizing, setCustomizing] = useState<MenuItem | null>(null)
  const [selectedMods, setSelectedMods] = useState<string[]>([])
  const [selectedSize, setSelectedSize] = useState<'M' | 'L' | 'XL'>('M')

  // Accessibility
  const [largeText, setLargeText] = useState(false)
  const [highContrast, setHighContrast] = useState(false)

  // Filters
  const [activeDiets, setActiveDiets] = useState<Diet[]>([])
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Tutorial
  const [showTutorial, setShowTutorial] = useState(true)
  const [tutorialStep, setTutorialStep] = useState(0)

  // Loyalty
  const [loyaltyCode, setLoyaltyCode] = useState('')
  const [loyaltyApplied, setLoyaltyApplied] = useState(false)
  const [showLoyaltyInput, setShowLoyaltyInput] = useState(false)

  // Table number / pickup time
  const [tableNumber, setTableNumber] = useState('')
  const [pickupTime, setPickupTime] = useState('15min')

  // Queue position
  const [queuePos] = useState(() => Math.floor(Math.random() * 8) + 1)

  const gridRef = useRef<HTMLDivElement>(null)
  const t = I18N[lang]
  const scale = largeText ? 1.2 : 1
  const bgColor = highContrast ? '#000' : '#07070d'
  const panelColor = highContrast ? '#111' : '#0a0a14'
  const accentColor = highContrast ? '#fff' : '#6366f1'

  // Recommendations based on cart
  const recommendations = useMemo(() => {
    if (cart.length === 0) return []
    const inCartCats = new Set(cart.map(c => c.menuItem.category))
    return menu.filter(m => !inCartCats.has(m.category) && !cart.find(c => c.menuItem.id === m.id)).slice(0, 4)
  }, [cart, menu])

  // Filtered products
  const filtered = useMemo(() => {
    return menu.filter(m => {
      if (m.category !== activeCat) return false
      if (activeDiets.length > 0) {
        const diets = getFakeDiets(m.id)
        if (!activeDiets.every(d => diets.includes(d))) return false
      }
      return true
    })
  }, [menu, activeCat, activeDiets])

  const itemCount = cart.reduce((s, c) => s + c.qty, 0)
  const { foodSub, drinkSub, foodTax, drinkTax, subtotal } = calcTax(cart)
  const totalTax = foodTax + drinkTax
  const loyaltyDiscount = loyaltyApplied ? subtotal * 0.05 : 0
  const total = subtotal + totalTax - loyaltyDiscount

  const openCustomize = useCallback((item: MenuItem) => {
    setCustomizing(item)
    setSelectedMods([])
    setSelectedSize('M')
  }, [])

  const confirmCustomize = useCallback(() => {
    if (!customizing) return
    setAddedId(customizing.id)
    setTimeout(() => setAddedId(null), 600)
    setCart(prev => [...prev, { menuItem: customizing, qty: 1, modifiers: selectedMods, size: selectedSize }])
    setCustomizing(null)
  }, [customizing, selectedMods, selectedSize])

  const quickAdd = useCallback((item: MenuItem) => {
    setAddedId(item.id)
    setTimeout(() => setAddedId(null), 600)
    setCart(prev => {
      const ex = prev.find(c => c.menuItem.id === item.id && c.modifiers.length === 0 && c.size === 'M')
      if (ex) return prev.map(c => c === ex ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { menuItem: item, qty: 1, modifiers: [], size: 'M' }]
    })
  }, [])

  const changeQty = useCallback((idx: number, delta: number) => {
    setCart(prev => prev.map((c, i) =>
      i === idx ? { ...c, qty: Math.max(0, c.qty + delta) } : c
    ).filter(c => c.qty > 0))
  }, [])

  const resetKiosk = useCallback(() => {
    setCart([])
    setStep('browse')
    setDineIn(null)
    setActiveCat(MENU_CATEGORIES[0])
    setLoyaltyApplied(false)
    setTableNumber('')
    setActiveDiets([])
    setSelectedAllergens([])
  }, [])

  useEffect(() => {
    if (step === 'success') {
      const t = setTimeout(resetKiosk, 6000)
      return () => clearTimeout(t)
    }
  }, [step, resetKiosk])

  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = 0
  }, [activeCat])

  // Helper: item has allergen warning
  function hasAllergenConflict(item: MenuItem) {
    if (selectedAllergens.length === 0) return false
    const itemAllergens = getFakeAllergens(item.id)
    return selectedAllergens.some(a => itemAllergens.includes(a))
  }

  // ── Success screen ───────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: bgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        fontFamily: '-apple-system, "Segoe UI", sans-serif',
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20 }}
          style={{ textAlign: 'center', color: '#e2e8f0' }}
        >
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, delay: 0.1 }}
            style={{
              width: 140, height: 140, borderRadius: '50%', margin: '0 auto 32px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 80px rgba(16,185,129,0.4)',
            }}
          >
            <span style={{ fontSize: 64, color: '#fff' }}>✓</span>
          </motion.div>
          <div style={{ fontSize: 26 * scale, fontWeight: 700, color: '#10b981', marginBottom: 12 }}>
            {t.confirmed}
          </div>
          <div style={{ fontSize: 52 * scale, fontWeight: 800, color: '#fff', marginBottom: 16, letterSpacing: 2 }}>
            #{String(orderNum).padStart(3, '0')}
          </div>
          <div style={{ fontSize: 16 * scale, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            {dineIn ? 'Installez-vous, on vous apporte ça !' : 'Nous vous appellerons quand ce sera prêt.'}
          </div>
          <div style={{
            marginTop: 32, padding: '16px 24px',
            background: 'rgba(99,102,241,0.15)',
            borderRadius: 16, display: 'inline-block',
            border: '1px solid rgba(99,102,241,0.3)',
          }}>
            <div style={{ fontSize: 11, color: '#a5b4fc', letterSpacing: 1, textTransform: 'uppercase' }}>
              {t.queue}
            </div>
            <div style={{ fontSize: 32 * scale, fontWeight: 900, color: '#fff', marginTop: 4 }}>
              {queuePos}<span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}> / file</span>
            </div>
            <div style={{ fontSize: 12, color: '#a5b4fc', marginTop: 4 }}>
              ≈ {queuePos * 3} min d'attente
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Confirmation screen ──────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: bgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        fontFamily: '-apple-system, "Segoe UI", sans-serif', padding: 20,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          style={{
            width: '100%', maxWidth: 580, background: panelColor,
            borderRadius: 32, padding: '32px 28px', color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.06)',
            maxHeight: '90vh', overflowY: 'auto',
          }}
        >
          <div style={{ fontSize: 24 * scale, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>
            Récapitulatif
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 20 }}>
            {cart.map((c, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 24 }}>{c.menuItem.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14 * scale, fontWeight: 500 }}>{c.menuItem.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                      x{c.qty} {c.size !== 'M' && `· ${c.size}`}
                      {c.modifiers.length > 0 && ` · ${c.modifiers.join(', ')}`}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 14 * scale, fontWeight: 600, color: accentColor }}>
                  {((c.menuItem.price + (c.size === 'L' ? 1 : c.size === 'XL' ? 2 : 0)) * c.qty).toFixed(2)} {settings.currency}
                </div>
              </div>
            ))}
          </div>

          {/* Dine-in options */}
          <div style={{
            textAlign: 'center', fontSize: 14 * scale, fontWeight: 600,
            marginBottom: 12, color: 'rgba(255,255,255,0.7)',
          }}>
            {t.dineIn} ou {t.takeaway} ?
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {[
              { val: true, emoji: '🪑', label: t.dineIn },
              { val: false, emoji: '🥡', label: t.takeaway },
            ].map(opt => (
              <motion.button
                key={String(opt.val)}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDineIn(opt.val)}
                style={{
                  flex: 1, padding: '16px 0', borderRadius: 16, cursor: 'pointer',
                  border: dineIn === opt.val ? `2px solid ${accentColor}` : '1px solid rgba(255,255,255,0.08)',
                  background: dineIn === opt.val ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  color: '#e2e8f0', fontSize: 14 * scale, fontWeight: 600,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 28 }}>{opt.emoji}</span>
                {opt.label}
              </motion.button>
            ))}
          </div>

          {/* Table number (dine-in) */}
          {dineIn === true && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{ marginBottom: 20, overflow: 'hidden' }}
            >
              <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                {t.tableNum}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {['1','2','3','4','5','6','7','8','9','←','0','✓'].map(k => (
                  <button
                    key={k}
                    onClick={() => {
                      if (k === '←') setTableNumber(v => v.slice(0, -1))
                      else if (k === '✓') { /* confirm */ }
                      else if (tableNumber.length < 3) setTableNumber(v => v + k)
                    }}
                    style={{
                      padding: '14px 0', borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#e2e8f0', fontSize: 18, fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div style={{
                marginTop: 10, padding: '12px 16px',
                background: 'rgba(99,102,241,0.1)',
                borderRadius: 10, textAlign: 'center',
                fontSize: 20, fontWeight: 800, color: '#a5b4fc',
              }}>
                Table {tableNumber || '—'}
              </div>
            </motion.div>
          )}

          {/* Pickup time (takeaway) */}
          {dineIn === false && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{ marginBottom: 20, overflow: 'hidden' }}
            >
              <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                {t.pickup}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['15min', '30min', '45min', '1h'].map(time => (
                  <button
                    key={time}
                    onClick={() => setPickupTime(time)}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 10,
                      background: pickupTime === time ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                      border: pickupTime === time ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.06)',
                      color: pickupTime === time ? '#a5b4fc' : '#94a3b8',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loyalty */}
          <div style={{ marginBottom: 20 }}>
            {!showLoyaltyInput ? (
              <button
                onClick={() => setShowLoyaltyInput(true)}
                style={{
                  width: '100%', padding: '12px', borderRadius: 12,
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px dashed rgba(245,158,11,0.3)',
                  color: '#fcd34d', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ⭐ J'ai une carte fidélité
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  placeholder="Carte ou téléphone"
                  value={loyaltyCode}
                  onChange={e => setLoyaltyCode(e.target.value)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#e2e8f0', fontSize: 13, outline: 'none',
                  }}
                />
                <button
                  onClick={() => { setLoyaltyApplied(!!loyaltyCode); setShowLoyaltyInput(false) }}
                  style={{
                    padding: '0 16px', borderRadius: 10, border: 'none',
                    background: loyaltyApplied ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                    color: loyaltyApplied ? '#6ee7b7' : '#fcd34d',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {loyaltyApplied ? '✓' : 'Valider'}
                </button>
              </div>
            )}
            {loyaltyApplied && (
              <div style={{ fontSize: 12, color: '#10b981', marginTop: 6, textAlign: 'center' }}>
                Remise fidélité -5% appliquée
              </div>
            )}
          </div>

          {/* Totals */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
              <span>Sous-total</span><span>{subtotal.toFixed(2)} {settings.currency}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
              <span>TVA</span><span>{totalTax.toFixed(2)} {settings.currency}</span>
            </div>
            {loyaltyDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#10b981', marginBottom: 4 }}>
                <span>Fidélité</span><span>-{loyaltyDiscount.toFixed(2)} {settings.currency}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22 * scale, fontWeight: 800, marginTop: 8 }}>
              <span>{t.total}</span>
              <span style={{ color: accentColor }}>{total.toFixed(2)} {settings.currency}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep('browse')}
              style={{
                flex: 1, padding: '16px 0', borderRadius: 16, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                color: '#94a3b8', fontSize: 14 * scale, fontWeight: 600,
              }}
            >
              ← Retour
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => dineIn !== null && setStep('success')}
              style={{
                flex: 2, padding: '16px 0', borderRadius: 16, cursor: 'pointer',
                border: 'none', fontSize: 15 * scale, fontWeight: 700, color: '#fff',
                background: dineIn !== null ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.06)',
                opacity: dineIn !== null ? 1 : 0.5,
                boxShadow: dineIn !== null ? '0 0 30px rgba(16,185,129,0.2)' : 'none',
              }}
            >
              Confirmer — {total.toFixed(2)} {settings.currency}
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Main browse layout ───────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      background: bgColor, color: '#e2e8f0',
      fontFamily: '-apple-system, "Segoe UI", sans-serif',
    }}>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{
        height: 80 * scale, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(13,13,26,0.8)', backdropFilter: 'blur(12px)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 22,
            background: `linear-gradient(135deg, ${accentColor}, #8b5cf6)`,
          }}>
            ☕
          </div>
          <div>
            <div style={{ fontSize: 18 * scale, fontWeight: 700, color: '#fff' }}>
              {settings.restaurantName}
            </div>
            <div style={{ fontSize: 12 * scale, color: 'rgba(255,255,255,0.4)' }}>
              {t.welcome}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Accessibility */}
          <button
            onClick={() => setLargeText(v => !v)}
            title="Grands caractères"
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: largeText ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              border: '1px solid ' + (largeText ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'),
              color: largeText ? '#a5b4fc' : '#94a3b8', cursor: 'pointer',
              fontSize: 18, fontWeight: 800,
            }}
          >
            A+
          </button>
          <button
            onClick={() => setHighContrast(v => !v)}
            title="Contraste élevé"
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: highContrast ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#e2e8f0', cursor: 'pointer', fontSize: 16,
            }}
          >
            ◐
          </button>

          {/* Language */}
          <div style={{ display: 'flex', gap: 3, padding: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
            {(['FR', 'DE', 'EN', 'PT', 'LU'] as Lang[]).map(l => (
              <button
                key={l} onClick={() => setLang(l)}
                style={{
                  padding: '5px 8px', borderRadius: 7, fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', border: 'none',
                  background: lang === l ? accentColor : 'transparent',
                  color: lang === l ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          <button
            onClick={onExit}
            style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 500,
              border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
              color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
            }}
          >
            Quitter
          </button>
        </div>
      </div>

      {/* Tutorial overlay */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (tutorialStep < 2) setTutorialStep(s => s + 1)
              else setShowTutorial(false)
            }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              style={{
                maxWidth: 400, padding: 32, borderRadius: 24,
                background: panelColor, textAlign: 'center',
                border: '1px solid rgba(99,102,241,0.3)',
                boxShadow: '0 0 60px rgba(99,102,241,0.2)',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                {tutorialStep === 0 ? '👆' : tutorialStep === 1 ? '🛒' : '✅'}
              </div>
              <div style={{ fontSize: 18 * scale, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                {tutorialStep === 0 && 'Bienvenue !'}
                {tutorialStep === 1 && 'Votre panier'}
                {tutorialStep === 2 && 'Validez votre commande'}
              </div>
              <div style={{ fontSize: 14 * scale, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 20 }}>
                {tutorialStep === 0 && t.tutorial}
                {tutorialStep === 1 && 'Gérez vos articles dans le panier à droite'}
                {tutorialStep === 2 && 'Cliquez sur "Commander" pour finaliser'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: 4,
                    background: i === tutorialStep ? accentColor : 'rgba(255,255,255,0.2)',
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                Appuyez pour continuer
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* LEFT */}
        <div style={{ flex: 7, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Filters bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            <button
              onClick={() => setShowFilters(v => !v)}
              style={{
                padding: '8px 14px', borderRadius: 10,
                background: showFilters ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                border: '1px solid ' + (showFilters ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'),
                color: showFilters ? '#a5b4fc' : '#94a3b8',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              🎚️ Filtres {activeDiets.length > 0 && `(${activeDiets.length})`}
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
                >
                  {DIETS.map(d => {
                    const on = activeDiets.includes(d.id)
                    return (
                      <button
                        key={d.id}
                        onClick={() => setActiveDiets(prev =>
                          on ? prev.filter(x => x !== d.id) : [...prev, d.id]
                        )}
                        style={{
                          padding: '6px 12px', borderRadius: 20,
                          background: on ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid ' + (on ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'),
                          color: on ? '#6ee7b7' : '#94a3b8',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {d.emoji} {d.label}
                      </button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Category tabs */}
          <div style={{
            display: 'flex', gap: 10, padding: '12px 20px',
            overflowX: 'auto', flexShrink: 0,
          }}>
            {MENU_CATEGORIES.map(cat => {
              const active = cat === activeCat
              return (
                <motion.button
                  key={cat}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => setActiveCat(cat)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 6, padding: '12px 20px', borderRadius: 20, cursor: 'pointer',
                    minWidth: 100, flexShrink: 0,
                    border: active ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.06)',
                    background: active ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                    color: active ? '#c7d2fe' : '#94a3b8',
                  }}
                >
                  <span style={{ fontSize: 26 }}>{CAT_EMOJIS[cat] || '📦'}</span>
                  <span style={{ fontSize: 12 * scale, fontWeight: 600, whiteSpace: 'nowrap' }}>{cat}</span>
                </motion.button>
              )
            })}
          </div>

          {/* Product grid */}
          <div
            ref={gridRef}
            style={{
              flex: 1, overflowY: 'auto', padding: '16px 20px 20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 14, alignContent: 'start',
            }}
          >
            <AnimatePresence mode="popLayout">
              {filtered.map(item => {
                const inCart = cart.find(c => c.menuItem.id === item.id)
                const justAdded = addedId === item.id
                const allergens = getFakeAllergens(item.id)
                const hasConflict = hasAllergenConflict(item)
                const diets = getFakeDiets(item.id)
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      borderRadius: 20, cursor: 'pointer',
                      border: hasConflict
                        ? '1px solid rgba(244,63,94,0.5)'
                        : inCart ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(255,255,255,0.04)',
                      position: 'relative', overflow: 'hidden',
                    }}
                  >
                    {/* Photo placeholder */}
                    <div style={{
                      height: 110,
                      background: CAT_GRADIENTS[item.category] || 'linear-gradient(135deg, #1e293b, #334155)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 52, position: 'relative',
                    }}>
                      <span style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}>
                        {item.emoji}
                      </span>
                      {inCart && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8,
                          width: 26, height: 26, borderRadius: 13,
                          background: accentColor, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        }}>
                          {inCart.qty}
                        </div>
                      )}
                      {diets.length > 0 && (
                        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 3 }}>
                          {diets.slice(0, 2).map(d => {
                            const diet = DIETS.find(x => x.id === d)
                            return (
                              <span key={d} style={{
                                padding: '3px 6px', borderRadius: 10,
                                background: 'rgba(16,185,129,0.9)',
                                color: '#fff', fontSize: 10,
                              }}>
                                {diet?.emoji}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 14 * scale, fontWeight: 600, textAlign: 'center',
                        marginBottom: 2, lineHeight: 1.3,
                      }}>
                        {item.name}
                      </span>

                      {/* Allergen warning */}
                      {hasConflict && (
                        <div style={{
                          fontSize: 10, color: '#f43f5e', marginBottom: 4, fontWeight: 600,
                        }}>
                          ⚠ {t.allergen}
                        </div>
                      )}
                      {allergens.length > 0 && !hasConflict && (
                        <div style={{ fontSize: 9, color: '#64748b', marginBottom: 4 }}>
                          Contient : {allergens.join(', ')}
                        </div>
                      )}

                      <span style={{ fontSize: 18 * scale, fontWeight: 800, color: accentColor, marginBottom: 10 }}>
                        {item.price.toFixed(2)} {settings.currency}
                      </span>

                      <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => quickAdd(item)}
                          style={{
                            flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
                            background: `linear-gradient(135deg, ${accentColor}, #818cf8)`,
                            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          + Ajouter
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openCustomize(item)}
                          style={{
                            padding: '10px 12px', borderRadius: 12, border: 'none',
                            background: 'rgba(255,255,255,0.06)',
                            color: '#94a3b8', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          ⚙
                        </motion.button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {justAdded && (
                        <motion.div
                          initial={{ opacity: 0.6, scale: 0.5 }}
                          animate={{ opacity: 0, scale: 2 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          style={{
                            position: 'absolute', inset: 0, borderRadius: 20,
                            background: 'radial-gradient(circle, rgba(16,185,129,0.2), transparent)',
                            pointerEvents: 'none',
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && cart.length > 0 && (
            <div style={{
              padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.04)',
              background: 'rgba(99,102,241,0.04)',
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 11, color: '#a5b4fc', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
                ✨ Les clients ont aussi pris...
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {recommendations.map(r => (
                  <motion.button
                    key={r.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => quickAdd(r)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      color: '#cbd5e1', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{r.emoji}</span>
                    {r.name}
                    <span style={{ color: accentColor, fontWeight: 700 }}>
                      +{r.price.toFixed(2)}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Cart */}
        <div style={{
          width: '30%', minWidth: 320, maxWidth: 400,
          display: 'flex', flexDirection: 'column',
          background: panelColor,
          borderLeft: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            padding: '18px 20px 14px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 17 * scale, fontWeight: 700 }}>{t.order}</span>
              {itemCount > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24, borderRadius: 12,
                  background: accentColor, color: '#fff',
                  fontSize: 11, fontWeight: 800,
                }}>
                  {itemCount}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                style={{
                  padding: '4px 10px', borderRadius: 8, border: 'none',
                  background: 'rgba(244,63,94,0.1)', color: '#f43f5e',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Vider
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 20px' }}>
            {cart.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', gap: 14,
                color: 'rgba(255,255,255,0.2)',
              }}>
                <span style={{ fontSize: 52 }}>🛒</span>
                <span style={{ fontSize: 13 * scale, textAlign: 'center', lineHeight: 1.5 }}>
                  {t.empty}
                </span>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {cart.map((c, i) => {
                  const sizeAdj = c.size === 'L' ? 1 : c.size === 'XL' ? 2 : 0
                  const linePrice = (c.menuItem.price + sizeAdj) * c.qty
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                    >
                      <div style={{
                        display: 'flex', gap: 10,
                        padding: '12px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}>
                        <span style={{ fontSize: 28, flexShrink: 0 }}>{c.menuItem.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13 * scale, fontWeight: 600,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {c.menuItem.name}
                          </div>
                          {(c.size !== 'M' || c.modifiers.length > 0) && (
                            <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 1 }}>
                              {c.size !== 'M' && `Taille ${c.size}`}
                              {c.modifiers.length > 0 && ` · ${c.modifiers.join(', ')}`}
                            </div>
                          )}
                          <div style={{ fontSize: 13, fontWeight: 700, color: accentColor, marginTop: 2 }}>
                            {linePrice.toFixed(2)} {settings.currency}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => changeQty(i, -1)}
                            style={{
                              width: 30, height: 30, borderRadius: 10, border: 'none',
                              background: 'rgba(255,255,255,0.06)', color: '#e2e8f0',
                              fontSize: 14, cursor: 'pointer',
                            }}
                          >
                            {c.qty === 1 ? '✕' : '−'}
                          </button>
                          <span style={{ fontSize: 14, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>
                            {c.qty}
                          </span>
                          <button
                            onClick={() => changeQty(i, 1)}
                            style={{
                              width: 30, height: 30, borderRadius: 10, border: 'none',
                              background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                              fontSize: 14, cursor: 'pointer',
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </div>

          <div style={{
            padding: '14px 20px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: highContrast ? '#000' : '#07070d',
          }}>
            {cart.length > 0 && (
              <>
                {/* Upsell banner */}
                <div style={{
                  padding: '8px 12px', borderRadius: 10, marginBottom: 10,
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px dashed rgba(245,158,11,0.3)',
                  fontSize: 11, color: '#fcd34d', textAlign: 'center',
                }}>
                  💡 +1€ pour taille XL sur vos boissons !
                </div>

                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4,
                }}>
                  <span>Sous-total</span>
                  <span>{subtotal.toFixed(2)} {settings.currency}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12,
                }}>
                  <span>TVA</span>
                  <span>{totalTax.toFixed(2)} {settings.currency}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  marginBottom: 16,
                }}>
                  <span style={{ fontSize: 15 * scale, fontWeight: 700 }}>{t.total}</span>
                  <span style={{ fontSize: 26 * scale, fontWeight: 800, color: accentColor }}>
                    {total.toFixed(2)} {settings.currency}
                  </span>
                </div>
              </>
            )}

            <motion.button
              whileTap={cart.length > 0 ? { scale: 0.97 } : {}}
              onClick={() => cart.length > 0 && setStep('confirm')}
              style={{
                width: '100%', height: 56 * scale, borderRadius: 16, border: 'none',
                fontSize: 16 * scale, fontWeight: 700, color: '#fff', cursor: 'pointer',
                background: cart.length > 0
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'rgba(255,255,255,0.04)',
                opacity: cart.length > 0 ? 1 : 0.4,
                boxShadow: cart.length > 0 ? '0 0 30px rgba(16,185,129,0.2)' : 'none',
              }}
              disabled={cart.length === 0}
            >
              {cart.length > 0 ? `${t.checkout} — ${total.toFixed(2)} ${settings.currency}` : t.checkout}
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Customize modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {customizing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCustomizing(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 460, background: panelColor,
                borderRadius: 24, padding: 24,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <span style={{ fontSize: 48 }}>{customizing.emoji}</span>
                <div>
                  <div style={{ fontSize: 20 * scale, fontWeight: 700, color: '#fff' }}>
                    {customizing.name}
                  </div>
                  <div style={{ fontSize: 14, color: accentColor, fontWeight: 700 }}>
                    {customizing.price.toFixed(2)} {settings.currency}
                  </div>
                </div>
              </div>

              {/* Size */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                  Taille
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['M', 'L', 'XL'] as const).map(s => {
                    const adj = s === 'L' ? 1 : s === 'XL' ? 2 : 0
                    return (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        style={{
                          flex: 1, padding: '12px 0', borderRadius: 12,
                          background: selectedSize === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                          border: selectedSize === s ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.06)',
                          color: selectedSize === s ? '#a5b4fc' : '#94a3b8',
                          fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        {s} {adj > 0 && <span style={{ fontSize: 10, opacity: 0.7 }}>+{adj}€</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Modifiers */}
              {MODIFIERS[customizing.category] && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                    Options
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {MODIFIERS[customizing.category].map(m => {
                      const on = selectedMods.includes(m.label)
                      return (
                        <button
                          key={m.label}
                          onClick={() => setSelectedMods(prev =>
                            on ? prev.filter(x => x !== m.label) : [...prev, m.label]
                          )}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 14px', borderRadius: 10,
                            background: on ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                            border: on ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)',
                            color: on ? '#6ee7b7' : '#cbd5e1',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          <span>{on ? '✓' : '○'} {m.label}</span>
                          {m.price > 0 && <span style={{ fontSize: 11 }}>+{m.price.toFixed(2)} €</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setCustomizing(null)}
                  style={{
                    flex: 1, padding: '14px 0', borderRadius: 12,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmCustomize}
                  style={{
                    flex: 2, padding: '14px 0', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Ajouter au panier
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
