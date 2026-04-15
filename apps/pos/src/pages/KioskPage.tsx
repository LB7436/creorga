import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePOS, type MenuItem, MENU_CATEGORIES } from '../store/posStore'

interface CartItem { menuItem: MenuItem; qty: number }
type OrderStep = 'browse' | 'confirm' | 'success'

const DRINK_CATS = ['Boissons', 'Bières', 'Vins', 'Cocktails']
const CAT_EMOJIS: Record<string, string> = {
  Boissons: '☕', Bières: '🍺', Vins: '🍷', Cocktails: '🍹', Cuisine: '🍔', Desserts: '🍮',
}

function calcTax(cart: CartItem[]) {
  let foodSub = 0, drinkSub = 0
  cart.forEach(c => {
    const line = c.menuItem.price * c.qty
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
  const [lang, setLang] = useState('FR')
  const gridRef = useRef<HTMLDivElement>(null)

  const filtered = menu.filter(m => m.category === activeCat)
  const itemCount = cart.reduce((s, c) => s + c.qty, 0)
  const { foodSub, drinkSub, foodTax, drinkTax, subtotal } = calcTax(cart)
  const totalTax = foodTax + drinkTax
  const total = subtotal + totalTax

  const addToCart = useCallback((item: MenuItem) => {
    setAddedId(item.id)
    setTimeout(() => setAddedId(null), 600)
    setCart(prev => {
      const ex = prev.find(c => c.menuItem.id === item.id)
      if (ex) return prev.map(c => c.menuItem.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { menuItem: item, qty: 1 }]
    })
  }, [])

  const changeQty = useCallback((id: string, delta: number) => {
    setCart(prev => prev.map(c =>
      c.menuItem.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c
    ).filter(c => c.qty > 0))
  }, [])

  const resetKiosk = useCallback(() => {
    setCart([])
    setStep('browse')
    setDineIn(null)
    setActiveCat(MENU_CATEGORIES[0])
  }, [])

  useEffect(() => {
    if (step === 'success') {
      const t = setTimeout(resetKiosk, 5000)
      return () => clearTimeout(t)
    }
  }, [step, resetKiosk])

  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = 0
  }, [activeCat])

  const cartInItem = (id: string) => cart.find(c => c.menuItem.id === id)

  // ── Success screen ──────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#07070d', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 100,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          style={{ textAlign: 'center', color: '#e2e8f0' }}
        >
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
            style={{
              width: 120, height: 120, borderRadius: '50%', margin: '0 auto 32px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 60px rgba(16,185,129,0.3)',
            }}
          >
            <span style={{ fontSize: 56, color: '#fff' }}>✓</span>
          </motion.div>
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              animate={{
                opacity: 0, scale: 0,
                x: (Math.random() - 0.5) * 300,
                y: (Math.random() - 0.5) * 300,
              }}
              transition={{ duration: 1.2, delay: 0.2 + i * 0.05 }}
              style={{
                position: 'absolute', left: '50%', top: '40%',
                width: 8, height: 8, borderRadius: 4,
                background: ['#6366f1', '#10b981', '#f59e0b', '#ec4899'][i % 4],
              }}
            />
          ))}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ fontSize: 22, fontWeight: 600, color: '#10b981', marginBottom: 12 }}
          >
            Commande confirmée !
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            style={{
              fontSize: 48, fontWeight: 800, color: '#fff', marginBottom: 16,
              letterSpacing: 2,
            }}
          >
            #{String(orderNum).padStart(3, '0')}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}
          >
            Merci ! Votre commande est en préparation.
            <br />
            {dineIn ? 'Installez-vous, on vous apporte ça !' : 'Nous vous appellerons quand ce sera prêt.'}
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // ── Confirmation screen ─────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#07070d', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 100,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          style={{
            width: '90%', maxWidth: 520, background: '#0d0d1a',
            borderRadius: 32, padding: '40px 36px', color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 28, textAlign: 'center' }}>
            Récapitulatif de commande
          </div>

          <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 24 }}>
            {cart.map(c => (
              <div key={c.menuItem.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{c.menuItem.emoji}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{c.menuItem.name}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>x{c.qty}</div>
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#6366f1' }}>
                  {(c.menuItem.price * c.qty).toFixed(2)} {settings.currency}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, marginBottom: 28,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
              <span>Sous-total</span><span>{subtotal.toFixed(2)} {settings.currency}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
              <span>TVA</span><span>{totalTax.toFixed(2)} {settings.currency}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, fontWeight: 800, marginTop: 8 }}>
              <span>Total</span><span style={{ color: '#6366f1' }}>{total.toFixed(2)} {settings.currency}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'rgba(255,255,255,0.7)' }}>
            Sur place ou à emporter ?
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
            {[
              { val: true, emoji: '🪑', label: 'Sur place' },
              { val: false, emoji: '🥡', label: 'À emporter' },
            ].map(opt => (
              <motion.button
                key={String(opt.val)}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDineIn(opt.val)}
                style={{
                  flex: 1, padding: '18px 0', borderRadius: 16, cursor: 'pointer',
                  border: dineIn === opt.val
                    ? '2px solid #6366f1'
                    : '1px solid rgba(255,255,255,0.08)',
                  background: dineIn === opt.val
                    ? 'rgba(99,102,241,0.15)'
                    : 'rgba(255,255,255,0.03)',
                  color: '#e2e8f0', fontSize: 15, fontWeight: 600,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}
              >
                <span style={{ fontSize: 32 }}>{opt.emoji}</span>
                {opt.label}
              </motion.button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep('browse')}
              style={{
                flex: 1, padding: '16px 0', borderRadius: 16, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                color: '#94a3b8', fontSize: 15, fontWeight: 600,
              }}
            >
              ← Retour
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => dineIn !== null && setStep('success')}
              style={{
                flex: 2, padding: '16px 0', borderRadius: 16, cursor: 'pointer',
                border: 'none', fontSize: 16, fontWeight: 700, color: '#fff',
                background: dineIn !== null
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'rgba(255,255,255,0.06)',
                opacity: dineIn !== null ? 1 : 0.5,
                boxShadow: dineIn !== null ? '0 0 30px rgba(16,185,129,0.2)' : 'none',
              }}
            >
              Confirmer la commande
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Main browse layout ──────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      background: '#07070d', color: '#e2e8f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    }}>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div style={{
        height: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(13,13,26,0.8)', backdropFilter: 'blur(12px)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 22,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 0 20px rgba(99,102,241,0.3)',
          }}>
            ☕
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
              {settings.restaurantName}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
              Mode Kiosque — Commandez ici
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['FR', 'EN', 'DE', 'PT'].map(l => (
              <button
                key={l} onClick={() => setLang(l)}
                style={{
                  padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                  border: lang === l ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  background: lang === l ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: lang === l ? '#a5b4fc' : 'rgba(255,255,255,0.35)',
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={onExit}
            style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 500,
              border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
              color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
            }}
          >
            Quitter
          </button>
        </div>
      </div>

      {/* ── Body: product browser + cart panel ───────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ── Left: categories + grid ─────────────────────────────────── */}
        <div style={{ flex: 7, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Category tabs */}
          <div style={{
            display: 'flex', gap: 10, padding: '16px 28px',
            overflowX: 'auto', flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            {MENU_CATEGORIES.map(cat => {
              const active = cat === activeCat
              return (
                <motion.button
                  key={cat}
                  whileTap={{ scale: 0.93 }}
                  animate={active ? { scale: 1.02 } : { scale: 1 }}
                  onClick={() => setActiveCat(cat)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 6, padding: '14px 22px', borderRadius: 20, cursor: 'pointer',
                    minWidth: 100, flexShrink: 0,
                    border: active
                      ? '1px solid rgba(99,102,241,0.4)'
                      : '1px solid rgba(255,255,255,0.06)',
                    background: active
                      ? 'rgba(99,102,241,0.12)'
                      : 'rgba(255,255,255,0.02)',
                    color: active ? '#c7d2fe' : '#94a3b8',
                    boxShadow: active ? '0 0 24px rgba(99,102,241,0.15)' : 'none',
                    transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{CAT_EMOJIS[cat] || '📦'}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{cat}</span>
                </motion.button>
              )
            })}
          </div>

          {/* Product grid */}
          <div
            ref={gridRef}
            style={{
              flex: 1, overflowY: 'auto', padding: '20px 28px 28px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16, alignContent: 'start',
            }}
          >
            <AnimatePresence mode="popLayout">
              {filtered.map(item => {
                const inCart = cartInItem(item.id)
                const justAdded = addedId === item.id
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '24px 16px 18px', borderRadius: 24, cursor: 'pointer',
                      border: inCart
                        ? '1px solid rgba(99,102,241,0.3)'
                        : '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(255,255,255,0.04)',
                      backdropFilter: 'blur(8px)',
                      position: 'relative', overflow: 'hidden',
                      transition: 'border 0.2s, box-shadow 0.2s, transform 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
                    }}
                  >
                    {/* Badge if in cart */}
                    {inCart && (
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        style={{
                          position: 'absolute', top: 10, right: 10,
                          width: 24, height: 24, borderRadius: 12,
                          background: '#6366f1', color: '#fff',
                          fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {inCart.qty}
                      </motion.div>
                    )}

                    <motion.span
                      animate={justAdded ? { scale: [1, 1.3, 1], y: [0, -8, 0] } : {}}
                      transition={{ duration: 0.4 }}
                      style={{ fontSize: 52, marginBottom: 10, display: 'block' }}
                    >
                      {item.emoji}
                    </motion.span>
                    <span style={{
                      fontSize: 15, fontWeight: 600, textAlign: 'center',
                      marginBottom: 4, lineHeight: 1.3,
                    }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#6366f1', marginBottom: 14 }}>
                      {item.price.toFixed(2)} {settings.currency}
                    </span>

                    {!inCart ? (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); addToCart(item) }}
                        style={{
                          padding: '10px 28px', borderRadius: 14, border: 'none',
                          background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                          color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                          minHeight: 44,
                        }}
                      >
                        Ajouter
                      </motion.button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => { e.stopPropagation(); changeQty(item.id, -1) }}
                          style={{
                            width: 40, height: 40, borderRadius: 12, border: 'none',
                            background: 'rgba(255,255,255,0.08)', color: '#e2e8f0',
                            fontSize: 20, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          −
                        </motion.button>
                        <span style={{ fontSize: 18, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>
                          {inCart.qty}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={(e) => { e.stopPropagation(); addToCart(item) }}
                          style={{
                            width: 40, height: 40, borderRadius: 12, border: 'none',
                            background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
                            fontSize: 20, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          +
                        </motion.button>
                      </div>
                    )}

                    {/* Add flash */}
                    <AnimatePresence>
                      {justAdded && (
                        <motion.div
                          initial={{ opacity: 0.6, scale: 0.5 }}
                          animate={{ opacity: 0, scale: 2 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          style={{
                            position: 'absolute', inset: 0, borderRadius: 24,
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
        </div>

        {/* ── Right: cart panel ───────────────────────────────────────── */}
        <div style={{
          width: '30%', minWidth: 320, maxWidth: 400,
          display: 'flex', flexDirection: 'column',
          background: '#0d0d1a',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Cart header */}
          <div style={{
            padding: '20px 24px 16px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Votre commande</span>
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 26, height: 26, borderRadius: 13,
                    background: '#6366f1', color: '#fff',
                    fontSize: 12, fontWeight: 700,
                  }}
                >
                  {itemCount}
                </motion.span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                style={{
                  padding: '4px 10px', borderRadius: 8, border: 'none',
                  background: 'rgba(244,63,94,0.1)', color: '#f43f5e',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Vider
              </button>
            )}
          </div>

          {/* Cart body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px' }}>
            {cart.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', gap: 16,
                color: 'rgba(255,255,255,0.2)',
              }}>
                <span style={{ fontSize: 56 }}>🛒</span>
                <span style={{ fontSize: 14, textAlign: 'center', lineHeight: 1.6 }}>
                  Ajoutez des articles
                  <br />pour commencer
                </span>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {cart.map(c => (
                  <motion.div
                    key={c.menuItem.id}
                    initial={{ opacity: 0, x: 30, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, x: -30, height: 0 }}
                    transition={{ type: 'spring', damping: 25 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <span style={{ fontSize: 28, flexShrink: 0 }}>{c.menuItem.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 600,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {c.menuItem.name}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#6366f1', marginTop: 2 }}>
                          {(c.menuItem.price * c.qty).toFixed(2)} {settings.currency}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => changeQty(c.menuItem.id, -1)}
                          style={{
                            width: 32, height: 32, borderRadius: 10, border: 'none',
                            background: 'rgba(255,255,255,0.06)', color: '#e2e8f0',
                            fontSize: 16, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {c.qty === 1 ? '✕' : '−'}
                        </motion.button>
                        <span style={{ fontSize: 15, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                          {c.qty}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => changeQty(c.menuItem.id, 1)}
                          style={{
                            width: 32, height: 32, borderRadius: 10, border: 'none',
                            background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                            fontSize: 16, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          +
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Cart footer */}
          <div style={{
            padding: '16px 24px 24px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: '#0a0a14',
          }}>
            {cart.length > 0 && (
              <>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 4,
                }}>
                  <span>Sous-total</span>
                  <span>{subtotal.toFixed(2)} {settings.currency}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 12,
                }}>
                  <span>TVA ({foodSub > 0 ? '8%' : ''}{foodSub > 0 && drinkSub > 0 ? ' / ' : ''}{drinkSub > 0 ? '17%' : ''})</span>
                  <span>{totalTax.toFixed(2)} {settings.currency}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  marginBottom: 20,
                }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>Total</span>
                  <motion.span
                    key={total.toFixed(2)}
                    initial={{ scale: 1.15, color: '#818cf8' }}
                    animate={{ scale: 1, color: '#c7d2fe' }}
                    style={{ fontSize: 28, fontWeight: 800 }}
                  >
                    {total.toFixed(2)} {settings.currency}
                  </motion.span>
                </div>
              </>
            )}

            <motion.button
              whileTap={cart.length > 0 ? { scale: 0.97 } : {}}
              onClick={() => cart.length > 0 && setStep('confirm')}
              style={{
                width: '100%', height: 60, borderRadius: 16, border: 'none',
                fontSize: 17, fontWeight: 700, color: '#fff', cursor: 'pointer',
                background: cart.length > 0
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'rgba(255,255,255,0.04)',
                opacity: cart.length > 0 ? 1 : 0.4,
                boxShadow: cart.length > 0 ? '0 0 30px rgba(16,185,129,0.2)' : 'none',
                transition: 'background 0.2s, opacity 0.2s, box-shadow 0.2s',
              }}
              disabled={cart.length === 0}
            >
              {cart.length > 0 ? `Commander — ${total.toFixed(2)} ${settings.currency}` : 'Commander'}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
