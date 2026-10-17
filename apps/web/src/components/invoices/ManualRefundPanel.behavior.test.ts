import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const storage = vi.hoisted(() => {
  const values = new Map<string, string>()
  const local = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: local })
  return { values, local }
})
const { default: ManualRefundPanel } = await import('./ManualRefundPanel')
const { default: api } = await import('@/lib/api')
const { useAuthStore } = await import('@/stores/authStore')
const oldAdapter = api.defaults.adapter, oldAxiosAdapter = axios.defaults.adapter
const companyA = 'manual-company-fictive-a', companyB = 'manual-company-fictive-b', actorA = 'manual-owner-fictif-a', actorB = 'manual-owner-fictif-b'
const invoiceA = 'manual-invoice-fictive-a', invoiceB = 'manual-invoice-fictive-b', creditA = 'manual-credit-fictive-a', creditB = 'manual-credit-fictive-b'
const tenderA = 'tender-cash-fictif', tenderB = 'tender-card-fictif'
let renderer: ReactTestRenderer | undefined, client: QueryClient
let requests: Array<{ method: string; url: string; company: string; body: any; params: any }>
let getResult: (config: InternalAxiosRequestConfig) => Promise<any[]>
let postResult: (body: any, config: InternalAxiosRequestConfig) => Promise<any>
const keyFor = (company = companyA, actor = actorA, credit = creditA) => `creorga-financial-v1:manual-refund:${company}:${actor}:${credit}`
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(child => text(child)).join('')
const buttons = (label: string) => renderer!.root.findAllByType('button').filter(button => text(button).trim() === label)
const mainForm = () => renderer!.root.findAllByType('form')[0]
const fieldset = () => renderer!.root.findAllByType('fieldset')[0]
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) })
const credit = (id = creditA, invoiceId = invoiceA) => ({ id, invoiceId, number: 'AVO-FICTIF-1', totalCents: 250, currency: 'EUR' })
const identity = (company = companyA, actor = actorA, role: 'OWNER' | 'MANAGER' | 'EMPLOYEE' = 'OWNER') => useAuthStore.getState().setAuth({
  accessToken: 'fixture-token-' + actor, user: { id: actor, email: actor + '@fixture.invalid', firstName: 'Retour', lastName: 'FICTIF', avatar: null },
  companies: [{ id: 'membership-' + actor, userId: actor, companyId: company, role, isActive: true,
    company: { id: company, name: 'Société FICTIVE', legalName: null, vatNumber: null, currency: 'EUR' } }],
})
const element = (invoiceId = invoiceA, creditId = creditA) => createElement(QueryClientProvider, { client }, createElement(ManualRefundPanel, { invoiceId, credit: credit(creditId, invoiceId) }))
const mount = async (invoiceId = invoiceA, creditId = creditA) => { await act(async () => { renderer = create(element(invoiceId, creditId)) }); await settle() }
const fill = async (amount = '2.50', tenderId = tenderA, reason = 'Retour FICTIF autorisé', reference = 'JUSTIFICATIF-FICTIF') => {
  await act(async () => { mainForm().findByType('select').props.onChange({ target: { value: tenderId } }); const inputs = mainForm().findAllByType('input');
    inputs[0].props.onChange({ target: { value: amount } }); inputs[1].props.onChange({ target: { value: reason } }); inputs[2].props.onChange({ target: { value: reference } }) })
}
const submit = async () => { await act(async () => { await mainForm().props.onSubmit({ preventDefault() {} }) }); await settle() }
const posted = () => requests.filter(r => r.method === 'post' && r.url === '/payments/manual-refunds')
const fail = (config: InternalAxiosRequestConfig, status: number, data: any) => new AxiosError(data.error || 'Réponse FICTIVE', 'ERR_BAD_RESPONSE', config, undefined,
  { config, status, statusText: 'fixture', headers: {}, data })
const proof = (body: any, overrides: Record<string, any> = {}) => ({ error: 'Montant supérieur à l’avoir ou au règlement encore remboursable, réservations prestataire incluses.',
  code: 'MANUAL_REFUND_AMOUNT_EXCEEDS_AVAILABLE', outcome: 'NOT_RECORDED', reservationPolicy: 'UNCHANGED', rejectionBasis: 'TENDER_LIMIT',
  requestId: body.requestId, companyId: companyA, actorId: actorA, invoiceId: invoiceA, creditNoteId: creditA, tenderId: body.tenderId, method: body.method,
  amountCents: body.amountCents, currency: 'EUR', reason: body.reason.trim(), reference: body.reference.trim(),
  creditLimitCents: 250, tenderAvailableCents: 225, providerReservedCents: 0, creditAvailableCents: 250, ...overrides })
