import { describe, expect, it, vi } from 'vitest'
import { assertJsonValue, collectSnapshot as captureSnapshot, decryptSnapshot, encryptSnapshot, isRecoveryKey, readOfflineQueue, readRecoveryCaches, type StorageReader, type QueueSnapshot } from '../../../../shared/browser-recovery/archive'

const collectSnapshot = (storage: StorageReader, origin: string, readQueue: () => Promise<QueueSnapshot>) => captureSnapshot(storage, origin, readQueue, async () => [])

function storage(values: Record<string, string>): StorageReader {
  return { get length() { return Object.keys(values).length }, key: i => Object.keys(values)[i] ?? null, getItem: key => values[key] ?? null }
}
const emptyQueue = async () => ({ state: 'absent' as const, records: [] })
const raw = '{"state":{"ventes":[{"id":"sale","total":11.7}],"clotures":[{"ventes":[{"id":"old-sale","total":42}]}],"staff":[{"pin":"fixture-only"}]},"version":2}'

describe('browser recovery is a private copy, never a migration', () => {
  it('selects only historical business keys, not current login credentials', () => {
    expect(isRecoveryKey('auth-store')).toBe(false)
    expect(isRecoveryKey('creorga-pos-v2')).toBe(true)
    expect(isRecoveryKey('creorga-pos-pending:co:staff:table')).toBe(true)
    expect(isRecoveryKey('creorga-floor-tables')).toBe(true)
  })
  it('preserves raw legacy bytes including sales in closed shifts, no invented payment', async () => {
    const values = { 'creorga-pos-v2': raw, 'auth-store': 'SECRET-NOT-EXPORTED' }
    const snapshot = await collectSnapshot(storage(values), 'http://localhost:5175', emptyQueue)
    expect(snapshot.localStorage).toHaveLength(1)
    expect(snapshot.localStorage[0].raw).toBe(raw)
    expect(values['creorga-pos-v2']).toBe(raw)
    expect(snapshot.automaticallyImported).toBe(false)
  })
  it('preserves malformed JSON without silently repairing it', async () => {
    const result = await collectSnapshot(storage({ 'creorga-pos-v2': '{ broken' }), 'http://localhost:5175', emptyQueue)
    expect(result.localStorage[0].raw).toBe('{ broken')
  })
  it('rejects concurrent changes rather than claim a stable snapshot', async () => {
    const values = { 'creorga-pos-v2': raw }
    await expect(collectSnapshot(storage(values), 'http://localhost:5175', async () => {
      values['creorga-pos-v2'] = 'changed'; return emptyQueue()
    })).rejects.toThrow('modifiées')
  })
  it('encrypts all business contents and can verify exact roundtrip', async () => {
    const snapshot = await collectSnapshot(storage({ 'creorga-pos-v2': raw }), 'http://localhost:5175', async () => ({
      state: 'present', records: [{ key: 'queue-id', value: { url: '/orders', options: { headers: { Authorization: 'fixture-only-token' } } } }],
    }))
    const result = await encryptSnapshot(snapshot)
    expect(result.archive).not.toContain('fixture-only')
    expect(result.archive).not.toContain('localhost')
    expect(result.archive).not.toContain('clotures')
    expect(await decryptSnapshot(result.archive, result.recoveryKey)).toEqual(snapshot)
  })
  it('uses different key, nonce and identity for each export', async () => {
    const snapshot = await collectSnapshot(storage({}), 'http://localhost:5175', emptyQueue)
    const a = await encryptSnapshot(snapshot), b = await encryptSnapshot(snapshot)
    expect(JSON.parse(a.archive).iv).not.toBe(JSON.parse(b.archive).iv)
    expect(JSON.parse(a.recoveryKey).key).not.toBe(JSON.parse(b.recoveryKey).key)
    await expect(decryptSnapshot(a.archive, b.recoveryKey)).rejects.toThrow('incompatibles')
  })
  it('rejects altered ciphertext', async () => {
    const snapshot = await collectSnapshot(storage({}), 'http://localhost:5175', emptyQueue)
    const bundle = await encryptSnapshot(snapshot), archive = JSON.parse(bundle.archive)
    archive.ciphertext = (archive.ciphertext[0] === 'A' ? 'B' : 'A') + archive.ciphertext.slice(1)
    await expect(decryptSnapshot(JSON.stringify(archive), bundle.recoveryKey)).rejects.toThrow()
  })
  it('checks per-record hashes, not just encryption', async () => {
    const snapshot = await collectSnapshot(storage({ 'creorga-pos-v2': raw }), 'http://localhost:5175', emptyQueue)
    snapshot.localStorage[0].raw = 'changed'
    const bundle = await encryptSnapshot(snapshot)
    await expect(decryptSnapshot(bundle.archive, bundle.recoveryKey)).rejects.toThrow('Empreinte')
  })
  it('refuses lossy IndexedDB types instead of silently discarding values', () => {
    expect(() => assertJsonValue(new Date())).toThrow('format')
    expect(() => assertJsonValue(Array(1))).toThrow('incomplet')
    expect(() => assertJsonValue(-0)).toThrow('format')
    expect(() => assertJsonValue({ value: undefined })).toThrow('format')
    expect(() => assertJsonValue({ nested: [null, 1, 'x'] })).not.toThrow()
  })
  it('does not create an absent IndexedDB database', async () => {
    const open = vi.fn()
    const factory = { databases: async () => [], open } as unknown as IDBFactory
    expect(await readOfflineQueue(factory)).toEqual({ state: 'absent', records: [] })
    expect(open).not.toHaveBeenCalled()
  })
  it('does not silently claim absence when database enumeration is unavailable', async () => {
    await expect(readOfflineQueue({} as IDBFactory)).rejects.toThrow('indisponible')
  })
  it('refuses file origin instead of exporting from the wrong storage', async () => {
    await expect(collectSnapshot(storage({}), 'null', emptyQueue)).rejects.toThrow('adresse exacte')
  })
  it('preserves service-worker queues and cached API bytes, not application assets', async () => {
    const factory = cacheFixture()
    const results = await readRecoveryCaches(factory, 'http://localhost:5175')
    expect(results.map(r => new URL(r.url).pathname)).toEqual(['/__queue__', '/api/orders'])
    expect(atob(results[0].bodyBase64)).toBe('[{"url":"/orders","body":"fixture"}]')
    const snapshot = await captureSnapshot(storage({}), 'http://localhost:5175', emptyQueue, async () => results)
    const bundle = await encryptSnapshot(snapshot)
    expect(await decryptSnapshot(bundle.archive, bundle.recoveryKey)).toEqual(snapshot)
    expect(bundle.archive).not.toContain('/api/orders')
  })
  it('refuses cache mutations rather than validating an incomplete copy', async () => {
    let calls = 0
    const factory = cacheFixture(() => ++calls > 1 ? 'changed' : '[{"url":"/orders","body":"fixture"}]')
    await expect(readRecoveryCaches(factory, 'http://localhost:5175')).rejects.toThrow('modifié')
  })
  it('does not create a cache when there are none to preserve', async () => {
    const open = vi.fn()
    expect(await readRecoveryCaches({ keys: async () => [], open } as unknown as CacheStorage, 'http://localhost:5175')).toEqual([])
    expect(open).not.toHaveBeenCalled()
  })
  it('closes the database and rejects a transaction-construction error', async () => {
    const close = vi.fn()
    const request: { onsuccess?: () => void; result: unknown } = { result: {
      objectStoreNames: { contains: () => true }, close, transaction: () => { throw new Error('database unavailable') },
    } }
    const factory = { databases: async () => [{ name: 'creorga-offline' }], open: () => {
      queueMicrotask(() => request.onsuccess?.()); return request
    } } as unknown as IDBFactory
    await expect(readOfflineQueue(factory)).rejects.toThrow('impossible')
    expect(close).toHaveBeenCalledOnce()
  })
})

function cacheFixture(queue = () => '[{"url":"/orders","body":"fixture"}]'): CacheStorage {
  return {
    keys: async () => ['creorga-v1-api'], has: async () => true,
    open: async () => ({
      keys: async () => [new Request('http://localhost:5175/__queue__'), new Request('http://localhost:5175/api/orders'), new Request('http://localhost:5175/assets/app.js')],
      match: async (request: Request) => new Response(new URL(request.url).pathname === '/__queue__' ? queue() : 'fixture-response'),
    }),
  } as unknown as CacheStorage
}
