import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, Fragment, useLayoutEffect } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

const { values, writes } = vi.hoisted(() => {
  const values = new Map<string, string>(), writes: string[] = []
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { writes.push(key); values.set(key, value) }, removeItem: (key: string) => { writes.push(key); values.delete(key) } } })
  return { values, writes }
})
const { default: OnboardingRedirect } = await import('./OnboardingRedirect')
const { default: RequireAuth } = await import('./RequireAuth')
const { useAuthStore } = await import('@/stores/authStore')
const { onboardingKey } = await import('@/lib/onboarding')
let renderer: ReactTestRenderer | undefined
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
const path = () => text(renderer!.root.findByProps({ 'aria-label': 'Route observée' }))
function Location() { return createElement('output', { 'aria-label': 'Route observée' }, useLocation().pathname) }
function identify(role: 'OWNER' | 'ADMIN' | 'EMPLOYEE', capabilities: string[] | null) {
  useAuthStore.setState({ logoutRevocationPending: false })
  useAuthStore.getState().setAuth({ accessToken: 'fictitious-onboarding', user: { id: 'onboarding-self', email: 'onboarding@fixture.invalid', firstName: 'FICTIF', lastName: role, avatar: null },
    companies: ['onboarding-a', 'onboarding-b'].map(companyId => ({ id: `${companyId}-member`, userId: 'onboarding-self', companyId, role, isActive: true,
      businessAccess: capabilities ? { role, capabilities, revision: `${companyId}-${role}`, version: 1 } : undefined,
      company: { id: companyId, name: companyId, legalName: null, vatNumber: null, currency: 'EUR' } })) })
}
function grant(capabilities: string[], version = 2) { const state = useAuthStore.getState(); state.setBusinessAccess({ role: 'OWNER', capabilities, revision: `grant-${state.companyId}-${version}`, version }, state.companyId!, state.user!.id) }
async function mount(initialPath = '/modules', revokeBeforeEffect = false) {
  function Revoke() { useLayoutEffect(() => { if (revokeBeforeEffect) useAuthStore.getState().setBusinessAccess(null, 'onboarding-a', 'onboarding-self') }, []); return null }
  await act(async () => { renderer = create(createElement(MemoryRouter, { initialEntries: [initialPath] }, createElement(Fragment, null,
    createElement(Revoke), createElement(OnboardingRedirect), createElement(Location), createElement(Routes, null,
      createElement(Route, { path: '/modules', element: createElement('main', null, 'Modules opérationnels FICTIFS') }),
      createElement(Route, { path: '/setup', element: createElement(RequireAuth, { children: createElement('main', null, 'Réglages autorisés FICTIFS') }) }),
      createElement(Route, { path: '*', element: createElement('main', null, 'Autre parcours FICTIF') }))))) })
}
beforeEach(() => { values.clear(); writes.length = 0; vi.stubGlobal('window', { location: { origin: 'http://localhost:5174', pathname: '/modules' }, localStorage }) })
afterEach(async () => { await act(async () => { renderer?.unmount() }); renderer = undefined; useAuthStore.getState().logout(); vi.unstubAllGlobals() })

describe('onboarding monté : réglages réservés aux capacités courantes', () => {
  it('EMPLOYEE reste aux modules sans clé locale et la route de paramétrage reste refusée', async () => {
    identify('EMPLOYEE', ['hr.self', 'service.read'])
    await mount()
    expect(path()).toBe('/modules')
    expect(text(renderer!.root)).toContain('Modules opérationnels FICTIFS')
    expect(values.has(onboardingKey('onboarding-a'))).toBe(false)
    expect(writes.filter(key => key.startsWith('creorga-onboarded'))).toEqual([])
    await act(async () => { renderer!.unmount() }); renderer = undefined
    await mount('/setup')
    expect(text(renderer!.root)).toContain('Accès non autorisé')
    expect(text(renderer!.root)).not.toContain('Réglages autorisés FICTIFS')
  })
  it('OWNER avec settings.manage et configuration inachevée est dirigé vers setup sans écrire de marqueur', async () => {
    identify('OWNER', ['settings.manage'])
    await mount()
    expect(path()).toBe('/setup')
    expect(text(renderer!.root)).toContain('Réglages autorisés FICTIFS')
    expect(writes.filter(key => key.startsWith('creorga-onboarded'))).toEqual([])
  })
  it('le rôle OWNER seul ne remplace pas settings.manage', async () => {
    identify('OWNER', ['hr.self'])
    await mount()
    expect(path()).toBe('/modules')
  })
  it('attend les droits frais inconnus puis réagit à la capacité autorisée', async () => {
    identify('OWNER', null)
    await mount()
    expect(path()).toBe('/modules')
    await act(async () => { grant(['settings.manage']) })
    expect(path()).toBe('/setup')
  })
  it('le changement de société attend sa propre autorisation et ne réutilise pas le statut de la précédente', async () => {
    identify('OWNER', ['settings.manage'])
    values.set(onboardingKey('onboarding-a'), '1')
    await mount()
    expect(path()).toBe('/modules')
    await act(async () => { useAuthStore.getState().setActiveCompany('onboarding-b') })
    expect(useAuthStore.getState().businessAccess).toBeNull()
    expect(path()).toBe('/modules')
    await act(async () => { grant(['hr.self']) })
    expect(path()).toBe('/modules')
    await act(async () => { grant(['settings.manage'], 3) })
    expect(path()).toBe('/setup')
    expect(values.get(onboardingKey('onboarding-a'))).toBe('1')
    expect(values.has(onboardingKey('onboarding-b'))).toBe(false)
  })
  it('n’utilise ni ne migre une ancienne clé globale pour fabriquer une configuration dans le nouveau contexte employé', async () => {
    identify('EMPLOYEE', ['service.read'])
    values.set('creorga-onboarded', '1')
    await mount()
    expect(path()).toBe('/modules')
    expect(values.get('creorga-onboarded')).toBe('1')
    expect(values.has(onboardingKey('onboarding-a'))).toBe(false)
  })
  it('une session révoquée avant l’effet ne redirige pas avec son ancienne capacité', async () => {
    identify('OWNER', ['settings.manage'])
    await mount('/modules', true)
    expect(path()).toBe('/modules')
  })
  it.each(['/login', '/welcome', '/c', '/hr/planning', '/setup'])('ne détourne pas le parcours %s', async initialPath => {
    identify('OWNER', ['settings.manage'])
    await mount(initialPath)
    expect(path()).toBe(initialPath)
  })
})
