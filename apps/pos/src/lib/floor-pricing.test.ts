import { describe, expect, it } from 'vitest'
import { reconcileDraftPricing } from './floor-pricing'
describe('Réconciliation des tarifs de brouillon', () => {
  it('adopte le prix serveur sans perdre quantité/note/modification concurrente et nouveau produit local', () => {
    const draft = { tables: [{ covers: [{ items: [{ id: 'a', qty: 3, note: 'Saisie pendant la requête', price: 0.01 }, { id: 'b', price: 4 }] }] }], seats: [] }
    const merged = reconcileDraftPricing(draft, { posPricing: { a: { name: 'Café', productId: 'p', priceCents: 1170, taxRate: 17, status: 'confirmed', source: 'catalog' } } })
    expect(merged.tables[0].covers[0].items[0]).toMatchObject({ qty: 3, note: 'Saisie pendant la requête', price: 11.7, taxRate: 17 })
    expect(merged.tables[0].covers[0].items[1]).toEqual({ id: 'b', price: 4 })
    expect(draft.tables[0].covers[0].items[0].price).toBe(0.01)
  })
})
