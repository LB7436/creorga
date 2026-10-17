import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User, UserCompany } from '@/types'

const { elements, saved } = vi.hoisted(() => {
  const saved = new Map<string, string>()
  const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value), removeItem: (key: string) => saved.delete(key) }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  return { elements: [] as Array<{ type: unknown; props: any }>, saved }
})
// Le rendu React et les hooks restent réels. Seuls les props d'événements du
// rendu sont recueillis, afin d'exécuter les handlers sans installer un DOM.
vi.mock('react/jsx-runtime', async original => {
  const real = await original<typeof import('react/jsx-runtime')>()
  return { ...real,
    jsx: (type: any, props: any, key?: string) => { if (props?.onClick || props?.['aria-disabled']) elements.push({ type, props }); return real.jsx(type, props, key) },
    jsxs: (type: any, props: any, key?: string) => { if (props?.onClick || props?.['aria-disabled']) elements.push({ type, props }); return real.jsxs(type, props, key) },
  }
})
vi.mock('react/jsx-dev-runtime', async original => {
  const real = await original<typeof import('react/jsx-dev-runtime')>()
  return { ...real, jsxDEV: (type: any, props: any, ...args: any[]) => {
    if (props?.onClick || props?.['aria-disabled']) elements.push({ type, props })
    return (real.jsxDEV as any)(type, props, ...args)
  } }
})
const { useAuthStore } = await import('@/stores/authStore')
const { default: api } = await import('@/lib/api')
const { default: ModuleSelector } = await import('./ModuleSelector')
const { default: MobileSettings } = await import('./mobile/MobileSettings')
const adapter = api.defaults.adapter
let client: QueryClient, logoutRequests: number
function text(node: any): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(text).join(' ')
  return node?.props ? text(node.props.children) : ''
}
beforeEach(() => {
  elements.length = 0; saved.clear(); logoutRequests = 0
  vi.stubGlobal('window', { location: { pathname: '/modules', origin: 'http://localhost:5174' }, localStorage })
  vi.stubGlobal('confirm', () => true)
  client = new QueryClient()
  useAuthStore.setState({ logoutRevocationPending: false })
  const user: User = { id: 'entry-fictif', email: 'entry@fixture.invalid', firstName: 'Compte', lastName: 'FICTIF', avatar: null }
  const companies: UserCompany[] = [{ id: 'entry-membership', userId: user.id, companyId: 'entry-company', isActive: true, role: 'OWNER', company: { id: 'entry-company', name: 'Société FICTIVE', legalName: null, vatNumber: null, currency: 'EUR' } }]
  useAuthStore.getState().setAuth({ accessToken: 'fixture-token', user, companies })
  api.defaults.adapter = async config => {
    if (config.url !== '/auth/logout') throw Error('Transport inattendu dans le test de déconnexion')
    logoutRequests++
    return { config, status: 200, statusText: 'fixture', headers: {}, data: { message: 'Cookie fictif révoqué' } }
  }
})
afterEach(() => { client.clear(); api.defaults.adapter = adapter; useAuthStore.getState().logout(); useAuthStore.setState({ logoutRevocationPending: false }); vi.unstubAllGlobals() })
function render(component: typeof ModuleSelector | typeof MobileSettings) {
  renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, null, createElement(component))))
}
describe('toutes les entrées de déconnexion rejoignent la révocation sûre', () => {
  it('le sélecteur de modules révoque le cookie au lieu de seulement vider son store', async () => {
    render(ModuleSelector)
    const button = elements.find(element => element.type === 'button' && element.props.title === 'Déconnexion')
    expect(button).toBeDefined()
    button!.props.onClick()
    await vi.waitFor(() => expect(logoutRequests).toBe(1))
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    await vi.waitFor(() => expect(useAuthStore.getState().logoutRevocationPending).toBe(false))
  })
  it('les réglages mobiles révoquent le cookie sans ouvrir une route de démonstration', async () => {
    render(MobileSettings)
    const button = elements.find(element => element.type === 'div' && text(element.props.children).trim() === 'Déconnecter')
    expect(button).toBeDefined()
    button!.props.onClick()
    await vi.waitFor(() => expect(logoutRequests).toBe(1))
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(window.location.pathname).toBe('/modules')
    expect(window.location.href).toBeUndefined()
  })
  it('le reset destructif est désactivé et conserve préférences, brouillons et verrou', () => {
    saved.set('creorga.backend.remote', 'http://localhost:3002')
    useAuthStore.getState().beginLogout()
    const retainedAssistant = saved.get('creorga-assistant')
    expect(retainedAssistant).toBeTypeOf('string')
    render(MobileSettings)
    const button = elements.find(element => element.type === 'div' && /Reset complet|Réinitialisation locale/.test(text(element.props.children)))
    expect(button).toBeDefined()
    expect(button!.props['aria-disabled']).toBe(true)
    button!.props.onClick?.()
    expect(saved.get('creorga-assistant')).toBe(retainedAssistant)
    expect(saved.get('creorga.backend.remote')).toBe('http://localhost:3002')
    expect(JSON.parse(saved.get('creorga-auth')!).state.logoutRevocationPending).toBe(true)
  })
})
