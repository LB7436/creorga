import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const storage = vi.hoisted(() => {
  const values = new Map<string, string>()
  const local = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: local })
  return { values, local }
})
const { default: CreditNotesPanel } = await import('./CreditNotesPanel')
const { default: api } = await import('@/lib/api')
const { useAuthStore } = await import('@/stores/authStore')
const oldAdapter = api.defaults.adapter, oldAxiosAdapter = axios.defaults.adapter
let renderer: ReactTestRenderer | undefined, client: QueryClient
let requests: Array<{ method: string; url: string; company: string; body: any }>
let postResult: (body: any, config: InternalAxiosRequestConfig) => Promise<any>
let getResult: (config: InternalAxiosRequestConfig) => Promise<any[]>
const invoiceA = 'invoice-fictive-a', invoiceB = 'invoice-fictive-b', companyA = 'credit-company-fictive-a', companyB = 'credit-company-fictive-b'
const actorA = 'credit-owner-fictif-a', actorB = 'credit-owner-fictif-b'
const keyFor = (company = companyA, actor = actorA, invoice = invoiceA) => `creorga-financial-v1:credit:${company}:${actor}:${invoice}`
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(child => text(child)).join('')
const buttons = (name: string) => renderer!.root.findAllByType('button').filter(button => text(button).trim() === name)
const mainForm = () => renderer!.root.findAllByType('form')[0]
const fieldset = () => renderer!.root.findAllByType('fieldset')[0]
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) })
const identity = (company = companyA, actor = actorA, role: 'OWNER' | 'MANAGER' | 'EMPLOYEE' = 'OWNER') => useAuthStore.getState().setAuth({
  accessToken: 'fixture-token-' + actor, user: { id: actor, email: actor + '@fixture.invalid', firstName: 'Avoir', lastName: 'FICTIF', avatar: null },
  companies: [{ id: 'membership-' + actor, userId: actor, companyId: company, role, isActive: true,
    company: { id: company, name: 'Société FICTIVE', legalName: null, vatNumber: null, currency: 'EUR' } }],
})
const element = (invoiceId = invoiceA, issued = true) => createElement(QueryClientProvider, { client }, createElement(CreditNotesPanel, { invoiceId, issued }))
const mount = async (invoiceId = invoiceA, issued = true) => { await act(async () => { renderer = create(element(invoiceId, issued)) }); await settle() }
const fill = async (amount = '11.00', reason = 'Correction FICTIVE autorisée') => {
  await act(async () => { const fields = mainForm().findAllByType('input'); fields[0].props.onChange({ target: { value: amount } }); fields[1].props.onChange({ target: { value: reason } }) })
}
const submit = async () => { await act(async () => { await mainForm().props.onSubmit({ preventDefault() {} }) }); await settle() }
const posted = () => requests.filter(r => r.method === 'post' && r.url.includes('/credit-notes'))
const fail = (config: InternalAxiosRequestConfig, status: number, data: any) => new AxiosError(data.message || 'Réponse FICTIVE', 'ERR_BAD_RESPONSE', config, undefined,
  { config, status, statusText: 'fixture', headers: {}, data })
const proof = (body: any, overrides: Record<string, any> = {}) => ({ message: 'Le montant dépasse le solde encore créditable de la facture.',
  code: 'CREDIT_AMOUNT_EXCEEDS_AVAILABLE', outcome: 'NOT_ISSUED', requestId: body.requestId, companyId: companyA, actorId: actorA, invoiceId: invoiceA,
  amountCents: body.amountCents, availableCents: 1025, reason: body.reason.trim(), ...overrides })
const credit = (id = 'credit-fictive-a', number = 'AVO-FICTIF-A') => ({ id, invoiceId: invoiceA, number, reason: 'Avoir FICTIF', currency: 'EUR', totalCents: 250, actorId: actorA })
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }

