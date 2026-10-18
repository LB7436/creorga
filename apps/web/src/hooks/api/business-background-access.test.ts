import { createElement, Fragment } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const storage = vi.hoisted(() => {
  const values = new Map<string, string>()
  const local = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: local })
  return { values, local }
})
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useOverdueAlerts } from '@/lib/overdueAlerts'
import CommandPalette from '@/components/CommandPalette'
import RobiSuggestionBanner from '@/components/RobiSuggestionBanner'
import { useInvoices, useInvoice, useQuotes } from './useInvoices'
import { useCustomers, useCustomer } from './useCustomers'
import { useProducts, useProduct, useCategories } from './useProducts'

// Vrais composants, hooks, cache et client API. Seul le transport HTTP est une
// frontière fictive : retirer les gardes doit renvoyer les appels interdits et
// réafficher les données privées du cache après révocation.
const companyId = 'background-company-fictif', userId = 'background-user-fictif'
const employee = ['catalog.read', 'service.read', 'hr.self', 'hr.schedule.read', 'assistant.use', 'assistant.business.read', 'inventory.quantities.read']
const admin = [...employee, 'hr.manage', 'hr.schedule.manage', 'settings.manage', 'catalog.prices.write', 'crm.customers.read']
const full = [...admin, 'invoices.read', 'finance.revenue.read', 'marketing.read', 'reputation.read']
let renderer: ReactTestRenderer | undefined, client: QueryClient
let calls: string[]
let actionCalls: string[]
let transport: (url: string) => Promise<any>
const originalAdapter = api.defaults.adapter
function login(capabilities: string[], role: 'OWNER' | 'ADMIN' | 'EMPLOYEE' = 'EMPLOYEE') {
  useAuthStore.getState().setAuth({ accessToken: 'fictitious-background-token',
    user: { id: userId, email: 'background@fixture.invalid', firstName: 'Fictif', lastName: 'Droits', avatar: null },
    companies: [{ id: 'fictitious-membership', companyId, userId, role, isActive: true,
      businessAccess: { role, capabilities, revision: `fictitious-${capabilities.join(',')}`, version: 1 },
      company: { id: companyId, name: 'FICTIF', currency: 'EUR', legalName: null, vatNumber: null } }],
  })
}
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 15)) })
function AlertsProbe() { const alerts = useOverdueAlerts(); return createElement('output', null, JSON.stringify(alerts)) }
function LocationProbe() { const location = useLocation(); return createElement('output', { 'data-location': true }, location.pathname + location.search + location.hash) }
function ResourcesProbe() {
  const values = [useInvoices().data, useInvoice('invoice-fictif').data, useQuotes().data, useCustomers().data,
    useCustomer('customer-fictif').data, useProducts().data, useProduct('product-fictif').data, useCategories().data]
  return createElement('output', null, JSON.stringify(values))
}
const element = (children: any) => createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: ['/hr/planning'] }, children))
async function mount(children: any) { await act(async () => { renderer = create(element(children)) }); await settle() }
const globalBackground = (open = false) => createElement(Fragment, null, createElement(AlertsProbe), createElement(CommandPalette, { open, onClose() {} }), createElement(RobiSuggestionBanner))

beforeEach(() => {
  storage.values.clear(); calls = []; actionCalls = []
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5174', pathname: '/hr/planning' }, localStorage: storage.local,
    addEventListener() {}, removeEventListener() {}, setInterval: (...args: Parameters<typeof setInterval>) => setInterval(...args), clearInterval: (id: any) => clearInterval(id) })
  useAuthStore.getState().confirmLogoutRevocation(); login(employee)
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } } })
  transport = async () => []
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
    actionCalls.push(String(input))
    return Response.json({ kind: 'action', success: false, summary: 'Action fictive indisponible' })
  })
  api.defaults.adapter = async config => {
    const url = config.url || ''; calls.push(url)
    return { config, status: 200, statusText: 'fixture', headers: {}, data: await transport(url) }
  }
})

