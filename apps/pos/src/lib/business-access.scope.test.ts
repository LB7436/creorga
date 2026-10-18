import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const memory = vi.hoisted(() => {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } })
  return values
})
import { usePOS } from '../store/posStore'
import { useSeats } from '../store/seatStore'
import { api, clearSession, setSession } from './server'
import { checkoutServer, loadServerState, startFloorBridge, stopFloorBridge } from './floorBridge'

const fetcher = vi.fn<typeof fetch>()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const access = (revision = 'owner-1', capabilities = ['service.read', 'service.manage', 'payments.receive', 'cash.close', 'finance.revenue.read']) => ({ role: 'OWNER', revision, version: 1, capabilities })
const sale = { id: 'vente-fictive', numero: 1, total: 2.6, pourboire: 0, tva: 0.38, coverIds: ['cover-fictif'] }
const fixture = () => ({ companyId: 'societe-fictive-a', revision: 1, businessAccess: access(), currentStaff: { id: 'employe-fictif', role: 'OWNER', name: 'FICTIF' },
  tables: [{ id: 'table-fictive', status: 'occupied', covers: [{ id: 'cover-fictif', label: 'Groupe FICTIF', items: [{ id: 'ligne-fictive', name: 'Espresso FICTIF', price: 2.6, qty: 1, taxRate: 17 }] }] }],
  seats: [], editor: { rooms: [], fixtures: [], scenes: [], background: null }, ventes: [sale], clotures: [{ id: 'cloture-fictive' }],
})
let bootstrap: any, currentAccess: any
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }

