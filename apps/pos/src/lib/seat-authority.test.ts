import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Table } from '../store/posStore'
import type { Seat } from '../store/seatStore'

const transport = vi.hoisted(() => ({ api: vi.fn(), company: 'place-societe', bootstrap: {} as any }))
vi.hoisted(() => {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
    clear: () => values.clear(),
  } })
})
vi.mock('./server', () => ({ api: transport.api, sessionCompany: () => transport.company, sessionHeaders: () => ({}), clearSession() {}, setSession() {}, endSession() {} }))
import { usePOS } from '../store/posStore'
import { useSeats } from '../store/seatStore'
import { startFloorBridge, stopFloorBridge, flushFloor, loadServerState, checkoutServer } from './floorBridge'

const coverId = 'seat:chaise:1'
const originalLine = () => ({ id: 'historique', menuItemId: 'ancien-cafe', name: 'Café FICTIF', price: 2.5, taxRate: 3, qty: 1, note: '', coverId, pricingStatus: 'confirmed' as const, pricingSource: 'catalog' })
const product = { id: 'espresso', name: 'Espresso FICTIF', price: 2.6, taxRate: 17, category: 'Cafés', emoji: '', active: true }
const chair = (): Seat => ({ id: 'chaise', tableId: 'table', position: 0, createdAt: 1, status: 'occupied', items: [originalLine()] })
const table = (): Table => ({ id: 'table', name: 'Table FICTIVE', section: 'salle', shape: 'round', seats: 2, x: 160, y: 140, status: 'occupied', mergedWith: [], covers: [{ id: coverId, label: 'Place FICTIVE', items: [originalLine()] }] })
// Profil fictif privilégié : le droit de lecture du journal est explicitement
// délégué à ce caissier pour les assertions de projection financière ci-dessous.
// Le profil CASHIER par défaut sans ce droit est couvert séparément.
const fixture = () => ({ companyId: transport.company, revision: 1,
  businessAccess: { role: 'CASHIER', revision: `cashier-journal:${transport.company}`, version: 1, capabilities: ['service.read', 'service.manage', 'payments.receive', 'finance.revenue.read'] },
  currentStaff: { id: 'caissier', role: 'CASHIER' }, tables: [table()], seats: [chair()], editor: { rooms: [], fixtures: [], scenes: [], background: null }, ventes: [], clotures: [] })
const lines = () => usePOS.getState().tables[0].covers.flatMap(cover => cover.items)
const canonical = () => useSeats.getState().seats.find(seat => seat.id === 'chaise')!
const draftKey = 'creorga-pos-draft:place-societe:caissier'
const confirmedSale = (id: string) => ({ id, version: 2, confirmation: 'manual_declaration', currency: 'EUR', numero: 1, horodatage: 123,
  tableId: 'table', tableName: 'Table FICTIVE', coverIds: [coverId], couverts: ['Place FICTIVE'],
  lignes: [{ sourceLineId: 'historique', name: 'Café FICTIF', qty: 1, price: 2.5, taxRate: 3 }],
  sousTotal: 2.43, tva: 0.07, pourboire: 0, brut: 2.5, remises: [], arrondiCaritatif: 0, total: 2.5,
  reglements: [{ methode: 'cash' as const, montant: 2.5 }], methode: 'cash' as const, vendeur: 'CAISSIER FICTIF' })

beforeEach(async () => {
  stopFloorBridge(); localStorage.clear(); transport.api.mockReset(); transport.company = 'place-societe'
  usePOS.setState({ tables: [] }); useSeats.setState({ seats: [] })
  vi.stubGlobal('window', { dispatchEvent() {}, confirm: () => false })
  transport.bootstrap = fixture()
  transport.api.mockImplementation(async (url: string, options?: RequestInit) => {
    if (url === '/pos/bootstrap') return structuredClone(transport.bootstrap)
    if (url === '/pos/draft') {
      // Accusé SIMULÉ de stockage ; aucun paiement ni PostgreSQL.
      const payload = JSON.parse(String(options?.body))
      transport.bootstrap = { ...transport.bootstrap, ...payload, revision: transport.bootstrap.revision + 1 }
      return { updatedAt: transport.bootstrap.revision }
    }
    throw Error('Transport non prévu dans le test des places')
  })
  await startFloorBridge()
})
afterEach(() => { stopFloorBridge(); usePOS.setState({ tables: [] }); useSeats.setState({ seats: [] }); vi.unstubAllGlobals() })