beforeEach(() => {
  storage.values.clear(); requests = []; client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } } })
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5174', pathname: '/invoices/factures' }, localStorage: storage.local })
  useAuthStore.getState().confirmLogoutRevocation(); identity()
  getResult = async () => []
  postResult = async (body, config) => { throw fail(config, 409, proof(body)) }
  const adapter = async (config: InternalAxiosRequestConfig) => {
    const method = config.method || 'get', url = config.url || '', body = config.data ? JSON.parse(config.data) : null
    requests.push({ method, url, company: String(config.headers['x-company-id'] || ''), body })
    let data: any
    if (url === '/api/auth/refresh') throw fail(config, 401, { message: 'Session FICTIVE expirée' })
    if (method === 'get' && /^\/invoices\/[^/]+\/credit-notes$/.test(url)) data = await getResult(config)
    else if (method === 'post' && /^\/invoices\/[^/]+\/credit-notes$/.test(url)) data = await postResult(body, config)
    else if (method === 'get' && url.startsWith('/payments/')) data = []
    else throw Error('Transport non prévu dans la recette des avoirs')
    return { config, status: method === 'post' ? 201 : 200, statusText: 'fixture', headers: {}, data }
  }
  api.defaults.adapter = adapter; axios.defaults.adapter = adapter
})
afterEach(async () => { await act(async () => { renderer?.unmount() }); renderer = undefined; client.clear(); api.defaults.adapter = oldAdapter; axios.defaults.adapter = oldAxiosAdapter; useAuthStore.getState().logout(); vi.unstubAllGlobals() })

