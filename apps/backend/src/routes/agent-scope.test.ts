import express from 'express'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessFor, CAPABILITIES } from '../lib/business-permissions'

// Frontières explicitement simulées : aucune base, aucun fichier métier et
// aucun fournisseur réel. Les routeurs et leur orchestration restent réels.
const fixture = vi.hoisted(() => ({ companyId: 'company-a', writes: [] as string[], diskAccess: [] as string[], providerCalls: [] as any[], queries: [] as any[], orders: [] as any[], products: [] as any[], shifts: [] as any[], unavailable: false, files: new Map<string, string>(), pdfDestroyed: 0, schedulerCalls: [] as string[], member: null as any,
  afterAdmission: null as null | (() => void), queryGate: null as null | ((model: string) => Promise<void>), onFloorRead: null as null | (() => void), membershipGate: null as null | (() => Promise<void>),
  pdfGate: null as null | (() => Promise<void>), notifReads: 0 }))
vi.mock('../jobs/proactive-worker', () => ({ getRecentNotifs: () => { fixture.notifReads++; return [{ message: 'PRIVATE_REVOKED_NOTIFICATION' }] } }))
vi.mock('../jobs/scheduler', () => ({
  listTasks: () => { fixture.schedulerCalls.push('read'); return [{ id: 'foreign-task', description: 'PRIVATE_OTHER_COMPANY_REMINDER' }] },
  createTask: () => { fixture.schedulerCalls.push('create'); return { id: 'new-global-task' } },
  deleteTask: () => { fixture.schedulerCalls.push('delete'); return true },
  cancelTask: () => { fixture.schedulerCalls.push('cancel'); return true },
}))
vi.mock('fs', () => ({ default: {
  existsSync: (name: string) => { fixture.diskAccess.push(name); return fixture.files.has(name) }, mkdirSync() {}, readFileSync(name: string) { fixture.diskAccess.push(name); if (fixture.files.has(name)) return fixture.files.get(name); throw Error('Aucun fichier métier dans la fixture') },
  writeFileSync(name: string) { fixture.writes.push(name) },
} }))
vi.mock('../lib/safe-json', () => ({ safeWriteJson(name: string, data: unknown) { fixture.writes.push(name); fixture.files.set(name, JSON.stringify(data)) } }))
vi.mock('pdf-parse', () => ({ PDFParse: class {
  async getText() { await fixture.pdfGate?.(); return { text: 'Planning fictif : collaborateur A, lundi de huit heures à midi.' } }
  async getInfo() { return { numpages: 1 } }
  async destroy() { fixture.pdfDestroyed++ }
} }))
vi.mock('./floorState', () => ({
  currentFloorCompanyId: () => fixture.companyId,
  getFloorState: () => { fixture.onFloorRead?.(); return { tables: [{ id: 't1', name: 'Table A', status: 'LIBRE', items: [] }], chairs: [] } },
}))
vi.mock('../lib/prisma', () => ({ default: { userCompany: { findFirst: async ({ where }: any) => {
  await fixture.membershipGate?.()
  return fixture.member?.isActive && fixture.member.userId === where.userId && fixture.member.companyId === where.companyId ? { ...fixture.member } : null
} }, ...Object.fromEntries(['product', 'ingredient', 'invoice', 'expense', 'shift', 'order'].map(model => [model, {
  findMany: async (args: any) => {
    fixture.queries.push({ model, args })
    await fixture.queryGate?.(model)
    if (fixture.unavailable) throw Error('PostgreSQL fixture indisponible')
    if (model === 'order') return fixture.orders
    if (model === 'product') return fixture.products.filter(row => !args.where.stock || row.stock !== null && row.stock <= args.where.stock.lte).slice(0, args.take)
    if (model === 'shift') return fixture.shifts.filter(row => (!args.where.userId || row.userId === args.where.userId)
      && (!args.where.status || args.where.status.in.includes(row.status))
      && (!args.where.endTime?.gt || row.endTime > args.where.endTime.gt)
      && (!args.where.status || row.startTime < args.where.startTime.lt)).slice(0, args.take)
    return []
  },
}])) } }))
vi.mock('../lib/logger', () => ({ default: { warn() {}, error() {}, info() {} } }))
vi.mock('../lib/security', () => ({ internalHeaders: () => ({ 'X-Internal-Token': 'fixture-only' }) }))

