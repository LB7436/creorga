import { describe, it, expect } from 'vitest'
import { floorSchema, protectedFloorFieldsChanged } from './floor-validation'
const base = { tables: [], chairs: [], photos: [], zones: [], updatedAt: 1 }
describe('Validation du plan partagé', () => {
  it('accepte une société neuve et refuse des collections mal formées', () => {
    expect(floorSchema.safeParse(base).success).toBe(true)
    expect(floorSchema.safeParse({ ...base, tables: {} }).success).toBe(false)
    expect(floorSchema.safeParse({ ...base, zones: [{ id: 'a', name: 'A' }, { id: 'a', name: 'B' }] }).success).toBe(false)
  })
  it('refuse une image active et une chaise sans table', () => {
    expect(floorSchema.safeParse({ ...base, globalBackground: 'javascript:alert(1)' }).success).toBe(false)
    expect(floorSchema.safeParse({ ...base, chairs: [{ id: 'c', tableId: 'absente', label: 'C', items: [] }] }).success).toBe(false)
  })
  it('ne permet pas de déclarer un couvert payé par import', () => {
    expect(protectedFloorFieldsChanged(base, { tables: [{ id: 't', posCovers: [{ id: 'c', paidAt: 1 }] }] })).toBe(true)
    expect(protectedFloorFieldsChanged(base, { kitchenTickets: {} })).toBe(true)
    expect(protectedFloorFieldsChanged(base, { tables: [] })).toBe(false)
  })
})
