import { useEffect, useState } from 'react'

/**
 * v4.8 — Grille des 12 produits les plus vendus. 1 tap = ajout quantité 1.
 * Compteur de ventes persisté côté client (localStorage), incrémenté à
 * chaque ajout au panier via recordSale().
 */

const SALES_KEY = 'creorga.pos.productSales'

export interface FavoriteProduct {
  id: string
  name: string
  emoji: string
  price: number
}

function readSales(): Record<string, number> {
  try {
    const raw = localStorage.getItem(SALES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function recordSale(productId: string, qty = 1): void {
  try {
    const sales = readSales()
    sales[productId] = (sales[productId] || 0) + qty
    localStorage.setItem(SALES_KEY, JSON.stringify(sales))
  } catch { /* best effort */ }
}

export default function FavoritesGrid({
  products,
  onAdd,
}: {
  products: FavoriteProduct[]
  onAdd: (productId: string) => void
}) {
  const [top, setTop] = useState<FavoriteProduct[]>([])

  useEffect(() => {
    const sales = readSales()
    const sorted = [...products].sort((a, b) => (sales[b.id] || 0) - (sales[a.id] || 0))
    setTop(sorted.slice(0, 12))
  }, [products])

  if (top.length === 0) return null

  return (
    <div style={{ padding: '10px 20px 0' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        ⭐ Favoris
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
        {top.map((p) => (
          <button
            key={p.id}
            onClick={() => onAdd(p.id)}
            style={{
              minHeight: 56, borderRadius: 10, border: '1px solid #e2e8f0',
              background: '#fff', cursor: 'pointer', display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 2, padding: '6px 4px',
            }}
          >
            <span style={{ fontSize: 18 }}>{p.emoji}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', textAlign: 'center', lineHeight: 1.2 }}>
              {p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
