import { describe, expect, it } from 'vitest'
import { syncKitchenTickets } from './kitchen-tickets'
describe('Tickets cuisine réels', () => {
  it('conserve un ticket après paiement et réouvre sa préparation si son contenu change', () => {
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
    expect(floor.kitchenTickets.c1.status).toBe('waiting')
    expect(floor.kitchenTickets.c1.createdAt).toBe(10)
  })
})
