import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({ states: [] as any[], warnings: [] as any[] }))
vi.mock('../routes/floorState', () => ({ getLoadedFloorStates: () => fixture.states }))
vi.mock('../lib/logger', () => ({ default: { warn: (...args: any[]) => fixture.warnings.push(args) } }))
import { findStaleSessions, startStaleSessionJanitor, stopStaleSessionJanitor } from './closeStaleFloorSessions'

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-17T18:00:00Z'))
  fixture.warnings = []
  fixture.states = [{ companyId: 'fixture-company-a', state: {
    tables: [{ id: 'PRIVATE_TABLE_ID', status: 'OCCUPEE', openedAt: Date.now() - 9 * 3_600_000,
      items: [{ id: 'PRIVATE_LINE', price: 12.5, qty: 2 }] }],
    chairs: [{ id: 'PRIVATE_CHAIR', tableId: 'PRIVATE_TABLE_ID', items: [{ price: 20, qty: 1 }] }],
  } }]
})
afterEach(() => { stopStaleSessionJanitor(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('Surveillance des tables anciennes : invalidation publique sans informations financières', () => {
  it('émet seulement une invalidation après cinq secondes et ne modifie aucune addition', async () => {
    const broadcast = vi.fn(); vi.stubGlobal('liveBroadcast', broadcast)
    const before = JSON.stringify(fixture.states)
    expect(findStaleSessions(fixture.states[0].state)[0].unpaidTotal).toBe(45)
    startStaleSessionJanitor()
    await vi.advanceTimersByTimeAsync(5000)
    expect(broadcast).toHaveBeenCalledExactlyOnceWith('floor-fixture-company-a', 'floor-updated', { invalidated: true })
    expect(JSON.stringify(broadcast.mock.calls)).not.toMatch(/PRIVATE_|unpaidTotal|hoursOpen|sessions/)
    expect(JSON.stringify(fixture.warnings)).not.toMatch(/PRIVATE_|unpaidTotal|hoursOpen/)
    expect(JSON.stringify(fixture.states)).toBe(before)
  })

  it('ne signale pas les tables récentes et arrête complètement les émissions au stop', async () => {
    const broadcast = vi.fn(); vi.stubGlobal('liveBroadcast', broadcast)
    fixture.states[0].state.tables[0].openedAt = Date.now() - 3_600_000
    startStaleSessionJanitor(); await vi.advanceTimersByTimeAsync(5000)
    expect(broadcast).not.toHaveBeenCalled()
    fixture.states[0].state.tables[0].openedAt = Date.now() - 9 * 3_600_000
    stopStaleSessionJanitor(); await vi.advanceTimersByTimeAsync(30 * 60_000)
    expect(broadcast).not.toHaveBeenCalled()
  })

  it('une panne du diffuseur ne journalise pas son erreur potentiellement privée', async () => {
    vi.stubGlobal('liveBroadcast', () => { throw Error('PRIVATE_PAYLOAD_OR_CREDENTIAL') })
    startStaleSessionJanitor(); await vi.advanceTimersByTimeAsync(5000)
    expect(fixture.warnings.length).toBeGreaterThan(0)
    expect(JSON.stringify(fixture.warnings)).not.toMatch(/PRIVATE_|unpaidTotal|hoursOpen/)
    expect(fixture.warnings.every(args => args.length === 1)).toBe(true)
  })
})
