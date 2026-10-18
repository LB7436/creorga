import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Les services directs, permissions et budgets sont réels ; seules les
// frontières disque, base et fournisseur sont simulées. Aucun appel externe.
const disk = vi.hoisted(() => ({ writes: [] as string[] }))
vi.mock('fs', () => ({ default: {
  existsSync: () => false, mkdirSync() {},
  readFileSync() { throw Error('No fixture file') },
  writeFileSync(name: string) { disk.writes.push(name) },
} }))
vi.mock('../lib/safe-json', () => ({ safeWriteJson(name: string) { disk.writes.push(name) } }))
const memberships = vi.hoisted(() => ({ lookups: [] as Array<{ userId: string; companyId: string; isActive: boolean }>, active: true }))
vi.mock('../lib/prisma', () => ({ default: { userCompany: { findFirst: async ({ where }: any) => {
  memberships.lookups.push({ ...where })
  return memberships.active && where.userId === 'human-fixture' && where.companyId === 'company-fixture'
    ? { role: 'OWNER', companyId: 'company-fixture', userId: 'human-fixture', isActive: true, company: { id: 'company-fixture' } } : null
} } } }))
vi.mock('./floorState', () => ({ currentFloorCompanyId: () => 'company-fixture', getFloorState: () => ({ tables: [{ id: 'table-fixture', name: 'Table fictive', status: 'LIBRE', items: [] }], chairs: [] }) }))
vi.mock('../lib/security', () => ({ INTERNAL_API_TOKEN: 'fixture-only', fallbackAdminAllowed: () => false, isProduction: () => false }))
vi.mock('../lib/logger', () => ({ default: { warn() {}, error() {}, info() {} } }))
const pdf = vi.hoisted(() => ({ read: async (): Promise<any> => ({ text: 'Texte de PDF fictif, suffisamment long pour une analyse simulée.' }), destroyed: 0 }))
vi.mock('pdf-parse', () => ({ PDFParse: class {
  getText() { return pdf.read() }
  async getInfo() { return { numpages: 1 } }
  async destroy() { pdf.destroyed++ }
} }))

const calls: string[] = []
let external: (url: string, init: RequestInit) => Promise<Response>
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const json = (body: any, status = 200) => Response.json(body, { status })
const deferred = <T>() => { let resolve!: (value: T) => void; return { promise: new Promise<T>(done => { resolve = done }), resolve } }
let app: ReturnType<typeof express>
const ask = (body = { text: 'état de la salle fictive', currentPath: '/' }) => request(app).post('/api/agent/super-ask').send(body)
const fakeClock = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })

beforeEach(async () => {
  vi.stubEnv('OLLAMA_URL', 'http://ollama.fixture.invalid')
  vi.resetModules()
  const [{ default: agent }, { default: assistant }, { accessFor }] = await Promise.all([import('./agent'), import('./assistant'), import('../lib/business-permissions')])
  app = express(); app.use(express.json())
  app.use('/api/agent', (req, _res, next) => {
    Object.assign(req, { user: { userId: 'human-fixture' }, companyId: 'company-fixture', role: 'OWNER',
      businessAccess: accessFor({ role: 'OWNER', userId: 'human-fixture', companyId: 'company-fixture' }) }); next()
  }, agent, assistant)
  disk.writes = []; memberships.lookups = []; memberships.active = true; calls.length = 0
  pdf.read = async () => ({ text: 'Texte de PDF fictif, suffisamment long pour une analyse simulée.' }); pdf.destroyed = 0
  external = async url => url.endsWith('/api/tags') ? json({ models: [] }) : json({ response: 'Lecture du fournisseur simulé.' })
  vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input)
    if (!/^http:\/\/ollama\.fixture\.invalid\/api\/(?:tags|generate)$/.test(url)
      && !/^https:\/\/duckduckgo\.com\/html\/\?q=/.test(url)) throw Error('Unapproved fixture destination')
    calls.push(url); return external(url, init)
  })
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers() })

