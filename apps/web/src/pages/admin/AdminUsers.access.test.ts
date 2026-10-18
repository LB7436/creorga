import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
vi.hoisted(() => {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } })
})
import AdminUsers from './AdminUsers'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
let renderer: ReactTestRenderer | undefined
const savedAdapter = api.defaults.adapter
afterEach(() => { act(() => renderer?.unmount()); api.defaults.adapter = savedAdapter; useAuthStore.getState().logout() })
describe('administration explicite des droits métier', () => {
  it('propose les vrais rôles délégués et un éditeur de capacités distinct du rôle', async () => {
    const owner = { id: 'owner', email: 'owner@fixture.invalid', firstName: 'Patron', lastName: 'FICTIF', avatar: null }
    useAuthStore.getState().setAuth({ accessToken: 'FICTITIOUS-TOKEN', user: owner, companies: [{ id: 'owner-membership', userId: owner.id, companyId: 'cafe', role: 'OWNER', isActive: true,
      businessAccess: { role: 'OWNER', capabilities: ['permissions.manage', 'hr.manage'], revision: 'owner', version: 0 }, company: { id: 'cafe', name: 'Café FICTIF', currency: 'EUR', legalName: null, vatNumber: null } }] })
    api.defaults.adapter = async config => ({ config, status: 200, statusText: 'fixture', headers: {}, data: [{ id: 'member', userId: 'employee', companyId: 'cafe', role: 'EMPLOYEE', isActive: true, capabilities: {}, accessVersion: 0,
      user: { id: 'employee', firstName: 'Employé', lastName: 'FICTIF', email: 'employee@fixture.invalid' } }] })
    await act(async () => { renderer = create(createElement(AdminUsers)) })
    const labels = renderer!.root.findAllByType('option').map(node => node.props.value)
    expect(labels).toContain('ADMIN')
    expect(labels).toContain('SERVER')
    expect(labels).toContain('CASHIER')
    expect(renderer!.root.findAllByType('button').some(node => node.children.join('').includes('Droits'))).toBe(true)
  })
})
