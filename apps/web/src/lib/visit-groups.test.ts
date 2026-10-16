import { describe, expect, it } from 'vitest'
import { visitForGroup } from './visit-groups'
const visits = [{ id: 'a', tableId: 't', expiresAt: '2099-01-01' }, { id: 'b', tableId: 't', expiresAt: '2099-01-01' }, { id: 'c', tableId: 'other', expiresAt: '2099-01-01' }]
describe('Sélection explicite des groupes QR fusionnés', () => {
  it('ne choisit pas arbitrairement le premier groupe', () => expect(visitForGroup(visits, 't', '')).toBeUndefined())
  it('retrouve uniquement le groupe explicitement sélectionné à cette table', () => {
    expect(visitForGroup(visits, 't', 'b')?.id).toBe('b')
    expect(visitForGroup(visits, 't', 'c')).toBeUndefined()
    expect(visitForGroup([{ ...visits[0], expiresAt: '2000-01-01' }], 't', 'a')).toBeUndefined()
  })
})