const allCapabilities = ['assistant.use', 'assistant.business.read', 'finance.revenue.read', 'finance.costs.read', 'service.read', 'inventory.quantities.read', 'hr.schedule.read', 'hr.schedule.manage', 'invoices.read', 'crm.customers.read', 'marketing.read', 'reputation.read']
let capabilities: string[], revision: string, role: string
let app: ReturnType<typeof express>
beforeEach(async () => {
  vi.stubEnv('OLLAMA_URL', 'http://ollama.fixture.invalid')
  vi.resetModules()
  fixture.companyId = 'company-a'; fixture.writes = []; fixture.providerCalls = []; fixture.queries = []
  fixture.unavailable = false
  fixture.diskAccess = []; fixture.member = null; fixture.afterAdmission = null; fixture.queryGate = null; fixture.onFloorRead = null; fixture.membershipGate = null
  fixture.pdfGate = null; fixture.notifReads = 0
  fixture.products = [{ id: 'product-a', name: 'Produit fictif A', stock: 12 }]
  fixture.shifts = [{ id: 'shift-a', userId: 'human-a', role: 'Service', status: 'SCHEDULED', startTime: new Date('2026-10-18T08:00:00Z'), endTime: new Date('2026-10-18T12:00:00Z'), user: { firstName: 'Fictif', lastName: 'A' } }]
  fixture.files.clear(); fixture.pdfDestroyed = 0; fixture.schedulerCalls = []
  fixture.orders = [{ id: 'paid-order-a', status: 'PAID', paidAt: new Date(), total: 12.34, subtotal: 12, taxAmount: 0.34, tenders: [{ amountCents: 1234 }] }]
  capabilities = [...allCapabilities]; revision = 'revision-a'; role = 'EMPLOYEE'
  const [{ default: agent }, { default: assistant }, { default: advanced }] = await Promise.all([import('./agent'), import('./assistant'), import('./assistant-advanced')])
  app = express(); app.use(express.json())
  app.use('/api/agent', (req, _res, next) => {
    fixture.member = { userId: 'human-a', companyId: fixture.companyId, role, isActive: true, accessVersion: revision === 'revision-a' ? 1 : 2,
      capabilities: Object.fromEntries(CAPABILITIES.map(capability => [capability, capabilities.includes(capability)])) }
    Object.assign(req, { user: { userId: 'human-a' }, companyId: fixture.companyId, role, businessAccess: accessFor(fixture.member) })
    fixture.afterAdmission?.(); next()
  }, agent, assistant, advanced)
  vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input)
    fixture.providerCalls.push({ url, init })
    if (url !== 'http://ollama.fixture.invalid/api/generate') throw Error('Destination externe non autorisée dans la fixture')
    return Response.json({ response: 'Réponse du fournisseur simulé, source product-a.' })
  })
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers() })
const ask = (text = 'État des produits', currentPath = '/inventory/stock') => request(app).post('/api/agent/super-ask').send({ text, currentPath, userId: 'victim', companyId: 'company-b', role: 'OWNER' })
const deferred = <T = void>() => { let resolve!: (value: T) => void; return { promise: new Promise<T>(done => { resolve = done }), resolve } }

