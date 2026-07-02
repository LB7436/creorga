import { describe, it, expect } from 'vitest'
import { stockStatusFor, type StockEntry } from './stockStore'

const stock: StockEntry[] = [
  { id: '1', name: 'coca-cola', quantity: 24, unit: 'pcs', lowStockThreshold: 6 },
  { id: '2', name: 'jambon', quantity: 2, unit: 'kg', lowStockThreshold: 5 },
  { id: '3', name: 'eau', quantity: 0, unit: 'pcs' },
]

describe('stockStatusFor', () => {
  it('produit non suivi → UNTRACKED et disponible', () => {
    const s = stockStatusFor('Tiramisu maison', stock)
    expect(s.status).toBe('UNTRACKED')
    expect(s.isAvailable).toBe(true)
    expect(s.qty).toBeNull()
  })

  it('stock suffisant → OK', () => {
    const s = stockStatusFor('Coca-Cola 33cl', stock)
    expect(s.status).toBe('OK')
    expect(s.qty).toBe(24)
    expect(s.isAvailable).toBe(true)
  })

  it('stock sous le seuil → LOW mais disponible', () => {
    const s = stockStatusFor('Croque au jambon', stock)
    expect(s.status).toBe('LOW')
    expect(s.isAvailable).toBe(true)
  })

  it('stock épuisé → OUT et indisponible', () => {
    const s = stockStatusFor('Eau minérale', stock)
    expect(s.status).toBe('OUT')
    expect(s.isAvailable).toBe(false)
  })

  it('correspondance insensible à la casse et bidirectionnelle', () => {
    expect(stockStatusFor('JAMBON', stock).tracked).toBe(true)
    // le matching est volontairement flou dans les deux sens
    expect(stockStatusFor('jambon de pays', stock).tracked).toBe(true)
    expect(stockStatusFor('salade', stock).tracked).toBe(false)
  })
})
