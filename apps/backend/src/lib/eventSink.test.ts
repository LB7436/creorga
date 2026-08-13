import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const createMany = vi.fn()
vi.mock('./prisma', () => ({
  default: {
    activityEvent: { createMany: (...a: any[]) => createMany(...a) },
    loginEvent: { createMany: (...a: any[]) => createMany(...a) },
    errorLog: { createMany: (...a: any[]) => createMany(...a) },
  },
}))
vi.mock('./logger', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { push, flush, _reinitialiserPourTests } from './eventSink'

describe('eventSink', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    createMany.mockReset()
    createMany.mockResolvedValue({ count: 1 })
    _reinitialiserPourTests()
  })
  afterEach(() => {
    vi.useRealTimers()
    _reinitialiserPourTests()
  })

  it("n'écrit rien immédiatement, puis vide le lot après 2 s", async () => {
    push('activityEvent', { module: 'crm', method: 'POST', path: '/api/crm/customers', status: 201 })
    push('activityEvent', { module: 'hr', method: 'GET', path: '/api/hr/team', status: 200 })
    expect(createMany).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2100)

    expect(createMany).toHaveBeenCalledTimes(1)
    const args = createMany.mock.calls[0][0]
    expect(args.data).toHaveLength(2)
    expect(args.skipDuplicates).toBe(true)
  })

  it('un échec Prisma est journalisé et le lot remis en tampon — jamais de throw', async () => {
    createMany.mockRejectedValueOnce(new Error("Can't reach database server"))
    push('loginEvent', { kind: 'LOGIN', userId: 'u1' })

    await vi.advanceTimersByTimeAsync(2100)
    expect(createMany).toHaveBeenCalledTimes(1)

    // Le lot remis en tampon repart au vidage suivant.
    createMany.mockResolvedValueOnce({ count: 1 })
    await flush()
    expect(createMany).toHaveBeenCalledTimes(2)
    expect(createMany.mock.calls[1][0].data).toHaveLength(1)
  })

  it('flush explicite (arrêt du service) vide les tampons sans attendre le minuteur', async () => {
    push('errorLog', { message: 'boom' })
    await flush()
    expect(createMany).toHaveBeenCalledTimes(1)

    // Rien à réécrire au vidage suivant.
    await flush()
    expect(createMany).toHaveBeenCalledTimes(1)
  })

  it('push ne lève jamais, même après saturation du tampon', () => {
    for (let i = 0; i < 6000; i++) push('activityEvent', { i })
    expect(() => push('activityEvent', { i: 6001 })).not.toThrow()
  })
})
