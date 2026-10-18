import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'

vi.hoisted(() => {
  const saved = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value), removeItem: (key: string) => saved.delete(key) } })
})
const { default: HrTimePage } = await import('./HrTimePage')
const { default: api } = await import('@/lib/api')
const { useAuthStore } = await import('@/stores/authStore')
const originalAdapter = api.defaults.adapter
let renderer: ReactTestRenderer | undefined, requests: Array<{ method: string; url: string }>, leave: any
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(child => text(child)).join('')
const buttons = (label: string) => renderer!.root.findAllByType('button').filter(node => text(node).trim() === label)

const identity = (role: 'OWNER' | 'MANAGER' | 'EMPLOYEE') => useAuthStore.getState().setAuth({ accessToken: 'fixture-token',
  user: { id: 'leave-employee-fictif', email: 'leave-employee@fixture.invalid', firstName: 'Employé', lastName: 'Fictif', avatar: null },
  companies: [{ id: 'leave-membership-fictif', userId: 'leave-employee-fictif', companyId: 'leave-company-fictive', role, isActive: true,
    businessAccess: { role, capabilities: role === 'EMPLOYEE' ? ['hr.self'] : ['hr.self', 'hr.manage'], revision: `leave-${role}`, version: 1 },
    company: { id: 'leave-company-fictive', name: 'Congés FICTIFS', legalName: null, vatNumber: null, currency: 'EUR' } }],
})
const mount = async (role: 'OWNER' | 'MANAGER' | 'EMPLOYEE') => { identity(role); await act(async () => { renderer = create(createElement(HrTimePage, { view: 'leaves' })) }) }
beforeEach(() => {
  requests = []
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5174', pathname: '/hr/conges' }, localStorage })
  leave = { id: 'leave-fictive', userId: 'leave-employee-fictif', type: 'VACATION', startDate: '2026-11-02T12:00:00Z', endDate: '2026-11-03T12:00:00Z',
    status: 'PENDING', notes: 'Congé fictif', user: { firstName: 'Employé', lastName: 'Fictif' } }
  api.defaults.adapter = async config => {
    const method = config.method || 'get', url = config.url || ''
    requests.push({ method, url })
    let data: any
    if (method === 'get' && url === '/hr/team') data = [{ userId: 'leave-employee-fictif', user: { firstName: 'Employé', lastName: 'Fictif', email: 'leave-employee@fixture.invalid' } }]
    else if (method === 'get' && url === '/hr/punches') data = []
    else if (method === 'get' && url === '/hr/leave-requests') data = [leave]
    else if (method === 'put' && url === '/hr/leave-requests/leave-fictive/status') { leave.status = JSON.parse(config.data).status; data = leave }
    else throw Error('Transport inattendu dans les tests des congés')
    return { config, status: 200, statusText: 'fixture', headers: {}, data }
  }
})
afterEach(async () => { await act(async () => { renderer?.unmount() }); renderer = undefined; api.defaults.adapter = originalAdapter; useAuthStore.getState().logout(); vi.unstubAllGlobals() })

describe('Congés montés : les décisions reflètent les rôles réellement attribués', () => {
  it('un salarié voit sa demande en attente sans commandes Approuver/Refuser', async () => {
    await mount('EMPLOYEE')
    expect(text(renderer!.root)).toContain('Congé fictif')
    expect(buttons('Approuver')).toHaveLength(0)
    expect(buttons('Refuser')).toHaveLength(0)
    expect(text(renderer!.root)).toContain('En attente')
    expect(buttons('Enregistrer la demande')).toHaveLength(1)
    expect(requests.filter(request => request.method !== 'get')).toEqual([])
  })

  it.each(['OWNER', 'MANAGER'] as const)('%s conserve les commandes de décision et peut approuver avec son clic explicite', async role => {
    await mount(role)
    expect(buttons('Approuver')).toHaveLength(1)
    expect(buttons('Refuser')).toHaveLength(1)
    await act(async () => { buttons('Approuver')[0].props.onClick() })
    expect(requests.filter(request => request.method === 'put')).toEqual([{ method: 'put', url: '/hr/leave-requests/leave-fictive/status' }])
    expect(text(renderer!.root)).toContain('Approuvé')
    expect(buttons('Approuver')).toHaveLength(0)
  })

  it('le retrait du rôle masque les décisions et neutralise un ancien handler de décision conservé', async () => {
    await mount('MANAGER')
    const staleAction = buttons('Approuver')[0].props.onClick
    await act(async () => { useAuthStore.getState().setBusinessAccess({ role: 'EMPLOYEE', capabilities: ['hr.self'], revision: 'leave-revoked', version: 2 }, 'leave-company-fictive', 'leave-employee-fictif') })
    await act(async () => { staleAction() })
    expect(requests.filter(request => request.method === 'put')).toEqual([])
    expect(buttons('Approuver')).toHaveLength(0)
    expect(buttons('Refuser')).toHaveLength(0)
    expect(text(renderer!.root)).toContain('En attente')
  })
})