describe('Robi : identité directe et refus sans réinterprétation', () => {
  it.each([400, 401, 403, 500])('un fournisseur HTTP %s n’entraîne aucun autre modèle ou outil', async status => {
    external = async () => json({ error: 'Refus du fournisseur simulé' }, status)
    const result = await ask()
    expect(result.status).toBe(503)
    expect(result.body.code).toBe('ASSISTANT_PROVIDER_UNAVAILABLE')
    expect(calls).toHaveLength(1)
    expect(disk.writes).toEqual([])
  })

  it('ne remplace pas une action métier désactivée par une autre interprétation', async () => {
    const result = await ask({ text: 'crée une facture pour Client Fictif de 15 euros', currentPath: '/' })
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ kind: 'action', success: false, details: { code: 'ASSISTANT_ACTION_MIGRATION_REQUIRED' } })
    expect(calls).toEqual([])
    expect(disk.writes).toEqual([])
  })

  it.each(['network', 'json', 'empty'] as const)('ne réinterprète pas un résultat fournisseur inconnu (%s)', async failure => {
    external = async () => {
      if (failure === 'network') throw Error('Réponse perdue fictive')
      return failure === 'json' ? new Response('corps tronqué', { status: 200 }) : json({})
    }
    const result = await ask()
    expect(result.status).toBe(503)
    expect(result.body.kind).toBe('error')
    expect(calls).toHaveLength(1)
    expect(disk.writes).toEqual([])
  })

  it('conserve la véritable identité humaine admise sans adhésion internal-service', async () => {
    vi.stubEnv('JWT_SECRET', 'fixture-key-only-never-production')
    const [{ authenticate }, { requireCompany }, { default: jwt }, { default: agent }, { default: assistant }] = await Promise.all([
      import('../middleware/auth'), import('../middleware/requireCompany'), import('jsonwebtoken'), import('./agent'), import('./assistant'),
    ])
    const secured = express(); secured.use(express.json()); secured.use('/api/agent', authenticate, requireCompany, agent, assistant)
    const bearer = jwt.sign({ userId: 'human-fixture', email: 'owner@fixture.invalid' }, 'fixture-key-only-never-production')
    const result = await request(secured).post('/api/agent/super-ask').set('Authorization', 'Bearer ' + bearer).set('x-company-id', 'company-fixture').send({ text: 'tables libres', currentPath: '/' })
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ kind: 'action', success: true })
    expect(memberships.lookups.length).toBeGreaterThan(1)
    for (const where of memberships.lookups) expect(where).toEqual({ userId: 'human-fixture', companyId: 'company-fixture', isActive: true })
    expect(calls).toEqual([])
    memberships.active = false
    await request(secured).post('/api/agent/super-ask').set('Authorization', 'Bearer ' + bearer).set('x-company-id', 'company-fixture').send({ text: 'tables libres' }).expect(403)
  })

  it('ferme le corps non consommé d’un fournisseur refusé', async () => {
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode('erreur fictive sans fin')) } })
    external = async () => new Response(stream, { status: 503 })
    await ask().expect(503)
    const reader = stream.getReader()
    try { expect(await reader.read()).toEqual({ done: true, value: undefined }) }
    finally { await reader.cancel(); reader.releaseLock() }
  })
})

