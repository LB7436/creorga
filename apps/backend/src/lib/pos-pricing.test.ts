import { describe, expect, it } from 'vitest'
import { canonicalizeFloorPricing, floorLines, pricedItem } from './pos-pricing'
const empty = () => ({ tables: [{ id: 'table', items: [] }], chairs: [] })
const line = (id = 'line') => ({ id, menuItemId: 'product', name: 'Prix navigateur falsifié', price: 0.01, qty: 1 })
const catalog = [{ id: 'product', name: 'Café', price: 11.7, taxRate: 17, isActive: true }]
function fresh() { const draft: any = empty(); draft.tables[0].items.push(line()); canonicalizeFloorPricing(empty(), draft, catalog, 100); return draft }

describe('Prix POS figés par le serveur', () => {
  it('résout les nouvelles lignes dans le catalogue et ignore prix, nom et taux clients', () => {
    const draft = fresh()
    expect(draft.tables[0].items[0]).toMatchObject({ name: 'Café', price: 11.7, taxRate: 17, pricingStatus: 'confirmed' })
    expect(draft.posPricing.line).toMatchObject({ priceCents: 1170, source: 'catalog', quotedAt: 100 })
  })
  it('préserve nom, prix et TVA malgré modification ou désactivation du catalogue', () => {
    const before = fresh(), draft = structuredClone(before)
    draft.tables[0].items[0].price = 0.01
    canonicalizeFloorPricing(before, draft, [{ ...catalog[0], price: 20, taxRate: 3, name: 'Autre', isActive: false }])
    expect(pricedItem(draft, draft.tables[0].items[0])).toMatchObject({ name: 'Café', price: 11.7, taxRate: 17 })
  })
  it('refuse le remplacement de produit, le produit étranger et les nouveaux produits inactifs', () => {
    const before = fresh(), draft = structuredClone(before)
    draft.tables[0].items[0].menuItemId = 'autre'
    expect(() => canonicalizeFloorPricing(before, draft, catalog)).toThrow(/remplacé/)
    expect(() => canonicalizeFloorPricing(empty(), { tables: [{ items: [line()] }], chairs: [] }, [])).toThrow(/non vérifié/)
    expect(() => canonicalizeFloorPricing(empty(), { tables: [{ items: [line()] }], chairs: [] }, [{ ...catalog[0], isActive: false }])).toThrow(/non vérifié/)
  })
  it('n’invente pas la TVA absente des anciennes lignes et préserve leur prix observé', () => {
    const before: any = empty(); before.tables[0].items.push({ ...line(), price: 9.99 })
    const draft = structuredClone(before)
    canonicalizeFloorPricing(before, draft, catalog)
    expect(draft.posPricing.line).toMatchObject({ status: 'review', priceCents: 999, source: 'legacy-unverified' })
    expect(draft.posPricing.line.taxRate).toBeUndefined()
  })
  it('garde le gel lors d’un transfert table vers chaise sans compter deux fois un miroir', () => {
    const before = fresh(), draft = structuredClone(before)
    draft.chairs = [{ items: draft.tables[0].items }]; draft.tables[0].items = []
    canonicalizeFloorPricing(before, draft)
    expect(floorLines(draft)).toHaveLength(1)
    expect(draft.chairs[0].items[0].price).toBe(11.7)
  })
  it('refuse les doublons et la réintroduction d’une référence retirée dans une nouvelle session', () => {
    const before = fresh(), draft = structuredClone(before)
    draft.chairs = [{ items: [structuredClone(draft.tables[0].items[0])] }]
    expect(() => canonicalizeFloorPricing(before, draft)).toThrow(/deux additions/)
    const removed = structuredClone(before); removed.tables[0].items = []
    canonicalizeFloorPricing(before, removed)
    const reintroduced = structuredClone(removed); reintroduced.tables[0].items.push(line())
    expect(() => canonicalizeFloorPricing(removed, reintroduced, catalog)).toThrow(/déjà été retirée/)
  })
  it('autorise la baisse de quantité mais refuse un ajout au tarif ancien après changement', () => {
    const before = fresh(), draft = structuredClone(before); draft.tables[0].items[0].qty = 2
    expect(() => canonicalizeFloorPricing(before, draft, [{ ...catalog[0], price: 15 }])).toThrow(/tarif/)
    canonicalizeFloorPricing(before, draft, catalog)
    expect(draft.tables[0].items[0].qty).toBe(2)
  })
  it('permet une nouvelle ligne au nouveau tarif sans réévaluer la précédente', () => {
    const before = fresh(), draft = structuredClone(before); draft.tables[0].items.push(line('new'))
    canonicalizeFloorPricing(before, draft, [{ ...catalog[0], price: 12, taxRate: 3 }])
    expect(draft.tables[0].items.map((i: any) => [i.price, i.taxRate])).toEqual([[11.7, 17], [12, 3]])
  })
  it('ignore aussi un registre falsifié directement à l’entrée du helper', () => {
    const before = fresh(), draft = structuredClone(before)
    draft.posPricing.line = { ...draft.posPricing.line, priceCents: 1, taxRate: 0 }
    canonicalizeFloorPricing(before, draft, catalog)
    expect(draft.posPricing.line.priceCents).toBe(1170)
    const added: any = empty(); added.tables[0].items.push(line())
    added.posPricing = { line: { ...draft.posPricing.line, priceCents: 1 } }
    canonicalizeFloorPricing(empty(), added, catalog)
    expect(added.posPricing.line.priceCents).toBe(1170)
  })
})
