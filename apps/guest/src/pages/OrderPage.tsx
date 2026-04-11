import { useState } from 'react'
import { useGuest, store } from '../store'

const S = {
  page: { padding: '20px 16px' },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  empty: { textAlign: 'center' as const, padding: '60px 20px', color: '#9ca3af' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  list: { display: 'flex' as const, flexDirection: 'column' as const, gap: 8 },
  item: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 12,
    padding: '14px 16px',
    borderRadius: 14,
    background: '#f9fafb',
    border: '1px solid #f3f4f6',
  },
  emoji: { fontSize: 28 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: 600 },
  price: { fontSize: 13, color: '#6366f1', fontWeight: 600 },
  qtyWrap: { display: 'flex' as const, alignItems: 'center' as const, gap: 8 },
  qBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    background: '#fff',
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    color: '#374151',
  },
  qty: { fontSize: 15, fontWeight: 700, minWidth: 20, textAlign: 'center' as const },
  footer: {
    marginTop: 24,
    padding: '20px 0',
    borderTop: '1px solid #e5e7eb',
  },
  totalRow: { display: 'flex' as const, justifyContent: 'space-between' as const, fontSize: 18, fontWeight: 700, marginBottom: 16 },
  orderBtn: {
    width: '100%',
    padding: '16px 0',
    borderRadius: 14,
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
  success: {
    textAlign: 'center' as const,
    padding: '80px 20px',
  },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: 700, color: '#10b981', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#6b7280' },
}

export default function OrderPage() {
  const guest = useGuest()
  const [submitted, setSubmitted] = useState(false)
  const total = guest.cart.reduce((s, c) => s + c.price * c.qty, 0)

  function handleOrder() {
    setSubmitted(true)
    setTimeout(() => { store.clearCart(); setSubmitted(false) }, 3000)
  }

  if (submitted) {
    return (
      <div style={S.page}>
        <div style={S.success} className="fade-in">
          <div style={S.successIcon}>✓</div>
          <div style={S.successTitle}>Commande envoyee !</div>
          <div style={S.successSub}>Votre commande est en preparation</div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <div style={S.title}>Votre Commande</div>
      {guest.cart.length === 0 ? (
        <div style={S.empty}>
          <div style={S.emptyIcon}>🛒</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Panier vide</div>
          <div style={{ fontSize: 13 }}>Ajoutez des articles depuis le menu</div>
        </div>
      ) : (
        <>
          <div style={S.list}>
            {guest.cart.map(item => (
              <div key={item.id} style={S.item}>
                <span style={S.emoji}>{item.emoji}</span>
                <div style={S.info}>
                  <div style={S.name}>{item.name}</div>
                  <div style={S.price}>{(item.price * item.qty).toFixed(2)} EUR</div>
                </div>
                <div style={S.qtyWrap}>
                  <button style={S.qBtn} onClick={() => store.changeQty(item.id, -1)}>-</button>
                  <span style={S.qty}>{item.qty}</span>
                  <button style={S.qBtn} onClick={() => store.changeQty(item.id, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
          <div style={S.footer}>
            <div style={S.totalRow}>
              <span>Total</span>
              <span style={{ color: '#6366f1' }}>{total.toFixed(2)} EUR</span>
            </div>
            <button style={S.orderBtn} onClick={handleOrder}>
              Envoyer la commande
            </button>
          </div>
        </>
      )}
    </div>
  )
}