const recorded = (body: any) => ({ id: body.requestId, creditNoteId: body.creditNoteId, tenderId: body.tenderId, amountCents: body.amountCents, method: body.method, currency: 'EUR', status: 'DECLARED', confirmation: 'manual_declaration', reference: body.reference })
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }

beforeEach(() => {
  storage.values.clear(); requests = []; client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } } })
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5174', pathname: '/invoices/factures' }, localStorage: storage.local })
  useAuthStore.getState().confirmLogoutRevocation(); identity()
  getResult = async config => config.url === '/payments/manual-tenders' ? [{ id: tenderA, method: 'CASH', amountCents: 225, availableCents: 225 }, { id: tenderB, method: 'CARD', amountCents: 800, availableCents: 800 }] : []
  postResult = async (body, config) => { throw fail(config, 409, proof(body)) }
  const adapter = async (config: InternalAxiosRequestConfig) => {
    const method = config.method || 'get', url = config.url || '', body = config.data ? JSON.parse(config.data) : null
    requests.push({ method, url, body, company: String(config.headers['x-company-id'] || ''), params: config.params })
    let data: any
    if (url === '/api/auth/refresh') throw fail(config, 401, { error: 'Session FICTIVE expirée' })
    if (method === 'get' && ['/payments/manual-tenders', '/payments/manual-refunds'].includes(url)) data = await getResult(config)
    else if (method === 'post' && url === '/payments/manual-refunds') data = await postResult(body, config)
    else throw Error('Transport non prévu dans la recette des déclarations manuelles')
    return { config, status: method === 'post' ? 201 : 200, statusText: 'fixture', headers: {}, data }
  }
  api.defaults.adapter = adapter; axios.defaults.adapter = adapter
})
afterEach(async () => { await act(async () => { renderer?.unmount() }); renderer = undefined; client.clear(); api.defaults.adapter = oldAdapter; axios.defaults.adapter = oldAxiosAdapter; useAuthStore.getState().logout(); vi.unstubAllGlobals() })

