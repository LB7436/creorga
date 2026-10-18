import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, Fragment, type ReactNode } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { AxiosError } from 'axios'
import toast, { useToasterStore } from 'react-hot-toast'
import type { UserCompany } from '@/types'

vi.hoisted(() => {
  const saved = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  } })
})
const { default: InventoryOperationsPage } = await import('./InventoryOperationsPage')
const { default: api } = await import('@/lib/api')
const { useAuthStore } = await import('@/stores/authStore')
const originalAdapter = api.defaults.adapter
const all = ['inventory.quantities.read', 'inventory.adjust', 'finance.costs.read', 'finance.manage']
const supplier = { id: 'supplier-fixture', name: 'Fournisseur FICTIF' }
let renderer: ReactTestRenderer | undefined, version: number, omitCost: boolean
let requests: Array<{ method: string; url: string; company: string; body: any }>
let ingredients: Record<string, any[]>, orders: any[], gate: null | ((method: string, url: string) => Promise<void>)
let releases: Array<() => void>
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
const content = () => text(renderer!.root.findByType('main'))
const notifications = () => text(renderer!.root.findByProps({ 'aria-label': 'Notifications observées' }))
const button = (name: string) => renderer!.root.findAllByType('button').find(node => text(node).trim() === name)!
const writes = () => requests.filter(request => request.method !== 'get')
const input = (name: string) => renderer!.root.findAllByType('label').find(label => text(label).startsWith(name))!.findByType('input')
const deferred = () => { let resolve!: () => void; return { promise: new Promise<void>(done => { resolve = done }), resolve } }
function Notifications() {
  const { toasts } = useToasterStore()
  return createElement('section', { 'aria-label': 'Notifications observées' }, toasts.map(item =>
    createElement('div', { key: item.id }, typeof item.message === 'function' ? (item.message as (value: typeof item) => ReactNode)(item) : item.message)))
}
function fresh(capabilities: string[], role: UserCompany['role'] = 'EMPLOYEE') {
  const state = useAuthStore.getState()
  state.setBusinessAccess({ role, capabilities, revision: `inventory-${++version}-${state.companyId}`, version }, state.companyId!, state.user!.id)
}
function identify(capabilities = all, role: UserCompany['role'] = 'EMPLOYEE') {
  useAuthStore.setState({ logoutRevocationPending: false })
  useAuthStore.getState().setAuth({ accessToken: 'inventory-fixture-token',
    user: { id: 'inventory-human', email: 'inventory@fixture.invalid', firstName: 'Inventaire', lastName: 'FICTIF', avatar: null },
    companies: ['company-a', 'company-b'].map(companyId => ({ id: `inventory-${companyId}`, userId: 'inventory-human', companyId, role, isActive: true,
      company: { id: companyId, name: companyId, legalName: null, vatNumber: null, currency: 'EUR' } })),
  })
  fresh(capabilities, role)
}
beforeEach(() => {
  version = 0; omitCost = false; requests = []; gate = null; releases = []; toast.remove()
  ingredients = {
    'company-a': [{ id: 'ingredient-a', name: 'Café FICTIF A', unit: 'kg', currentStock: 12, minStockLevel: 2, costPerUnit: 5.5, supplier }],
    'company-b': [{ id: 'ingredient-b', name: 'Café FICTIF B', unit: 'kg', currentStock: 34, minStockLevel: 3, costPerUnit: 8.5, supplier }],
  }
  orders = [{ id: 'order-a', status: 'PENDING', total: 22, createdAt: '2026-10-18T08:00:00Z', supplier,
    items: [{ id: 'line-a', quantity: 4, unitCost: 5.5, ingredient: ingredients['company-a'][0] }] }]
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5174', pathname: '/inventory/stock' }, localStorage, confirm: () => true })
  identify()
  // Composant, store, garde de portée, intercepteurs et notifications réels.
  // Seul le transport est remplacé ; ses refus suivent les capacités de l'API.
  api.defaults.adapter = async config => {
    const method = config.method || 'get', url = config.url || '', company = String(config.headers['x-company-id'])
    const body = config.data ? JSON.parse(config.data) : undefined
    requests.push({ method, url, company, body })
    const capabilities = [...(useAuthStore.getState().businessAccess?.capabilities ?? [])]
    const allowed = (...needed: string[]) => needed.every(value => capabilities.includes(value))
    const financial = /suppliers|purchase-orders/.test(url)
    if (!allowed(...(method === 'get' ? financial ? ['finance.costs.read'] : ['inventory.quantities.read']
      : financial ? ['inventory.adjust', 'finance.costs.read'] : ['inventory.adjust']))
      || body?.costPerUnit !== undefined && !allowed('finance.manage')
      || method === 'post' && url.endsWith('purchase-orders') && !allowed('finance.manage')) {
      throw new AxiosError('Accès refusé fictif', 'ERR_BAD_RESPONSE', config, undefined,
        { config, status: 403, statusText: 'fixture', headers: {}, data: { message: 'Permission métier requise' } })
    }
    let data: any
    if (method === 'get' && url === '/inventory/ingredients') data = structuredClone(ingredients[company]).map(item => {
      if (!omitCost && allowed('finance.costs.read')) return item
      const { costPerUnit: _cost, ...quantities } = item
      if (allowed('finance.costs.read')) return quantities
      const { supplier: _supplier, ...visible } = quantities; return visible
    })
    else if (method === 'get' && url === '/inventory/suppliers') data = [supplier]
    else if (method === 'get' && url === '/inventory/purchase-orders') data = structuredClone(orders)
    else if (method === 'put' && /\/ingredients\//.test(url)) {
      const found = ingredients[company].find(item => url.endsWith('/' + item.id))!
      Object.assign(found, body); data = structuredClone(found)
    } else if (method === 'put' && /\/receive$/.test(url)) { orders[0].status = 'RECEIVED'; data = { id: 'order-a', status: 'RECEIVED' } }
    else if (method === 'post' && url === '/inventory/ingredients') {
      data = { id: 'new-ingredient', ...body }; ingredients[company].push(data)
    } else if (method === 'post' && url === '/inventory/suppliers') data = { id: 'new-supplier', ...body }
    else if (method === 'post' && url === '/inventory/purchase-orders') data = { id: 'new-order', ...body }
    else if (method === 'delete') data = { message: 'Suppression fictive confirmée' }
    else throw Error(`Transport inventaire inattendu : ${method} ${url}`)
    await gate?.(method, url)
    return { config, status: method === 'post' ? 201 : 200, statusText: 'fixture', headers: {}, data }
  }
})
afterEach(async () => {
  releases.forEach(release => release())
  await act(async () => { renderer?.unmount() }); renderer = undefined
  api.defaults.adapter = originalAdapter; useAuthStore.getState().logout(); toast.remove(); vi.unstubAllGlobals()
})
async function mount(view: 'stock' | 'suppliers' | 'orders' = 'stock') {
  await act(async () => { renderer = create(createElement(Fragment, null, createElement(InventoryOperationsPage, { view }), createElement(Notifications))) })
}
async function fill(name: string, value: string) { await act(async () => { input(name).props.onChange({ target: { value } }) }) }
function hold(method: string, suffix: string) {
  const entered = deferred(), release = deferred(); releases.push(release.resolve)
  let claimed = false
  gate = async (currentMethod, url) => { if (!claimed && currentMethod === method && url.endsWith(suffix)) { claimed = true; entered.resolve(); await release.promise } }
  return { entered: entered.promise, release: release.resolve }
}

