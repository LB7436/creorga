import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Only the external storage/network boundaries are replaced. The actual routers,
// orchestration, response parsing and cancellation behavior run in these tests.
const disk = vi.hoisted(() => ({ writes: [] as string[] }))
vi.mock('fs', () => ({ default: {
  existsSync: () => false, mkdirSync: () => {},
  readFileSync: () => { throw Error('No fixture file') },
  writeFileSync: (name: string) => { disk.writes.push(name) },
} }))
const memberships = vi.hoisted(() => ({ lookups: [] as string[] }))
vi.mock('../lib/prisma', () => ({ default: { userCompany: { findFirst: async ({ where }: any) => {
  memberships.lookups.push(where.userId)
  return where.userId === 'human-fixture' && where.companyId === 'company-fixture'
    ? { role: 'OWNER', companyId: 'company-fixture', company: { id: 'company-fixture' } } : null
} } } }))
vi.mock('./floorState', () => ({ currentFloorCompanyId: () => 'company-fixture', getFloorState: () => ({ tables: [{ id: 'table-fixture', name: 'Table fictive', status: 'LIBRE', items: [] }], chairs: [] }) }))
vi.mock('../lib/security', () => ({ INTERNAL_API_TOKEN: 'fixture-only', internalHeaders: () => ({ 'X-Internal-Token': 'fixture-only' }), fallbackAdminAllowed: () => false, isProduction: () => false }))
vi.mock('../lib/logger', () => ({ default: { warn() {}, error() {}, info() {} } }))

const calls: string[] = []
let external: (url: string, init: RequestInit) => Promise<Response>
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const json = (body: any, status = 200) => Response.json(body, { status })
const deferred = <T>() => { let resolve!: (value: T) => void; return { promise: new Promise<T>(done => { resolve = done }), resolve: (value: T) => resolve(value) } }
let app: ReturnType<typeof express>
const ask = (body = { text: 'Combien de tables et de produits ?', currentPath: '/' }) => request(app).post('/api/agent/super-ask').send(body)
const shortDeadline = <T extends { set(name: string, value: string): T }>(req: T) => req.set('x-fixture-internal', 'yes').set('x-creorga-assistant-deadline', String(Date.now() + 80))

beforeEach(async () => {
  vi.stubEnv('PORT', '0'); vi.stubEnv('OLLAMA_URL', 'http://ollama.fixture.invalid')
  vi.resetModules()
  const [{ default: agent }, { default: assistant }] = await Promise.all([import('./agent'), import('./assistant')])
  app = express(); app.use(express.json())
  app.use('/api/agent', (req, _res, next) => {
    Object.assign(req, { user: { userId: req.get('x-fixture-internal') ? 'internal-service' : 'human-fixture' }, companyId: 'company-fixture', role: 'OWNER' }); next()
  }, agent, assistant)
  disk.writes = []; memberships.lookups = []; calls.length = 0
  external = async url => url.endsWith('/api/tags') ? json({ models: [] }) : url.endsWith('/api/generate') ? json({ response: '{"intent":"NONE"}' }) : json({ kind: 'error', text: 'Pas de données fictives.' })
  vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input)
    if (!/^http:\/\/localhost:0\/api\/agent\/(?:intent|smart-query|web-search\?q=)/.test(url)
      && !/^http:\/\/ollama\.fixture\.invalid\/api\/(?:tags|chat|generate)$/.test(url)
      && !/^https:\/\/duckduckgo\.com\/html\/\?q=/.test(url)) throw Error('Unapproved fixture destination')
    calls.push(url); return external(url, init)
  })
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers() })