describe('Déclaration refusée : preuve exacte et correction humaine sans nouvelle remise d’argent', () => {
  it('la preuve ne défige rien automatiquement et explique sa portée avant le choix explicite', async () => {
    await mount(); await fill(); await submit()
    const body = posted()[0].body
    expect(body).toMatchObject({ amountCents: 250, tenderId: tenderA, method: 'CASH' })
    expect(fieldset().props.disabled).toBe(true)
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(body)
    expect(buttons('Modifier la déclaration refusée')).toHaveLength(1)
    expect(text(renderer!.root)).toContain('Ce refus ne prouve pas')
    expect(text(renderer!.root)).toContain('aucune nouvelle remise')
    expect(requests.some(r => r.url === '/payments/refunds' || r.url.includes('/review'))).toBe(false)
  })

  it('le clic explicite archive la demande exacte puis permet 2,25 EUR avec un nouvel UUID', async () => {
    await mount(); await fill(); await submit()
    const original = posted()[0].body
    expect(buttons('Modifier la déclaration refusée')).toHaveLength(1)
    await act(async () => { buttons('Modifier la déclaration refusée')[0].props.onClick() })
    const history = JSON.parse(storage.local.getItem(`${keyFor()}:refused:${original.requestId}`)!)
    expect(history.body).toEqual(original); expect(history.proof).toMatchObject(proof(original)); expect(history.observedAt).toEqual(expect.any(String))
    expect(storage.local.getItem(keyFor())).toBeNull(); expect(fieldset().props.disabled).toBe(false)
    postResult = async body => recorded(body)
    await fill('2.25'); await submit()
    expect(posted()).toHaveLength(2)
    expect(posted()[1].body).toMatchObject({ creditNoteId: creditA, tenderId: tenderA, method: 'CASH', amountCents: 225, reason: original.reason, reference: original.reference })
    expect(posted()[1].body.requestId).not.toBe(original.requestId)
    expect(storage.local.getItem(`${keyFor()}:refused:${original.requestId}`)).not.toBeNull()
  })

  it('un ancien pending est rejoué à l’identique avant de rendre la correction disponible', async () => {
    const original = { requestId: crypto.randomUUID(), creditNoteId: creditA, tenderId: tenderA, method: 'CASH', amountCents: 250, reason: 'Ancien retour FICTIF', reference: 'ANCIEN-JUSTIFICATIF-FICTIF' }
    storage.local.setItem(keyFor(), JSON.stringify(original))
    await mount()
    expect(buttons('Modifier la déclaration refusée')).toHaveLength(0)
    expect(fieldset().props.disabled).toBe(true)
    await fill('1.00', tenderB, 'Ne doit pas remplacer', 'AUTRE-FICTIF'); await submit()
    expect(posted().map(r => r.body)).toEqual([original])
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(original)
    expect(buttons('Modifier la déclaration refusée')).toHaveLength(1)
  })

  it.each([
    ['réseau', 0, {}], ['503', 503, {}], ['collision 409', 409, { error: 'Référence incompatible' }], ['422', 422, {}], ['400', 400, {}], ['fausse preuve sur 503', 503, { typed: true }],
  ])('conserve strictement la demande pour %s', async (_name, status, data) => {
    postResult = async (body, config) => { if (!status) throw Error('Réseau FICTIF interrompu'); throw fail(config, Number(status), (data as any).typed ? proof(body) : data) }
    await mount(); await fill(); await submit()
    const original = posted()[0].body
    expect(buttons('Modifier la déclaration refusée')).toHaveLength(0)
    expect(fieldset().props.disabled).toBe(true)
    await submit()
    expect(posted().map(r => r.body)).toEqual([original, original])
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(original)
  })

  it('un 401 conserve la référence après refus de renouvellement de session', async () => {
    postResult = async (_body, config) => { throw fail(config, 401, { error: 'Session FICTIVE expirée' }) }
    await mount(); await fill(); await submit()
    expect(posted()).toHaveLength(1); expect(storage.local.getItem(keyFor())).not.toBeNull()
    expect(buttons('Modifier la déclaration refusée')).toHaveLength(0)
  })

  it.each([
    ['requestId', 'other'], ['companyId', companyB], ['actorId', actorB], ['invoiceId', invoiceB], ['creditNoteId', creditB], ['tenderId', tenderB],
    ['method', 'CARD'], ['amountCents', 225], ['currency', 'USD'], ['reason', 'Autre motif'], ['reference', 'AUTRE-PIECE'], ['outcome', 'UNKNOWN'],
    ['reservationPolicy', 'RELEASED'], ['providerReservedCents', -1], ['creditAvailableCents', 100], ['tenderAvailableCents', 225.5], ['creditLimitCents', -1], ['rejectionBasis', 'PROVIDER_RESERVATION'],
  ])('une preuve différente %s=%s ne permet jamais une nouvelle référence', async (field, value) => {
    postResult = async (body, config) => { throw fail(config, 409, proof(body, { [field]: value })) }
    await mount(); await fill(); await submit()
    expect(buttons('Modifier la déclaration refusée')).toHaveLength(0)
    expect(fieldset().props.disabled).toBe(true)
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(posted()[0].body)
  })

  it.each(['UNKNOWN', 'REVIEW'])('un refus dû uniquement à une réservation %s reste figé même si un faux serveur prétend NOT_RECORDED', async () => {
    postResult = async (body, config) => { throw fail(config, 409, proof(body, { tenderAvailableCents: 800, creditLimitCents: 250, providerReservedCents: 100, creditAvailableCents: 150 })) }
    await mount(); await fill('2.00', tenderB); await submit()
    expect(buttons('Modifier la déclaration refusée')).toHaveLength(0)
    expect(fieldset().props.disabled).toBe(true)
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(posted()[0].body)
    expect(requests.some(r => r.url.includes('/review') || r.url === '/payments/refunds')).toBe(false)
  })

  it('un conflit local après la preuve interdit de retirer la référence active', async () => {
    await mount(); await fill(); await submit()
    expect(buttons('Modifier la déclaration refusée')).toHaveLength(1)
    const action = buttons('Modifier la déclaration refusée')[0].props.onClick, replacement = { ...posted()[0].body, reference: 'AUTRE-JUSTIFICATIF' }
    storage.local.setItem(keyFor(), JSON.stringify(replacement))
    await act(async () => { action() })
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(replacement)
    expect(fieldset().props.disabled).toBe(true)
  })

  it('un stockage plein préserve la demande sans simuler une archive réussie', async () => {
    await mount(); await fill(); await submit()
    expect(buttons('Modifier la déclaration refusée')).toHaveLength(1)
    const original = posted()[0].body, setItem = storage.local.setItem
    storage.local.setItem = (key, value) => { if (key.includes(':refused:')) throw Error('Stockage FICTIF plein'); setItem(key, value) }
    try {
      await act(async () => { buttons('Modifier la déclaration refusée')[0].props.onClick() })
      expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(original)
      expect(fieldset().props.disabled).toBe(true)
    } finally { storage.local.setItem = setItem }
  })

  it('deux soumissions dans le même tour React n’envoient qu’une déclaration', async () => {
    const response = deferred<any>(); postResult = () => response.promise
    await mount(); await fill('1.00')
    const handler = mainForm().props.onSubmit
    let first!: Promise<void>, second!: Promise<void>
    await act(async () => { first = handler({ preventDefault() {} }); second = handler({ preventDefault() {} }) })
    await vi.waitFor(() => expect(posted().length).toBeGreaterThan(0))
    await act(async () => { response.resolve(recorded(posted()[0].body)); await Promise.all([first, second]) })
    expect(posted()).toHaveLength(1)
  })
})