describe('Inventaire : quantités utilisables sans droit financier', () => {
  it('charge les quantités EMPLOYEE sans fournisseurs, commandes, coûts ou formulaire d’écriture', async () => {
    identify(['inventory.quantities.read'])
    await mount()
    expect(content()).toContain('Café FICTIF A'); expect(content()).toContain('12')
    expect(requests.map(request => request.url)).toEqual(['/inventory/ingredients'])
    expect(renderer!.root.findAllByType('form')).toHaveLength(0)
    expect(renderer!.root.findAllByProps({ 'aria-label': 'Stock de Café FICTIF A' }).some(node => node.type === 'input')).toBe(false)
    expect(content()).not.toContain('Valeur estimée'); expect(content()).not.toContain('Coût'); expect(notifications()).toBe('')
    expect(content()).not.toContain('Fournisseur FICTIF')
  })
  it('permet à ADMIN d’ajuster seulement une quantité sans réécrire le coût historique', async () => {
    identify(['inventory.quantities.read', 'inventory.adjust'], 'ADMIN')
    await mount()
    const stock = renderer!.root.findByProps({ 'aria-label': 'Stock de Café FICTIF A' })
    await act(async () => { stock.props.onBlur({ target: { value: '15' } }) })
    expect(writes()).toEqual([{ method: 'put', url: '/inventory/ingredients/ingredient-a', company: 'company-a', body: { currentStock: 15 } }])
    expect(ingredients['company-a'][0].costPerUnit).toBe(5.5)
    expect(content()).toMatch(/création|Création/); expect(content()).not.toContain('Coût unitaire')
    expect(notifications()).toContain('Stock enregistré')
  })
  it.each(['suppliers', 'orders'] as const)('refuse la vue %s sans coûts avant toute lecture', async view => {
    identify(['inventory.quantities.read', 'inventory.adjust'])
    await mount(view)
    expect(renderer!.root.findAllByProps({ role: 'alert' })).not.toHaveLength(0)
    expect(requests).toEqual([]); expect(renderer!.root.findAllByType('form')).toHaveLength(0)
  })
  it.each([['suppliers', '/inventory/suppliers'], ['orders', '/inventory/purchase-orders']] as const)('charge seulement les données de la vue %s pour une lecture financière', async (view, url) => {
    identify(['inventory.quantities.read', 'finance.costs.read'])
    await mount(view)
    expect(requests.map(request => request.url)).toEqual([url])
    expect(renderer!.root.findAllByType('form')).toHaveLength(0)
    expect(renderer!.root.findAllByType('button').some(node => text(node) === 'Réceptionner')).toBe(false)
  })
  it('ne transforme pas un coût manquant en zéro ou en valorisation chiffrée', async () => {
    omitCost = true
    await expect(mount()).resolves.toBeUndefined()
    expect(content()).toContain('Non renseigné'); expect(content()).toContain('Indisponible')
    expect(content()).not.toContain('NaN'); expect(content()).not.toContain('0.00 €')
  })
})