describe('Robi : révocation pendant une requête déjà admise', () => {
  const changed = (change: string) => {
    if (change === 'inactive') fixture.member.isActive = false
    else if (change === 'company') fixture.companyId = 'company-b'
    else fixture.member.accessVersion += 2 // Retrait puis réattribution : mêmes capacités, nouvelle révision.
  }
  it('refuse avant le chargement métier quand l’adhésion a expiré depuis l’admission', async () => {
    fixture.afterAdmission = () => changed('inactive')
    await ask('état des produits disponibles').expect(403)
    expect(fixture.queries).toEqual([]); expect(fixture.providerCalls).toEqual([]); expect(fixture.writes).toEqual([])
  })
  it('refuse la mémoire quand la relecture des droits échoue', async () => {
    fixture.membershipGate = async () => { throw Error('Adhésions PostgreSQL indisponibles') }
    const response = await request(app).get('/api/agent/memory/recall').expect(503)
    expect(response.body.code).toBe('ASSISTANT_CONTEXT_UNAVAILABLE')
    expect(fixture.diskAccess).toEqual([]); expect(fixture.writes).toEqual([]); expect(fixture.providerCalls).toEqual([])
  })
  it('borne la relecture des droits à deux secondes sans reprendre une entrée disque tardive', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const reached = deferred(), release = deferred()
    fixture.membershipGate = async () => { reached.resolve(); await release.promise }
    const pending = request(app).get('/api/agent/memory/recall').then(response => response)
    await reached.promise
    try {
      await vi.advanceTimersByTimeAsync(2001)
      const response = await pending
      expect(response.status).toBe(503)
      expect(response.body.code).toBe('ASSISTANT_CONTEXT_UNAVAILABLE')
    } finally { release.resolve(); await pending }
    expect(fixture.diskAccess).toEqual([]); expect(fixture.writes).toEqual([]); expect(fixture.providerCalls).toEqual([])
  })
  it.each(['revision', 'inactive', 'company'])('refuse après une lecture suspendue si le contexte change (%s)', async change => {
    const reached = deferred(), release = deferred()
    fixture.queryGate = async model => { if (model === 'product') { reached.resolve(); await release.promise } }
    const pending = ask('état des produits disponibles').then(response => response)
    await reached.promise; changed(change); release.resolve()
    const response = await pending
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('ASSISTANT_SCOPE_CHANGED')
    expect(JSON.stringify(response.body)).not.toContain('Produit fictif A')
    expect(fixture.providerCalls).toEqual([]); expect(fixture.writes).toEqual([]); expect(fixture.diskAccess).toEqual([])
  })

  it.each([
    ['Quels produits sont en rupture ?', 'product'], ['Quel employé travaille ce soir ?', 'shift'], ['Quel chiffre d’affaires aujourd’hui ?', 'order'],
  ])('refuse aussi la lecture locale suspendue : %s', async (text, model) => {
    const reached = deferred(), release = deferred()
    fixture.products = [{ id: 'private-stock', name: 'PRIVATE_REVOKED_STOCK', stock: 0 }]
    fixture.queryGate = async queried => { if (queried === model) { reached.resolve(); await release.promise } }
    const pending = ask(text, '/').then(response => response)
    await reached.promise; changed('revision'); release.resolve()
    const response = await pending
    expect(response.status).toBe(403)
    expect(response.body.data).toBeUndefined()
    expect(fixture.providerCalls).toEqual([]); expect(fixture.writes).toEqual([])
  })

  it('ne retourne pas le cache et ne lit pas la mémoire après une révocation pendant le contexte', async () => {
    await ask('état des produits disponibles').expect(200)
    const previousWrites = [...fixture.writes]
    fixture.diskAccess = []
    const reached = deferred(), release = deferred()
    fixture.queryGate = async model => { if (model === 'product') { reached.resolve(); await release.promise } }
    const pending = ask('état des produits disponibles').then(response => response)
    await reached.promise; changed('revision'); release.resolve()
    const response = await pending
    expect(response.status).toBe(403)
    expect(response.body.cached).toBeUndefined()
    expect(fixture.providerCalls).toHaveLength(1); expect(fixture.writes).toEqual(previousWrites); expect(fixture.diskAccess).toEqual([])
  })

  it.each(['headers', 'body', 'model'])('refuse le résultat suspendu du fournisseur (%s) sans mémoire ou cache périmés', async stage => {
    const reached = deferred(), release = deferred()
    vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit = {}) => {
      const url = String(input); fixture.providerCalls.push({ url, init })
      if (stage === 'model') {
        if (url.endsWith('/api/tags')) { reached.resolve(); await release.promise; return Response.json({ models: [] }) }
        return Response.json({ response: 'PRIVATE_REVOKED_PROVIDER' })
      }
      if (stage === 'headers') { reached.resolve(); await release.promise; return Response.json({ response: 'PRIVATE_REVOKED_PROVIDER' }) }
      return { ok: true, status: 200, json: async () => { reached.resolve(); await release.promise; return { response: 'PRIVATE_REVOKED_PROVIDER' } } } as Response
    })
    const question = stage === 'model' ? 'analyse les produits disponibles' : 'état des produits disponibles'
    const pending = ask(question).then(response => response)
    await reached.promise; changed('revision'); release.resolve()
    const response = await pending
    expect(response.status).toBe(403)
    expect(JSON.stringify(response.body)).not.toContain('PRIVATE_REVOKED_PROVIDER')
    expect(fixture.providerCalls).toHaveLength(1); expect(fixture.writes).toEqual([])
    fixture.queryGate = null
    vi.stubGlobal('fetch', async () => Response.json({ response: 'Réponse fraîche après nouvelle admission.' }))
    const fresh = await ask(question).expect(200)
    expect(fresh.body.cached).not.toBe(true)
    expect(fresh.body.text).toBe('Réponse fraîche après nouvelle admission.')
  })

  it.each([
    ['get', '/memory/recall'], ['get', '/memory/list/victim'], ['post', '/memory/learn'], ['delete', '/memory/forget'],
  ] as const)('revalide avant toute entrée disque sur $0 $1', async (method, endpoint) => {
    fixture.afterAdmission = () => changed('inactive')
    const response = await request(app)[method]('/api/agent' + endpoint).send({ entity: 'Fictif', fact: 'PRIVATE_MEMORY' })
    expect(response.status).toBe(403)
    expect(fixture.diskAccess).toEqual([]); expect(fixture.writes).toEqual([])
  })

  it.each(['/super-ask', '/execute'])('ne retourne pas de données de salle après un changement pendant %s', async endpoint => {
    fixture.onFloorRead = () => changed('revision')
    const response = await request(app).post('/api/agent' + endpoint).send({ text: 'tables libres', commandId: 'pos.stale-sessions', currentPath: '/' })
    expect(response.status).toBe(403)
    expect(response.body.details).toBeUndefined()
    expect(fixture.providerCalls).toEqual([]); expect(fixture.writes).toEqual([])
  })

  it('ferme le workflow historique avant tout appel interne ou mutation', async () => {
    const response = await request(app).post('/api/agent/workflow').send({ text: 'tables libres puis crée une facture Client Fictif' })
    expect(response.status).toBe(503)
    expect(response.body.code).toBe('ASSISTANT_ADVANCED_MIGRATION_REQUIRED')
    expect(response.body.success).not.toBe(true)
    expect(fixture.providerCalls).toEqual([]); expect(fixture.writes).toEqual([])
  })

  it.each([['get', '/mobile-summary'], ['post', '/daily-briefing'], ['get', '/proactive']] as const)('refuse les indicateurs suspendus sur $0 $1', async (method, endpoint) => {
    const reached = deferred(), release = deferred()
    fixture.queryGate = async model => { if (model === 'shift') { reached.resolve(); await release.promise } }
    const pending = request(app)[method]('/api/agent' + endpoint).send({}).then(response => response)
    await reached.promise; changed('revision'); release.resolve()
    const response = await pending
    expect(response.status).toBe(403)
    expect(response.body).toMatchObject({ kind: 'error', code: 'ASSISTANT_SCOPE_CHANGED' })
    expect(response.body.unpaidTotal).toBeUndefined(); expect(response.body.suggestions).toBeUndefined()
    expect(fixture.providerCalls).toEqual([]); expect(fixture.writes).toEqual([])
  })

  it('revalide les notifications après leur import et avant leur lecture', async () => {
    fixture.afterAdmission = () => changed('revision')
    const response = await request(app).get('/api/agent/proactive/inbox')
    expect(response.status).toBe(403)
    expect(response.body.notifs).toBeUndefined(); expect(fixture.notifReads).toBe(0)
  })

  it.each(['parse', 'provider'])('refuse le PDF après révocation pendant %s', async stage => {
    const reached = deferred(), release = deferred()
    if (stage === 'parse') fixture.pdfGate = async () => { reached.resolve(); await release.promise }
    vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit = {}) => {
      fixture.providerCalls.push({ url: String(input), init })
      return { ok: true, status: 200, json: async () => {
        reached.resolve(); await release.promise
        return { response: JSON.stringify({ type: 'planning', summary: 'PRIVATE_REVOKED_PDF' }) }
      } } as Response
    })
    const pending = request(app).post('/api/agent/process-pdf').send({ pdfBase64: Buffer.from('%PDF-1.7\nfixture').toString('base64') }).then(response => response)
    await reached.promise; changed('revision'); release.resolve()
    const response = await pending
    expect(response.status).toBe(403)
    expect(response.body.kind).toBe('error'); expect(JSON.stringify(response.body)).not.toContain('PRIVATE_REVOKED_PDF')
    expect(fixture.providerCalls).toHaveLength(stage === 'parse' ? 0 : 1); expect(fixture.writes).toEqual([])
    expect(fixture.pdfDestroyed).toBe(1)
  })

  it('refuse la proposition de salle photographiée après révocation pendant le fournisseur', async () => {
    const reached = deferred(), release = deferred()
    vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit = {}) => {
      fixture.providerCalls.push({ url: String(input), init })
      return { ok: true, status: 200, json: async () => {
        reached.resolve(); await release.promise
        return { response: JSON.stringify({ zone: 'PRIVATE_REVOKED_PHOTO', tablesCount: 3, features: [] }) }
      } } as Response
    })
    const pending = request(app).post('/api/agent/analyze-photos').send({ photos: ['AAAA'] }).then(response => response)
    await reached.promise; changed('inactive'); release.resolve()
    const response = await pending
    expect(response.status).toBe(403)
    expect(response.body.proposal).toBeUndefined(); expect(JSON.stringify(response.body)).not.toContain('PRIVATE_REVOKED_PHOTO')
    expect(fixture.providerCalls).toHaveLength(1); expect(fixture.writes).toEqual([])
  })

  it('refuse les résultats web après révocation pendant leur lecture', async () => {
    const reached = deferred(), release = deferred()
    vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit = {}) => {
      fixture.providerCalls.push({ url: String(input), init })
      return { ok: true, status: 200, text: async () => {
        reached.resolve(); await release.promise
        return '<a class="result__a" href="https://fixture.invalid">PRIVATE_REVOKED_WEB</a>'
      } } as Response
    })
    const pending = request(app).get('/api/agent/web-search?q=fixture').then(response => response)
    await reached.promise; changed('revision'); release.resolve()
    const response = await pending
    expect(response.status).toBe(403)
    expect(response.body.results).toBeUndefined(); expect(JSON.stringify(response.body)).not.toContain('PRIVATE_REVOKED_WEB')
    expect(fixture.providerCalls).toHaveLength(1); expect(fixture.writes).toEqual([])
  })
})

