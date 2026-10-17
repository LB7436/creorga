import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'

const storage = vi.hoisted(() => {
  const values = new Map<string, string>()
  const local = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: local })
  return { values, local }
})
// Actual panel, router, assistant/auth stores and fetchAuth. Only network and
// browser device APIs are fixture boundaries; no Chrome, SMTP, Ollama or PG.
const { default: AssistantPanel } = await import('./AssistantPanel')
const { useAssistant } = await import('@/stores/assistantStore')
const { useAuthStore } = await import('@/stores/authStore')
const originalAdapter = axios.defaults.adapter
let renderer: ReactTestRenderer | undefined
let requests: Array<{ url: string; init: RequestInit }>
let transport: (url: string, init: RequestInit) => Promise<Response>
const deferred = <T,>() => { let resolve!: (value: T) => void; return { promise: new Promise<T>(done => { resolve = done }), resolve: (value: T) => resolve(value) } }
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(text).join('')
const buttons = (label: string) => renderer!.root.findAllByType('button').filter(node => text(node).trim() === label)
const messages = () => useAssistant.getState().messages
const lastMessage = () => messages()[messages().length - 1]
const token = (actor = 'owner-fixture', label = 'initial') => `fixture.${btoa(JSON.stringify({ userId: actor, label }))}.not-a-real-signature`
const login = (companyId = 'company-fixture', actor = 'owner-fixture') => useAuthStore.getState().setAuth({
  accessToken: token(actor), user: { id: actor, email: actor + '@fixture.invalid', firstName: 'Fictif', lastName: 'Recette', avatar: null },
  companies: [{ id: 'membership-fixture', userId: actor, companyId, role: 'OWNER', isActive: true,
    company: { id: companyId, name: 'Société fictive', legalName: null, vatNumber: null, currency: 'EUR' } }],
})
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve() })
const mount = async () => { await act(async () => { renderer = create(createElement(MemoryRouter, { initialEntries: ['/owner'] }, createElement(AssistantPanel))) }) }
async function send(value = 'Sans rien modifier, vérifie les informations disponibles.') {
  await act(async () => { renderer!.root.findAllByType('input').find(node => typeof node.props.placeholder === 'string')!.props.onChange({ target: { value } }) })
  await act(async () => { renderer!.root.findByType('form').props.onSubmit({ preventDefault() {} }); await Promise.resolve() })
}

beforeEach(() => {
  storage.values.clear(); requests = []
  vi.stubGlobal('window', { innerWidth: 1440, innerHeight: 900, location: { origin: 'http://localhost:5174', pathname: '/owner' }, localStorage: storage.local,
    addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) })
  useAuthStore.getState().confirmLogoutRevocation(); login()
  useAssistant.setState({ histories: {}, conversations: [], currentConversationId: null, messages: [], attachments: [], open: true, mode: 'idle', voiceEnabled: false, autoListen: false })
  useAssistant.getState().newConversation()
  transport = async () => { throw Error('Unexpected fixture network operation') }
  vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input)
    if (url !== 'http://localhost:3002/api/agent/super-ask') throw Error('Unapproved fixture destination')
    requests.push({ url, init }); return transport(url, init)
  })
  axios.defaults.adapter = async () => { throw Error('Unexpected fixture auth operation') }
})
afterEach(async () => {
  await act(async () => { renderer?.unmount() }); renderer = undefined
  axios.defaults.adapter = originalAdapter; useAuthStore.getState().logout(); vi.useRealTimers(); vi.unstubAllGlobals()
})

