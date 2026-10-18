import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import express from 'express'
import request from 'supertest'

const fixture = vi.hoisted(() => {
  const saved = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key), clear: () => saved.clear(),
  } })
  return { api: vi.fn(), saved: {} as any, working: {} as any, previous: {} as any,
    products: [{ id: 'soupe-fictive', name: 'Soupe FICTIVE', price: 6.5, taxRate: 3, isActive: true, category: { name: 'Entrées', icon: '' } }] }
})
vi.mock('../lib/server', async original => ({ ...await original<typeof import('../lib/server')>(), api: fixture.api }))
vi.mock('../../../backend/src/lib/prisma', () => {
  const empty = async () => [], zero = async () => 0
  const database = {
    product: { findMany: async () => fixture.products }, posCoverPayment: { findMany: empty, count: zero }, order: { findMany: empty },
    table: { findMany: empty }, saleOrigin: { findMany: empty, count: zero }, orderItem: { findMany: empty, count: zero },
    serviceShare: { findMany: empty }, serviceCover: { findMany: empty }, userCompany: { findMany: empty, count: zero },
    posSale: { findMany: empty }, posClosure: { findMany: empty }, reservation: { findMany: empty },
    companySettings: { findUnique: async () => null }, customer: { count: zero },
  }
  return { default: database, prisma: database }
})
vi.mock('../../../backend/src/routes/floorState', async original => {
  const pricing = await import('../../../backend/src/lib/pos-pricing')
  return { ...await original<typeof import('../../../backend/src/routes/floorState')>(), getFloorState: () => fixture.working,
    prepareFloorPricing: async () => { pricing.canonicalizeFloorPricing(fixture.previous, fixture.working, fixture.products) } }
})
import posRouter from '../../../backend/src/routes/pos'
import OrderPage from './OrderPage'
import { usePOS } from '../store/posStore'
import { useSeats } from '../store/seatStore'
import { flushFloor, loadServerState, startFloorBridge, stopFloorBridge } from '../lib/floorBridge'
import { clearSession, setSession } from '../lib/server'

// Route Express/Zod, calculs, bridge, stores et rendu React réels. Seule la
// frontière de stockage est simulée en mémoire ; aucun PostgreSQL ni port de
// laboratoire. Supertest ouvre un serveur HTTP éphémère de test uniquement.
// Les handlers React sont activés par react-test-renderer : ce n'est pas un
// parcours Chrome, ni une preuve de persistance dans la base du laboratoire.
const app = express(); app.use(express.json())
app.use('/pos', (req, res, next) => {
  fixture.previous = structuredClone(fixture.saved); fixture.working = structuredClone(fixture.saved)
  Object.assign(req, { companyId: 'restaurant-fictif', company: { name: 'RESTAURANT FICTIF' }, role: 'SERVER', user: { userId: 'caissier-fictif' },
    businessAccess: { role: 'SERVER', revision: 'restaurant-service-fictif', version: 1, capabilities: ['catalog.read', 'service.read', 'service.manage', 'crm.customers.read'] } })
  const send = res.json.bind(res)
  res.json = ((body: any) => {
    if (req.method === 'PUT' && res.statusCode < 400) {
      fixture.working.updatedAt = fixture.previous.updatedAt + 1
      fixture.saved = structuredClone(fixture.working)
    }
    return send(body)
  }) as typeof res.json
  next()
}, posRouter)

let renderer: ReactTestRenderer | undefined
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(child => text(child)).join('')
const productButtons = () => renderer!.root.findAllByType('button').filter(node => text(node).includes('Soupe FICTIVE'))
const mount = async () => { await act(async () => { renderer = create(createElement(OrderPage, { tableId: 'table-fictive', onBack() {}, onPay() {} })) }) }
const identities = () => usePOS.getState().tables[0].covers.map(cover => cover.id)

beforeEach(async () => {
  stopFloorBridge(); localStorage.clear(); fixture.api.mockReset()
  usePOS.setState({ tables: [], menu: [] }); useSeats.setState({ seats: [] })
  vi.stubGlobal('window', { innerWidth: 1440, dispatchEvent() {}, confirm: () => false,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), addEventListener() {}, removeEventListener() {} })
  fixture.saved = { zones: [{ id: 'salle-fictive', name: 'Salle FICTIVE', color: '#6366f1' }],
    tables: [{ id: 'table-fictive', name: 'Table FICTIVE', section: 'Salle FICTIVE', shape: 'round', seats: 4, x: 160, y: 140, status: 'LIBRE', items: [] }],
    chairs: [], photos: [], updatedAt: 123 }
  fixture.api.mockImplementation(async (url: string, options?: RequestInit) => {
    if (url === '/pos/customers') return []
    if (url === '/pos/bootstrap') {
      const response = await request(app).get(url)
      if (response.status >= 400) throw Object.assign(new Error(response.body.error), { status: response.status })
      return response.body
    }
    if (url === '/pos/draft') {
      const response = await request(app).put(url).set('If-Match', (options?.headers as Record<string, string>)['If-Match']).send(JSON.parse(String(options?.body)))
      if (response.status >= 400) throw Object.assign(new Error(response.body.error), { status: response.status })
      return response.body
    }
    throw Error('Aucun autre transport autorisé dans ce test')
  })
  setSession('jeton-fictif', 'restaurant-fictif')
  await startFloorBridge()
})
afterEach(async () => {
  await act(async () => { renderer?.unmount() }); renderer = undefined
  stopFloorBridge(); clearSession(); usePOS.setState({ tables: [] }); useSeats.setState({ seats: [] }); vi.unstubAllGlobals()
})

describe('Nouvelle table : UI → draft → bootstrap réel → UI', () => {
  it('garde les produits et les deux couverts après sauvegarde puis deux rechargements serveur', async () => {
    usePOS.getState().openTable('table-fictive', 2)
    const originalIds = identities()
    await mount()
    expect(productButtons().length).toBeGreaterThan(0)
    await act(async () => { await flushFloor(); await loadServerState(); await loadServerState() })
    expect(identities()).toEqual(originalIds)
    expect(renderer!.root.findAllByProps({ 'aria-label': 'Ajouter un groupe de commande' })).toHaveLength(1)
    expect(productButtons().length).toBeGreaterThan(0)
    expect(text(renderer!.root)).toContain('Couvert 1')
    expect(text(renderer!.root)).toContain('Couvert 2')
    expect(usePOS.getState().ventes).toEqual([])
    expect(fixture.saved.tables[0].items).toEqual([])
    expect(fixture.saved.chairs).toEqual([])
  })

  it('permet l’ajout depuis le bouton produit après synchronisation sans changer l’identité du groupe', async () => {
    usePOS.getState().openTable('table-fictive', 2)
    const originalIds = identities()
    await mount()
    await act(async () => { await flushFloor(); await loadServerState() })
    expect(productButtons().length).toBeGreaterThan(0)
    await act(async () => { productButtons()[0].props.onClick() })
    await act(async () => { await flushFloor(); await loadServerState() })
    expect(identities()).toEqual(originalIds)
    expect(usePOS.getState().tables[0].covers.map(cover => cover.items.map(item => [item.name, item.price, item.qty]))).toEqual([
      [['Soupe FICTIVE', 6.5, 1]], [],
    ])
    expect(fixture.saved.tables[0].items).toHaveLength(1)
    expect(usePOS.getState().ventes).toEqual([])
    expect(text(renderer!.root)).toContain('6,50 €')
  })
})