describe('Robi : factures et dépenses ont des autorisations distinctes du CA', () => {
  it.each([
    ['montants des dépenses récentes', '/accounting', 'finance.costs.read', 'expense'],
    ['factures impayées', '/invoices', 'invoices.read', 'invoice'],
    ['factures impayées', '/accounting', 'invoices.read', 'invoice'],
  ])('lit seulement la ressource demandée : %s sur %s', async (text, currentPath, allowed, model) => {
    capabilities = ['assistant.use', 'assistant.business.read', allowed]
    await ask(text, currentPath).expect(200)
    expect(fixture.queries.map(query => query.model)).toEqual([model])
    expect(fixture.providerCalls).toEqual([])
  })

  it('refuse un résumé comptable ambigu avec le seul droit des dépenses', async () => {
    capabilities = ['assistant.use', 'assistant.business.read', 'finance.costs.read']
    await ask('résumé comptable', '/accounting').expect(403)
    expect(fixture.queries).toEqual([]); expect(fixture.providerCalls).toEqual([])
  })
})

describe('Robi : contexte autorisé conservé dans les services directs', () => {
  it('répond à une lecture déterministe sans token interne ni fournisseur', async () => {
    const result = await ask('tables libres', '/pos')
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ kind: 'action', success: true, intent: 'pos.free-tables' })
    expect(fixture.providerCalls).toEqual([])
  })

  it('charge les données PostgreSQL de la société admise, jamais les valeurs du corps', async () => {
    const result = await ask('état des produits disponibles')
    expect(result.status).toBe(200)
    expect(result.body.text).toContain('fournisseur simulé')
    expect(fixture.queries.some(q => q.model === 'product')).toBe(true)
    for (const query of fixture.queries) {
      expect(query.args.where.companyId).toBe('company-a')
      expect(query.args.take).toBeLessThanOrEqual(100)
    }
    expect(fixture.providerCalls).toHaveLength(1)
    const call = fixture.providerCalls[0]
    expect(new Headers(call.init.headers).has('x-internal-token')).toBe(false)
    expect(JSON.parse(call.init.body).prompt).toContain('Produit fictif A')
    expect(fixture.writes.every(file => !file.includes('victim') && !file.includes('company-b'))).toBe(true)
  })

  it.each(['assistant.use', 'assistant.business.read', 'inventory.quantities.read'])('refuse sans %s avant lecture ou fournisseur', async capability => {
    capabilities = capabilities.filter(c => c !== capability); role = 'EMPLOYEE'
    const result = await ask('état des produits disponibles')
    expect(result.status).toBe(403)
    expect(fixture.queries).toEqual([])
    expect(fixture.providerCalls).toEqual([])
    expect(fixture.writes).toEqual([])
  })

  it('refuse les finances avant fournisseur, même si la page prétendue est différente', async () => {
    capabilities = capabilities.filter(c => c !== 'finance.revenue.read'); role = 'EMPLOYEE'
    const result = await ask('Quel chiffre d’affaires et quelles factures impayées ?', '/')
    expect(result.status).toBe(403)
    expect(fixture.providerCalls).toEqual([])
    expect(fixture.queries).toEqual([])
  })

  it('borne le planning salarié à son identité serveur', async () => {
    capabilities = capabilities.filter(c => c !== 'hr.schedule.manage'); role = 'EMPLOYEE'
    const result = await ask('mes horaires prévus', '/hr/planning')
    expect(result.status).toBe(200)
    const query = fixture.queries.find(q => q.model === 'shift')
    expect(query.args.where).toMatchObject({ companyId: 'company-a', userId: 'human-a' })
  })

  it('ne partage ni cache ni mémoire entre deux révisions de droits', async () => {
    await ask('état des produits disponibles').expect(200)
    fixture.files.set(fixture.writes[0], JSON.stringify([{ q: 'privé', a: 'PRIVATE_OLD_ROLE', ts: Date.now() }]))
    revision = 'revision-b'
    await ask('état des produits disponibles').expect(200)
    expect(fixture.providerCalls).toHaveLength(2)
    expect(new Set(fixture.writes).size).toBe(2)
    expect(JSON.parse(fixture.providerCalls[1].init.body).prompt).not.toContain('PRIVATE_OLD_ROLE')
  })

  it('ne partage pas une réponse entre sociétés du même utilisateur', async () => {
    await ask('état des produits disponibles').expect(200)
    fixture.companyId = 'company-b'
    await ask('état des produits disponibles').expect(200)
    expect(fixture.providerCalls).toHaveLength(2)
    expect(fixture.queries.map(q => q.args.where.companyId)).toContain('company-b')
  })

  it('refuse les indicateurs financiers mobiles au salarié sans cette capacité', async () => {
    capabilities = capabilities.filter(c => c !== 'finance.revenue.read'); role = 'EMPLOYEE'
    for (const route of ['/mobile-summary', '/proactive']) await request(app).get('/api/agent' + route).expect(403)
    await request(app).post('/api/agent/daily-briefing').send({}).expect(403)
    expect(fixture.queries).toEqual([])
  })

  it('garde la photo en migration et refuse un faux PDF avant le fournisseur', async () => {
    const image = await request(app).post('/api/agent/photo-magic').send({ imageBase64: 'AAAA' }).expect(503)
    expect(image.body.code).toBe('FEATURE_MIGRATION_REQUIRED')
    await request(app).post('/api/agent/process-pdf').send({ pdfBase64: Buffer.from('not a PDF').toString('base64') }).expect(400)
    expect(fixture.providerCalls).toEqual([])
  })

  it('lit le CA local en centimes et précise sa base sans appeler un fournisseur', async () => {
    const result = await ask('Quel chiffre d’affaires aujourd’hui ?', '/').expect(200)
    expect(result.body).toMatchObject({ source: 'local-business-read', data: { salesCents: 1234, baseCents: 1200, taxCents: 34, orderCount: 1 } })
    expect(result.body.text).toContain('sans IA générative')
    expect(fixture.queries.map(q => q.model)).toEqual(['order'])
    expect(fixture.queries[0].args.where).toMatchObject({ companyId: 'company-a', status: 'PAID' })
    expect(fixture.providerCalls).toEqual([])
    expect(fixture.writes).toEqual([])
  })

  it('refuse un CA dont les règlements ne correspondent pas aux ventes', async () => {
    fixture.orders[0].tenders = [{ amountCents: 1000 }]
    const result = await ask('chiffre d’affaires aujourd’hui', '/').expect(503)
    expect(result.body.code).toBe('ASSISTANT_REVENUE_INCONSISTENT')
    expect(fixture.providerCalls).toEqual([])
  })

  it('respecte les journées de 23 et 25 heures au Luxembourg', async () => {
    const { luxembourgDayBounds } = await import('../lib/assistant-scope')
    const spring = luxembourgDayBounds(new Date('2026-03-29T12:00:00Z'))
    const autumn = luxembourgDayBounds(new Date('2026-10-25T12:00:00Z'))
    expect(spring.gte.toISOString()).toBe('2026-03-28T23:00:00.000Z')
    expect((spring.lt.getTime() - spring.gte.getTime()) / 3_600_000).toBe(23)
    expect(autumn.gte.toISOString()).toBe('2026-10-24T22:00:00.000Z')
    expect((autumn.lt.getTime() - autumn.gte.getTime()) / 3_600_000).toBe(25)
  })

  it.each(['home.day-summary', 'pos.day-stats', 'pos.open-tables'])('refuse aussi la commande directe %s sans finances', async commandId => {
    capabilities = capabilities.filter(c => c !== 'finance.revenue.read')
    await request(app).post('/api/agent/execute').send({ commandId }).expect(403)
    expect(fixture.providerCalls).toEqual([])
  })

  it('conserve les bornes financières : absence de ledger, dépassement de volume ou montant dangereux refusés', async () => {
    for (const orders of [
      [{ ...fixture.orders[0], tenders: [] }],
      Array.from({ length: 1001 }, () => fixture.orders[0]),
      [{ ...fixture.orders[0], total: Number.MAX_SAFE_INTEGER }],
    ]) {
      fixture.orders = orders
      const result = await ask('chiffre d’affaires aujourd’hui', '/').expect(503)
      expect(result.body.code).toBe('ASSISTANT_REVENUE_INCONSISTENT')
    }
    expect(fixture.providerCalls).toEqual([])
  })

  it('ne présente pas le CA du jour comme une autre période ou un montant net', async () => {
    for (const text of ['chiffre d’affaires cette semaine', 'chiffre d’affaires net', 'chiffre d’affaires hier']) {
      const result = await ask(text, '/').expect(503)
      expect(result.body.code).toBe('ASSISTANT_REVENUE_PERIOD_UNAVAILABLE')
    }
    expect(fixture.queries).toEqual([])
  })

  it('analyse un PDF éphémère avec le fournisseur simulé configuré, sans adopter ses actions', async () => {
    vi.stubGlobal('fetch', async (input: string | URL, init: RequestInit = {}) => {
      fixture.providerCalls.push({ url: String(input), init })
      return Response.json({ response: JSON.stringify({ type: 'planning', summary: 'Planning fictif analysé.', route: 'https://untrusted.invalid', kind: 'action', uiAction: { type: 'navigate' } }) })
    })
    const result = await request(app).post('/api/agent/process-pdf').send({ pdfBase64: Buffer.from('%PDF-1.7\nfixture content').toString('base64') }).expect(200)
    expect(result.body.kind).toBe('pdf-action')
    expect(result.body.uiAction).toBeUndefined()
    expect(result.body.debug.actionExecuted).toBe(false)
    expect(fixture.providerCalls[0].url).toBe('http://ollama.fixture.invalid/api/generate')
    expect(fixture.pdfDestroyed).toBe(1)
    expect(fixture.writes).toEqual([])
  })

  it('rejette les objets de question et les PDF base64 malformés', async () => {
    await request(app).post('/api/agent/super-ask').send({ text: { toString: 'attaque' } }).expect(400)
    for (const pdfBase64 of ['%%%=', 'AAAA====', 'AAAAA', 123]) await request(app).post('/api/agent/process-pdf').send({ pdfBase64 }).expect(400)
    expect(fixture.providerCalls).toEqual([])
  })

  it('ne confond pas le droit de CA avec celui des dépenses', async () => {
    capabilities = capabilities.filter(c => c !== 'finance.costs.read')
    await ask('montants des dépenses récentes', '/accounting').expect(403)
    expect(fixture.queries).toEqual([])
    expect(fixture.providerCalls).toEqual([])
  })

  it('exige le droit de salle sur les intentions directes et les questions libres', async () => {
    capabilities = capabilities.filter(c => c !== 'service.read')
    await ask('tables libres', '/pos').expect(403)
    await ask('état général de la salle', '/pos').expect(403)
    expect(fixture.providerCalls).toEqual([])
  })

  it.each([
    { method: 'get', path: '/schedule?userId=victim&status=pending' },
    { method: 'post', path: '/schedule' },
    { method: 'delete', path: '/schedule/foreign-task' },
    { method: 'post', path: '/schedule/foreign-task/cancel' },
  ] as const)('ferme $method $path sans lire, créer, supprimer ou annuler une tâche globale', async ({ method, path }) => {
    role = 'EMPLOYEE'; fixture.companyId = 'company-b'
    const response = await request(app)[method]('/api/agent' + path).send({ userId: 'victim', companyId: 'company-a',
      text: 'rappel privé', description: 'rappel privé', dueAt: Date.now() + 60_000 }).expect(503)
    expect(response.body.code).toBe('FEATURE_MIGRATION_REQUIRED')
    expect(response.body.message).toContain('conservés')
    expect(response.body.success).not.toBe(true)
    expect(JSON.stringify(response.body)).not.toContain('PRIVATE_OTHER_COMPANY_REMINDER')
    expect(fixture.schedulerCalls).toEqual([])
    expect(fixture.writes).toEqual([])
    expect(fixture.providerCalls).toEqual([])
  })
})

