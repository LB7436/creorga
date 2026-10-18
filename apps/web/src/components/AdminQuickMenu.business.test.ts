import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter, useLocation } from 'react-router-dom'

vi.hoisted(() => {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } })
})
// Seule la frontière de rendu dans le DOM est adaptée au renderer sans DOM.
vi.mock('react-dom', async original => ({ ...await original<typeof import('react-dom')>(), createPortal: (children: ReactNode) => children }))

import AdminQuickMenu from './AdminQuickMenu'
import { useAuthStore } from '@/stores/authStore'
import { useEnvMode } from '@/stores/envModeStore'

let renderer: ReactTestRenderer | undefined
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
const company = (id: string, name: string) => ({ id, name, legalName: null, vatNumber: null, currency: 'EUR' })

function identify(name = 'Café FICTIF') {
  useAuthStore.getState().setAuth({ accessToken: 'FICTITIOUS-TOKEN',
    user: { id: 'menu-user', email: 'menu@fixture.invalid', firstName: 'Compte', lastName: 'FICTIF', avatar: null },
    companies: [{ id: 'menu-membership', userId: 'menu-user', companyId: 'menu-company', role: 'ADMIN', isActive: true,
      businessAccess: { role: 'ADMIN', capabilities: ['settings.manage'], revision: 'menu-fixture', version: 0 },
      company: company('menu-company', name) }] })
}
function Location() { return createElement('output', { 'aria-label': 'Destination observée' }, useLocation().pathname) }
async function mountOpen() {
  await act(async () => { renderer = create(createElement(MemoryRouter, { initialEntries: ['/modules'] }, createElement(AdminQuickMenu), createElement(Location))) })
  await act(async () => { renderer!.root.findByProps({ title: 'Panneau administrateur' }).props.onClick() })
}

beforeEach(() => {
  vi.stubGlobal('document', { addEventListener() {}, removeEventListener() {}, body: {} })
  useEnvMode.getState().reset()
  identify()
})
afterEach(() => {
  act(() => renderer?.unmount()); renderer = undefined
  useEnvMode.getState().reset(); useAuthStore.getState().logout(); vi.unstubAllGlobals()
})

describe('panneau métier : libellés honnêtes et contexte courant', () => {
  it('annonce l’administration des utilisateurs sans promettre une console founder, et conserve /admin', async () => {
    await mountOpen()
    const content = text(renderer!.root)
    expect(content).toContain('Administration de l’établissement')
    expect(content).toContain('Administration & utilisateurs')
    expect(content).toContain('Société, accès et catalogue')
    expect(content).not.toMatch(/Super Admin|Panel founder|Admin panel/)
    const action = renderer!.root.findAllByType('button').find(node => text(node).includes('Administration & utilisateurs'))
    expect(action).toBeDefined()
    await act(async () => { action!.props.onClick() })
    expect(text(renderer!.root.findByProps({ 'aria-label': 'Destination observée' }))).toBe('/admin')
  })

  it.each(['Café FICTIF', 'Restaurant FICTIF', 'Bar FICTIF'])('affiche la société active %s sans établissement de démonstration', async name => {
    identify(name)
    await mountOpen()
    expect(text(renderer!.root)).toContain(`Creorga OS v2.0 · ${name}`)
    expect(text(renderer!.root)).not.toContain('Café um Rond-Point')
  })

  it('actualise le pied du panneau déjà ouvert si le contexte de société change', async () => {
    await mountOpen()
    await act(async () => { useAuthStore.setState({ company: company('other-company', 'Autre société FICTIVE'), companyId: 'other-company' }) })
    expect(text(renderer!.root)).toContain('Creorga OS v2.0 · Autre société FICTIVE')
    expect(text(renderer!.root)).not.toContain('Café FICTIF')
    expect(text(renderer!.root)).not.toContain('Café um Rond-Point')
  })

  it('n’invente pas un établissement quand aucun nom courant n’est disponible', async () => {
    await act(async () => { useAuthStore.setState({ company: null }) })
    await mountOpen()
    expect(text(renderer!.root)).toContain('Creorga OS v2.0')
    expect(text(renderer!.root)).not.toContain('Creorga OS v2.0 ·')
    expect(text(renderer!.root)).not.toContain('Café um Rond-Point')
  })

  it.each([
    ['Mode test', 'testMode'],
    ['Mode développeur', 'developerMode'],
    ['Affichage « Bientôt »', 'comingSoonMode'],
  ] as const)('traduit %s sans changer son interrupteur', async (label, key) => {
    await mountOpen()
    const labelNode = renderer!.root.findAllByType('span').find(node => text(node) === label)
    expect(labelNode).toBeDefined()
    expect(useEnvMode.getState()[key]).toBe(false)
    await act(async () => { labelNode!.parent!.findByType('button').props.onClick() })
    expect(useEnvMode.getState()[key]).toBe(true)
    await act(async () => { labelNode!.parent!.findByType('button').props.onClick() })
    expect(useEnvMode.getState()[key]).toBe(false)
  })
})