describe('Suggestion Robi : ouvrir le module sans confirmer une action inconnue', () => {
  const suggestionId = 'critical-cta-fictive'
  const location = () => renderer!.root.findByProps({ 'data-location': true }).children.join('')
  const ctaButton = () => renderer!.root.findAllByType('button').find(button => button.props.title !== 'Ignorer 24h')!
  const ignored = () => storage.local.getItem('creorga.dismissedSuggestions')
  async function banner(cta?: object, capabilities = full) {
    login(capabilities, 'OWNER')
    transport = async () => [{ id: suggestionId, title: 'ALERTE-CRITIQUE-FICTIVE', severity: 'critical', cta }]
    await mount(createElement(Fragment, null, createElement(RobiSuggestionBanner), createElement(LocationProbe)))
  }
  const click = () => act(async () => { await ctaButton().props.onClick() })

  it.each(['/inventory/stock', '/invoices/relances?status=overdue#liste'])('ouvre la route interne %s sans masquer l’alerte pendant 24 h', async route => {
    await banner({ label: 'Voir et vérifier', route })
    expect(location()).toBe('/hr/planning')
    await click()
    expect(location()).toBe(route)
    expect(ignored()).toBeNull()
    expect(JSON.stringify(renderer!.toJSON())).toContain('ALERTE-CRITIQUE-FICTIVE')
    expect(actionCalls).toEqual([])
  })

  it('préfère ouvrir le module quand le serveur propose aussi un intent', async () => {
    await banner({ label: 'Lancer campagne', route: '/crm/campagnes', intent: 'crm.send-campaign' })
    await click()
    expect(location()).toBe('/crm/campagnes')
    expect(actionCalls).toEqual([])
    expect(ignored()).toBeNull()
  })

  it.each(['https://other.invalid/collect', '//other.invalid/collect', '/\\other.invalid/collect', 'javascript:alert(1)', '/%5c%5cother.invalid', '/inventory/stock\n'])('refuse le lien non qualifié %s en gardant une erreur accessible', async route => {
    await banner({ label: 'Voir', route })
    await click()
    expect(location()).toBe('/hr/planning')
    expect(ignored()).toBeNull()
    expect(actionCalls).toEqual([])
    expect(renderer!.root.findByProps({ role: 'alert' }).children.join('')).toMatch(/lien|adresse|invalide/i)
    expect(JSON.stringify(renderer!.toJSON())).toContain('ALERTE-CRITIQUE-FICTIVE')
  })

  it.each([undefined, { label: 'Confirmer', intent: 'crm.send-campaign' }])('une suggestion sans parcours qualifié ne lance aucune commande et reste visible', async cta => {
    await banner(cta)
    await click()
    expect(actionCalls).toEqual([])
    expect(ignored()).toBeNull()
    expect(location()).toBe('/hr/planning')
    expect(renderer!.root.findByProps({ role: 'alert' }).children.join('')).toMatch(/indisponible|ne peut pas|module|assistant/i)
    expect(JSON.stringify(renderer!.toJSON())).toContain('ALERTE-CRITIQUE-FICTIVE')
  })

  it('relit les droits de la page cible avant de naviguer', async () => {
    await banner({ label: 'Catalogue', route: '/admin/catalog' }, full.filter(capability => capability !== 'catalog.prices.write'))
    await click()
    expect(location()).toBe('/hr/planning')
    expect(ignored()).toBeNull()
    expect(renderer!.root.findByProps({ role: 'alert' }).children.join('')).toMatch(/accès|droit|autorisé/i)
  })

  it('un ancien clic conservé ne navigue ni ne masque après un changement de portée', async () => {
    await banner({ label: 'Stock', route: '/inventory/stock' })
    const oldClick = ctaButton().props.onClick
    await act(async () => useAuthStore.getState().setBusinessAccess({ role: 'OWNER', capabilities: full, revision: 'changed-before-click', version: 2 }, companyId, userId))
    await act(async () => { await oldClick() })
    expect(location()).toBe('/hr/planning')
    expect(ignored()).toBeNull()
    expect(actionCalls).toEqual([])
  })

  it('seul Ignorer masque explicitement l’alerte pour 24 h', async () => {
    await banner({ label: 'Stock', route: '/inventory/stock' })
    const before = Date.now()
    await act(async () => { renderer!.root.findByProps({ title: 'Ignorer 24h' }).props.onClick() })
    expect(JSON.parse(ignored()!)[suggestionId]).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000)
    expect(JSON.stringify(renderer!.toJSON())).not.toContain('ALERTE-CRITIQUE-FICTIVE')
    expect(location()).toBe('/hr/planning')
    expect(actionCalls).toEqual([])
  })
})
afterEach(async () => {
  await act(async () => { renderer?.unmount() }); renderer = undefined
  client.clear(); api.defaults.adapter = originalAdapter
  useAuthStore.getState().logout(); vi.useRealTimers(); vi.unstubAllGlobals()
})

