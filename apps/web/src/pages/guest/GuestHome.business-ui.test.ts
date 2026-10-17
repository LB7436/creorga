import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter } from 'react-router-dom'

// Le vrai composant professionnel est monté ; seul le transport externe est simulé.
vi.mock('@/optional/entertainment', () => import('@/optional/entertainment.business'))
const { saved, session, storage, sessionStorageFixture } = vi.hoisted(() => {
  const memory = () => {
    const values = new Map<string, string>()
    return { values, storage: { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } } }
  }
  const local = memory(), scoped = memory()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: local.storage })
  return { saved: local.values, session: scoped.values, storage: local.storage, sessionStorageFixture: scoped.storage }
})
const { default: GuestHome } = await import('./GuestHome')
let renderer: ReactTestRenderer | undefined
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(child => text(child)).join('')
const button = (label: string) => renderer!.root.findAllByType('button').find(node => text(node).trim() === label)!
const companyId = 'portail-fictif', tableId = 'table-fictive', access = 'a'.repeat(64)
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  saved.clear(); session.clear()
  saved.set('creorga.guest.lang', 'fr')
  session.set(`creorga-guest-visit:${companyId}:${tableId}`, JSON.stringify({ visitId: 'visite-fictive', token: access }))
  const location = new URL(`http://localhost:5174/c?companyId=${companyId}&table=${tableId}`)
  vi.stubGlobal('sessionStorage', sessionStorageFixture)
  vi.stubGlobal('window', { location, localStorage: storage, sessionStorage: sessionStorageFixture,
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, setInterval, clearInterval })
  vi.stubGlobal('fetch', async (input: string | URL, options?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost:3002')
    if (url.pathname === '/api/portal-config') return json({ companyId, toggles: { menu: true, order: true, reviews: false, games: false },
      games: {}, welcomeMessage: '', accentColor: '#6366f1', tableNumber: tableId, themeMode: 'dark', logoDataUrl: null,
      restaurantName: 'CAFÉ FICTIF', updatedAt: 1 })
    if (url.pathname === '/api/portal-config/menu') return json({ companyId, restaurantName: 'CAFÉ FICTIF', categories: [
      { id: 'cafes-fictifs', name: 'Cafés FICTIFS', icon: '☕', products: [{ id: 'espresso-fictif', categoryId: 'cafes-fictifs',
        name: 'Espresso FICTIF', price: 2.6, taxRate: 17, description: '', image: null, allergens: [], isActive: true,
        stockTracked: false, stockQty: null, stockUnit: null, stockStatus: 'UNTRACKED', isAvailable: true }] },
    ] })
    if (url.pathname.startsWith('/api/guest/bill/')) return json({ total: 0, orderIds: [], paymentProviders: [] })
    if (url.pathname === '/api/guest/orders' && options?.method === 'POST') {
      const payload = JSON.parse(String(options.body))
      expect(payload).toMatchObject({ companyId, tableId, items: [{ productId: 'espresso-fictif', qty: 1 }] })
      expect((options.headers as Record<string, string>)['x-guest-access']).toBe(access)
      return json({ id: payload.requestId, companyId, tableId, guestVisitId: 'visite-fictive',
        items: [{ productId: 'espresso-fictif', name: 'Espresso FICTIF', qty: 1, price: 2.6 }], total: 2.6,
        status: 'received', createdAt: 1, updatedAt: 1 }, 201)
    }
    if (url.pathname.startsWith('/api/guest/orders/')) return json({ status: 'received' })
    if (url.pathname === '/api/portal-config/client-events') return json({ ok: true, persisted: false }, 202)
    throw Error(`Transport non prévu dans la recette locale du portail : ${url.pathname}`)
  })
})
afterEach(async () => { await act(async () => { renderer?.unmount() }); renderer = undefined; vi.unstubAllGlobals() })
async function mount() {
  await act(async () => { renderer = create(createElement(MemoryRouter, {
    initialEntries: [`/c?companyId=${companyId}&table=${tableId}`],
  }, createElement(GuestHome))) })
}

describe('Portail professionnel : contrat visible de commande et zone défilante', () => {
  it('présente le profil comme facultatif et laisse commander avec la visite sans inscription', async () => {
    await mount()
    expect(text(renderer!.root)).toContain('Commande sans inscription avec le QR de votre visite')
    expect(text(renderer!.root)).not.toContain('inscription requise pour commander')
    expect(button('Inscription facultative')).toBeDefined()
    await act(async () => { button('Ajouter').props.onClick() })
    await act(async () => { button('Voir le panier').props.onClick() })
    expect(renderer!.root.findAllByProps({ role: 'dialog', 'aria-label': 'Inscription client' })).toHaveLength(0)
    await act(async () => { button('Envoyer la commande').props.onClick() })
    expect(text(renderer!.root)).toContain('Commande envoyée')
    expect(saved.has('creorga-guest-client-profile-v1')).toBe(false)
  })

  it('réserve le pied au flux et une zone de contenu défilante accessible au clavier', async () => {
    await mount()
    const main = renderer!.root.findByType('main'), nav = renderer!.root.findByType('nav')
    // Contrat CSS rendu uniquement : aucun moteur de layout ni mesure 375/390 px ici.
    expect(main.parent).toBe(nav.parent)
    expect(main.parent!.props.style).toMatchObject({ height: '100dvh', overflow: 'hidden' })
    expect(main.props.style).toMatchObject({ minHeight: 0, overflowY: 'auto' })
    expect(main.props.tabIndex).toBe(0)
    expect(nav.props.style).toMatchObject({ position: 'relative', flexShrink: 0 })
    expect(nav.props.className).not.toMatch(/\bfixed\b/)
  })
})
