import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
vi.hoisted(() => {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key),
  } })
})
import { MemoryRouter } from 'react-router-dom'
import RequireAuth from './RequireAuth'
import { useAuthStore } from '@/stores/authStore'
let renderer: ReactTestRenderer | undefined
afterEach(() => { act(() => renderer?.unmount()); useAuthStore.getState().logout() })
describe('accès direct aux écrans sensibles', () => {
  it('ne monte pas les données financières sans droit, même avec une session authentifiée', () => {
    useAuthStore.setState({ isAuthenticated: true, role: 'employee', companyId: 'cafe', businessAccess: { role: 'EMPLOYEE', capabilities: [], revision: 'deny', version: 1 } } as any)
    act(() => { renderer = create(createElement(MemoryRouter, { initialEntries: ['/accounting/rapports'] }, createElement(RequireAuth, { children: createElement('p', {}, 'FINANCES CONFIDENTIELLES FICTIVES') }))) })
    expect(JSON.stringify(renderer!.toJSON())).not.toContain('FINANCES CONFIDENTIELLES FICTIVES')
    expect(renderer!.root.findByProps({ role: 'alert' }).children.join('')).toMatch(/autorisé|autorisation/i)
  })

  it('autorise la route réelle des commandes avec le seul droit de lecture des coûts', () => {
    useAuthStore.setState({ isAuthenticated: true, role: 'employee', companyId: 'cafe', businessAccess: {
      role: 'EMPLOYEE', capabilities: ['finance.costs.read'], revision: 'costs-only', version: 1,
    } } as any)
    act(() => { renderer = create(createElement(MemoryRouter, { initialEntries: ['/inventory/commandes'] },
      createElement(RequireAuth, { children: createElement('p', {}, 'COMMANDES FOURNISSEURS FICTIVES AUTORISÉES') }))) })
    expect(JSON.stringify(renderer!.toJSON())).toContain('COMMANDES FOURNISSEURS FICTIVES AUTORISÉES')
  })

  it('refuse la même route des commandes au profil quantités seules', () => {
    useAuthStore.setState({ isAuthenticated: true, role: 'employee', companyId: 'cafe', businessAccess: {
      role: 'EMPLOYEE', capabilities: ['inventory.quantities.read'], revision: 'quantities-only', version: 1,
    } } as any)
    act(() => { renderer = create(createElement(MemoryRouter, { initialEntries: ['/inventory/commandes'] },
      createElement(RequireAuth, { children: createElement('p', {}, 'COMMANDES FOURNISSEURS PRIVÉES FICTIVES') }))) })
    expect(JSON.stringify(renderer!.toJSON())).not.toContain('COMMANDES FOURNISSEURS PRIVÉES FICTIVES')
    expect(renderer!.root.findByProps({ role: 'alert' }).children.join('')).toMatch(/autorisé|autorisation/i)
  })
})
