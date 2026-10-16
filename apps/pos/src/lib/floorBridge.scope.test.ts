import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ pos: {} as Record<string, any>, seats: [] as unknown[], company: 'company-a', api: vi.fn() }))
vi.mock('./server', () => ({ api: state.api, sessionCompany: () => state.company, sessionHeaders: () => ({}), clearSession: vi.fn(), setSession: vi.fn(), endSession: vi.fn() }))
vi.mock('../store/posStore', () => ({ usePOS: {
  getState: () => state.pos,
  setState: (value: Record<string, unknown> | ((s: Record<string, any>) => Record<string, unknown>)) => { state.pos = { ...state.pos, ...(typeof value === 'function' ? value(state.pos) : value) } },
  subscribe: () => () => {},
} }))
vi.mock('../store/seatStore', () => ({ useSeats: { getState: () => ({ seats: state.seats }), setState: (value: { seats: unknown[] }) => { state.seats = value.seats }, subscribe: () => () => {} } }))
import { checkoutServer, closeServerDay, startFloorBridge, stopFloorBridge, loadServerState } from './floorBridge'
const fixture = (companyId: string) => ({ companyId, revision: 1, currentStaff: { id: 'owner-' + companyId }, tables: [{ id: 'table-a', covers: [{ id: 'cover-a', items: [{ id: 'line-a', price: 2, qty: 1 }] }] }], editor: {}, ventes: [], clotures: [], seats: [] })
const values = new Map<string, string>()
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { promise, resolve } }
beforeEach(async () => {
  values.clear(); state.api.mockReset(); state.company = 'company-a'; state.pos = fixture(state.company); state.seats = []
  vi.stubGlobal('window', { dispatchEvent: vi.fn(), confirm: () => false })
  vi.stubGlobal('localStorage', storage)
  state.api.mockResolvedValue(fixture(state.company))
  await startFloorBridge()
})
afterEach(() => { stopFloorBridge(); vi.unstubAllGlobals() })
describe('POS asynchronous operation scope', () => {
  it('keeps an old pending payment under its old account and rejects its late result', async () => {
    const sale = deferred<unknown>(); state.api.mockImplementation((path: string) => path === '/pos/checkout' ? sale.promise : Promise.resolve(fixture(state.company)))
    const operation = checkoutServer('table-a', 'cash', 0, ['cover-a'], {}, 2, 2)
    await vi.waitFor(() => expect(state.api.mock.calls.some(([path]) => path === '/pos/checkout')).toBe(true))
    stopFloorBridge(); state.company = 'company-b'; state.pos = fixture(state.company)
    sale.resolve({ id: 'sale-a', numero: 1, total: 2, coverIds: ['cover-a'] })
    await expect(operation).rejects.toThrow('session de caisse a changé')
    expect(state.pos.companyId).toBe('company-b'); expect(state.pos.ventes).toEqual([])
    expect([...values.keys()]).toContain('creorga-pos-pending:company-a:owner-company-a:table-a')
    expect(state.api.mock.calls.filter(([path]) => String(path).startsWith('/pos/sales/'))).toHaveLength(0)
  })
  it('cannot apply the previous account closure to a newly connected company', async () => {
    const closing = deferred<unknown>(); state.api.mockImplementation((path: string) => path === '/pos/close' ? closing.promise : Promise.resolve(fixture(state.company)))
    const operation = closeServerDay()
    await vi.waitFor(() => expect(state.api.mock.calls.some(([path]) => path === '/pos/close')).toBe(true))
    stopFloorBridge(); state.company = 'company-b'; state.pos = fixture(state.company)
    closing.resolve({ id: 'close-a' })
    await expect(operation).rejects.toThrow('session de caisse a changé')
    expect(state.pos.clotures).toEqual([])
    expect([...values.keys()]).toContain('creorga-pos-close:company-a:owner-company-a')
  })
  it('refuses a bootstrap with an inconsistent company instead of showing its data', async () => {
    state.api.mockResolvedValue(fixture('company-b'))
    await expect(loadServerState()).rejects.toThrow('autre établissement')
    expect(state.pos.companyId).toBe('company-a')
  })
})