describe('Robi: refus et résultat métier honnête', () => {
  it.each([400, 401, 403])('arrête la chaîne sur un refus de contexte interne HTTP %s', async status => {
    external = async () => json({ error: 'Contexte indisponible dans la fixture' }, status)
    const result = await ask()
    expect(result.status).toBe(503)
    expect(result.body).toMatchObject({ kind: 'error', code: 'ASSISTANT_CONTEXT_UNAVAILABLE' })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatch(/\/api\/agent\/intent$/)
  })

  it('ne remplace pas une action explicitement refusée par une autre interprétation', async () => {
    external = async () => json({ kind: 'action', intent: 'invoices.create', success: false, summary: 'Action non disponible', details: { code: 'ASSISTANT_ACTION_MIGRATION_REQUIRED' } })
    const result = await ask()
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ kind: 'action', success: false, path: 'direct-intent' })
    expect(calls).toHaveLength(1)
  })

  it('conserve un échec explicite transporté en HTTP 200 sans relancer un modèle ou un outil', async () => {
    external = async () => json({ kind: 'error', code: 'ASSISTANT_UPSTREAM_UNAVAILABLE', text: 'Aucune réponse vérifiée disponible.' })
    const result = await ask()
    expect(result.body).toMatchObject({ kind: 'error', code: 'ASSISTANT_UPSTREAM_UNAVAILABLE', path: 'direct-intent' })
    expect(calls).toHaveLength(1)
  })

  it.each(['network', 'json'] as const)('ne réinterprète pas une demande dont le résultat interne est inconnu (%s)', async failure => {
    external = async url => {
      if (url.endsWith('/intent')) {
        if (failure === 'network') throw Error('Fictitious lost response after dispatch')
        return new Response('corps fictif tronqué', { status: 200 })
      }
      return json({ kind: 'text', text: 'Une autre interprétation serait dangereuse' })
    }
    const result = await ask()
    expect(result.status).toBe(503)
    expect(result.body).toMatchObject({ kind: 'error', code: 'ASSISTANT_RESULT_UNKNOWN' })
    expect(calls).toHaveLength(1)
    expect(disk.writes).toEqual([])
  })

  it('compte un résultat action success:false comme un échec du workflow', async () => {
    let intentCalls = 0
    external = async url => {
      if (url.endsWith('/intent')) {
        intentCalls++
        return json(intentCalls === 1 ? { kind: 'text', text: 'Pas de correspondance directe' } : { kind: 'action', success: intentCalls === 2, summary: intentCalls === 2 ? 'Navigation fictive autorisée' : 'Refus explicite' })
      }
      if (url.endsWith('/api/tags')) return json({ models: [{ name: 'llama3.1:8b' }] })
      if (url.endsWith('/api/chat')) return json({ message: { tool_calls: [{ function: { name: 'ui_navigate', arguments: { natural_language_phrase: 'Va au planning' } } }, { function: { name: 'invoices_create', arguments: { natural_language_phrase: 'Crée une facture fictive' } } }] } })
      throw Error('Unexpected fixture destination')
    }
    const result = await ask()
    expect(result.body).toMatchObject({ kind: 'workflow', success: false })
    expect(result.body.summary).toContain('1/2')
    expect(result.body.steps.map((step: any) => step.success)).toEqual([true, false])
  })

  it('respecte le vrai refus requireCompany du service interne sans adhésion, même pour un propriétaire humain autorisé', async () => {
    vi.stubEnv('JWT_SECRET', 'fixture-key-only-never-production')
    const [{ authenticate }, { requireCompany }, { default: jwt }, { default: agent }, { default: assistant }] = await Promise.all([
      import('../middleware/auth'), import('../middleware/requireCompany'), import('jsonwebtoken'), import('./agent'), import('./assistant'),
    ])
    const secured = express(); secured.use(express.json()); secured.use('/api/agent', authenticate, requireCompany, agent, assistant)
    external = async (url, init) => {
      if (!url.endsWith('/api/agent/intent')) throw Error('No model/network allowed after context refusal')
      const result = await request(secured).post('/api/agent/intent').set(Object.fromEntries(new Headers(init.headers))).send(JSON.parse(String(init.body)))
      return json(result.body, result.status)
    }
    const bearer = jwt.sign({ userId: 'human-fixture', email: 'owner@fixture.invalid' }, 'fixture-key-only-never-production')
    const result = await request(secured).post('/api/agent/super-ask').set('Authorization', 'Bearer ' + bearer).set('x-company-id', 'company-fixture').send({ text: 'Combien de tables et de produits ?', currentPath: '/' })
    expect(result.status).toBe(503)
    expect(result.body.code).toBe('ASSISTANT_CONTEXT_UNAVAILABLE')
    expect(memberships.lookups).toEqual(['human-fixture', 'internal-service'])
    expect(calls).toHaveLength(1)
    expect(disk.writes).toEqual([])
  })

  it('ferme le corps non consommé d’un modèle refusé avant de terminer par un fallback autorisé', async () => {
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode('erreur fictive sans fin')) } })
    external = async url => {
      if (url.endsWith('/intent')) return json({ kind: 'text', text: 'Pas de correspondance directe' })
      if (url.endsWith('/api/tags')) return new Response(stream, { status: 503 })
      if (url.endsWith('/api/generate')) return json({ response: '{"intent":"NONE"}' })
      return json({ kind: 'text', text: 'Aucune donnée métier vérifiée.' })
    }
    const result = await ask()
    expect(result.status).toBe(200)
    const reader = stream.getReader()
    try { expect(await reader.read()).toEqual({ done: true, value: undefined }) }
    finally { await reader.cancel(); reader.releaseLock() }
  })
})