describe('Lectures locales explicites : ruptures et planning de ce soir', () => {
  const stockQuestion = 'Quels produits sont en rupture ?'
  const planningQuestion = 'Quel employé travaille ce soir ?'
  const noProvider = () => vi.stubGlobal('fetch', async (input: unknown) => {
    fixture.providerCalls.push({ url: String(input) }); throw Error('Fournisseur simulé absent')
  })
  const eveningFixture = () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-17T12:00:00Z'))
    fixture.shifts = [
      { id: 'evening-a', userId: 'human-a', role: 'Service', status: 'SCHEDULED', startTime: new Date('2026-10-17T15:00:00Z'), endTime: new Date('2026-10-17T20:00:00Z'), user: { firstName: 'Fictif', lastName: 'A' } },
      { id: 'evening-b', userId: 'human-b', role: 'Bar', status: 'CONFIRMED', startTime: new Date('2026-10-17T20:00:00Z'), endTime: new Date('2026-10-18T01:00:00Z'), user: { firstName: 'Fictif', lastName: 'B' } },
      { id: 'ends-at-evening', userId: 'human-c', role: 'Service', status: 'SCHEDULED', startTime: new Date('2026-10-17T10:00:00Z'), endTime: new Date('2026-10-17T16:00:00Z'), user: { firstName: 'Hors', lastName: 'Plage' } },
      { id: 'cancelled', userId: 'human-d', role: 'Service', status: 'CANCELLED', startTime: new Date('2026-10-17T17:00:00Z'), endTime: new Date('2026-10-17T21:00:00Z'), user: { firstName: 'Annulé', lastName: 'Fictif' } },
    ]
  }

  it.each(['/super-ask', '/smart-query'])('répond exactement aux ruptures sans fournisseur sur %s', async endpoint => {
    noProvider()
    fixture.products = [{ id: 'zero', name: 'Produit zéro', stock: 0 }, { id: 'negative', name: 'Produit négatif', stock: -2 },
      { id: 'untracked', name: 'Stock non suivi', stock: null }, { id: 'available', name: 'Disponible', stock: 5 }]
    const response = await request(app).post('/api/agent' + endpoint).send({ text: stockQuestion, currentPath: '/', companyId: 'company-b', userId: 'victim' }).expect(200)
    expect(response.body).toMatchObject({ source: 'local-business-read', data: { type: 'product-stockouts', truncated: false } })
    expect(response.body.data.items.map((row: any) => row.id)).toEqual(['zero', 'negative'])
    expect(response.body.text).toContain('sans IA générative')
    expect(response.body.text).toContain('non suivis')
    expect(fixture.queries).toHaveLength(1)
    expect(fixture.queries[0]).toMatchObject({ model: 'product', args: { take: 41, where: { companyId: 'company-a', isActive: true, stock: { lte: 0 } } } })
    expect(fixture.providerCalls).toEqual([]); expect(fixture.writes).toEqual([])
  })

  it.each(['/super-ask', '/smart-query'])('répond au planning exact du soir, borné Luxembourg, sur %s', async endpoint => {
    noProvider(); eveningFixture()
    const response = await request(app).post('/api/agent' + endpoint).send({ text: planningQuestion, currentPath: '/' }).expect(200)
    expect(response.body).toMatchObject({ source: 'local-business-read', data: { type: 'evening-schedule', scope: 'team', truncated: false,
      period: { from: '2026-10-17T16:00:00.000Z', toExclusive: '2026-10-17T22:00:00.000Z', timeZone: 'Europe/Luxembourg' } } })
    expect(response.body.data.items.map((row: any) => row.id)).toEqual(['evening-a', 'evening-b'])
    expect(response.body.text).toContain('18:00'); expect(response.body.text).toContain('00:00')
    expect(response.body.text).toContain('présence réelle non vérifiée')
    expect(fixture.queries).toHaveLength(1)
    expect(fixture.queries[0]).toMatchObject({ model: 'shift', args: { take: 41, where: { companyId: 'company-a',
      startTime: { lt: new Date('2026-10-17T22:00:00Z') }, endTime: { gt: new Date('2026-10-17T16:00:00Z') }, status: { in: ['SCHEDULED', 'CONFIRMED'] } } } })
    expect(fixture.providerCalls).toEqual([]); expect(fixture.writes).toEqual([])
  })

  it.each([
    [stockQuestion, 'assistant.use'], [stockQuestion, 'assistant.business.read'], [stockQuestion, 'inventory.quantities.read'],
    [planningQuestion, 'assistant.use'], [planningQuestion, 'assistant.business.read'], [planningQuestion, 'hr.schedule.read'],
  ])('refuse la lecture %s après retrait de %s avant toute frontière', async (question, capability) => {
    noProvider(); capabilities = capabilities.filter(value => value !== capability)
    await ask(question, '/').expect(403)
    expect(fixture.queries).toEqual([]); expect(fixture.providerCalls).toEqual([]); expect(fixture.writes).toEqual([])
  })

  it('restreint immédiatement la même question aux créneaux propres après retrait du droit équipe', async () => {
    noProvider(); eveningFixture(); role = 'EMPLOYEE'
    const team = await ask(planningQuestion, '/').expect(200)
    expect(team.body.data.items).toHaveLength(2)
    capabilities = capabilities.filter(value => value !== 'hr.schedule.manage'); revision = 'same-role-revoked'
    const own = await ask(planningQuestion, '/').expect(200)
    expect(own.body.data.scope).toBe('self')
    expect(own.body.data.items.map((row: any) => row.id)).toEqual(['evening-a'])
    expect(JSON.stringify(own.body)).not.toContain('Fictif B')
    expect(own.body.text).toContain('uniquement vos créneaux')
    expect(fixture.queries[1].args.where).toMatchObject({ companyId: 'company-a', userId: 'human-a' })
    expect(fixture.providerCalls).toEqual([]); expect(fixture.writes).toEqual([])
  })

  it.each([stockQuestion, planningQuestion])('ne partage pas les lectures locales entre sociétés et ne demande pas les finances : %s', async question => {
    noProvider(); eveningFixture(); capabilities = capabilities.filter(value => !value.startsWith('finance.'))
    await ask(question, '/').expect(200)
    fixture.companyId = 'company-b'
    await ask(question, '/').expect(200)
    expect(fixture.queries.map(row => row.args.where.companyId)).toEqual(['company-a', 'company-b'])
    expect(fixture.providerCalls).toEqual([]); expect(fixture.writes).toEqual([])
  })

  it.each([stockQuestion, planningQuestion])('distingue une liste vide vérifiée d’une source indisponible : %s', async question => {
    noProvider(); eveningFixture(); fixture.products = []; fixture.shifts = []
    const empty = await ask(question, '/').expect(200)
    expect(empty.body.data.items).toEqual([]); expect(empty.body.data.truncated).toBe(false)
    fixture.unavailable = true
    const unavailable = await ask(question, '/').expect(503)
    expect(unavailable.body.code).toBe('ASSISTANT_CONTEXT_UNAVAILABLE')
    expect(fixture.providerCalls).toEqual([])
  })

  it.each([stockQuestion, planningQuestion])('signale explicitement une liste tronquée, sans total complet : %s', async question => {
    noProvider(); eveningFixture()
    fixture.products = Array.from({ length: 41 }, (_, i) => ({ id: 'p' + i, name: 'Produit ' + i, stock: 0 }))
    fixture.shifts = Array.from({ length: 41 }, (_, i) => ({ ...fixture.shifts[0], id: 's' + i }))
    const response = await ask(question, '/').expect(200)
    expect(response.body.data.items).toHaveLength(40)
    expect(response.body.data.truncated).toBe(true)
    expect(response.body.text).toContain('liste tronquée')
    expect(fixture.queries[0].args.take).toBe(41)
    expect(fixture.providerCalls).toEqual([])
  })

  it.each([
    ['2026-03-29T12:00:00Z', '2026-03-29T16:00:00.000Z', '2026-03-29T22:00:00.000Z'],
    ['2026-10-25T12:00:00Z', '2026-10-25T17:00:00.000Z', '2026-10-25T23:00:00.000Z'],
  ])('résout le soir civil malgré le changement d’heure : %s', async (now, from, toExclusive) => {
    noProvider(); eveningFixture(); vi.setSystemTime(new Date(now)); fixture.shifts = []
    const response = await ask(planningQuestion, '/').expect(200)
    expect(response.body.data.period).toMatchObject({ from, toExclusive })
    expect(fixture.providerCalls).toEqual([])
  })

  it.each(['Quels produits sont en rupture demain ?', 'Quel employé travaille ce soir et demain ?'])('ne remplace pas une autre période par la lecture locale : %s', async question => {
    noProvider(); eveningFixture()
    const response = await ask(question, '/').expect(503)
    expect(response.body.code).toBe('ASSISTANT_PROVIDER_UNAVAILABLE')
    expect(response.body.source).not.toBe('local-business-read')
    expect(fixture.writes).toEqual([])
  })
})