describe('Robi : un budget total de vingt secondes, corps inclus', () => {
  it.each(['headers', 'body'] as const)('borne la demande lorsque les %s du fournisseur ne terminent pas', async stage => {
    fakeClock()
    const held = deferred<Response>(), body = deferred<any>(), reached = deferred<void>()
    let observedSignal: AbortSignal | null | undefined
    external = async (_url, init) => {
      observedSignal = init.signal; reached.resolve()
      return stage === 'headers' ? held.promise : { ok: true, status: 200, json: () => body.promise } as Response
    }
    const pending = ask().then(result => result)
    await reached.promise
    try {
      await vi.advanceTimersByTimeAsync(20_001)
      const result = await pending
      expect(result.status).toBe(504)
      expect(result.body.code).toBe('ASSISTANT_TIMEOUT')
      expect(observedSignal?.aborted).toBe(true)
      expect(calls).toHaveLength(1)
    } finally { held.resolve(json({ response: 'Réponse tardive ignorée' })); body.resolve({ response: 'Réponse tardive ignorée' }); await pending }
    expect(disk.writes).toEqual([])
  })

  it('ne poursuit ni cache ni mémoire après expiration pendant smart-query', async () => {
    fakeClock()
    const held = deferred<any>(), reached = deferred<void>()
    external = async () => { reached.resolve(); return { ok: true, status: 200, json: () => held.promise } as Response }
    const pending = request(app).post('/api/agent/smart-query').send({ question: 'état fictif non mis en cache', currentPath: '/' }).then(result => result)
    await reached.promise
    try {
      await vi.advanceTimersByTimeAsync(20_001)
      const result = await pending
      expect(result.status).toBe(504)
    } finally { held.resolve({ response: 'Réponse tardive à ne pas mémoriser' }); await pending }
    expect(disk.writes).toEqual([])
    vi.useRealTimers()
    external = async () => json({ response: 'Réponse fraîche de fixture' })
    const next = await request(app).post('/api/agent/smart-query').send({ question: 'état fictif non mis en cache', currentPath: '/' })
    expect(next.body.text).toBe('Réponse fraîche de fixture')
    expect(next.body.cached).not.toBe(true)
  })

  it.each(['headers', 'body'] as const)('borne les %s de la recherche externe sans créer de nouveau budget', async stage => {
    fakeClock()
    const held = deferred<Response>(), body = deferred<string>(), reached = deferred<void>()
    let signal: AbortSignal | null | undefined
    external = async (_url, init) => { signal = init.signal; reached.resolve(); return stage === 'headers' ? held.promise : { ok: true, status: 200, text: () => body.promise } as Response }
    const pending = ask({ text: 'cherche sur internet une documentation fictive', currentPath: '/' }).then(result => result)
    await reached.promise
    try {
      await vi.advanceTimersByTimeAsync(20_001)
      expect((await pending).status).toBe(504)
      expect(signal?.aborted).toBe(true)
    } finally { held.resolve(new Response('<html></html>')); body.resolve('<html></html>'); await pending }
    expect(calls).toHaveLength(1)
    expect(disk.writes).toEqual([])
  })

  it('abandonne le fournisseur quand le client ferme prématurément sa connexion', async () => {
    const held = deferred<Response>(), reached = deferred<void>()
    let signal: AbortSignal | null | undefined
    external = async (_url, init) => { signal = init.signal; reached.resolve(); return held.promise }
    const pending = ask(); pending.end(() => {})
    await reached.promise
    try { pending.abort(); await delay(50); expect(signal?.aborted).toBe(true) }
    finally { held.resolve(json({ response: 'Réponse abandonnée' })) }
    await delay(20)
    expect(calls).toHaveLength(1)
    expect(disk.writes).toEqual([])
  })

  it.each([3_600_000, -1000])('un en-tête public de délai (%s ms) ne change pas les vingt secondes', async supplied => {
    fakeClock()
    const held = deferred<Response>(), reached = deferred<void>()
    let complete = false
    external = async () => { reached.resolve(); return held.promise }
    const pending = ask().set('x-creorga-assistant-deadline', String(Date.now() + supplied)).then(result => { complete = true; return result })
    await reached.promise
    try {
      await vi.advanceTimersByTimeAsync(19_999); expect(complete).toBe(false)
      await vi.advanceTimersByTimeAsync(2)
      expect((await pending).status).toBe(504)
    } finally { held.resolve(json({ response: 'Réponse tardive' })); await pending }
    expect(disk.writes).toEqual([])
  })

  it('un en-tête de service interne arbitraire ne change pas l’identité ou le délai admis', async () => {
    const result = await ask({ text: 'tables libres', currentPath: '/' }).set('x-internal-token', 'attacker').set('x-creorga-assistant-deadline', '0')
    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
    expect(calls).toEqual([])
  })

  it('borne également le chemin SSE et ne transmet aucun fragment après expiration', async () => {
    fakeClock()
    const held = deferred<Response>(), reached = deferred<void>()
    external = async () => { reached.resolve(); return held.promise }
    const pending = request(app).post('/api/agent/smart-query-stream').send({ question: 'état fictif stream', currentPath: '/' }).then(result => result)
    await reached.promise
    try { await vi.advanceTimersByTimeAsync(20_001); expect((await pending).status).toBe(504) }
    finally { held.resolve(json({ response: 'Fragment tardif' })); await pending }
    expect(disk.writes).toEqual([])
  })

  it('borne un parseur PDF bloqué et détruit le parseur après sa résolution tardive', async () => {
    fakeClock()
    const held = deferred<any>(), reached = deferred<void>()
    pdf.read = async () => { reached.resolve(); return held.promise }
    const pending = request(app).post('/api/agent/process-pdf').send({ pdfBase64: Buffer.from('%PDF-1.7\nfixture').toString('base64') }).then(result => result)
    await reached.promise
    try { await vi.advanceTimersByTimeAsync(20_001); expect((await pending).status).toBe(504) }
    finally { held.resolve({ text: 'Texte tardif ne déclenchant aucun fournisseur.' }); await pending }
    expect(calls).toEqual([])
    expect(pdf.destroyed).toBe(1)
    expect(disk.writes).toEqual([])
  })

  it('borne aussi le corps de réponse du fournisseur PDF sans succès tardif', async () => {
    fakeClock()
    const held = deferred<any>(), reached = deferred<void>()
    let signal: AbortSignal | null | undefined
    external = async (_url, init) => { signal = init.signal; reached.resolve(); return { ok: true, status: 200, json: () => held.promise } as Response }
    const pending = request(app).post('/api/agent/process-pdf').send({ pdfBase64: Buffer.from('%PDF-1.7\nfixture').toString('base64') }).then(result => result)
    await reached.promise
    try {
      await vi.advanceTimersByTimeAsync(20_001)
      expect((await pending).status).toBe(504)
      expect(signal?.aborted).toBe(true)
    } finally { held.resolve({ response: JSON.stringify({ summary: 'Analyse trop tardive' }) }); await pending }
    expect(pdf.destroyed).toBe(1)
    expect(disk.writes).toEqual([])
  })
})