describe('Déclaration manuelle : session, droits, facture et réponses tardives', () => {
  it.each(['société', 'acteur', 'session'] as const)('un changement de %s ne réutilise pas la liste de déclarations en cache', async change => {
    const defaultGet = getResult
    getResult = config => config.url === '/payments/manual-refunds' ? Promise.resolve([{ id: 'record-fictif-a', reference: 'DECLARATION-FICTIVE-A', amountCents: 100, currency: 'EUR' }]) : defaultGet(config)
    await mount(); expect(text(renderer!.root)).toContain('DECLARATION-FICTIVE-A')
    getResult = config => config.url === '/payments/manual-refunds' ? Promise.resolve([]) : defaultGet(config)
    await act(async () => { identity(change === 'société' ? companyB : companyA, change === 'acteur' ? actorB : actorA) }); await settle()
    expect(text(renderer!.root)).not.toContain('DECLARATION-FICTIVE-A')
    expect(requests.filter(r => r.method === 'get' && r.url === '/payments/manual-refunds')).toHaveLength(2)
  })

  it.each(['facture', 'avoir'] as const)('changer de %s ne reprend pas les champs ou la référence de l’ancien panneau', async change => {
    postResult = async () => { throw Error('Résultat FICTIF incertain') }
    await mount(); await fill(); await submit()
    const original = posted()[0].body
    await act(async () => { renderer!.update(element(change === 'facture' ? invoiceB : invoiceA, creditB)) }); await settle()
    expect(fieldset().props.disabled).toBe(false)
    expect(text(renderer!.root)).not.toContain(original.requestId)
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(original)
  })

  it('un ancien handler ne peut rien envoyer après changement de société', async () => {
    await mount(); await fill()
    const oldSubmit = mainForm().props.onSubmit
    await act(async () => { identity(companyB) }); await settle()
    await act(async () => { await oldSubmit({ preventDefault() {} }) })
    expect(posted()).toEqual([])
    expect(storage.local.getItem(keyFor())).toBeNull(); expect(storage.local.getItem(keyFor(companyB))).toBeNull()
  })

  it('un ancien choix de correction ne retire pas la référence après changement d’acteur', async () => {
    await mount(); await fill(); await submit()
    expect(buttons('Modifier la déclaration refusée')).toHaveLength(1)
    const action = buttons('Modifier la déclaration refusée')[0].props.onClick, original = posted()[0].body
    await act(async () => { identity(companyA, actorB) }); await settle()
    await act(async () => { action() })
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(original)
    expect(storage.local.getItem(keyFor(companyA, actorB))).toBeNull()
  })

  it('une réponse tardive ne vide pas l’ancienne demande ni n’affiche son erreur dans la nouvelle société', async () => {
    const response = deferred<any>(); postResult = () => response.promise
    await mount(); await fill('1.00')
    let pending!: Promise<void>
    await act(async () => { pending = mainForm().props.onSubmit({ preventDefault() {} }) })
    await vi.waitFor(() => expect(posted()).toHaveLength(1))
    const original = posted()[0].body
    await act(async () => { identity(companyB, actorB) }); await settle()
    await act(async () => { response.resolve(recorded(original)); await pending }); await settle()
    expect(text(renderer!.root)).not.toContain(original.requestId)
    expect(text(renderer!.root)).not.toContain('La session ou la société a changé')
    expect(JSON.parse(storage.local.getItem(keyFor())!)).toEqual(original)
    expect(storage.local.getItem(keyFor(companyB, actorB))).toBeNull()
    expect(fieldset().props.disabled).toBe(false)
  })

  it('la liste tardive du contexte précédent n’est pas affichée dans le suivant', async () => {
    const response = deferred<any[]>(), defaultGet = getResult
    getResult = config => config.url === '/payments/manual-refunds' && config.headers['x-company-id'] === companyA ? response.promise : defaultGet(config)
    await mount(); await act(async () => { identity(companyB) }); await settle()
    await act(async () => { response.resolve([{ id: 'late-fictif', reference: 'ANCIEN-CONTEXTE-FICTIF', amountCents: 100, currency: 'EUR' }]) }); await settle()
    expect(text(renderer!.root)).not.toContain('ANCIEN-CONTEXTE-FICTIF')
  })

  it('le retrait du rôle masque les commandes et neutralise l’ancien handler', async () => {
    await mount(); await fill()
    const oldSubmit = mainForm().props.onSubmit
    await act(async () => { useAuthStore.getState().setRole('employee') }); await settle()
    await act(async () => { await oldSubmit({ preventDefault() {} }) })
    expect(posted()).toEqual([])
    expect(renderer!.root.findAllByType('form')).toHaveLength(0)
  })
})
