import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Users } from 'lucide-react'

vi.hoisted(() => {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } })
})
const { default: ModuleLayout } = await import('./ModuleLayout')
const { default: ModuleSelector } = await import('@/pages/ModuleSelector')
const { default: HrLayout } = await import('@/pages/hr/HrLayout')
const { useAuthStore } = await import('@/stores/authStore')
const { default: api } = await import('@/lib/api')
const originalAdapter = api.defaults.adapter
let renderer: ReactTestRenderer | undefined, requests: string[], mobile = false
let qc: QueryClient
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
function identify(role: 'ADMIN' | 'EMPLOYEE' | 'MANAGER', capabilities: string[]) {
  useAuthStore.setState({ logoutRevocationPending: false })
  useAuthStore.getState().setAuth({ accessToken: 'fictitious', user: { id: 'nav-self', email: 'nav@fixture.invalid', firstName: 'FICTIF', lastName: role, avatar: null },
    companies: [{ id: 'nav-member', userId: 'nav-self', companyId: 'nav-company', role, isActive: true, businessAccess: { role, capabilities, revision: capabilities.join(',') || 'empty', version: 1 },
      company: { id: 'nav-company', name: 'Navigation FICTIVE', legalName: null, vatNumber: null, currency: 'EUR' } }] })
}
function Location() { const navigate = useNavigate(); return createElement('section', null,
  createElement('output', { 'aria-label': 'Route observée' }, useLocation().pathname),
  createElement('button', { onClick: () => navigate('/modules') }, 'Retour modules FICTIF')) }
async function mount(page: ReturnType<typeof createElement>) {
  await act(async () => { renderer = create(createElement(QueryClientProvider, { client: qc }, createElement(MemoryRouter, { initialEntries: ['/modules'] }, page, createElement(Location)))) })
}
beforeEach(() => {
  requests = []; mobile = false; qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5174', pathname: '/modules' }, localStorage,
    matchMedia: () => ({ matches: mobile, addEventListener() {}, removeEventListener() {} }), addEventListener() {}, removeEventListener() {}, setInterval, clearInterval })
  vi.stubGlobal('document', { addEventListener() {}, removeEventListener() {}, documentElement: { setAttribute() {} }, body: {} })
  api.defaults.adapter = async config => { requests.push(config.url || ''); return { config, status: 200, statusText: 'fixture', headers: {}, data: config.url === '/module-config' ? { config: {}, revision: 1 } : [] } }
  vi.stubGlobal('fetch', async (input: RequestInfo | URL) => { requests.push(String(input)); return new Response(JSON.stringify([]), { status: 200 }) })
})
afterEach(async () => { await act(async () => { renderer?.unmount() }); renderer = undefined; qc.clear(); api.defaults.adapter = originalAdapter; useAuthStore.getState().logout(); vi.unstubAllGlobals() })
const items = [{ label: 'Planning', path: '/hr/planning', icon: Users }, { label: 'Factures confidentielles', path: '/invoices/factures', icon: Users },
  { label: 'Mon dossier', path: '/hr/equipe', icon: Users }, { label: 'Administration', path: '/admin/company', icon: Users }]

describe('Navigation montée : capacités, pas étiquette propriétaire', () => {
  it.each([false, true])('la navigation mobile=%s ne propose que les pages autorisées et ne sonde pas Robi sans droit', async isMobile => {
    mobile = isMobile; identify('EMPLOYEE', ['hr.self', 'hr.schedule.read'])
    await mount(createElement(ModuleLayout, { title: 'FICTIF', color: '#991b1b', items }))
    const links = renderer!.root.findAllByType('a').map(node => node.props.href)
    expect(links).toEqual(['/hr/planning', '/hr/equipe'])
    expect(requests.filter(url => url.includes('/agent/'))).toEqual([])
  })
  it('aucune capacité courante ne laisse visibles des liens privés précédemment autorisés', async () => {
    identify('MANAGER', ['hr.self', 'hr.schedule.read', 'invoices.read'])
    await mount(createElement(ModuleLayout, { title: 'FICTIF', color: '#991b1b', items }))
    await act(async () => { useAuthStore.getState().setBusinessAccess(null, 'nav-company', 'nav-self') })
    expect(renderer!.root.findAllByType('a')).toHaveLength(0)
  })
  it('ADMIN délégué ouvre le module RH sans alias OWNER et une ancienne carte ne navigue pas après révocation', async () => {
    identify('ADMIN', ['hr.self', 'hr.schedule.read', 'hr.manage', 'settings.manage'])
    await mount(createElement(ModuleSelector))
    const card = renderer!.root.findByProps({ 'data-module-id': 'hr' }).find(node => node.props.role === 'button')
    expect(text(card)).not.toContain('Réservé au propriétaire')
    await act(async () => { card.props.onClick() })
    expect(text(renderer!.root.findByProps({ 'aria-label': 'Route observée' }))).toBe('/hr/planning')
    expect(useAuthStore.getState().businessAccess?.role).toBe('ADMIN')
    const staleClick = card.props.onClick
    await act(async () => { renderer!.root.findAllByType('button').find(node => text(node) === 'Retour modules FICTIF')!.props.onClick() })
    await act(async () => { useAuthStore.getState().setBusinessAccess(null, 'nav-company', 'nav-self') })
    const before = text(renderer!.root.findByProps({ 'aria-label': 'Route observée' }))
    await act(async () => { staleClick() })
    expect(text(renderer!.root.findByProps({ 'aria-label': 'Route observée' }))).toBe(before)
    expect(renderer!.root.findAllByProps({ title: 'Panneau administrateur' })).toHaveLength(0)
  })
  it('le module caisse d’un serveur conduit au service, pas à un chiffre d’affaires refusé', async () => {
    identify('EMPLOYEE', ['service.read', 'hr.self'])
    await mount(createElement(ModuleSelector))
    await act(async () => { renderer!.root.findByProps({ 'data-module-id': 'pos' }).find(node => node.props.role === 'button').props.onClick() })
    expect(text(renderer!.root.findByProps({ 'aria-label': 'Route observée' }))).toBe('/pos/floor')
    expect(renderer!.root.findAllByProps({ title: 'Panneau administrateur' })).toHaveLength(0)
  })
  it('la vue RH personnelle n’appelle pas l’annuaire et ne promet pas une vue patron', async () => {
    identify('EMPLOYEE', ['hr.self', 'hr.schedule.read'])
    await mount(createElement(HrLayout))
    expect(requests.filter(url => url.includes('/hr/team'))).toEqual([])
    expect(text(renderer!.root)).not.toContain('Vue patron')
    expect(text(renderer!.root)).toContain('Mes données RH')
  })
})
