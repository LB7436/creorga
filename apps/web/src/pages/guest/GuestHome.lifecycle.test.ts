import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/optional/entertainment', () => import('@/optional/entertainment.business'))
const fixture = vi.hoisted(() => {
  const memory = () => { const values = new Map<string, string>(); return { values, storage: {
    getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) },
  } } }
  const local = memory(), session = memory()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: local.storage })
  return { local, session }
})
const { default: GuestHome } = await import('./GuestHome')
const companyId = 'guest-lifecycle-fixture', tableId = 'table-fixture'
let renderer: ReactTestRenderer | undefined, calls: Array<{ url: string; init: RequestInit }>, release: () => void
let held: Promise<void>, total: number
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
const button = (name: string) => renderer!.root.findAllByType('button').find(node => text(node).trim() === name || node.findAllByType('span').some(span => text(span) === name))!
const json = (value: unknown, status = 200) => Response.json(value, { status })
const orderCalls = () => calls.filter(call => call.url.endsWith('/api/guest/orders'))
const pendingKeys = () => [...fixture.local.values.keys()].filter(key => key.startsWith('creorga-guest-order:'))
const cart = () => JSON.parse(fixture.session.values.get(`creorga-cart-visit:${companyId}:${tableId}:visit-fixture`) || '[]')
const cartBackdrops = () => renderer!.root.findAll(node => node.type === 'div' && node.props.style?.position === 'fixed' && node.props.style?.inset === 0 && node.props.style?.zIndex === 50)
beforeEach(() => {
  calls = []; total = 2.6; fixture.local.values.clear(); fixture.session.values.clear()
  held = new Promise(resolve => { release = resolve })
  fixture.local.values.set('creorga.guest.lang', 'fr')
  fixture.session.values.set(`creorga-guest-visit:${companyId}:${tableId}`, JSON.stringify({ visitId: 'visit-fixture', token: 'a'.repeat(64) }))
  const location = new URL(`http://localhost:5174/c?companyId=${companyId}&table=${tableId}`)
  vi.stubGlobal('sessionStorage', fixture.session.storage)
  vi.stubGlobal('window', { location, localStorage: fixture.local.storage, sessionStorage: fixture.session.storage,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, setInterval, clearInterval })
  vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input); calls.push({ url, init })
    const path = new URL(url).pathname
    if (path === '/api/portal-config') return json({ companyId, toggles: { menu: true, order: true, reviews: true, games: false },
      games: {}, welcomeMessage: '', accentColor: '#6366f1', tableNumber: tableId, themeMode: 'dark', restaurantName: 'PORTAIL FICTIF', updatedAt: 1 })
    if (path === '/api/portal-config/menu') return json({ companyId, categories: [{ id: 'category-fixture', name: 'Cafés fictifs', products: [
      { id: 'product-fixture', name: 'Espresso FICTIF', price: 2.6, description: '', allergens: [], isActive: true, isAvailable: true },
    ] }] })
    if (path.startsWith('/api/guest/bill/')) return json({ total: 0, orderIds: [], paymentProviders: [] })
    if (path === '/api/guest/orders') {
      const body = JSON.parse(String(init.body))
      // La réponse ignore volontairement AbortSignal : la garde UI doit suffire.
      await held
      return json({ id: body.requestId, companyId, tableId, total, status: 'received' }, 201)
    }
    if (path.startsWith('/api/guest/orders/')) return json({ status: 'received' })
    if (path === '/api/portal-config/client-events') return json({ ok: true, persisted: false }, 202)
    throw Error(`Destination hors fixture : ${path}`)
  })
})
afterEach(async () => { release(); await act(async () => { renderer?.unmount() }); renderer = undefined; vi.unstubAllGlobals() })
async function mount() {
  await act(async () => { renderer = create(createElement(MemoryRouter, { initialEntries: [`/c?companyId=${companyId}&table=${tableId}`] }, createElement(GuestHome))) })
}
async function prepare() {
  await mount()
  await act(async () => { button('Ajouter').props.onClick() })
  await act(async () => { button('Voir le panier').props.onClick() })
}