describe('Avoir refusé : choix explicite après preuve exacte, jamais sur incertitude', () => {
  it('reste figé après le refus prouvé et ne modifie ni référence ni montant automatiquement', async () => {
    await mount(); await fill(); await submit()
    const body = posted()[0].body
    expect(body.amountCents).toBe(1100)
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(body)
    expect(fieldset().props.disabled).toBe(true)
    expect(buttons('Modifier la demande refusée')).toHaveLength(1)
    expect(text(renderer!.root)).toContain(body.requestId)
    expect(posted()).toHaveLength(1)
  })

  it('un clic explicite conserve la preuve locale puis permet un nouveau montant avec un nouvel UUID', async () => {
    await mount(); await fill(); await submit()
    const original = posted()[0].body
    await act(async () => { buttons('Modifier la demande refusée')[0].props.onClick() })
    expect(storage.local.getItem(keyFor())).toBeNull()
    const retained = JSON.parse(storage.local.getItem(`${keyFor()}:refused:${original.requestId}`)!)
    expect(retained.body).toEqual(original); expect(retained.proof).toMatchObject(proof(original))
    expect(retained.observedAt).toEqual(expect.any(String))
    expect(fieldset().props.disabled).toBe(false)
    postResult = async body => ({ ...credit(body.requestId), totalCents: body.amountCents })
    await fill('2.50'); await submit()
    expect(posted()).toHaveLength(2)
    expect(posted()[1].body).toMatchObject({ amountCents: 250, reason: original.reason })
    expect(posted()[1].body.requestId).not.toBe(original.requestId)
    expect(storage.local.getItem(`${keyFor()}:refused:${original.requestId}`)).not.toBeNull()
  })

  it('une ancienne référence persistée doit être rejouée telle quelle avant de proposer la modification', async () => {
    const original = { requestId: crypto.randomUUID(), amountCents: 1100, reason: 'Ancienne demande FICTIVE' }
    storage.local.setItem(keyFor(), JSON.stringify(original))
    await mount()
    expect(buttons('Modifier la demande refusée')).toHaveLength(0)
    expect(fieldset().props.disabled).toBe(true)
    await fill('2.50', 'Tentative de remplacer le montant'); await submit()
    expect(posted().map(r => r.body)).toEqual([original])
    expect(buttons('Modifier la demande refusée')).toHaveLength(1)
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(original)
  })

  it.each([
    ['réseau sans réponse', 0, {}], ['503', 503, {}], ['collision 409', 409, { message: 'Cette référence désigne un autre avoir.' }],
    ['refus 422', 422, {}], ['refus 400', 400, {}], ['fausse preuve sur 503', 503, { typed: true }],
  ])('ne libère rien pour %s', async (_name, status, data) => {
    postResult = async (body, config) => { if (!status) throw Error('Réseau FICTIF interrompu'); throw fail(config, Number(status), (data as any).typed ? proof(body) : data) }
    await mount(); await fill(); await submit()
    const original = posted()[0].body
    expect(buttons('Modifier la demande refusée')).toHaveLength(0)
    expect(fieldset().props.disabled).toBe(true)
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(original)
    await submit()
    expect(posted().map(r => r.body)).toEqual([original, original])
  })

  it('une session expirée garde la référence et ne propose jamais sa libération', async () => {
    postResult = async (_body, config) => { throw fail(config, 401, { message: 'Session FICTIVE expirée' }) }
    await mount(); await fill(); await submit()
    expect(posted()).toHaveLength(1)
    expect(storage.local.getItem(keyFor())).not.toBeNull()
    expect(buttons('Modifier la demande refusée')).toHaveLength(0)
  })

  it.each([
    ['requestId', 'autre-reference'], ['companyId', companyB], ['actorId', actorB], ['invoiceId', invoiceB], ['amountCents', 250],
    ['reason', 'Autre motif FICTIF'], ['outcome', 'UNKNOWN'], ['availableCents', 1100], ['availableCents', -1], ['availableCents', 1.5], ['code', 'OTHER_CONFLICT'],
  ])('ignore une preuve non concordante : %s=%s', async (property, value) => {
    postResult = async (body, config) => { throw fail(config, 409, proof(body, { [property]: value })) }
    await mount(); await fill(); await submit()
    expect(buttons('Modifier la demande refusée')).toHaveLength(0)
    expect(fieldset().props.disabled).toBe(true)
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(posted()[0].body)
  })

  it('une référence locale modifiée après la preuve ne peut pas être abandonnée par un ancien bouton', async () => {
    await mount(); await fill(); await submit()
    const savedAction = buttons('Modifier la demande refusée')[0].props.onClick
    const replacement = { ...posted()[0].body, reason: 'Autre demande à préserver' }
    storage.local.setItem(keyFor(), JSON.stringify(replacement))
    await act(async () => { savedAction() })
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(replacement)
    expect(fieldset().props.disabled).toBe(true)
  })

  it('si la preuve locale ne peut pas être conservée, la référence active reste intacte', async () => {
    await mount(); await fill(); await submit()
    const original = posted()[0].body, setItem = storage.local.setItem
    storage.local.setItem = (key, value) => { if (key.includes(':refused:')) throw Error('Stockage FICTIF plein'); setItem(key, value) }
    try {
      await act(async () => { buttons('Modifier la demande refusée')[0].props.onClick() })
      expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(original)
      expect(fieldset().props.disabled).toBe(true)
    } finally { storage.local.setItem = setItem }
  })

  it('deux soumissions dans le même tour React ne produisent qu’un appel', async () => {
    const response = deferred<any>(); postResult = () => response.promise
    await mount(); await fill()
    const handler = mainForm().props.onSubmit
    let first!: Promise<void>, second!: Promise<void>
    await act(async () => { first = handler({ preventDefault() {} }); second = handler({ preventDefault() {} }) })
    await vi.waitFor(() => expect(posted().length).toBeGreaterThan(0))
    await act(async () => { response.resolve(credit(posted()[0].body.requestId)); await Promise.all([first, second]) })
    expect(posted()).toHaveLength(1)
  })
})

