import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, Fragment, type ReactNode } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import toast, { useToasterStore } from 'react-hot-toast'
import { AxiosError } from 'axios'

vi.hoisted(() => {
  const saved = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  } })
})
const { default: HrTimePage } = await import('./HrTimePage')
const { default: api } = await import('@/lib/api')
const { useAuthStore } = await import('@/stores/authStore')
const originalAdapter = api.defaults.adapter
let renderer: ReactTestRenderer | undefined
let records: Record<string, any[]>, posts: Array<{ company: string; body: any }>, requests: Array<{ company: string; method: string; url: string }>
let releasePost: () => void, postGate: Promise<void>, outcome: 'ok' | 'network' | 400 | 500 | 'refresh-failure'
let failRefresh: boolean
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
const button = (name: string) => renderer!.root.findAllByType('button').find(node => text(node).trim() === name)!
const form = () => renderer!.root.findByType('form')
const articles = () => renderer!.root.findAllByType('article')
const notificationText = () => text(renderer!.root.findByProps({ 'aria-label': 'Notifications observées' }))
const event = () => ({ preventDefault() {} })
function Notifications() {
  const { toasts } = useToasterStore()
  return createElement('section', { 'aria-label': 'Notifications observées' }, toasts.map(item =>
    createElement('div', { key: item.id }, typeof item.message === 'function' ? (item.message as (value: typeof item) => ReactNode)(item) : item.message)))
}
function identify(userId = 'employe-fictif-a', activeCompany = 'societe-fictive-a') {
  useAuthStore.getState().setAuth({ accessToken: 'fixture-' + userId,
    user: { id: userId, email: `${userId}@fixture.invalid`, firstName: 'Employé', lastName: userId.endsWith('a') ? 'FICTIF A' : 'FICTIF B', avatar: null },
    companies: ['societe-fictive-a', 'societe-fictive-b'].map(companyId => ({ id: `${userId}-${companyId}`, userId, companyId, role: 'EMPLOYEE', isActive: true,
      businessAccess: { role: 'EMPLOYEE', capabilities: ['hr.self'], revision: `leave-${userId}-${companyId}`, version: 1 },
      company: { id: companyId, name: companyId, legalName: null, vatNumber: null, currency: 'EUR' } })),
  })
  if (activeCompany !== 'societe-fictive-a') { useAuthStore.getState().setActiveCompany(activeCompany); freshAccess(activeCompany) }
}
function freshAccess(companyId: string) {
  const state = useAuthStore.getState()
  state.setBusinessAccess({ role: 'EMPLOYEE', capabilities: ['hr.self'], revision: `leave-${state.user!.id}-${companyId}`, version: 1 }, companyId, state.user!.id)
}
beforeEach(() => {
  posts = []; requests = []; records = { 'societe-fictive-a': [], 'societe-fictive-b': [] }; outcome = 'ok'; failRefresh = false
  postGate = new Promise(resolve => { releasePost = resolve })
  toast.remove()
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5174', pathname: '/hr/conges' }, localStorage })
  useAuthStore.setState({ logoutRevocationPending: false }); identify()
  // Vrais formulaire, store, intercepteurs et notifications. Seul le transport
  // est remplacé ; le faux serveur conserve une ligne même si sa réponse est perdue.
  api.defaults.adapter = async config => {
    const method = config.method || 'get', url = config.url || '', company = String(config.headers['x-company-id'])
    requests.push({ company, method, url })
    let data: any, status = 200
    if (method === 'get' && url === '/hr/team') {
      const user = useAuthStore.getState().user!
      data = [{ userId: user.id, user: { firstName: user.firstName, lastName: user.lastName, email: user.email } }]
    } else if (method === 'get' && url === '/hr/punches') data = []
    else if (method === 'get' && url === '/hr/leave-requests') {
      if (failRefresh) throw new AxiosError('Liste indisponible', 'ERR_BAD_RESPONSE', config, undefined,
        { config, status: 500, statusText: 'fixture', headers: {}, data: { message: 'Liste RH indisponible' } })
      data = structuredClone(records[company])
    } else if (method === 'post' && url === '/hr/leave-requests') {
      const body = JSON.parse(config.data), id = `demande-fictive-${posts.length + 1}`, result = { id, ...body, status: 'PENDING', createdAt: '2026-10-17T13:00:00Z' }
      posts.push({ company, body }); await postGate
      if (outcome !== 400) records[company].push({ ...result, user: { firstName: 'Employé', lastName: 'FICTIF' } })
      if (outcome === 'network') throw new AxiosError('Réponse perdue après écriture fictive', 'ERR_NETWORK', config)
      if (outcome === 400 || outcome === 500) throw new AxiosError('Refus ou issue inconnue', 'ERR_BAD_RESPONSE', config, undefined,
        { config, status: outcome, statusText: 'fixture', headers: {}, data: { message: outcome === 400 ? 'Période de congé invalide' : 'Erreur serveur' } })
      if (outcome === 'refresh-failure') failRefresh = true
      data = result; status = 201
    } else throw Error(`Transport inattendu dans les congés fictifs : ${method} ${url}`)
    return { config, status, statusText: 'fixture', headers: {}, data }
  }
})
afterEach(async () => {
  releasePost()
  await act(async () => { renderer?.unmount() })
  renderer = undefined; api.defaults.adapter = originalAdapter
  useAuthStore.getState().logout(); toast.remove(); vi.unstubAllGlobals()
})
async function mount() {
  await act(async () => { renderer = create(createElement(Fragment, null, createElement(HrTimePage, { view: 'leaves' }), createElement(Notifications))) })
}
async function fill(note = 'FICTIVE — demande unique') {
  const inputs = form().findAllByType('input')
  for (const [index, value] of ['2026-10-24', '2026-10-24', note].entries()) await act(async () => { inputs[index].props.onChange({ target: { value } }) })
}
async function start() {
  let pending!: Promise<void>
  await act(async () => { pending = form().props.onSubmit(event()) })
  return { finish: async () => { await act(async () => { releasePost(); await pending }) } }
}

