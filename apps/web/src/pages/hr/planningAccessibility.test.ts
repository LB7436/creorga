import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter } from 'react-router-dom'

vi.hoisted(() => {
  const saved = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  } })
})
// Seul le montage du portail DOM est neutralisé. Son formulaire React et ses effets restent réels.
vi.mock('react-dom', async original => ({ ...await original<typeof import('react-dom')>(), createPortal: (children: ReactNode) => children }))
const { default: PlanningPage } = await import('./PlanningPage')
const { default: api } = await import('@/lib/api')
const { useAuthStore } = await import('@/stores/authStore')
const originalAdapter = api.defaults.adapter
let renderer: ReactTestRenderer | undefined, shifts: any[], requests: Array<{ method: string; url: string }>
const employeeId = 'planning-employee-fictif'
const employeeName = 'Collaborateur Planning FICTIF'
const shift = (startTime = '2026-10-18T04:00:00.000Z', endTime = '2026-10-18T10:00:00.000Z') => ({
  id: 'shift-fictif', companyId: 'planning-company-fictive', userId: employeeId, role: 'Serveur', notes: 'section:Bar',
  startTime, endTime, breakMinutes: 30, status: 'SCHEDULED', user: { id: employeeId, firstName: 'Collaborateur', lastName: 'Planning FICTIF' },
})
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(child => text(child)).join('')
const cards = () => renderer!.root.findAll(node => node.type === 'article' && text(node).includes(employeeName))
const actionButton = (label: string) => renderer!.root.findAllByType('button').filter(node => node.props['aria-label'] === label)
const mount = async () => { await act(async () => { renderer = create(createElement(MemoryRouter, { initialEntries: ['/hr/planning?view=week'] }, createElement(PlanningPage))) }) }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-17T10:00:00.000Z'))
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5174', pathname: '/hr/planning' }, localStorage,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) })
  vi.stubGlobal('document', { body: {}, addEventListener() {}, removeEventListener() {} })
  useAuthStore.getState().setAuth({ accessToken: 'fixture-token', user: { id: 'planning-manager-fictif', email: 'planning-manager@fixture.invalid', firstName: 'Responsable', lastName: 'Fictif', avatar: null }, companies: [
    { id: 'planning-membership', userId: 'planning-manager-fictif', companyId: 'planning-company-fictive', role: 'MANAGER', isActive: true,
      businessAccess: { role: 'MANAGER', capabilities: ['hr.self', 'hr.manage', 'hr.schedule.read', 'hr.schedule.manage', 'service.read'], revision: 'planning-manager-grants', version: 1 },
      company: { id: 'planning-company-fictive', name: 'Planning FICTIF', legalName: null, vatNumber: null, currency: 'EUR' } },
  ] })
  shifts = [shift()]; requests = []
  api.defaults.adapter = async config => {
    const url = config.url || '', method = config.method || 'get'
    requests.push({ method, url })
    let data: any
    if (method === 'get' && url === '/hr/team') data = [{ userId: employeeId, role: 'EMPLOYEE', user: { id: employeeId, firstName: 'Collaborateur', lastName: 'Planning FICTIF', email: 'planning-employee@fixture.invalid' }, profile: {} }]
    else if (method === 'get' && url === '/hr/shifts') data = shifts
    else if (method === 'get' && ['/reservations', '/hr/leave-requests'].includes(url)) data = []
    else throw Error('Transport inattendu dans la recette du planning')
    return { config, status: 200, statusText: 'fixture', headers: {}, data }
  }
})
afterEach(async () => { await act(async () => { renderer?.unmount() }); renderer = undefined; api.defaults.adapter = originalAdapter; useAuthStore.getState().logout(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('planning réel : cartes lisibles indépendantes des boutons d’ajout', () => {
  it('expose le créneau du dimanche et son employé hors des descendants présentiels d’un bouton', async () => {
    await mount()
    expect(cards()).toHaveLength(1)
    const card = cards()[0]
    expect(card.props['aria-label']).toContain(employeeName)
    expect(card.props['aria-label']).toContain('18/10/2026')
    expect(text(card)).toContain('06:00 - 12:00')
    let ancestor = card.parent
    while (ancestor) {
      expect(ancestor.props.role).not.toBe('button')
      expect(ancestor.type).not.toBe('button')
      ancestor = ancestor.parent
    }
    expect(requests.filter(request => request.method !== 'get')).toEqual([])
  })

  it('le bouton natif d’ajout reste accessible sans englober la carte ni envoyer le formulaire', async () => {
    await mount()
    const buttons = actionButton('Ajouter un shift 18/10/2026 06:00')
    expect(buttons).toHaveLength(1)
    expect(buttons[0].props.type).toBe('button')
    expect(text(buttons[0])).not.toContain(employeeName)
    await act(async () => { buttons[0].props.onClick() })
    expect(renderer!.root.findAllByProps({ id: 'planning-shift-start' })[0].props.value).toBe(6)
    expect(text(renderer!.root)).toContain('dimanche 18 octobre 2026')
    expect(requests.filter(request => request.method !== 'get')).toEqual([])
  })

  it('ne fait pas disparaître un créneau contenu dans une seule heure', async () => {
    shifts = [shift('2026-10-18T04:10:00.000Z', '2026-10-18T04:40:00.000Z')]
    shifts[0].breakMinutes = 0
    await mount()
    expect(cards()).toHaveLength(1)
    expect(text(cards()[0])).toContain('06:10 - 06:40')
    expect(cards()[0].props.style.height).toBe(21)
  })

  it('un service de nuit conserve ses deux segments calendaires, pas deux shifts métier', async () => {
    shifts = [shift('2026-10-16T20:15:00.000Z', '2026-10-17T04:45:00.000Z')]
    await mount()
    expect(cards()).toHaveLength(2)
    expect(cards().map(card => text(card))).toEqual(expect.arrayContaining([expect.stringContaining('22:15 - 24:00'), expect.stringContaining('00:00 - 06:45')]))
    expect(requests.filter(request => request.method !== 'get')).toEqual([])
  })

  it('le filtre de section masque puis réaffiche la carte sans modifier le créneau', async () => {
    await mount()
    const button = (label: string) => renderer!.root.findAllByType('button').find(node => text(node).trim() === label)!
    await act(async () => { button('Salle').props.onClick() })
    expect(cards()).toHaveLength(0)
    await act(async () => { button('Bar').props.onClick() })
    expect(cards()).toHaveLength(1)
    expect(text(cards()[0])).toContain('06:00 - 12:00')
    expect(requests.filter(request => request.method !== 'get')).toEqual([])
  })
})
