import { useState } from 'react'
import { usePOS, type MenuItem } from '../store/posStore'

interface CartItem { menuItem: MenuItem; qty: number }

const S = {
  page: {
    display: 'flex' as const,
    height: '100vh',
    background: '#07070d',
    color: '#e2e8f0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  },
  left: {
    flex: 1,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    overflow: 'hidden' as const,
  },
  header: {
    padding: '20px 24px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  title: { fontSize: 24, fontWeight: 700, color: '#818cf8' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  cats: {
    display: 'flex' as const,
    gap: 8,
    padding: '12px 24px',
    overflowX: 'auto' as const,
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  catBtn: (active: boolean) => ({
    padding: '8px 18px',
    borderRadius: 20,
    border: active ? '1px solid rgba(129,140,248,0.4)' : '1px solid rgba(255,255,255,0.08)',
    background: active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
    color: active ? '#a5b4fc' : '#94a3b8',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  }),
  grid: {
    flex: 1,
    display: 'grid' as const,
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
    padding: 24,
    overflowY: 'auto' as const,
    alignContent: 'start' as const,
  },
  item: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    gap: 8,
    padding: '20px 12px',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.03)',
    cursor: 'pointer',
    transition: 'all .15s',
  },
  emoji: { fontSize: 36 },
  itemName: { fontSize: 14, fontWeight: 500, textAlign: 'center' as const },
  itemPrice: { fontSize: 15, fontWeight: 700, color: '#818cf8' },
  right: {
    width: 340,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    background: '#0a0a16',
    borderLeft: '1px solid rgba(255,255,255,0.06)',
  },
  cartHeader: { padding: '20px 20px 12px', fontSize: 16, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  cartItems: { flex: 1, overflowY: 'auto' as const, padding: '12px 20px' },
  cartItem: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#e2e8f0',
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  footer: { padding: 20, borderTop: '1px solid rgba(255,255,255,0.06)' },
  total: { display: 'flex' as const, justifyContent: 'space-between' as const, fontSize: 20, fontWeight: 700, marginBottom: 16 },
  orderBtn: {
    width: '100%',
    padding: '14px 0',
    borderRadius: 14,
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
  empty: { color: 'rgba(255,255,255,0.25)', fontSize: 13, textAlign: 'center' as const, padding: '40px 0' },
}

export default function KioskPage({ onExit }: { onExit: () => void }) {
  const menu = usePOS(s => s.menu).filter(m => m.active)
  const settings = usePOS(s => s.settings)
  const categories = [...new Set(menu.map(m => m.category))]
  const [activeCat, setActiveCat] = useState(categories[0] || '')
  const [cart, setCart] = useState<CartItem[]>([])
  const [ordered, setOrdered] = useState(false)

  const filtered = menu.filter(m => m.category === activeCat)
  const total = cart.reduce((s, c) => s + c.menuItem.price * c.qty, 0)

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const ex = prev.find(c => c.menuItem.id === item.id)
      if (ex) return prev.map(c => c.menuItem.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { menuItem: item, qty: 1 }]
    })
  }

  function changeQty(id: string, delta: number) {
    setCart(prev => prev.map(c => c.menuItem.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0))
  }

  function placeOrder() {
    setOrdered(true)
    setTimeout(() => { setCart([]); setOrdered(false) }, 3000)
  }

  if (ordered) {
    return (
      <div style={{ ...S.page, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 64 }}>&#10003;</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>Commande envoyée !</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)' }}>Votre commande sera prête bientôt</div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <div style={S.left}>
        <div style={S.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={S.title}>{settings.restaurantName}</div>
              <div style={S.subtitle}>Mode Kiosque - Commandez ici</div>
            </div>
            <button onClick={onExit} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
              Quitter Kiosque
            </button>
          </div>
        </div>
        <div style={S.cats}>
          {categories.map(c => (
            <button key={c} style={S.catBtn(c === activeCat)} onClick={() => setActiveCat(c)}>{c}</button>
          ))}
        </div>
        <div style={S.grid}>
          {filtered.map(item => (
            <button key={item.id} style={S.item} onClick={() => addToCart(item)}>
              <span style={S.emoji}>{item.emoji}</span>
              <span style={S.itemName}>{item.name}</span>
              <span style={S.itemPrice}>{item.price.toFixed(2)} {settings.currency}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={S.right}>
        <div style={S.cartHeader}>Votre commande</div>
        <div style={S.cartItems}>
          {cart.length === 0 && <div style={S.empty}>Ajoutez des articles</div>}
          {cart.map(c => (
            <div key={c.menuItem.id} style={S.cartItem}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{c.menuItem.emoji} {c.menuItem.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{(c.menuItem.price * c.qty).toFixed(2)} {settings.currency}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button style={S.qtyBtn} onClick={() => changeQty(c.menuItem.id, -1)}>-</button>
                <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{c.qty}</span>
                <button style={S.qtyBtn} onClick={() => changeQty(c.menuItem.id, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
        <div style={S.footer}>
          <div style={S.total}>
            <span>Total</span>
            <span style={{ color: '#818cf8' }}>{total.toFixed(2)} {settings.currency}</span>
          </div>
          <button style={{ ...S.orderBtn, opacity: cart.length === 0 ? 0.4 : 1 }} disabled={cart.length === 0} onClick={placeOrder}>
            Commander
          </button>
        </div>
      </div>
    </div>
  )
}