describe('Requêtes globales : capacités effectives et société active', () => {
  it.each([['EMPLOYEE', employee], ['ADMIN', admin]] as const)('un planning %s ne monte aucune lecture de factures, clients ou inbox interdite', async (role, capabilities) => {
    login([...capabilities], role)
    await mount(globalBackground())
    expect(calls).toEqual([])
    expect(useAuthStore.getState().businessAccess?.role).toBe(role)
  })

  it.each(['droits absents', 'société absente', 'session fermée', 'propriétaire sans capacités'])('ne lance rien avec %s', async missing => {
    login(full, 'OWNER')
    if (missing === 'droits absents') useAuthStore.setState({ businessAccess: null })
    if (missing === 'société absente') useAuthStore.setState({ companyId: null, company: null })
    if (missing === 'session fermée') useAuthStore.setState({ isAuthenticated: false })
    if (missing === 'propriétaire sans capacités') login([], 'OWNER')
    await mount(globalBackground())
    expect(calls).toEqual([])
  })

  it('charge factures et devis accordés explicitement à un EMPLOYEE', async () => {
    login([...employee, 'invoices.read'])
    await mount(createElement(AlertsProbe))
    expect(calls.sort()).toEqual(['/invoices', '/invoices/quotes'])
  })

  it('une palette fermée ne charge pas de ressources même autorisées', async () => {
    login(full, 'OWNER')
    await mount(createElement(CommandPalette, { open: false, onClose() {} }))
    expect(calls).toEqual([])
  })

  it('une palette ouverte respecte les retraits explicites catalog.read et crm.customers.read', async () => {
    login(employee.filter(capability => capability !== 'catalog.read'))
    await mount(createElement(CommandPalette, { open: true, onClose() {} }))
    expect(calls).toEqual([])
  })

  it('une palette ouverte ne charge que le catalogue permis', async () => {
    await mount(createElement(CommandPalette, { open: true, onClose() {} }))
    expect(calls).toEqual(['/products'])
  })

  it('retire immédiatement les anciens payloads privés du résultat des hooks après révocation', async () => {
    login(full, 'OWNER')
    for (const key of [['invoices', {}], ['invoices', 'detail', 'invoice-fictif'], ['quotes', {}], ['customers', 'all'],
      ['customers', 'detail', 'customer-fictif'], ['products', 'all'], ['products', 'detail', 'product-fictif'], ['categories']]) {
      client.setQueryData(key, [{ id: 'PRIVATE-FICTIF', number: 'PRIVATE-FICTIF', name: 'PRIVATE-FICTIF' }])
    }
    await mount(createElement(ResourcesProbe))
    expect(JSON.stringify(renderer!.toJSON())).toContain('PRIVATE-FICTIF')
    await act(async () => useAuthStore.getState().setBusinessAccess({ role: 'OWNER', capabilities: [], revision: 'revoked-fictif', version: 2 }, companyId, userId))
    expect(JSON.stringify(renderer!.toJSON())).not.toContain('PRIVATE-FICTIF')
    expect(calls).toEqual([])
  })

  it('efface aussi les alertes issues des factures mises en cache après retrait invoices.read', async () => {
    login([...employee, 'invoices.read'])
    client.setQueryData(['invoices', {}], [{ id: 'private-invoice', number: 'PRIVATE-FACTURE', status: 'SENT', dueDate: '2020-01-01', total: 999, customer: { firstName: 'PRIVATE', lastName: 'CLIENT' } }])
    client.setQueryData(['quotes', {}], [])
    await mount(createElement(AlertsProbe))
    expect(JSON.stringify(renderer!.toJSON())).toContain('PRIVATE-FACTURE')
    await act(async () => useAuthStore.getState().setBusinessAccess({ role: 'EMPLOYEE', capabilities: employee, revision: 'invoice-revoked', version: 2 }, companyId, userId))
    expect(JSON.stringify(renderer!.toJSON())).not.toContain('PRIVATE-FACTURE')
  })

  it('retire la suggestion chargée et arrête les polls après révocation des droits de son inbox', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    login(full, 'OWNER')
    transport = async () => [{ id: 'suggestion-fictive', title: 'PRIVATE-SUGGESTION', severity: 'critical' }]
    await mount(createElement(RobiSuggestionBanner))
    expect(JSON.stringify(renderer!.toJSON())).toContain('PRIVATE-SUGGESTION')
    await act(async () => useAuthStore.getState().setBusinessAccess({ role: 'OWNER', capabilities: ['assistant.use'], revision: 'inbox-revoked', version: 2 }, companyId, userId))
    expect(JSON.stringify(renderer!.toJSON())).not.toContain('PRIVATE-SUGGESTION')
    await act(async () => { await vi.advanceTimersByTimeAsync(60_001) })
    expect(calls).toEqual(['/agent/proactive/inbox'])
  })
})