describe('Avoirs réels : états, caches et réponses bornés au contexte autorisé', () => {
  it.each(['société', 'acteur', 'session'] as const)('un changement de %s ne réutilise pas la liste mise en cache', async change => {
    getResult = async () => [credit()]
    await mount()
    expect(text(renderer!.root)).toContain('AVO-FICTIF-A')
    getResult = async () => []
    await act(async () => { identity(change === 'société' ? companyB : companyA, change === 'acteur' ? actorB : actorA) }); await settle()
    expect(text(renderer!.root)).not.toContain('AVO-FICTIF-A')
    expect(requests.filter(r => r.method === 'get' && r.url === `/invoices/${invoiceA}/credit-notes`)).toHaveLength(2)
  })

  it('changer de facture ne réutilise pas une demande en attente de l’autre document', async () => {
    postResult = async () => { throw Error('Résultat FICTIF incertain') }
    await mount(); await fill(); await submit()
    const original = posted()[0].body
    await act(async () => { renderer!.update(element(invoiceB)) }); await settle()
    expect(fieldset().props.disabled).toBe(false)
    expect(text(renderer!.root)).not.toContain(original.requestId)
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(original)
    expect(storage.local.getItem(keyFor(companyA, actorA, invoiceB))).toBeNull()
  })

  it('un ancien handler n’envoie rien après changement de société', async () => {
    await mount(); await fill()
    const oldSubmit = mainForm().props.onSubmit
    await act(async () => { identity(companyB) }); await settle()
    await act(async () => { await oldSubmit({ preventDefault() {} }) })
    expect(posted()).toEqual([])
    expect(storage.local.getItem(keyFor())).toBeNull()
    expect(storage.local.getItem(keyFor(companyB))).toBeNull()
  })

  it('un bouton de refus conservé ne retire pas la demande d’un ancien acteur', async () => {
    await mount(); await fill(); await submit()
    const oldAction = buttons('Modifier la demande refusée')[0].props.onClick, original = posted()[0].body
    await act(async () => { identity(companyA, actorB) }); await settle()
    await act(async () => { oldAction() })
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(original)
    expect(storage.local.getItem(keyFor(companyA, actorB))).toBeNull()
  })

  it('une réponse tardive ne vide pas la demande ancienne et ne contamine pas le nouveau contexte', async () => {
    const response = deferred<any>(); postResult = () => response.promise
    await mount(); await fill()
    let pending!: Promise<void>
    await act(async () => { pending = mainForm().props.onSubmit({ preventDefault() {} }) })
    await vi.waitFor(() => expect(posted()).toHaveLength(1))
    const original = posted()[0].body
    await act(async () => { identity(companyB, actorB) }); await settle()
    await act(async () => { response.resolve(credit(original.requestId)); await pending }); await settle()
    expect(text(renderer!.root)).not.toContain(original.requestId)
    expect(text(renderer!.root)).not.toContain('La session ou la société a changé')
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(original)
    expect(storage.local.getItem(keyFor(companyB, actorB))).toBeNull()
    expect(fieldset().props.disabled).toBe(false)
  })

  it('une ancienne liste reçue tard ne se retrouve pas dans le cache de la société suivante', async () => {
    const response = deferred<any[]>(); getResult = config => config.headers['x-company-id'] === companyA ? response.promise : Promise.resolve([])
    await mount()
    await act(async () => { identity(companyB) }); await settle()
    await act(async () => { response.resolve([credit()]) }); await settle()
    expect(text(renderer!.root)).not.toContain('AVO-FICTIF-A')
  })

  it('le retrait du rôle masque les actions et neutralise un ancien handler', async () => {
    await mount(); await fill()
    const oldSubmit = mainForm().props.onSubmit
    await act(async () => { useAuthStore.getState().setRole('employee') }); await settle()
    await act(async () => { await oldSubmit({ preventDefault() {} }) })
    expect(posted()).toEqual([])
    expect(renderer!.root.findAllByType('form')).toHaveLength(0)
  })
})