describe('Congés : soumission unique et issue visible sans reprise silencieuse', () => {
  it('deux soumissions immédiates du vrai formulaire ne créent qu’une demande et une confirmation', async () => {
    await mount(); await fill()
    const submit = form().props.onSubmit
    let pending!: Promise<void[]>
    await act(async () => { pending = Promise.all([submit(event()), submit(event())]) })
    try {
      expect(posts).toHaveLength(1)
      expect(form().findByType('button').props.disabled).toBe(true)
    } finally { await act(async () => { releasePost(); await pending }) }
    expect(records['societe-fictive-a']).toHaveLength(1)
    expect(articles()).toHaveLength(1)
    expect(text(articles()[0])).toContain('FICTIVE — demande unique')
    expect(notificationText().match(/Demande de congé enregistrée/g)).toHaveLength(1)
    expect(form().findAllByType('input').map(input => input.props.value)).toEqual(['', '', ''])
  })

  it.each(['network', 500] as const)('une issue %s garde les valeurs et bloque un second POST même après actualisation', async failure => {
    outcome = failure
    await mount(); await fill()
    const pending = await start(); await pending.finish()
    expect(records['societe-fictive-a']).toHaveLength(1)
    expect(text(renderer!.root)).toContain('peut avoir été enregistrée')
    expect(text(renderer!.root)).not.toContain('Enregistrement impossible')
    expect(text(renderer!.root)).not.toContain('Aucune demande de congé.')
    expect(notificationText()).not.toContain('Demande de congé enregistrée')
    expect(form().findAllByType('input').map(input => input.props.value)).toEqual(['2026-10-24', '2026-10-24', 'FICTIVE — demande unique'])
    expect(form().findByType('button').props.disabled).toBe(true)
    await act(async () => { await form().props.onSubmit(event()) })
    await act(async () => { button('Actualiser').props.onClick() })
    expect(articles()).toHaveLength(1)
    expect(posts).toHaveLength(1)
    expect(form().findByType('button').props.disabled).toBe(true)
  })

  it('un refus 400 garde le formulaire et permet seulement une nouvelle soumission explicite corrigée', async () => {
    outcome = 400
    await mount(); await fill()
    const pending = await start(); await pending.finish()
    expect(text(renderer!.root)).toContain('Période de congé invalide')
    expect(form().findByType('button').props.disabled).not.toBe(true)
    expect(posts).toHaveLength(1)
    expect(records['societe-fictive-a']).toEqual([])
    outcome = 'ok'; await fill('FICTIVE — correction explicite')
    await act(async () => { await form().props.onSubmit(event()) })
    expect(posts).toHaveLength(2)
    expect(articles()).toHaveLength(1)
    expect(text(articles()[0])).toContain('correction explicite')
  })

  it('un POST confirmé suivi d’une panne de lecture ne devient pas un échec de création', async () => {
    outcome = 'refresh-failure'
    await mount(); await fill()
    const pending = await start(); await pending.finish()
    expect(records['societe-fictive-a']).toHaveLength(1)
    expect(posts).toHaveLength(1)
    expect(text(renderer!.root)).toContain('Demande de congé enregistrée')
    expect(text(renderer!.root)).toContain('liste n’a pas pu être actualisée')
    expect(text(renderer!.root)).not.toContain('Enregistrement impossible')
    expect(articles()).toHaveLength(1)
    expect(form().findAllByType('input').map(input => input.props.value)).toEqual(['', '', ''])
  })

  it.each(['company', 'user', 'session'] as const)('une réponse tardive après changement %s ne touche pas le nouveau formulaire ni ses notifications', async change => {
    await mount(); await fill('FICTIVE — ancienne identité')
    const staleSubmit = form().props.onSubmit, pending = await start()
    await act(async () => {
      if (change === 'company') { useAuthStore.getState().setActiveCompany('societe-fictive-b'); freshAccess('societe-fictive-b') }
      else identify(change === 'user' ? 'employe-fictif-b' : 'employe-fictif-a')
    })
    expect(form().findAllByType('input').map(input => input.props.value)).toEqual(['', '', ''])
    await fill('FICTIVE — nouvelle identité')
    const readsBeforeResponse = requests.filter(request => request.method === 'get').length
    await pending.finish()
    await act(async () => { await staleSubmit(event()) })
    expect(posts).toHaveLength(1)
    expect(requests.filter(request => request.method === 'get')).toHaveLength(readsBeforeResponse)
    expect(notificationText()).toBe('')
    expect(form().findAllByType('input').map(input => input.props.value)).toEqual(['2026-10-24', '2026-10-24', 'FICTIVE — nouvelle identité'])
    expect(text(renderer!.root)).not.toContain('FICTIVE — ancienne identité')
    expect(form().findByType('button').props.disabled).not.toBe(true)
  })

  it('une réponse reçue après fermeture de la page ne déclenche ni relecture ni notification', async () => {
    await mount(); await fill()
    const pending = await start(), count = requests.length
    await act(async () => { renderer!.unmount() }); renderer = undefined
    await pending.finish()
    expect(requests).toHaveLength(count)
    await act(async () => { renderer = create(createElement(Notifications)) })
    expect(notificationText()).toBe('')
  })
})
