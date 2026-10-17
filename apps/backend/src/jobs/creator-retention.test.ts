import { afterEach, describe, expect, it, vi } from 'vitest'
const store = vi.hoisted(() => ({ deleted: 0 }))
vi.mock('../lib/prisma', () => {
  const table = { deleteMany: () => { store.deleted++; return Promise.resolve({ count: 1 }) } }
  return { default: { activityEvent: table, loginEvent: table, errorLog: table, opportunity: table, creatorRefreshToken: table,
    $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations) } }
})
vi.mock('../lib/logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))
import { purgerRetention, startCreatorRetention, stopCreatorRetention } from './creator-retention'

afterEach(() => { stopCreatorRetention(); vi.useRealTimers(); vi.unstubAllEnvs(); store.deleted = 0 })
describe('gel rétention créateur', () => {
  it('l’appel direct ne supprime aucune ligne même avec toutes les variables legacy d’activation', async () => {
    vi.stubEnv('CREORGA_BUSINESS_ONLY', 'false')
    vi.stubEnv('CREORGA_ALLOW_BACKUP_DELETION', 'true')
    vi.stubEnv('CREORGA_BACKUP_RETENTION_APPROVED', 'true')
    vi.stubEnv('CREORGA_RETENTION_ENABLED', 'true')
    vi.stubEnv('CREORGA_CREATOR_RETENTION_ENABLED', 'true')
    expect(await purgerRetention()).toEqual({ activityEvents: 0, loginEvents: 0, errorLogs: 0, opportunites: 0, refreshTokens: 0 })
    expect(store.deleted).toBe(0)
  })
  it('le démarrage direct n’installe aucun nettoyage différé', async () => {
    vi.useFakeTimers()
    startCreatorRetention()
    await vi.advanceTimersByTimeAsync(25 * 60 * 60 * 1000)
    expect(store.deleted).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})
