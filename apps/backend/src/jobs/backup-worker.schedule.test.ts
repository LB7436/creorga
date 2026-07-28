import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Phase 3.2 — la planification du worker de sauvegarde n'avait jamais ete
 * verifiee (RAPPORT-AUDIT.md §6). On l'eprouve avec des timers simules :
 * snapshot 60 s apres le boot, puis interval de 6 h, sans double
 * planificateur si startBackupWorker est appele plusieurs fois.
 */

vi.mock('../lib/logger', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

describe('startBackupWorker — planification', () => {
  let startBackupWorker: () => void
  let stopBackupWorker: () => void

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.resetModules()
    const mod = await import('./backup-worker')
    startBackupWorker = mod.startBackupWorker
    stopBackupWorker = mod.stopBackupWorker
  })

  afterEach(() => {
    stopBackupWorker()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('programme un premier snapshot 60 s apres le demarrage', () => {
    const timeout = vi.spyOn(global, 'setTimeout')
    startBackupWorker()

    const delays = timeout.mock.calls.map((c) => c[1])
    expect(delays).toContain(60_000)
  })

  it('programme un interval de 6 h exactement (ni 6 min, ni 24 h)', () => {
    const interval = vi.spyOn(global, 'setInterval')
    startBackupWorker()

    expect(interval).toHaveBeenCalledTimes(1)
    expect(interval.mock.calls[0][1]).toBe(SIX_HOURS_MS)
    expect(interval.mock.calls[0][1]).toBe(21_600_000)
  })

  it('est idempotent : trois appels ne creent pas trois planificateurs', () => {
    const interval = vi.spyOn(global, 'setInterval')
    startBackupWorker()
    startBackupWorker()
    startBackupWorker()

    expect(interval).toHaveBeenCalledTimes(1)
  })

  it('stopBackupWorker annule la planification et autorise un redemarrage', () => {
    const interval = vi.spyOn(global, 'setInterval')
    const clear = vi.spyOn(global, 'clearInterval')

    startBackupWorker()
    stopBackupWorker()
    expect(clear).toHaveBeenCalledTimes(1)

    startBackupWorker()
    expect(interval).toHaveBeenCalledTimes(2)
  })
})
