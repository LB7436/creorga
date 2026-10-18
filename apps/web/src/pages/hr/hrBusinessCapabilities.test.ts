import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter } from 'react-router-dom'

vi.hoisted(() => {
  const data = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) } })
})
// DOM portal only: all forms, stores, guards and transports below are real.
vi.mock('react-dom', async original => ({ ...await original<typeof import('react-dom')>(), createPortal: (children: ReactNode) => children }))
const { default: HrTimePage } = await import('./HrTimePage')
const { default: PlanningPage } = await import('./PlanningPage')
const { default: EquipePage } = await import('./EquipePage')
const { default: DossierEmployeModal } = await import('./DossierEmployeModal')
const { default: api } = await import('@/lib/api')
const { useAuthStore } = await import('@/stores/authStore')
const originalAdapter = api.defaults.adapter
let renderer: ReactTestRenderer | undefined, requests: Array<{ method: string; url: string }>, team: any[], leaves: any[], shifts: any[], writes: any[]
let fetchReply: (url: string, method: string) => Promise<any>
const self = { id: 'hr-self', email: 'hr-self@fixture.invalid', firstName: 'Salarié', lastName: 'FICTIF', avatar: null }
const colleague = { id: 'hr-other', email: 'hr-other@fixture.invalid', firstName: 'Collègue', lastName: 'SECRET' }
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
const buttons = (name: string) => renderer!.root.findAllByType('button').filter(node => text(node).trim() === name)
const capsSelf = ['hr.self', 'hr.schedule.read']
function identify(role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE', capabilities: string[], companyId = 'hr-company') {
  useAuthStore.setState({ logoutRevocationPending: false })
  useAuthStore.getState().setAuth({ accessToken: 'fictitious', user: self, companies: [{ id: 'hr-member', userId: self.id, companyId, role, isActive: true,
    businessAccess: { role, capabilities, revision: `${role}-${companyId}-${capabilities.join(',')}`, version: 1 },
    company: { id: companyId, name: 'RH FICTIF', legalName: null, vatNumber: null, currency: 'EUR' } }] })
}
async function mount(page: ReactNode) { await act(async () => { renderer = create(createElement(MemoryRouter, { initialEntries: ['/hr/planning?view=week'] }, page)) }) }
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-17T10:00:00Z'))
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5174', pathname: '/hr/planning' }, localStorage,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), addEventListener() {}, removeEventListener() {},
    setInterval, clearInterval, open: vi.fn(), confirm: () => true })
  vi.stubGlobal('document', { body: {}, addEventListener() {}, removeEventListener() {} })
  requests = []; writes = []
  team = [self, colleague].map(user => ({ userId: user.id, role: 'EMPLOYEE', user, profile: { salaireBrut: 4321, heuresHebdo: 40 } }))
  leaves = [self, colleague].map(user => ({ id: `leave-${user.id}`, userId: user.id, user, type: 'VACATION', status: 'PENDING', notes: `Note ${user.lastName}`,
    startDate: '2026-10-16T12:00:00Z', endDate: '2026-10-18T12:00:00Z' }))
  shifts = [self, colleague].map(user => ({ id: `shift-${user.id}`, userId: user.id, user, startTime: '2026-10-18T08:00:00Z', endTime: '2026-10-18T12:00:00Z', role: 'Serveur', notes: 'section:Salle' }))
  api.defaults.adapter = async config => {
    const url = config.url || '', method = config.method || 'get'; requests.push({ method, url })
    if (method === 'post' && url === '/hr/shifts') { const body = JSON.parse(config.data); writes.push(body); shifts.push({ id: 'shift-created-fictitious', ...body, user: colleague }) }
    const data = url === '/hr/team' ? team : url === '/hr/shifts' ? shifts : url === '/hr/leave-requests' ? leaves : []
    return { config, status: 200, statusText: 'fixture', headers: {}, data }
  }
  fetchReply = async url => url.endsWith('/employes') ? { permissions: { canManage: true }, employes: [self, colleague].map(user => ({
    id: user.id === self.id ? 'hr-member' : 'hr-other-member', userId: user.id, prenom: user.firstName, nom: user.lastName, email: user.email, role: 'EMPLOYEE', isActive: true,
  })) } : { permissions: { canManage: true }, employe: { id: 'hr-member', userId: self.id, prenom: self.firstName, nom: self.lastName, email: self.email, role: 'EMPLOYEE' },
    profil: { poste: 'FICTIF', salaireBrut: 4321 }, notes: [{ id: 'sensitive-note', texte: 'NOTE PRIVÉE ÉQUIPE', createdAt: '2026-10-17T10:00:00Z' }], documents: [], conges: [], shifts: 0 }
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => { const url = String(input), method = init?.method || 'GET'; requests.push({ method, url });
    return new Response(JSON.stringify(await fetchReply(url, method)), { status: 200, headers: { 'Content-Type': 'application/json' } }) })
})
afterEach(async () => { await act(async () => { renderer?.unmount() }); renderer = undefined; api.defaults.adapter = originalAdapter; useAuthStore.getState().logout(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('RH : capacités effectives, données propres et générations', () => {
  it('ADMIN délégué peut décider un congé sans devenir OWNER', async () => {
    identify('ADMIN', [...capsSelf, 'hr.manage'])
    await mount(createElement(HrTimePage, { view: 'leaves' }))
    expect(useAuthStore.getState().role).toBe('employee')
    expect(buttons('Approuver')).toHaveLength(2)
    await act(async () => { await buttons('Approuver')[1].props.onClick() })
    expect(requests.filter(request => request.method === 'put')).toEqual([{ method: 'put', url: '/hr/leave-requests/leave-hr-other/status' }])
  })
  it('le nom OWNER ne donne aucun droit RH manquant', async () => {
    identify('OWNER', capsSelf)
    await mount(createElement(HrTimePage, { view: 'leaves' }))
    expect(buttons('Approuver')).toHaveLength(0)
    expect(text(renderer!.root)).not.toContain('SECRET')
  })
  it('EMPLOYEE peut consulter/créer ses congés sans appeler /hr/team ni exposer un collègue', async () => {
    identify('EMPLOYEE', capsSelf)
    await mount(createElement(HrTimePage, { view: 'leaves' }))
    expect(requests.some(request => request.url === '/hr/team')).toBe(false)
    expect(text(renderer!.root)).toContain('Note FICTIF')
    expect(text(renderer!.root)).not.toContain('SECRET')
    expect(renderer!.root.findAllByType('option').filter(node => node.props.value === self.id)).toHaveLength(1)
  })
  it('la révocation des capacités neutralise les anciens handlers et vide la vue privilégiée', async () => {
    identify('MANAGER', [...capsSelf, 'hr.manage'])
    await mount(createElement(HrTimePage, { view: 'leaves' }))
    const stale = buttons('Approuver')[0].props.onClick
    await act(async () => { useAuthStore.getState().setBusinessAccess(null, 'hr-company', self.id) })
    await act(async () => { await stale() })
    expect(requests.filter(request => request.method === 'put')).toEqual([])
    expect(text(renderer!.root)).not.toContain('Note SECRET')
    expect(text(renderer!.root)).toContain('Accès RH non autorisé')
  })
  it('un planning personnel ne charge ni annuaire équipe ni réservations et ne propose aucune écriture ou paie', async () => {
    identify('EMPLOYEE', capsSelf)
    await mount(createElement(PlanningPage))
    expect(requests.filter(request => ['/hr/team', '/reservations'].includes(request.url))).toEqual([])
    expect(text(renderer!.root)).toContain('Salarié FICTIF')
    expect(text(renderer!.root)).not.toContain('SECRET')
    expect(text(renderer!.root)).not.toContain('Coût prévu')
    expect(buttons('Payroll')).toHaveLength(0)
    expect(buttons('Publier et envoyer')).toHaveLength(0)
    expect(renderer!.root.findAllByType('button').filter(node => String(node.props['aria-label'] || '').startsWith('Ajouter un shift'))).toHaveLength(0)
  })
  it('ADMIN avec hr.manage et hr.schedule.manage voit l’équipe et les actions, pas les coûts agrégés', async () => {
    identify('ADMIN', [...capsSelf, 'hr.manage', 'hr.schedule.manage'])
    await mount(createElement(PlanningPage))
    expect(text(renderer!.root)).toContain('Collègue SECRET')
    expect(buttons('Publier et envoyer')).toHaveLength(1)
    expect(renderer!.root.findAllByType('button').some(node => String(node.props['aria-label'] || '').startsWith('Ajouter un shift'))).toBe(true)
    expect(text(renderer!.root)).not.toContain('Coût prévu')
    expect(buttons('Payroll')).toHaveLength(0)
    expect(useAuthStore.getState().businessAccess?.role).toBe('ADMIN')
  })
  it('un ancien clic Publier ne poste rien après révocation', async () => {
    identify('MANAGER', [...capsSelf, 'hr.manage', 'hr.schedule.manage'])
    await mount(createElement(PlanningPage))
    const publish = buttons('Publier et envoyer')[0].props.onClick
    await act(async () => { useAuthStore.getState().setBusinessAccess(null, 'hr-company', self.id) })
    await act(async () => { await publish() })
    expect(requests.filter(request => request.method === 'post')).toEqual([])
    expect(text(renderer!.root)).not.toContain('Collègue SECRET')
  })
  it('ADMIN autorisé crée un créneau par le vrai formulaire sans afficher un taux fictif à 0€/h', async () => {
    identify('ADMIN', [...capsSelf, 'hr.manage', 'hr.schedule.manage'])
    await mount(createElement(PlanningPage))
    await act(async () => { renderer!.root.findAllByType('button').find(node => node.props['aria-label'] === 'Ajouter un shift 18/10/2026 10:00')!.props.onClick() })
    expect(text(renderer!.root)).not.toContain('€/h')
    await act(async () => { renderer!.root.findByProps({ id: 'planning-shift-employee' }).props.onChange({ target: { value: colleague.id } }) })
    await act(async () => { await buttons('Ajouter')[0].props.onClick() })
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ userId: colleague.id, role: 'Serveur', notes: 'section:Salle' })
    expect(renderer!.root.findAllByProps({ id: 'planning-shift-employee' })).toHaveLength(0)
    expect(shifts.filter(shift => shift.id === 'shift-created-fictitious')).toHaveLength(1)
  })
  it('les capacités financières explicites conservent la prévision et son export, sans déduire un rôle propriétaire', async () => {
    identify('MANAGER', [...capsSelf, 'hr.manage', 'hr.schedule.manage', 'finance.costs.read', 'exports.read'])
    await mount(createElement(PlanningPage))
    expect(text(renderer!.root)).toContain('Coût prévu')
    expect(buttons('Payroll')).toHaveLength(1)
  })
  it('une liste RH trop large ne transforme pas hr.self en gestionnaire', async () => {
    identify('EMPLOYEE', capsSelf)
    await mount(createElement(EquipePage))
    expect(text(renderer!.root)).toContain('Mes documents')
    expect(text(renderer!.root)).not.toContain('SECRET')
    expect(text(renderer!.root)).not.toContain('Gérer les accès')
  })
  it('un dossier salarié reste personnel et sans actions de gestion malgré un booléen serveur trop large', async () => {
    identify('EMPLOYEE', capsSelf)
    await mount(createElement(DossierEmployeModal, { userCompanyId: 'hr-member', onClose() {} }))
    expect(text(renderer!.root)).not.toContain('Enregistrer la fiche')
    expect(text(renderer!.root)).not.toContain('NOTE PRIVÉE ÉQUIPE')
    expect(buttons('Fiche')).toHaveLength(0)
  })
  it('hr.self refuse une URL directe de dossier d’un collègue avant même le transport', async () => {
    identify('EMPLOYEE', capsSelf)
    await mount(createElement(DossierEmployeModal, { userCompanyId: 'hr-other-member', onClose() {} }))
    expect(text(renderer!.root)).toContain('Accès au dossier RH non autorisé')
    expect(requests).toEqual([])
  })
  it.each(['equipe', 'dossier'] as const)('une réponse JSON tardive %s ne réinstalle pas des données de la société précédente', async page => {
    identify('ADMIN', [...capsSelf, 'hr.manage'])
    let release!: (value: any) => void
    const oldBody = new Promise(resolve => { release = resolve })
    let first = true
    vi.stubGlobal('fetch', async () => {
      const response = new Response('{}', { status: 200 })
      const old = first; first = false
      Object.defineProperty(response, 'json', { value: async () => old ? oldBody : page === 'equipe' ? { permissions: { canManage: false }, employes: [] }
        : { employe: { id: 'hr-member', userId: self.id, prenom: 'SOCIÉTÉ', nom: 'NOUVELLE' }, permissions: { canManage: false }, documents: [] } })
      return response
    })
    await mount(page === 'equipe' ? createElement(EquipePage) : createElement(DossierEmployeModal, { userCompanyId: 'hr-member', onClose() {} }))
    await act(async () => { identify('EMPLOYEE', capsSelf, 'hr-next-company') })
    await act(async () => { release(page === 'equipe' ? { permissions: { canManage: true }, employes: [{ id: 'stale', userId: 'old', prenom: 'SECRET', nom: 'ANCIEN', email: 'old@fixture.invalid' }] }
      : { permissions: { canManage: true }, employe: { id: 'stale', prenom: 'SECRET', nom: 'ANCIEN' }, profil: { salaireBrut: 4321 }, documents: [] }); await oldBody })
    expect(text(renderer!.root)).not.toContain('SECRET ANCIEN')
    expect(text(renderer!.root)).not.toContain('Salaire brut mensuel')
    expect(text(renderer!.root)).not.toContain('Gérer les accès')
  })
})