describe('Inventaire : décisions et saisies explicites', () => {
  it('exige un coût explicitement saisi avant de créer un article, y compris pour le propriétaire', async () => {
    identify(all, 'OWNER'); await mount()
    expect(input('Coût unitaire').props.value).toBe('')
    await fill('Nom', 'Article fictif')
    await act(async () => { await renderer!.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
    expect(writes()).toEqual([])
    await fill('Coût unitaire', '2.35')
    await act(async () => { await renderer!.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
    expect(writes()).toHaveLength(1); expect(writes()[0].body.costPerUnit).toBe(2.35)
  })
  it('la réception autorisée ne demande pas de droit de gestion des coûts et ne renvoie pas de coût', async () => {
    identify(['inventory.quantities.read', 'inventory.adjust', 'finance.costs.read'])
    await mount('orders')
    await act(async () => { button('Réceptionner').props.onClick() })
    expect(writes()).toEqual([{ method: 'put', url: '/inventory/purchase-orders/order-a/receive', company: 'company-a', body: undefined }])
    expect(content()).toContain('Réceptionné'); expect(notifications()).toContain('Réception enregistrée')
  })
  it('un ancien handler de quantité ne soumet rien après retrait de la capacité', async () => {
    await mount()
    const stale = renderer!.root.findByProps({ 'aria-label': 'Stock de Café FICTIF A' }).props.onBlur
    await act(async () => { fresh(['inventory.quantities.read']) })
    await act(async () => { stale({ target: { value: '77' } }) })
    expect(writes()).toEqual([]); expect(notifications()).toBe('')
  })
  it.each(['revision', 'company'] as const)('masque immédiatement les anciennes valeurs après changement %s et ignore la lecture tardive', async change => {
    await mount()
    const held = hold('get', '/ingredients')
    await act(async () => { button('Actualiser').props.onClick() })
    await held.entered
    await act(async () => {
      if (change === 'company') useAuthStore.getState().setActiveCompany('company-b')
      fresh(['inventory.quantities.read'])
    })
    expect(content()).not.toContain('66.00 €'); expect(content()).not.toContain('Coût')
    if (change === 'company') { expect(content()).not.toContain('Café FICTIF A'); expect(content()).toContain('Café FICTIF B') }
    await act(async () => { held.release() })
    expect(notifications()).toBe(''); expect(content()).not.toContain('66.00 €')
  })
  it('une réponse de modification tardive ne touche ni les quantités ni les notifications de la nouvelle société', async () => {
    await mount()
    const held = hold('put', '/ingredient-a')
    await act(async () => { renderer!.root.findByProps({ 'aria-label': 'Stock de Café FICTIF A' }).props.onBlur({ target: { value: '99' } }) })
    await held.entered
    await act(async () => { useAuthStore.getState().setActiveCompany('company-b'); fresh(all) })
    await act(async () => { held.release() })
    expect(content()).toContain('Café FICTIF B')
    expect(renderer!.root.findByProps({ 'aria-label': 'Stock de Café FICTIF B' }).props.value).toBe('34')
    expect(notifications()).toBe(''); expect(writes()).toHaveLength(1)
  })
})
