import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, Fragment } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
const { default: Login } = await import('./Login')
const { default: api } = await import('@/lib/api')
const { useAuthStore } = await import('@/stores/authStore')
const originalAdapter = api.defaults.adapter
const user = { id: 'admission-erp-fictive', email: 'admission-erp@fixture.invalid', firstName: 'Camille', lastName: 'FICTIF', avatar: null }
const membership = (id: string, isActive = true, role: UserCompany['role'] = 'EMPLOYEE'): UserCompany => ({
  id: 'membership-' + id, userId: user.id, companyId: id, role, isActive,
  company: { id, name: 'Établissement FICTIF ' + id, legalName: null, vatNumber: null, currency: 'EUR' },
})
let renderer: ReactTestRenderer | undefined, router: ReturnType<typeof createMemoryRouter> | undefined, client: QueryClient
let companies: UserCompany[], httpStatus: number, requestCount: number
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
const messages = () => renderer!.root.findAll(node => typeof node.type === 'string' && node.props['data-notification-type']).map(node => ({ type: node.props['data-notification-type'], text: text(node) }))
function NotificationProbe() {
  const { toasts } = useToasterStore()
  return createElement('section', null, toasts.map(item => createElement('p', { key: item.id, 'data-notification-type': item.type }, typeof item.message === 'string' ? item.message : 'Notification non textuelle')))
}
async function mount() {
  router = createMemoryRouter([
    { path: '/login', element: createElement(Login) },
    { path: '/welcome', element: createElement('h1', null, 'Accueil FICTIF') },
    { path: '/setup', element: createElement('h1', null, 'Configuration FICTIVE') },
  ], { initialEntries: ['/login'] })
  await act(async () => {
    renderer = create(createElement(QueryClientProvider, { client }, createElement(Fragment, null,
      createElement(RouterProvider, { router: router! }), createElement(NotificationProbe))))
  })
}
async function fill(name: string, value: string) {
  await act(async () => { await renderer!.root.findByProps({ name }).props.onChange({ target: { name, value }, type: 'change' }) })
}
async function submit() {
  await act(async () => { await renderer!.root.findByType('form').props.onSubmit({ preventDefault: () => {}, persist: () => {} }) })
  expect(requestCount).toBe(1)
}
const expectNoAdmission = () => {
  expect(useAuthStore.getState().isAuthenticated).toBe(false)
  expect(useAuthStore.getState().accessToken).toBeNull()
  expect(useAuthStore.getState().companyId).toBeNull()
  expect(router!.state.location.pathname).toBe('/login')
  expect(messages().filter(message => message.type === 'success')).toEqual([])
}

beforeEach(() => {
  companies = []; httpStatus = 200; requestCount = 0
  toast.remove()
  vi.stubEnv('VITE_REGISTRATION_OPEN', 'true')
  vi.stubGlobal('window', { location: { pathname: '/login', origin: 'http://localhost:5174' }, localStorage,
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }) })
  useAuthStore.getState().logout()
  useAuthStore.setState({ logoutRevocationPending: false })
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  // Transport seul simulé : formulaire RHF, Zod, effets React, store, routeur et
  // notifications restent réels. Aucun appel au serveur ou compte de campagne.
  api.defaults.adapter = async config => {
    if (config.method !== 'post' || !['/auth/login', '/auth/register'].includes(config.url || '')) throw Error('Transport inattendu dans la recette du formulaire de connexion')
    requestCount++
    if (httpStatus !== 200) throw new AxiosError('Refus fictif', 'ERR_BAD_RESPONSE', config, undefined,
      { config, status: httpStatus, statusText: 'fixture', headers: {}, data: httpStatus === 403
        ? { code: 'NO_ACTIVE_COMPANY', message: 'Aucun accès actif à un établissement. Contactez le propriétaire.' }
        : { code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Service de connexion indisponible. Réessayez.' } })
    return { config, status: 200, statusText: 'fixture', headers: {}, data: { accessToken: 'fixture-only-access-token', user, companies } }
  }
})
afterEach(async () => {
  await act(async () => { renderer?.unmount() })
  router?.dispose(); router = undefined; renderer = undefined
  client.clear(); api.defaults.adapter = originalAdapter; toast.remove()
  useAuthStore.getState().logout(); vi.unstubAllGlobals(); vi.unstubAllEnvs()
})

describe('Connexion ERP : aucune admission sans société active, même avec un ancien serveur', () => {
  it('une réponse 200 companies[] reste sur login sans setAuth, bienvenue ou faux établissement', async () => {
    await mount(); await fill('email', user.email); await fill('password', 'mot-de-passe-fictif')
    await submit()
    expectNoAdmission()
    expect(text(renderer!.root.findByProps({ role: 'alert' }))).toMatch(/actif.*propriétaire/)
  })

  it('une liste composée seulement d’adhésions désactivées est aussi refusée', async () => {
    companies = [membership('inactive-fictive', false)]
    await mount(); await fill('email', user.email); await fill('password', 'mot-de-passe-fictif')
    await submit()
    expectNoAdmission()
  })

  it('conserve uniquement l’autre adhésion active et son rôle salarié, jamais OWNER par défaut', async () => {
    companies = [membership('inactive-fictive', false, 'OWNER'), membership('active-fictive', true, 'EMPLOYEE')]
    await mount(); await fill('email', user.email); await fill('password', 'mot-de-passe-fictif')
    await submit()
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().companyId).toBe('active-fictive')
    expect(useAuthStore.getState().role).toBe('employee')
    expect(useAuthStore.getState().companies.map(item => item.companyId)).toEqual(['active-fictive'])
    expect(router!.state.location.pathname).toBe('/welcome')
  })

  it.each([403, 503])('un refus HTTP %s affiche le message réel sans admettre la session', async status => {
    httpStatus = status
    await mount(); await fill('email', user.email); await fill('password', 'mot-de-passe-fictif')
    await submit()
    expectNoAdmission()
    expect(text(renderer!.root.findByProps({ role: 'alert' }))).toContain(status === 403 ? 'Contactez le propriétaire' : 'Réessayez')
  })

  it('une inscription valide conserve l’accès propriétaire et rejoint la configuration du nouvel espace', async () => {
    companies = [membership('nouvel-espace-fictif', true, 'OWNER')]
    await mount()
    await act(async () => { renderer!.root.findAllByType('button').find(button => text(button).trim() === 'Créer mon espace')!.props.onClick() })
    await fill('email', user.email); await fill('password', 'mot-de-passe-fictif'); await fill('confirmPassword', 'mot-de-passe-fictif')
    await fill('firstName', 'Camille'); await fill('lastName', 'FICTIF'); await fill('companyName', 'Nouvel espace FICTIF')
    await submit()
    expect(useAuthStore.getState().companyId).toBe('nouvel-espace-fictif')
    expect(useAuthStore.getState().role).toBe('owner')
    expect(router!.state.location.pathname).toBe('/setup')
  })
})
