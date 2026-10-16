import { describe, expect, it } from 'vitest'
import { syncKitchenTickets } from './kitchen-tickets'
describe('Tickets cuisine réels', () => {
  it('un déplacement graphique conserve les 300 préparations sans reparcourir tout le journal pour chaque groupe', () => {
    let coverReads = 0
    const floor: any = { kitchenTickets: {} }
    const tables = [{ name: 'Salle déplacée', covers: Array.from({ length: 300 }, (_, i) => {
      const id = `groupe-${i}`, items = [{ id: `ligne-${i}`, name: 'Café', qty: 1, note: '' }]
      floor.kitchenTickets[id] = { id, get coverId() { coverReads++; return id }, tableName: 'Ancien nom', items, lastRequested: items, status: 'served', createdAt: 10, updatedAt: 11, actorId: 'origine' }
      return { id, label: id, items }
    }) }]
    const active = syncKitchenTickets(floor, tables, 'responsable', 20)
    expect(active.size).toBe(300)
    expect(Object.keys(floor.kitchenTickets)).toHaveLength(300)
    for (const ticket of Object.values(floor.kitchenTickets) as any[]) expect(ticket).toMatchObject({ tableName: 'Salle déplacée', status: 'served', createdAt: 10, updatedAt: 11, actorId: 'origine' })
    expect(coverReads, 'Le travail doit être linéaire dans le journal, pas groupes × journal').toBeLessThanOrEqual(1200)
  })
  it('une quantité ajoutée ne relance pas les boissons déjà préparées', () => {
    const floor: any = {}, tables = [{ name: 'T3', covers: [{ id: 'c3', label: 'C3', items: [{ id: 'ligne', name: 'Café', qty: 1, note: '' }] }] }]
    syncKitchenTickets(floor, tables, 'a', 10)
    floor.kitchenTickets.c3.status = 'served'
    tables[0].covers[0].items[0].qty = 3
    syncKitchenTickets(floor, tables, 'b', 11)
    expect(floor.kitchenTickets.c3.status).toBe('served')
    const pending: any[] = Object.values(floor.kitchenTickets).filter((t: any) => t.status === 'waiting')
    expect(pending).toHaveLength(1)
    expect(pending[0].items[0].qty).toBe(2)
    syncKitchenTickets(floor, tables, 'b', 12)
    expect(Object.keys(floor.kitchenTickets)).toHaveLength(2)
  })
  it('conserve le ticket initial et ajoute une correction distincte si son contenu change', () => {
    const floor: any = {}
    const tables = [{ name: 'T1', covers: [{ id: 'c1', label: 'C1', items: [{ id: 'i', name: 'Café', qty: 1, note: 'Sans sucre' }] }] }]
    syncKitchenTickets(floor, tables, 'a', 10)
    floor.kitchenTickets.c1.status = 'ready'
    syncKitchenTickets(floor, tables, 'a', 11)
    expect(floor.kitchenTickets.c1.status).toBe('ready')
    syncKitchenTickets(floor, [], 'a', 12)
    expect(floor.kitchenTickets.c1.items[0].qty).toBe(1)
    tables[0].covers[0].items[0].qty = 2
    syncKitchenTickets(floor, tables, 'a', 13)
    expect(floor.kitchenTickets.c1.status).toBe('ready')
    expect(floor.kitchenTickets.c1.createdAt).toBe(10)
    expect(Object.values(floor.kitchenTickets).some((t: any) => t.status === 'waiting' && t.items[0].qty === 1)).toBe(true)
  })
  it('une portion supprimée après séparation produit une correction, mais un règlement ne retire pas la préparation', () => {
    const floor: any = { kitchenBaselines: { fragment: [{ id: 'split-line', name: 'Café', qty: 1, note: 'Bar sans sucre' }] }, kitchenTickets: { original: { id: 'original', coverId: 'source', tableName: 'T3', status: 'ready', items: [{ id: 'line', name: 'Café', qty: 3, note: '' }], preserveAfterMove: true, routing: [{ coverId: 'fragment', tableName: 'T4' }] } } }
    const settled = structuredClone(floor)
    syncKitchenTickets(floor, [], 'owner', 20)
    expect(Object.values(floor.kitchenTickets).filter((t: any) => t.status === 'waiting')).toEqual([expect.objectContaining({ items: [expect.objectContaining({ id: 'split-line', qty: -1, correction: true })] })])
    syncKitchenTickets(floor, [], 'owner', 21)
    expect(Object.keys(floor.kitchenTickets)).toHaveLength(2)
    syncKitchenTickets(settled, [], 'owner', 20, new Set(['fragment']))
    expect(Object.keys(settled.kitchenTickets)).toHaveLength(1)
    expect(settled.kitchenTickets.original.status).toBe('ready')
  })
})