describe('Portail réel : cycle de vie des envois de commande', () => {
  it('revient à la carte sans voile de panier vide et accepte le premier ajout de la nouvelle commande', async () => {
    await prepare()
    // Le badge d'ajout bref est terminé, comme après le parcours staff réel.
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 650)) })
    await act(async () => { button('Envoyer la commande').props.onClick() })
    await act(async () => { release() })
    expect(text(renderer!.root)).toContain('Commande envoyée')
    expect(cart()).toEqual([])
    await act(async () => { button('Nouvelle commande').props.onClick() })
    // Appeler directement onClick d'Ajouter contournerait ce vrai voile rendu.
    // Ce test de composant n'est pas une preuve de hit-test dans Chrome.
    expect(cartBackdrops()).toHaveLength(0)
    expect(text(renderer!.root)).not.toContain('Votre panier est vide')
    await act(async () => { button('Ajouter').props.onClick() })
    expect(cart()[0].qty).toBe(1)
    expect(button('Voir le panier')).toBeDefined()
    expect(orderCalls()).toHaveLength(1)
  })
  it('ferme synchroniquement deux appels du même bouton avant le premier rerendu', async () => {
    await prepare()
    const submit = button('Envoyer la commande').props.onClick
    await act(async () => { submit(); submit() })
    expect(orderCalls()).toHaveLength(1)
    expect(pendingKeys()).toHaveLength(1)
    await act(async () => { release() })
    expect(text(renderer!.root)).toContain('Commande envoyée')
  })
  it('préserve un panier modifié pendant l’envoi confirmé', async () => {
    await prepare()
    await act(async () => { button('Envoyer la commande').props.onClick() })
    const plus = renderer!.root.findAllByType('button').filter(node => node.findAllByType('svg').some(svg => String(svg.props.className).includes('lucide-plus'))).slice(-1)[0]!
    await act(async () => { plus.props.onClick() })
    expect(cart()[0].qty).toBe(2)
    await act(async () => { release() })
    expect(cart()[0]?.qty).toBe(2)
    expect(text(renderer!.root)).toMatch(/panier.*conservé|vérifiez.*addition/i)
  })
  it('ignore un succès après Avis puis Menu sans vider le panier partagé ni effacer sa référence', async () => {
    await prepare()
    await act(async () => { button('Envoyer la commande').props.onClick() })
    const keys = pendingKeys()
    await act(async () => { button('Avis').props.onClick() })
    await act(async () => { button('Menu').props.onClick() })
    const plus = renderer!.root.findAllByType('button').find(node => node.findAllByType('svg').some(svg => String(svg.props.className).includes('lucide-plus')))!
    await act(async () => { plus.props.onClick() })
    expect(cart()[0].qty).toBe(2)
    await act(async () => { release() })
    expect(cart()[0]?.qty).toBe(2)
    expect(pendingKeys()).toEqual(keys)
    expect(calls.filter(call => call.url.endsWith('/client-events'))).toHaveLength(0)
    expect(text(renderer!.root)).not.toContain('Commande envoyée')
    expect(orderCalls()[0].init.signal?.aborted).toBe(true)
  })
  it('conserve panier et référence après fermeture sans annoncer l’annulation du serveur', async () => {
    await prepare()
    await act(async () => { button('Envoyer la commande').props.onClick() })
    const keys = pendingKeys()
    await act(async () => { renderer!.unmount() }); renderer = undefined
    await act(async () => { release() })
    expect(cart()[0].qty).toBe(1); expect(pendingKeys()).toEqual(keys)
    expect(calls.filter(call => call.url.endsWith('/client-events'))).toHaveLength(0)
    expect(orderCalls()[0].init.signal?.aborted).toBe(true)
  })
  it('ignore aussi une réponse quand la capacité de la même visite change sans rerendu', async () => {
    await prepare()
    await act(async () => { button('Envoyer la commande').props.onClick() })
    const keys = pendingKeys()
    fixture.session.values.set(`creorga-guest-visit:${companyId}:${tableId}`, JSON.stringify({ visitId: 'visit-fixture', token: 'b'.repeat(64) }))
    await act(async () => { release() })
    expect(cart()[0].qty).toBe(1); expect(pendingKeys()).toEqual(keys)
    expect(calls.filter(call => call.url.endsWith('/client-events'))).toHaveLength(0)
    expect(text(renderer!.root)).not.toContain('Commande envoyée')
  })
  it('réutilise la référence conservée quand le même panier est rejoué explicitement après fermeture', async () => {
    await prepare()
    await act(async () => { button('Envoyer la commande').props.onClick() })
    const first = JSON.parse(String(orderCalls()[0].init.body)).requestId
    await act(async () => { renderer!.unmount() }); renderer = undefined
    await act(async () => { release() })
    held = new Promise(resolve => { release = resolve })
    await mount()
    await act(async () => { button('Voir le panier').props.onClick() })
    await act(async () => { button('Envoyer la commande').props.onClick() })
    expect(orderCalls()).toHaveLength(2)
    expect(JSON.parse(String(orderCalls()[1].init.body)).requestId).toBe(first)
    await act(async () => { release() })
    expect(text(renderer!.root)).toContain('Commande envoyée')
  })
  it('capture la version et les lignes du panier dans le même événement synchrone', async () => {
    await prepare()
    const submit = button('Envoyer la commande').props.onClick
    const plus = renderer!.root.findAllByType('button').filter(node => node.findAllByType('svg').some(svg => String(svg.props.className).includes('lucide-plus'))).slice(-1)[0]!
    await act(async () => { plus.props.onClick(); submit() })
    expect(JSON.parse(String(orderCalls()[0].init.body)).items[0].qty).toBe(2)
    await act(async () => { release() })
    expect(cart()).toEqual([])
  })
})
