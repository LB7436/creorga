import { describe, expect, it } from 'vitest'
import { isPublicLiveChannel, publicFloorInvalidation } from './live-channels'
describe('public realtime subscriptions', () => {
  it('rejects table tracking even with a known company and table', () => { expect(isPublicLiveChannel('table-tenant-a-table-3')).toBe(false) })
  it('rejects private inbox, payments and arbitrary wildcard rooms', () => {
    for (const value of ['inbox-tenant-a', 'payments-tenant-a', '*', 'floor-tenant-a\n', null, {}]) expect(isPublicLiveChannel(value)).toBe(false)
  })
  it('retains bounded public game and floor update signals', () => {
    expect(isPublicLiveChannel('games-tenant-a')).toBe(true); expect(isPublicLiveChannel('floor-tenant-a')).toBe(true)
    expect(isPublicLiveChannel('floor-' + 'a'.repeat(101))).toBe(false)
  })
  it('ferme seulement les scores en profil professionnel', () => {
    expect(isPublicLiveChannel('games-tenant-a', { gamesEnabled: false })).toBe(false)
    expect(isPublicLiveChannel('floor-tenant-a', { gamesEnabled: false })).toBe(true)
  })
  it('le signal public de surveillance ne contient aucune identité ni donnée métier', () => {
    expect(publicFloorInvalidation()).toEqual({ invalidated: true })
    expect(Object.keys(publicFloorInvalidation())).toEqual(['invalidated'])
  })
})