beforeEach(() => {
  vi.useFakeTimers(); memory.clear(); fetcher.mockReset(); stopFloorBridge(); clearSession()
  vi.stubGlobal('window', { dispatchEvent() {}, confirm: () => false })
  vi.stubGlobal('CustomEvent', class { constructor(public type: string, public options?: unknown) {} })
  vi.stubGlobal('fetch', fetcher)
  usePOS.setState({ tables: [], ventes: [], clotures: [], currentStaff: null, businessAccess: null } as any)
  useSeats.setState({ seats: [] }); setSession('jeton-fictif', 'societe-fictive-a')
  bootstrap = fixture(); currentAccess = access()
  fetcher.mockImplementation(async (input, options) => {
    const path = String(input).split('/api')[1]
    if (path === '/pos/bootstrap') return json(bootstrap)
    if (path === '/companies/access') return json(currentAccess)
    if (path === '/pos/draft') return new Promise<Response>(() => {}) // écriture volontairement en attente, aucun réseau réel
    if (path === '/pos/checkout') return json(sale)
    if (path === '/pos/refus-fictif') return json({ error: 'Permission retirée' }, 403)
    throw Error(`Transport fictif non prévu : ${path} ${options?.method || 'GET'}`)
  })
})
afterEach(() => { stopFloorBridge(); clearSession(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('POS : droits explicites et révocation sans perte de brouillon', () => {
  it('ne garde aucun journal financier lorsque le bootstrap ne fournit pas de droits explicites', async () => {
    delete bootstrap.businessAccess
    await startFloorBridge()
    expect(usePOS.getState().ventes).toEqual([])
    expect(usePOS.getState().clotures).toEqual([])
    expect(usePOS.getState().tables[0].covers[0].items).toHaveLength(1)
  })

  it('un vrai rôle EMPLOYEE avec droit de service ne reçoit pas implicitement le chiffre d’affaires', async () => {
    bootstrap.businessAccess = { role: 'EMPLOYEE', revision: 'employee-1', version: 1, capabilities: ['service.read', 'service.manage', 'payments.receive'] }
    bootstrap.currentStaff.role = 'EMPLOYEE'
    await startFloorBridge()
    expect(usePOS.getState().currentStaff?.role).toBe('EMPLOYEE')
    expect(usePOS.getState().ventes).toEqual([])
    expect(usePOS.getState().clotures).toEqual([])
  })

  it('sonde les permissions pendant un brouillon sale et une écriture bloquée, sans perdre les références en attente', async () => {
    await startFloorBridge()
    const pendingKey = 'creorga-pos-pending:societe-fictive-a:employe-fictif:table-fictive'
    memory.set(pendingKey, JSON.stringify({ requestId: 'reference-financiere-a-preserver' }))
    usePOS.getState().setItemNote('table-fictive', 'ligne-fictive', 'Brouillon FICTIF à préserver')
    currentAccess = { role: 'EMPLOYEE', revision: 'revoked-2', version: 2, capabilities: ['service.read'] }
    await vi.advanceTimersByTimeAsync(5100)
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith('/companies/access'))).toBe(true)
    expect((usePOS.getState() as any).businessAccess).toEqual(currentAccess)
    expect(usePOS.getState().ventes).toEqual([])
    expect(usePOS.getState().clotures).toEqual([])
    expect(usePOS.getState().tables[0].covers[0].items[0].note).toBe('Brouillon FICTIF à préserver')
    expect(memory.get(pendingKey)).toContain('reference-financiere-a-preserver')
    expect([...memory.keys()].some(key => key.startsWith('creorga-pos-draft:'))).toBe(true)
  })

  it('un refus 403 retire les données financières et les droits mais ne supprime pas la commande ni un pending', async () => {
    await startFloorBridge()
    const tables = structuredClone(usePOS.getState().tables)
    memory.set('creorga-pos-partial:societe-fictive-a:employe-fictif:table-fictive', '{"requestId":"a-garder"}')
    await expect(api('/pos/refus-fictif')).rejects.toMatchObject({ status: 403 })
    expect((usePOS.getState() as any).businessAccess).toBeNull()
    expect(usePOS.getState().ventes).toEqual([])
    expect(usePOS.getState().clotures).toEqual([])
    expect(usePOS.getState().tables).toEqual(tables)
    expect([...memory.values()].some(value => value.includes('a-garder'))).toBe(true)
  })

  it('une lecture de bootstrap commencée avant le 403 ne peut pas réintroduire le chiffre d’affaires', async () => {
    await startFloorBridge()
    const pending = deferred<Response>()
    fetcher.mockImplementationOnce(() => pending.promise)
    const reading = loadServerState()
    await expect(api('/pos/refus-fictif')).rejects.toMatchObject({ status: 403 })
    pending.resolve(json(bootstrap))
    await reading.catch(() => {})
    expect(usePOS.getState().ventes).toEqual([])
    expect(usePOS.getState().clotures).toEqual([])
    expect((usePOS.getState() as any).businessAccess).toBeNull()
  })

  it('une sonde tardive de l’ancienne société ne réattribue pas ses permissions', async () => {
    await startFloorBridge()
    const pending = deferred<Response>()
    fetcher.mockImplementation(async input => String(input).endsWith('/companies/access') ? pending.promise : json(bootstrap))
    await vi.advanceTimersByTimeAsync(5000)
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith('/companies/access'))).toBe(true)
    stopFloorBridge(); setSession('jeton-b', 'societe-fictive-b')
    usePOS.setState({ businessAccess: { role: 'EMPLOYEE', revision: 'societe-b', capabilities: ['service.read'] }, ventes: [], clotures: [] } as any)
    pending.resolve(json(access('old-late')))
    await Promise.resolve(); await Promise.resolve()
    expect((usePOS.getState() as any).businessAccess.revision).toBe('societe-b')
    expect(usePOS.getState().ventes).toEqual([])
  })

  it('une confirmation de paiement n’est pas réinterprétée comme un échec après retrait du droit de chiffre d’affaires', async () => {
    await startFloorBridge()
    const pending = deferred<Response>()
    fetcher.mockImplementation(async input => {
      const path = String(input).split('/api')[1]
      if (path === '/pos/checkout') return pending.promise
      if (path === '/companies/access') return json(currentAccess)
      if (path === '/pos/bootstrap') return json({ ...bootstrap, businessAccess: currentAccess, tables: [], ventes: [], clotures: [] })
      throw Error(`Transport imprévu ${path}`)
    })
    const payment = checkoutServer('table-fictive', 'cash', 0, ['cover-fictif'], {}, 2.6, 2.6)
    await Promise.resolve(); await Promise.resolve()
    currentAccess = { role: 'CASHIER', revision: 'cashier-2', version: 2, capabilities: ['service.read', 'service.manage', 'payments.receive'] }
    await vi.advanceTimersByTimeAsync(5000)
    expect((usePOS.getState() as any).businessAccess).toEqual({ role: 'CASHIER', revision: 'cashier-2', version: 2, capabilities: ['payments.receive', 'service.manage', 'service.read'] })
    pending.resolve(json(sale))
    await expect(payment).resolves.toMatchObject({ id: 'vente-fictive' })
    expect(usePOS.getState().ventes).toEqual([])
    expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith('/pos/checkout'))).toHaveLength(1)
  })

  it.each(['SERVER', 'CASHIER', 'ADMIN'])('conserve le rôle réel %s et la version explicite sans le promouvoir propriétaire', async role => {
    bootstrap.businessAccess = { role, revision: `profil-${role}`, version: 3, capabilities: ['service.read'] }
    bootstrap.currentStaff.role = role
    await startFloorBridge()
    expect((usePOS.getState() as any).businessAccess).toEqual(bootstrap.businessAccess)
    expect(usePOS.getState().currentStaff?.role).toBe(role)
    expect(usePOS.getState().ventes).toEqual([])
  })

  it('refuse une politique sans version au lieu de conserver les anciens droits financiers', async () => {
    delete bootstrap.businessAccess.version
    await startFloorBridge()
    expect((usePOS.getState() as any).businessAccess).toBeNull()
    expect(usePOS.getState().ventes).toEqual([])
  })

  it('n’adopte pas une politique de version inférieure reçue après un droit plus récent', async () => {
    bootstrap.businessAccess = { role: 'SERVER', revision: 'plus-recent', version: 8, capabilities: ['service.read', 'service.manage'] }
    currentAccess = { role: 'OWNER', revision: 'ancienne', version: 7, capabilities: ['finance.revenue.read'] }
    await startFloorBridge(); await vi.advanceTimersByTimeAsync(5000)
    expect((usePOS.getState() as any).businessAccess).toEqual({ role: 'SERVER', revision: 'plus-recent', version: 8, capabilities: ['service.manage', 'service.read'] })
    expect(usePOS.getState().ventes).toEqual([])
  })

  it('la sonde ne sauvegarde pas automatiquement un ancien brouillon repris après confirmation de l’utilisateur', async () => {
    await startFloorBridge(); stopFloorBridge()
    const draft = structuredClone({ tables: usePOS.getState().tables, editor: usePOS.getState().editor, seats: [] })
    draft.tables[0].covers[0].items[0].note = 'Ancien brouillon FICTIF à reprendre manuellement'
    memory.set('creorga-pos-draft:societe-fictive-a:employe-fictif', JSON.stringify({ revision: 1, ...draft }))
    Object.assign(window, { confirm: () => true })
    await startFloorBridge()
    currentAccess = { ...access('same-grants-version-2'), version: 2 }
    await vi.advanceTimersByTimeAsync(5600)
    expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith('/pos/draft'))).toHaveLength(0)
    expect(usePOS.getState().tables[0].covers[0].items[0].note).toBe('Ancien brouillon FICTIF à reprendre manuellement')
    expect(memory.get('creorga-pos-draft:societe-fictive-a:employe-fictif')).toContain('Ancien brouillon')
  })

  it('un refus 401 définitif retire aussi les données financières sans effacer la commande', async () => {
    await startFloorBridge()
    fetcher.mockResolvedValueOnce(json({ message: 'Session expirée' }, 401))
    await expect(api('/auth/me', {}, false)).rejects.toMatchObject({ status: 401 })
    expect(usePOS.getState().ventes).toEqual([])
    expect(usePOS.getState().clotures).toEqual([])
    expect(usePOS.getState().tables[0].covers[0].items).toHaveLength(1)
  })
})
