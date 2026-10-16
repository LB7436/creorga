import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ pos: {} as Record<string, any>, seats: [] as unknown[], company: 'company-a', api: vi.fn() }))
vi.mock('./server', () => ({ api: state.api, sessionCompany: () => state.company, sessionHeaders: () => ({}), clearSession: vi.fn(), setSession: vi.fn(), endSession: vi.fn() }))
vi.mock('../store/posStore', () => ({ usePOS: {
  getState: () => state.pos,
  setState: (value: Record<string, unknown> | ((s: Record<string, any>) => Record<string, unknown>)) => { state.pos = { ...state.pos, ...(typeof value === 'function' ? value(state.pos) : value) } },
  subscribe: () => () => {},
} }))
vi.mock('../store/seatStore', () => ({ useSeats: { getState: () => ({ seats: state.seats }), setState: (value: { seats: unknown[] }) => { state.seats = value.seats }, subscribe: () => () => {} } }))
import { checkoutServer, payPartServer, moveTableServer, separateServiceServer, previewAllocationServer, confirmAllocationServer, closeServerDay, startFloorBridge, stopFloorBridge, loadServerState } from './floorBridge'
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
  it('retrouve une allocation financière après réponse perdue en conservant la décision du responsable', async () => {
    let body: any
    state.api.mockImplementation((path: string, options: any) => {
      if (path === '/pos/financial-allocations') { body = JSON.parse(options.body); return Promise.reject(new Error('réponse perdue')) }
      if (path.startsWith('/pos/table-movements/')) return Promise.resolve({ requestId: body.requestId, groups: [{ id: 'part-a' }] })
      return Promise.resolve(fixture(state.company))
    })
    const decision = { input: { requestId: 'stable-id', orderId: 'origin', groups: [], tenderDecisions: [], reason: 'Choix fictif', expectedRevision: 1 }, confirmHash: 'hash' }
    expect((await confirmAllocationServer(decision)).groups[0].id).toBe('part-a')
    expect(body.managerAcknowledged).toBe(true)
    expect(body.confirmHash).toBe('hash')
    expect([...values.keys()].some(k => k.startsWith('creorga-pos-allocation:'))).toBe(false)
  })
  it('refuse un aperçu d’allocation tardif après changement de compte', async () => {
    const response = deferred<any>()
    state.api.mockImplementation((path: string) => path === '/pos/financial-allocations/preview' ? response.promise : Promise.resolve(fixture(state.company)))
    const operation = previewAllocationServer({ orderId: 'origin', groups: [], tenderDecisions: [], reason: 'Choix fictif' })
    await vi.waitFor(() => expect(state.api.mock.calls.some(([p]) => p === '/pos/financial-allocations/preview')).toBe(true))
    stopFloorBridge(); state.company = 'company-b'; state.pos = fixture(state.company)
    response.resolve({ plan: { groups: [{ label: 'Privé A' }] }, confirmHash: 'hash' })
    await expect(operation).rejects.toThrow('session de caisse a changé')
    expect(state.pos.companyId).toBe('company-b')
  })
  it('retrouve une séparation après réponse perdue sans changer de référence ni déplacer localement la ligne', async () => {
    let payload: any
    state.api.mockImplementation((path: string, options: any) => {
      if (path === '/pos/service-separations') { payload = JSON.parse(options.body); return Promise.reject(new Error('réponse perdue')) }
      if (path.startsWith('/pos/table-movements/')) return Promise.resolve({ requestId: payload.requestId, targetCoverId: 'nouveau-groupe' })
      return Promise.resolve(fixture(state.company))
    })
    expect((await separateServiceServer({ kind: 'LINES', fromTableId: 'table-a', intoTableId: 'table-b', coverId: 'cover-a', lines: [{ id: 'line-a', qty: 1 }] })).targetCoverId).toBe('nouveau-groupe')
    expect(state.pos.tables[0].covers[0].items[0].id).toBe('line-a')
    expect([...values.keys()].some(k => k.startsWith('creorga-pos-separation:'))).toBe(false)
  })
  it('une séparation incertaine reste liée à son compte et refuse une réponse tardive après changement de société', async () => {
    const response = deferred<any>()
    state.api.mockImplementation((path: string) => path === '/pos/service-separations' ? response.promise : Promise.resolve(fixture(state.company)))
    const operation = separateServiceServer({ kind: 'GROUP', fromTableId: 'table-a', intoTableId: 'table-b', coverId: 'cover-a' })
    await vi.waitFor(() => expect(state.api.mock.calls.some(([p]) => p === '/pos/service-separations')).toBe(true))
    stopFloorBridge(); state.company = 'company-b'; state.pos = fixture(state.company)
    response.resolve({ revision: 2 })
    await expect(operation).rejects.toThrow('session de caisse a changé')
    expect(state.pos.companyId).toBe('company-b')
    expect([...values.keys()]).toContain('creorga-pos-separation:company-a:owner-company-a:cover-a')
  })
  it('retrouve une fusion après réponse perdue et ne déplace pas le brouillon sans confirmation', async () => {
    let payload: any
    state.api.mockImplementation((path: string, options: any) => {
      if (path === '/pos/table-movements') { payload = JSON.parse(options.body); return Promise.reject(new Error('réponse perdue')) }
      if (path.startsWith('/pos/table-movements/')) return Promise.resolve({ requestId: payload.requestId, visitIds: ['visit-a'], revision: 2 })
      return Promise.resolve(fixture(state.company))
    })
    const result = await moveTableServer('table-a', 'table-b', 'MERGE')
    expect(result.visitIds).toEqual(['visit-a'])
    expect(state.pos.tables[0].covers).toHaveLength(1)
    expect([...values.keys()].some(k => k.startsWith('creorga-pos-move:'))).toBe(false)
  })
  it('conserve la référence de fusion non confirmée sous le compte initial', async () => {
    const remote = deferred<any>()
    state.api.mockImplementation((path: string) => path === '/pos/table-movements' ? remote.promise : Promise.resolve(fixture(state.company)))
    const operation = moveTableServer('table-a', 'table-b', 'TRANSFER')
    await vi.waitFor(() => expect(state.api.mock.calls.some(([p]) => p === '/pos/table-movements')).toBe(true))
    stopFloorBridge(); state.company = 'company-b'; state.pos = fixture(state.company)
    remote.resolve({ requestId: 'old' })
    await expect(operation).rejects.toThrow('session de caisse a changé')
    expect(state.pos.companyId).toBe('company-b')
    expect([...values.keys()]).toContain('creorga-pos-move:company-a:owner-company-a:table-a')
  })
  it('retrouve un acompte après perte de réponse, sans inventer une autre référence', async () => {
    let payload: any
    state.api.mockImplementation((path: string, options: any) => {
      if (path === '/pos/payments') { payload = JSON.parse(options.body); return Promise.reject(new Error('réponse réseau perdue')) }
      if (path.startsWith('/pos/payments/')) return Promise.resolve({ requestId: payload.requestId, status: 'PARTIAL', paidCents: 100, outstandingCents: 100 })
      return Promise.resolve(fixture(state.company))
    })
    const result = await payPartServer({ tableId: 'table-a', coverIds: ['cover-a'], amountCents: 100, expectedOutstandingCents: 200, method: 'CASH', cashReceivedCents: 100 })
    expect(result.outstandingCents).toBe(100)
    expect(state.api.mock.calls.filter(([p]) => p === '/pos/payments')).toHaveLength(1)
    expect([...values.keys()].some(k => k.startsWith('creorga-pos-partial:'))).toBe(false)
    expect(state.pos.tables[0].covers).toHaveLength(1)
  })
  it('ne publie pas un acompte tardif dans un autre compte', async () => {
    const result = deferred<any>()
    state.api.mockImplementation((path: string) => path === '/pos/payments' ? result.promise : Promise.resolve(fixture(state.company)))
    const operation = payPartServer({ tableId: 'table-a', coverIds: ['cover-a'], amountCents: 100, expectedOutstandingCents: 200, method: 'CASH' })
    await vi.waitFor(() => expect(state.api.mock.calls.some(([p]) => p === '/pos/payments')).toBe(true))
    stopFloorBridge(); state.company = 'company-b'; state.pos = fixture(state.company)
    result.resolve({ status: 'PARTIAL', paidCents: 100, outstandingCents: 100 })
    await expect(operation).rejects.toThrow('session de caisse a changé')
    expect(state.pos.companyId).toBe('company-b')
    expect([...values.keys()]).toContain('creorga-pos-partial:company-a:owner-company-a:table-a')
  })
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