describe('Autorité unique des lignes de place : vrais stores et sérialisation', () => {
  it('ajoute les trois articles du service dans la chaise et dans une seule projection', async () => {
    usePOS.getState().addItem('table', coverId, product)
    usePOS.getState().addItem('table', coverId, { ...product, id: 'biere', name: 'Bière FICTIVE', price: 3.9 })
    usePOS.getState().addItem('table', coverId, { ...product, id: 'eau', name: 'Eau FICTIVE', price: 1.25 })
    expect(canonical().items.map(item => [item.name, item.price, item.qty])).toEqual([
      ['Café FICTIF', 2.5, 1], ['Espresso FICTIF', 2.6, 1], ['Bière FICTIVE', 3.9, 1], ['Eau FICTIVE', 1.25, 1],
    ])
    expect(lines().map(item => [item.id, item.price, item.qty])).toEqual(canonical().items.map(item => [item.id, item.price, item.qty]))
    await flushFloor()
    const draft = JSON.parse(transport.api.mock.calls.find(([url]) => url === '/pos/draft')![1].body)
    expect(draft.seats[0].items).toHaveLength(4)
    expect(draft.tables[0].covers[0].items.reduce((total: number, item: any) => total + Math.round(item.price * 100) * item.qty, 0)).toBe(1025)
    await loadServerState()
    expect(canonical().items).toHaveLength(4); expect(lines()).toHaveLength(4)
    expect(new Set(lines().map(item => item.id)).size).toBe(4)
  })

  it('applique quantité et note à la même identité historique sans changer prix ni TVA', async () => {
    usePOS.getState().setItemQty('table', 'historique', 2)
    usePOS.getState().setItemNote('table', 'historique', 'Sans sucre')
    usePOS.getState().updateTable('table', { kitchenNote: 'Servir ensemble' })
    expect(canonical().items[0]).toMatchObject({ id: 'historique', qty: 2, note: 'Sans sucre', price: 2.5, taxRate: 3 })
    expect(lines()[0]).toMatchObject({ id: 'historique', qty: 2, note: 'Sans sucre', price: 2.5, taxRate: 3 })
    await flushFloor(); await loadServerState()
    expect(usePOS.getState().tables[0].kitchenNote).toBe('Servir ensemble')
    expect(canonical().items[0].note).toBe('Sans sucre')
  })

  it('retire une ligne de la chaise au lieu de la faire réapparaître au rechargement', async () => {
    usePOS.getState().removeItem('table', 'historique')
    expect(canonical().items).toEqual([]); expect(lines()).toEqual([])
    await flushFloor(); await loadServerState()
    expect(canonical().items).toEqual([]); expect(lines()).toEqual([])
  })

  it('projette également une saisie directe depuis le panneau de chaise', async () => {
    useSeats.getState().addItem('chaise', { menuItemId: product.id, name: product.name, price: product.price, taxRate: product.taxRate, qty: 1, note: 'Panneau chaise' })
    expect(lines()).toHaveLength(2)
    expect(lines()[1]).toMatchObject({ name: product.name, note: 'Panneau chaise', coverId })
    await flushFloor()
  })

  it('additionne la quantité d’un même article sans créer une seconde ligne', () => {
    usePOS.getState().addItem('table', coverId, product)
    const id = canonical().items[1].id
    usePOS.getState().addItem('table', coverId, product)
    expect(canonical().items[1]).toMatchObject({ id, qty: 2, price: 2.6, taxRate: 17 })
    expect(lines()).toHaveLength(2); expect(lines()[1]).toMatchObject({ id, qty: 2 })
  })

  it('rend la table occupée quand sa chaise reçoit une commande', () => {
    useSeats.getState().clearItems('chaise')
    usePOS.setState({ tables: [{ ...table(), status: 'available', covers: [] }] })
    useSeats.getState().addItem('chaise', { menuItemId: product.id, name: product.name, price: product.price, taxRate: product.taxRate, qty: 1, note: '' })
    expect(usePOS.getState().tables[0].status).toBe('occupied')
    expect(lines()).toHaveLength(1)
  })

  it('n’autorise pas les mutateurs à changer une place avec acompte', () => {
    usePOS.setState({ tables: [{ ...table(), covers: [{ ...table().covers[0], payment: { orderId: 'acompte', totalCents: 250, paidCents: 100, outstandingCents: 150 } }] }] })
    const before = structuredClone(canonical())
    usePOS.getState().addItem('table', coverId, product)
    usePOS.getState().setItemQty('table', 'historique', 2)
    usePOS.getState().setItemNote('table', 'historique', 'Interdit')
    usePOS.getState().removeItem('table', 'historique')
    expect(canonical()).toEqual(before); expect(lines()).toHaveLength(1)
  })

  it('refuse une place inconnue sans modifier la chaise d’une autre identité', () => {
    usePOS.setState({ tables: [{ ...table(), covers: [{ ...table().covers[0], id: 'seat:autre-chaise:1' }] }] })
    const before = structuredClone(canonical())
    expect(() => usePOS.getState().addItem('table', 'seat:autre-chaise:1', product)).toThrow(/place|chaise/i)
    expect(canonical()).toEqual(before)
  })

  it('conserve et refuse une divergence résiduelle au lieu d’envoyer un faux succès', async () => {
    const projected = { ...table(), covers: [{ ...table().covers[0], items: [{ ...originalLine(), qty: 2 }] }] }
    usePOS.setState({ tables: [projected] })
    const pending = localStorage.getItem(draftKey)
    expect(pending).not.toBeNull()
    await expect(flushFloor()).rejects.toThrow(/diverg/i)
    expect(transport.api.mock.calls.filter(([url]) => url === '/pos/draft')).toHaveLength(0)
    expect(localStorage.getItem(draftKey)).toBe(pending)
  })

  it('ne récupère pas silencieusement un ancien brouillon divergent', async () => {
    stopFloorBridge()
    const old = fixture(); old.tables[0].covers[0].items[0].qty = 2
    const stored = JSON.stringify({ revision: 1, tables: old.tables, editor: old.editor, seats: old.seats })
    localStorage.setItem(draftKey, stored); Object.assign(window, { confirm: () => true })
    await expect(startFloorBridge()).rejects.toThrow(/diverg/i)
    expect(localStorage.getItem(draftKey)).toBe(stored)
    expect(canonical().items[0].qty).toBe(1)
    expect(transport.api.mock.calls.filter(([url]) => url === '/pos/draft')).toHaveLength(0)
  })

  it('n’importe jamais le brouillon d’une place dans une autre société', async () => {
    stopFloorBridge()
    const old = fixture(); old.tables[0].covers[0].items[0].qty = 2
    const stored = JSON.stringify({ revision: 1, tables: old.tables, editor: old.editor, seats: old.seats })
    localStorage.setItem(draftKey, stored)
    transport.company = 'autre-societe'
    transport.bootstrap = { ...fixture(), tables: [{ ...table(), id: 'autre-table', covers: [] }], seats: [] }
    Object.assign(window, { confirm: () => true })
    await startFloorBridge()
    expect(usePOS.getState().tables.map(table => table.id)).toEqual(['autre-table'])
    expect(useSeats.getState().seats).toEqual([])
    expect(localStorage.getItem(draftKey)).toBe(stored)
    expect(transport.api.mock.calls.filter(([url]) => url === '/pos/draft')).toHaveLength(0)
  })

  it('retourne une vente confirmée et retire uniquement la place explicitement réglée', async () => {
    useSeats.setState({ seats: [chair(), { ...chair(), id: 'autre-chaise', createdAt: 2, position: 1, items: [{ ...originalLine(), id: 'autre-ligne', coverId: 'seat:autre-chaise:2' }] }] })
    const original = transport.api.getMockImplementation()!
    transport.api.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === '/pos/checkout') {
        const payload = JSON.parse(String(options?.body)), sale = confirmedSale(payload.requestId)
        const data = structuredClone(transport.bootstrap)
        data.seats[0].items = []; data.seats[0].status = 'free'
        data.tables[0].covers = data.tables[0].covers.filter((cover: any) => cover.id !== coverId)
        data.ventes = [sale]; data.revision++
        transport.bootstrap = data
        return sale
      }
      return original(url, options)
    })
    const sale = await checkoutServer('table', 'cash', 0, [coverId], {}, 2.5, 2.5)
    expect(sale.total).toBe(2.5); expect(usePOS.getState().ventes.map(value => value.id)).toEqual([sale.id])
    expect(canonical().items).toEqual([])
    expect(useSeats.getState().seats.find(seat => seat.id === 'autre-chaise')!.items[0].id).toBe('autre-ligne')
    expect(lines().map(item => item.id)).toEqual(['autre-ligne'])
    expect(usePOS.getState().tables[0].status).toBe('occupied')
  })

  it('ne transforme pas une confirmation200 en échec lorsque le GET suivant est indisponible', async () => {
    useSeats.setState({ seats: [chair(), { ...chair(), id: 'autre-chaise', createdAt: 2, position: 1, items: [{ ...originalLine(), id: 'autre-ligne', coverId: 'seat:autre-chaise:2' }] }] })
    const original = transport.api.getMockImplementation()!
    let confirmed = false
    transport.api.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === '/pos/checkout') { confirmed = true; return confirmedSale(JSON.parse(String(options?.body)).requestId) }
      if (confirmed && url === '/pos/bootstrap') throw Error('GET fictif indisponible après confirmation')
      return original(url, options)
    })
    const sale = await checkoutServer('table', 'cash', 0, [coverId], {}, 2.5, 2.5)
    expect(sale.total).toBe(2.5); expect(canonical().items).toEqual([])
    expect(usePOS.getState().ventes.map(value => value.id)).toEqual([sale.id])
    expect(lines().map(item => item.id)).toEqual(['autre-ligne'])
    usePOS.getState().setItemNote('table', 'autre-ligne', 'Service suivant FICTIF')
    expect(localStorage.getItem(draftKey)).not.toBeNull() // applying a été remis à false.
    await flushFloor()
    expect(useSeats.getState().seats.find(seat => seat.id === 'autre-chaise')!.items[0].note).toBe('Service suivant FICTIF')
  })

  it('rapproche une réponse perdue avec la même référence puis rend la vente confirmée', async () => {
    const original = transport.api.getMockImplementation()!
    let requestId = '', lookup = ''
    transport.api.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === '/pos/checkout') { requestId = JSON.parse(String(options?.body)).requestId; throw Error('Réponse fictive perdue') }
      if (url.startsWith('/pos/sales/')) { lookup = url; return confirmedSale(requestId) }
      if (requestId && url === '/pos/bootstrap') throw Error('GET fictif indisponible')
      return original(url, options)
    })
    const sale = await checkoutServer('table', 'cash', 0, [coverId], {}, 2.5, 2.5)
    expect(lookup).toBe(`/pos/sales/${requestId}`); expect(sale.id).toBe(requestId)
    expect(transport.api.mock.calls.filter(([url]) => url === '/pos/checkout')).toHaveLength(1)
    expect(canonical().items).toEqual([]); expect(lines()).toEqual([])
    expect(usePOS.getState().ventes.map(value => value.id)).toEqual([requestId])
  })

  it('garde la référence après un incident local postconfirmation et la réutilise au rejeu', async () => {
    const original = transport.api.getMockImplementation()!, posted: string[] = []
    transport.api.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === '/pos/checkout') { const id = JSON.parse(String(options?.body)).requestId; posted.push(id); return confirmedSale(id) }
      if (posted.length && url === '/pos/bootstrap') throw Error('GET fictif indisponible')
      return original(url, options)
    })
    const unsubscribe = usePOS.subscribe(state => {
      if (state.ventes.length) { unsubscribe(); throw Error('Incident local FICTIF après réception de la vente') }
    })
    const first = await checkoutServer('table', 'cash', 0, [coverId], {}, 2.5, 2.5)
    expect(first.total).toBe(2.5)
    const retained = JSON.parse(localStorage.getItem('creorga-pos-pending:place-societe:caissier:table')!)
    expect(retained.requestId).toBe(first.id)
    const second = await checkoutServer('table', 'cash', 0, [coverId], {}, 2.5, 2.5)
    expect(posted).toEqual([first.id, first.id]); expect(second.id).toBe(first.id)
    expect(usePOS.getState().ventes.map(value => value.id)).toEqual([first.id])
    expect(canonical().items).toEqual([]); expect(lines()).toEqual([])
  })

  it('ne vide aucune place si une confirmation ancienne ne précise pas les groupes réglés', async () => {
    const original = transport.api.getMockImplementation()!
    let confirmed = false
    transport.api.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === '/pos/checkout') { confirmed = true; return { ...confirmedSale(JSON.parse(String(options?.body)).requestId), coverIds: undefined } }
      if (confirmed && url === '/pos/bootstrap') throw Error('GET fictif indisponible')
      return original(url, options)
    })
    const sale = await checkoutServer('table', 'cash', 0, [coverId], {}, 2.5, 2.5)
    expect(sale.total).toBe(2.5); expect(canonical().items[0].id).toBe('historique')
    expect(lines()[0].id).toBe('historique')
    expect(JSON.parse(localStorage.getItem('creorga-pos-pending:place-societe:caissier:table')!).requestId).toBe(sale.id)
  })

  it('conserve une saisie arrivée pendant l’attente du paiement confirmé sans la déclarer réglée', async () => {
    const original = transport.api.getMockImplementation()!
    let release!: (value: ReturnType<typeof confirmedSale>) => void
    let requestId = '', refreshAfterConfirmation = 0
    const delayed = new Promise<ReturnType<typeof confirmedSale>>(resolve => { release = resolve })
    transport.api.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === '/pos/checkout') { requestId = JSON.parse(String(options?.body)).requestId; return delayed }
      if (requestId && url === '/pos/bootstrap') { refreshAfterConfirmation++; return fixture() }
      return original(url, options)
    })
    const operation = checkoutServer('table', 'cash', 0, [coverId], {}, 2.5, 2.5)
    await vi.waitFor(() => expect(requestId).not.toBe(''))
    usePOS.getState().addItem('table', coverId, product)
    const pending = localStorage.getItem(draftKey)
    release(confirmedSale(requestId))
    const sale = await operation
    expect(sale.total).toBe(2.5)
    expect(canonical().items.map(item => item.name)).toEqual(['Café FICTIF', 'Espresso FICTIF'])
    expect(localStorage.getItem(draftKey)).toBe(pending)
    expect(JSON.parse(localStorage.getItem('creorga-pos-pending:place-societe:caissier:table')!).requestId).toBe(requestId)
    expect(refreshAfterConfirmation).toBe(0)
    expect(usePOS.getState().ventes.map(value => value.id)).toEqual([sale.id])
  })
})
