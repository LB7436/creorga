import { describe, expect, it } from 'vitest'
import { projectFloorBusiness, projectFloorEditor } from './floor-business-projection'

const line = (id: string, price = 5) => ({ id, name: 'Fictif', productId: 'product-a', menuItemId: 'product-a', price, qty: 1, addedAt: 123, note: '', coverId: 'open-cover' })
const quote = (priceCents: number) => ({ version: 1, status: 'confirmed', source: 'catalog', productId: 'product-a', name: 'Fictif', priceCents, taxRate: 17, quotedAt: 123 })
function fixture() {
  return { tables: [{ id: 'table-a', name: 'Table', shape: 'round', seats: 2, x: 0, y: 0, section: 'Salle', status: 'OCCUPEE',
    items: [line('open'), line('consumed', 900)], posCovers: [
      { id: 'open-cover', label: 'Ouvert', items: [line('open'), line('consumed', 900)] },
      { id: 'paid-cover', label: 'Payé', paidAt: 123, paidMethod: 'card', items: [line('paid', 800)] },
      { id: 'paid-in-db', label: 'Payé DB', items: [line('paid-db', 700)] },
    ] }], chairs: [{ id: 'chair-a', label: 'Chaise', tableId: 'table-a', createdAt: 123, items: [line('chair-open'), line('consumed-chair', 600)] }],
    zones: [{ id: 'Salle', name: 'Salle' }], photos: [], updatedAt: 456, storageAuthority: 'postgres',
    posPricing: { open: quote(500), consumed: quote(90000), paid: quote(80000), 'paid-db': quote(70000), 'chair-open': quote(500), 'consumed-chair': quote(60000), ancient: quote(99999) },
    lineOrigins: { open: 'qr-original', paid: 'paid-origin', ancient: 'ancient-origin' },
    kitchenTickets: { old: { status: 'served', total: 99999 } }, kitchenBaselines: { old: [line('ancient', 999)] }, unexpectedFinance: { revenue: 99999 },
    posEditor: { rooms: [], fixtures: [], background: null, scenes: [{ id: 'scene-a', label: 'Historique', createdAt: 123, rooms: [], fixtures: [],
      tables: [{ id: 'old-table', name: 'Table', shape: 'round', seats: 2, x: 0, y: 0, section: 'Salle', status: 'occupied', mergedWith: [],
        customerId: 'old-client', orderDiscount: { type: 'amount', value: 900 }, covers: [{ id: 'old-cover', label: 'Ancien', items: [line('old-line', 900)] }] }] }] } }
}

describe('DTO salle métier sans historique financier', () => {
  it('omet payés, consommés et registres historiques sans modifier le plan enregistré', () => {
    const floor = fixture(), before = structuredClone(floor)
    const projected = projectFloorBusiness(floor, { paidCoverIds: new Set(['paid-in-db']), consumedLineIds: new Set(['consumed', 'consumed-chair']) })
    expect(projected.tables[0].items.map((item: any) => item.id)).toEqual(['open'])
    expect(projected.tables[0].posCovers.map((cover: any) => cover.id)).toEqual(['open-cover'])
    expect(projected.chairs[0].items.map((item: any) => item.id)).toEqual(['chair-open'])
    expect(Object.keys(projected.posPricing)).toEqual(['open', 'chair-open'])
    expect(projected).not.toHaveProperty('kitchenTickets'); expect(projected).not.toHaveProperty('kitchenBaselines'); expect(projected).not.toHaveProperty('unexpectedFinance')
    expect(floor).toEqual(before)
  })
  it('conserve prix et provenance requis pour les lignes actives ERP/POS', () => {
    const projected = projectFloorBusiness(fixture(), { paidCoverIds: new Set(['paid-in-db']), consumedLineIds: new Set(['consumed', 'consumed-chair']) })
    expect(projected.updatedAt).toBe(456)
    expect(projected.lineOrigins).toEqual({ open: 'qr-original' })
    expect(projected.posPricing.open).toMatchObject({ priceCents: 500, taxRate: 17, source: 'catalog', productId: 'product-a' })
    expect(projected.tables[0].items[0].addedAt).toBe(123)
    expect(projected.storageAuthority).toBe('postgres')
  })
  it('les scènes ne contiennent que la géométrie et des groupes vides', () => {
    const original = fixture().posEditor, before = structuredClone(original), editor = projectFloorEditor(original)
    expect(editor.scenes[0].tables[0]).toMatchObject({ id: 'old-table', x: 0, y: 0, status: 'available', covers: [], mergedWith: [] })
    expect(editor.scenes[0].tables[0]).not.toHaveProperty('customerId')
    expect(editor.scenes[0].tables[0]).not.toHaveProperty('orderDiscount')
    expect(JSON.stringify(editor)).not.toContain('old-line')
    expect(original).toEqual(before)
  })
  it('un ancien couvert implicite réglé ne réexpose pas ses lignes ni ses prix', () => {
    const floor: any = fixture()
    delete floor.tables[0].posCovers
    floor.tables[0].openedAt = 42
    const projected = projectFloorBusiness(floor, { paidCoverIds: new Set(['table-table-a-42']) })
    expect(projected.tables[0].items).toEqual([])
    expect(projected.posPricing).not.toHaveProperty('open')
    expect(projected.lineOrigins).not.toHaveProperty('open')
  })
})