describe('Robi : arrêt explicite et réponses tardives', () => {
  it('arrête la demande depuis un vrai bouton sans prétendre annuler une action déjà effectuée', async () => {
    const held = deferred<Response>(); transport = async () => held.promise
    await mount(); await send()
    expect(useAssistant.getState().mode).toBe('thinking')
    expect(buttons('Arrêter')).toHaveLength(1)
    await act(async () => { buttons('Arrêter')[0].props.onClick() })
    expect(requests[0].init.signal?.aborted).toBe(true)
    expect(useAssistant.getState().mode).toBe('idle')
    expect(lastMessage()?.text).toMatch(/interruption.*ne.*annulation|ne.*annule/i)
    held.resolve(Response.json({ kind: 'action', success: true, summary: 'Ancienne réponse tardive' })); await flush()
    expect(messages().some(message => message.text.includes('Ancienne réponse tardive'))).toBe(false)
  })

  it('ne laisse pas une ancienne réponse ou son finally terminer la demande suivante de la même conversation', async () => {
    const first = deferred<Response>(), second = deferred<Response>()
    transport = async () => requests.length === 1 ? first.promise : second.promise
    await mount(); await send('Première demande')
    expect(buttons('Arrêter')).toHaveLength(1)
    await act(async () => { buttons('Arrêter')[0].props.onClick() })
    await send('Deuxième demande')
    first.resolve(Response.json({ kind: 'text', text: 'Ancien résultat à ignorer' })); await flush()
    expect(useAssistant.getState().mode).toBe('thinking')
    expect(messages().some(message => message.text.includes('Ancien résultat'))).toBe(false)
    second.resolve(Response.json({ kind: 'text', text: 'Résultat courant fictif' })); await flush()
    expect(lastMessage()?.text).toBe('Résultat courant fictif')
    expect(useAssistant.getState().mode).toBe('idle')
  })

  it.each(['societe', 'session', 'droits'] as const)('abandonne le transport à un changement de %s et ignore son retour', async change => {
    const held = deferred<Response>(); transport = async () => held.promise
    await mount(); await send()
    await act(async () => {
      if (change === 'societe') login('other-company-fixture')
      else if (change === 'session') { useAuthStore.getState().logout(); login() }
      else useAuthStore.getState().setViewMode('employee', 'employee-fixture')
    })
    expect(requests[0].init.signal?.aborted).toBe(true)
    held.resolve(Response.json({ kind: 'text', text: 'Anciennes données privées fictives' })); await flush()
    expect(messages().some(message => message.text.includes('Anciennes données'))).toBe(false)
  })

  it.each(['fermeture', 'demontage'] as const)('abandonne le transport à la %s du panneau', async action => {
    const held = deferred<Response>(); transport = async () => held.promise
    await mount(); await send()
    await act(async () => {
      if (action === 'fermeture') renderer!.root.findByProps({ title: 'Fermer (Ctrl+Shift+A)' }).props.onClick()
      else { renderer!.unmount(); renderer = undefined }
    })
    expect(requests[0].init.signal?.aborted).toBe(true)
    held.resolve(Response.json({ kind: 'text', text: 'Ne pas afficher après fermeture' })); await flush()
    expect(messages().some(message => message.text.includes('Ne pas afficher'))).toBe(false)
  })
})

describe('Robi : une attente utilisateur bornée et honnête', () => {
  it.each(['headers', 'body'] as const)('termine après le budget utilisateur si les %s restent bloqués', async stage => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const held = deferred<Response>(), body = deferred<any>()
    transport = async () => stage === 'headers' ? held.promise : { ok: true, status: 200, json: () => body.promise } as Response
    await mount(); await send()
    await act(async () => { await vi.advanceTimersByTimeAsync(25_001) })
    expect(requests[0].init.signal?.aborted).toBe(true)
    expect(useAssistant.getState().mode).toBe('idle')
    expect(lastMessage()?.text).toMatch(/délai|temps.*dépass/i)
    held.resolve(Response.json({ kind: 'text', text: 'Retour périmé' })); body.resolve({ kind: 'text', text: 'Retour périmé' }); await flush()
    expect(messages().some(message => message.text.includes('Retour périmé'))).toBe(false)
  })

  it('affiche le refus de contexte typé sans le remplacer par une réponse chiffrée ou un message HTTP vague', async () => {
    transport = async () => Response.json({ kind: 'error', code: 'ASSISTANT_CONTEXT_UNAVAILABLE', text: 'Le contexte autorisé de cette société est indisponible. Aucune donnée vérifiée.' }, { status: 503 })
    await mount(); await send()
    expect(lastMessage()?.text).toContain('Aucune donnée vérifiée')
    expect(lastMessage()?.action).toBeUndefined()
    expect(useAssistant.getState().mode).toBe('idle')
  })

  it('borne son attente du refresh partagé sans annuler la rotation ni rejouer la demande arrêtée', async () => {
    const refresh = deferred<any>(), enteredRefresh = deferred<void>()
    let refreshConfig: any
    transport = async () => Response.json({ error: 'Session fictive expirée' }, { status: 401 })
    axios.defaults.adapter = async config => {
      if (config.url !== '/api/auth/refresh' || config.method !== 'post') throw Error('Unapproved fixture auth destination')
      refreshConfig = config; enteredRefresh.resolve(); return refresh.promise
    }
    await mount(); await send(); await enteredRefresh.promise
    expect(buttons('Arrêter')).toHaveLength(1)
    await act(async () => { buttons('Arrêter')[0].props.onClick() })
    expect(useAssistant.getState().mode).toBe('idle')
    expect(refreshConfig.signal).toBeUndefined()
    refresh.resolve({ config: refreshConfig, status: 200, statusText: 'fixture', headers: {}, data: { accessToken: token('owner-fixture', 'renewed') } }); await flush()
    expect(useAuthStore.getState().accessToken).toBe(token('owner-fixture', 'renewed'))
    expect(requests).toHaveLength(1)
    expect(messages().some(message => message.action)).toBe(false)
  })
})