describe('Robi: un budget total, y compris les corps de réponse', () => {
  it.each(['headers', 'body'] as const)('borne la réponse lorsque les %s du sous-appel ne terminent pas', async stage => {
    const held = deferred<Response>(), body = deferred<any>(), reached = deferred<void>()
    let observedSignal: AbortSignal | null | undefined
    external = async (url, init) => {
      if (url.endsWith('/intent')) {
        observedSignal = init.signal; reached.resolve()
        return stage === 'headers' ? held.promise : { ok: true, status: 200, json: () => body.promise } as Response
      }
      return json({ kind: 'error', text: 'Fin de fixture' })
    }
    const pending = shortDeadline(ask()).then(result => result)
    await reached.promise
    try {
      const result = await Promise.race([pending, delay(350).then(() => null)])
      expect(result?.status).toBe(504)
      expect(result?.body).toMatchObject({ kind: 'error', code: 'ASSISTANT_TIMEOUT' })
      expect(observedSignal?.aborted).toBe(true)
      expect(calls).toHaveLength(1)
    } finally {
      held.resolve(json({ kind: 'text', text: 'Réponse tardive ignorée' })); body.resolve({ kind: 'text', text: 'Réponse tardive ignorée' }); await pending
    }
    await delay(5)
    expect(calls).toHaveLength(1)
  })

  it('ne poursuit ni cache ni mémoire après expiration pendant smart-query', async () => {
    const held = deferred<any>(), reached = deferred<void>()
    external = async () => { reached.resolve(); return { ok: true, status: 200, json: () => held.promise } as Response }
    const pending = shortDeadline(request(app).post('/api/agent/smart-query').send({ question: 'Etat des tables fictives non mis en cache', currentPath: '/' })).then(result => result)
    await reached.promise
    try {
      const result = await Promise.race([pending, delay(350).then(() => null)])
      expect(result?.status).toBe(504)
      expect(result?.body.code).toBe('ASSISTANT_TIMEOUT')
    } finally { held.resolve({ response: 'Réponse tardive qui ne doit pas être mémorisée' }); await pending }
    await delay(5)
    expect(disk.writes).toEqual([])
    external = async () => json({ response: 'Réponse fraîche de fixture' })
    const next = await request(app).post('/api/agent/smart-query').send({ question: 'Etat des tables fictives non mis en cache', currentPath: '/' })
    expect(next.body.text).toBe('Réponse fraîche de fixture')
    expect(next.body.cached).not.toBe(true)
  })

  it('propage la date limite héritée sans la recommencer au sous-chemin intent', async () => {
    const reached = deferred<void>(), held = deferred<Response>()
    let headers: Headers | undefined
    external = async (_url, init) => { headers = new Headers(init.headers); reached.resolve(); return held.promise }
    const deadline = Date.now() + 100
    const pending = ask().set('x-fixture-internal', 'yes').set('x-creorga-assistant-deadline', String(deadline)).then(result => result)
    await reached.promise
    try { expect(headers?.get('x-creorga-assistant-deadline')).toBe(String(deadline)) }
    finally { held.resolve(json({ kind: 'action', success: true, summary: 'Navigation fictive' })); await pending }
  })

  it('propage le même abandon au sous-appel web.search autorisé sans modifier ses droits', async () => {
    const held = deferred<Response>(), reached = deferred<void>()
    let signal: AbortSignal | null | undefined, headers: Headers | undefined
    external = async (_url, init) => { signal = init.signal; headers = new Headers(init.headers); reached.resolve(); return held.promise }
    const deadline = Date.now() + 80
    const pending = request(app).post('/api/agent/intent').set('x-fixture-internal', 'yes').set('x-creorga-assistant-deadline', String(deadline)).send({ text: 'Cherche sur internet une documentation fictive' }).then(result => result)
    await reached.promise
    try {
      const result = await Promise.race([pending, delay(350).then(() => null)])
      expect(result?.status).toBe(504)
      expect(signal?.aborted).toBe(true)
      expect(headers?.get('x-creorga-assistant-deadline')).toBe(String(deadline))
      expect(calls[0]).toMatch(/\/api\/agent\/web-search\?q=/)
    } finally { held.resolve(json({ results: [] })); await pending }
  })

  it.each(['headers', 'body'] as const)('borne aussi les %s de la recherche externe déjà autorisée', async stage => {
    const held = deferred<Response>(), body = deferred<string>(), reached = deferred<void>()
    let signal: AbortSignal | null | undefined
    external = async (_url, init) => { signal = init.signal; reached.resolve(); return stage === 'headers' ? held.promise : { ok: true, status: 200, text: () => body.promise } as Response }
    const pending = shortDeadline(request(app).get('/api/agent/web-search?q=documentation-fictive')).then(result => result)
    await reached.promise
    try {
      const result = await Promise.race([pending, delay(350).then(() => null)])
      expect(result?.status).toBe(504)
      expect(result?.body.code).toBe('ASSISTANT_TIMEOUT')
      expect(signal?.aborted).toBe(true)
    } finally { held.resolve(new Response('<html></html>')); body.resolve('<html></html>'); await pending }
    expect(disk.writes).toEqual([])
  })

  it('abandonne les sous-appels quand le client ferme prématurément sa connexion', async () => {
    const held = deferred<Response>(), reached = deferred<void>()
    let signal: AbortSignal | null | undefined
    external = async (_url, init) => { signal = init.signal; reached.resolve(); return held.promise }
    const pending = ask(); pending.end(() => {})
    await reached.promise
    try {
      pending.abort(); await delay(50)
      expect(signal?.aborted).toBe(true)
    } finally { held.resolve(json({ kind: 'text', text: 'Réponse abandonnée' })) }
    await delay(20)
    expect(calls).toHaveLength(1)
    expect(disk.writes).toEqual([])
  })

  it('refuse un budget interne déjà expiré avant le moindre dispatch', async () => {
    const result = await ask().set('x-fixture-internal', 'yes').set('x-creorga-assistant-deadline', String(Date.now() - 1))
    expect(result.status).toBe(504)
    expect(result.body.code).toBe('ASSISTANT_TIMEOUT')
    expect(calls).toEqual([])
  })

  it('un en-tête public arbitraire ne prolonge pas le budget total de vingt secondes', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const held = deferred<Response>(), reached = deferred<void>()
    let signal: AbortSignal | null | undefined, complete = false
    external = async (_url, init) => { signal = init.signal; reached.resolve(); return held.promise }
    const pending = ask().set('x-creorga-assistant-deadline', String(Date.now() + 3_600_000)).then(result => { complete = true; return result })
    await reached.promise
    try {
      await vi.advanceTimersByTimeAsync(19_999)
      expect(complete).toBe(false)
      await vi.advanceTimersByTimeAsync(2)
      const result = await pending
      expect(result.status).toBe(504)
      expect(signal?.aborted).toBe(true)
    } finally { held.resolve(json({ kind: 'text', text: 'Réponse tardive' })); await pending }
  })
})
