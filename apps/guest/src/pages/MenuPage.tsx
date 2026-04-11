import { useState } from 'react'
import { store } from '../store'

// Sample menu data — in production this would come from API
const MENU = [
  { id: 'm1', name: 'Eau minerale', price: 2.50, category: 'Boissons', emoji: '💧' },
  { id: 'm2', name: 'Limonade', price: 3.00, category: 'Boissons', emoji: '🥤' },
  { id: 'm3', name: 'Jus d\'orange', price: 4.00, category: 'Boissons', emoji: '🍊' },
  { id: 'm4', name: 'Cafe espresso', price: 3.00, category: 'Boissons', emoji: '☕' },
  { id: 'm5', name: 'Biere pression', price: 4.50, category: 'Bieres', emoji: '🍺' },
  { id: 'm6', name: 'Vin rouge (verre)', price: 6.00, category: 'Vins', emoji: '🍷' },
  { id: 'm7', name: 'Mojito', price: 12.00, category: 'Cocktails', emoji: '🍹' },
  { id: 'm8', name: 'Spritz', price: 10.00, category: 'Cocktails', emoji: '🍹' },
  { id: 'm9', name: 'Burger maison', price: 17.00, category: 'Cuisine', emoji: '🍔' },
  { id: 'm10', name: 'Salade Cesar', price: 13.00, category: 'Cuisine', emoji: '🥗' },
  { id: 'm11', name: 'Pates carbonara', price: 16.00, category: 'Cuisine', emoji: '🍝' },
  { id: 'm12', name: 'Planche charcuterie', price: 18.00, category: 'Cuisine', emoji: '🥩' },
  { id: 'm13', name: 'Frites', price: 5.00, category: 'Cuisine', emoji: '🍟' },
  { id: 'm14', name: 'Tiramisu', price: 7.50, category: 'Desserts', emoji: '🍮' },
  { id: 'm15', name: 'Mousse chocolat', price: 6.50, category: 'Desserts', emoji: '🍫' },
  { id: 'm16', name: 'Coupe glacee', price: 8.00, category: 'Desserts', emoji: '🍨' },
]

const categories = [...new Set(MENU.map(m => m.category))]

const S = {
  page: { padding: '20px 16px' },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  cats: { display: 'flex' as const, gap: 8, overflowX: 'auto' as const, marginBottom: 20, paddingBottom: 4 },
  catBtn: (active: boolean) => ({
    padding: '8px 18px',
    borderRadius: 20,
    border: active ? '2px solid #6366f1' : '2px solid #e5e7eb',
    background: active ? '#ede9fe' : '#fff',
    color: active ? '#6366f1' : '#6b7280',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  }),
  list: { display: 'flex' as const, flexDirection: 'column' as const, gap: 10 },
  item: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 14,
    padding: '14px 16px',
    borderRadius: 16,
    background: '#f9fafb',
    border: '1px solid #f3f4f6',
  },
  emoji: { fontSize: 32, flexShrink: 0 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: 600, color: '#1a1a2e' },
  price: { fontSize: 14, fontWeight: 700, color: '#6366f1', marginTop: 2 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontSize: 20,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  added: {
    position: 'fixed' as const,
    bottom: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#10b981',
    color: '#fff',
    padding: '10px 24px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
}

export default function MenuPage() {
  const [activeCat, setActiveCat] = useState(categories[0])
  const [toast, setToast] = useState('')
  const filtered = MENU.filter(m => m.category === activeCat)

  function handleAdd(item: typeof MENU[0]) {
    store.addItem({ id: item.id, name: item.name, price: item.price, emoji: item.emoji })
    setToast(`${item.emoji} ${item.name} ajoute !`)
    setTimeout(() => setToast(''), 1500)
  }

  return (
    <div style={S.page}>
      <div style={S.title}>Notre Menu</div>
      <div style={S.cats}>
        {categories.map(c => (
          <button key={c} style={S.catBtn(c === activeCat)} onClick={() => setActiveCat(c)}>{c}</button>
        ))}
      </div>
      <div style={S.list}>
        {filtered.map(item => (
          <div key={item.id} style={S.item}>
            <span style={S.emoji}>{item.emoji}</span>
            <div style={S.info}>
              <div style={S.name}>{item.name}</div>
              <div style={S.price}>{item.price.toFixed(2)} EUR</div>
            </div>
            <button style={S.addBtn} onClick={() => handleAdd(item)}>+</button>
          </div>
        ))}
      </div>
      {toast && <div style={S.added} className="fade-in">{toast}</div>}
    </div>
  )
}
