import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { createServer, request as httpRequest, type Server, type IncomingMessage } from 'node:http'
import { once } from 'node:events'
import { randomUUID } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { createHttpDrain } from '../lib/http-drain'
import { createHttpWorkRegistry, observeHttpArguments, observeHttpMiddleware } from '../lib/http-work'
import { createBackendShutdown } from '../lib/backend-lifecycle'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import pos from './pos'
import payments from './payments'
import floorState, { floorCompanyContext, remplacerPlanDeSalle } from './floorState'
import { canonicalizeFloorPricing } from '../lib/pos-pricing'
import { floorHash } from '../lib/floor-workspace'
import { lockFinancialCompany } from '../lib/financial-lock'

const mirrors = vi.hoisted(() => ({ directory: '' }))
const remote = vi.hoisted(() => ({ calls: 0, entered: undefined as (() => void) | undefined, held: undefined as Promise<void> | undefined }))
vi.mock('../middleware/audit-log', async original => ({
  ...await original<typeof import('../middleware/audit-log')>(),
  dataPath: (name: string) => {
    if (!mirrors.directory) throw Error('Miroir de laboratoire absent')
    return path.join(mirrors.directory, name)
  },
}))
// Seul le fournisseur est simulé ; routes, verrous, transactions et réserves sont réels.
vi.mock('../lib/payments/gateway', () => ({
  SUPPORTED_PROVIDERS: ['paypal'],
  getGateway: () => ({}),
  charge: async () => {
    remote.calls++; remote.entered?.(); await remote.held
    throw Error('LABORATOIRE_REPONSE_PRESTATAIRE_PERDUE')
  },
}))

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}
const tick = () => new Promise<void>(resolve => setImmediate(resolve))
async function until(check: () => Promise<boolean>, message: string) {
  const end = Date.now() + 8000
  while (Date.now() < end) {
    if (await check()) return
    await new Promise(resolve => setTimeout(resolve, 15))
  }
  throw Error(message)
}
async function bounded<T>(value: Promise<T>, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try { return await Promise.race([value, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error(message)), 8000) })]) }
  finally { clearTimeout(timer) }
}

const app = express()
// Même pile HTTP réelle que le runtime ; les anciens essais sans compression
// ne pouvaient pas révéler une réponse sync dont le end natif est différé.
app.use(...observeHttpArguments([helmet()], true))
app.use(...observeHttpArguments([cors({ origin: false })], true))
app.use(...observeHttpArguments([compression()], true))
app.use(observeHttpMiddleware(express.json(), { beforeAdmission: true }))
app.use(...observeHttpArguments([cookieParser()], true))
app.use('/api/pos', observeHttpMiddleware(deviceOrUserAuth), observeHttpMiddleware(requireCompany), observeHttpMiddleware(floorCompanyContext), pos)
app.use('/api/payments', observeHttpMiddleware(deviceOrUserAuth), payments)
app.use('/api/floor-state', observeHttpMiddleware(deviceOrUserAuth), observeHttpMiddleware(requireCompany), observeHttpMiddleware(floorCompanyContext), floorState)
const fixtures: Array<{ server: Server; finish: () => Promise<void> }> = []
async function laboratory() {
  const interrupted = deferred(), received = deferred(), bodyAborted = deferred()
  const server = createServer((req, res) => {
    received.resolve()
    req.once('aborted', bodyAborted.resolve)
    res.once('close', () => { if (!res.writableFinished) interrupted.resolve() })
    app(req, res)
  })
  const work = createHttpWorkRegistry()
  const drain = createHttpDrain(server, () => false, work)
  const events: string[] = []
  const lifecycle = createBackendShutdown({
    assertAllowed: () => {}, stopScheduling: () => {},
    closeHttp: () => drain.close(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())), () => {}),
    drain: async () => { events.push('travaux-termines') },
    flushAudit: async () => { events.push('audit-termine') },
    // Ne pas déconnecter le client partagé avant les assertions SQL ; on observe la frontière.
    disconnect: async () => { events.push('frontiere-deconnexion') },
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  fixtures.push({ server, finish: async () => {
    try { await lifecycle.shutdown() } catch { /* RED ancien drain : fermer seulement ce listener de fixture, après fin métier prouvée. */ }
    if (server.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  } })
  return { server, lifecycle, events, interrupted, received, bodyAborted, port: (server.address() as { port: number }).port }
}

async function fixture() {
  const companyId = 'integration-abandon-' + randomUUID(), userId = companyId + '-owner'
  await prisma.company.create({ data: { id: companyId, name: 'F18 Abandon HTTP fictif' } })
  await prisma.user.create({ data: { id: userId, email: userId + '@example.invalid', password: 'unused', firstName: 'Fictif', lastName: 'F18' } })
  await prisma.userCompany.create({ data: { companyId, userId, role: 'OWNER' } })
  const category = await prisma.category.create({ data: { companyId, name: 'F18' } })
  const product = await prisma.product.create({ data: { companyId, categoryId: category.id, name: 'Café fictif F18', price: 2.6, taxRate: 3, stock: 10 } })
  const tableId = randomUUID(), coverId = randomUUID(), lineId = randomUUID()
  await prisma.table.create({ data: { id: tableId, companyId, name: 'F18 Table', capacity: 2 } })
  const floor: any = { tables: [{ id: tableId, name: 'F18 Table', section: 'Salle', seats: 2, shape: 'round', status: 'OCCUPEE', x: 0, y: 0,
    items: [], posCovers: [{ id: coverId, label: 'F18 nouveau groupe', items: [{ id: lineId, menuItemId: product.id, name: product.name, price: 2.6, qty: 1, note: '', coverId }] }] }],
    chairs: [], photos: [], zones: [], updatedAt: Date.now(), storageAuthority: 'postgres' }
  canonicalizeFloorPricing({ tables: [], chairs: [] }, floor, [product])
  const hash = floorHash(floor)
  await prisma.floorWorkspace.create({ data: { companyId, revision: BigInt(floor.updatedAt), snapshot: floor, snapshotHash: hash, initialSnapshot: floor, initialHash: hash } })
  remplacerPlanDeSalle(floor, companyId)
  const token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '10m' })
  const auth = (builder: any) => builder.set('Authorization', 'Bearer ' + token).set('x-company-id', companyId)
  const input = { requestId: randomUUID(), tableId, coverIds: [coverId], expectedTotal: 2.6, tip: 0, method: 'cash', cashReceived: 3 }
  return { companyId, userId, productId: product.id, token, auth, input }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
function outgoing(port: number, f: Fixture, pathname: string, body: unknown, onResponse?: (response: IncomingMessage) => void) {
  const json = JSON.stringify(body)
  const req = httpRequest({ host: '127.0.0.1', port, method: 'POST', path: pathname, agent: false,
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json), Authorization: 'Bearer ' + f.token, 'x-company-id': f.companyId } })
  // Le client de laboratoire abandonne volontairement sa réponse ; pas de répétition automatique.
  req.on('error', () => {})
  req.on('response', res => { if (onResponse) onResponse(res); else res.resume() })
  req.end(json)
  return req
}
async function assertSingleSale(f: Fixture) {
  expect(await prisma.posSale.count({ where: { id: f.input.requestId, companyId: f.companyId } })).toBe(1)
  expect(await prisma.order.count({ where: { companyId: f.companyId } })).toBe(1)
  expect(await prisma.saleOrigin.count({ where: { companyId: f.companyId, kind: 'LINE' } })).toBe(1)
  expect(await prisma.posCoverPayment.count({ where: { companyId: f.companyId } })).toBe(1)
  expect((await prisma.product.findUniqueOrThrow({ where: { id: f.productId } })).stock).toBe(9)
  const tenders = await prisma.orderTender.findMany({ where: { companyId: f.companyId } })
  expect(tenders).toHaveLength(1); expect(tenders[0].amountCents).toBe(260)
}

describe('F18 : abandon HTTP, SQL réel et reprise idempotente', () => {
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL || 'http://invalid')
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || url.hostname !== '127.0.0.1' || url.port !== '5450' || url.pathname !== '/creorga_tests') throw Error('Base de laboratoire gardée obligatoire')
    vi.stubEnv('CREORGA_FLOOR_AUTHORITY', 'postgres')
    mirrors.directory = await mkdtemp(path.join(tmpdir(), 'creorga-http-abandon-mirrors-'))
  })
  afterEach(async () => {
    vi.restoreAllMocks()
    for (const item of fixtures.splice(0)) await item.finish()
  })
  afterAll(async () => {
    // Les sociétés UUID et leurs preuves financières restent en laboratoire, pas de purge.
    vi.unstubAllEnvs(); await prisma.$disconnect()
  })

  it('termine après un corps interrompu avant admission sans écriture financière ni débit de stock', async () => {
    const f = await fixture(), lab = await laboratory()
    const req = httpRequest({ host: '127.0.0.1', port: lab.port, method: 'POST', path: '/api/pos/checkout', agent: false,
      headers: { 'Content-Type': 'application/json', 'Content-Length': 1000, Authorization: 'Bearer ' + f.token, 'x-company-id': f.companyId } })
    req.on('error', () => {})
    req.write('{"requestId":')
    await bounded(lab.received.promise, 'Aucune requête HTTP reçue par la fixture')
    req.destroy(); await bounded(lab.bodyAborted.promise, 'Corps interrompu non observé côté serveur')
    await bounded(lab.lifecycle.shutdown(), 'Le parsing interrompu avant métier empêche l’arrêt')
    expect(await prisma.posSale.count({ where: { companyId: f.companyId } })).toBe(0)
    expect(await prisma.order.count({ where: { companyId: f.companyId } })).toBe(0)
    expect(await prisma.paymentAttempt.count({ where: { companyId: f.companyId } })).toBe(0)
    expect(await prisma.orderTender.count({ where: { companyId: f.companyId } })).toBe(0)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.productId } })).stock).toBe(10)
  })

  it('attend le vrai checkout après abandon, puis redémarre et rejoue sans seconde vente ni stock', async () => {
    const f = await fixture(), lab = await laboratory(), acquired = deferred(), release = deferred()
    const held = prisma.$transaction(async tx => { await lockFinancialCompany(tx, f.companyId); acquired.resolve(); await release.promise }, { timeout: 15000 })
    await acquired.promise
    const req = outgoing(lab.port, f, '/api/pos/checkout', f.input)
    let stopped: Promise<void> | undefined
    try {
      await until(async () => {
        const rows: any[] = await prisma.$queryRaw`SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory' AND NOT granted AND classid = hashtext(${f.companyId})::oid AND objid = hashtext('pos-ledger')::oid`
        return rows[0].n > 0
      }, 'Le checkout réel ne rejoint pas le verrou de laboratoire')
      req.destroy(); await bounded(lab.interrupted.promise, 'Abandon non observé côté serveur')
      stopped = lab.lifecycle.shutdown(); void stopped.catch(() => {})
      await tick()
      expect(lab.events).not.toContain('frontiere-deconnexion')
      expect(await prisma.posSale.count({ where: { id: f.input.requestId } })).toBe(0)
    } finally { release.resolve(); await held }
    await until(async () => await prisma.posSale.count({ where: { id: f.input.requestId } }) === 1, 'Le checkout tenu ne commet pas sa vente')
    await bounded(stopped!, 'Un abandon déjà terminé bloque encore le drainage')
    expect(lab.events).toEqual(['travaux-termines', 'audit-termine', 'frontiere-deconnexion'])
    await assertSingleSale(f)
    const restarted = await laboratory()
    const replay = await f.auth(request(restarted.server).post('/api/pos/checkout')).send(f.input).expect(200)
    expect(replay.body.id).toBe(f.input.requestId); expect(replay.body.total).toBe(2.6)
    await assertSingleSale(f)
  })

  it('ne traite pas une réponse perdue après commit comme une vente à refaire sous une autre référence', async () => {
    const f = await fixture(), lab = await laboratory()
    const responseDiscarded = deferred()
    let status: number | undefined, streamEndEmitted = false, receivedBodyBytes = 0, destroyed = false, readableEnded = false
    outgoing(lab.port, f, '/api/pos/checkout', f.input, incoming => {
      status = incoming.statusCode
      // Perte pour le consommateur applicatif dès les en-têtes : aucun decode
      // JSON/résultat reçu. Cela ne prétend pas prouver une perte de paquet TCP.
      incoming.on('error', () => {})
      incoming.on('end', () => { streamEndEmitted = true })
      incoming.on('data', bytes => { receivedBodyBytes += bytes.length })
      incoming.once('close', () => {
        destroyed = incoming.destroyed; readableEnded = incoming.readableEnded
        responseDiscarded.resolve()
      })
      incoming.destroy()
    })
    await bounded(responseDiscarded.promise, 'La réponse après commit n’est pas interceptée')
    const observed = { status, receivedBodyBytes, destroyed, readableEnded, streamEndEmitted }
    // Node peut émettre end/readableEnded après destroy même avec zéro octet.
    // Ces drapeaux de transport ne prouvent pas une réception/décodage JSON.
    expect(observed, 'Transport de fixture : ' + JSON.stringify(observed)).toMatchObject({ status: 200, receivedBodyBytes: 0, destroyed: true })
    await until(async () => await prisma.posSale.count({ where: { id: f.input.requestId } }) === 1, 'Vente de laboratoire non commise')
    await tick()
    await bounded(lab.lifecycle.shutdown(), 'Arrêt après commit non confirmé')
    const restarted = await laboratory()
    const found = await f.auth(request(restarted.server).get('/api/pos/sales/' + f.input.requestId)).expect(200)
    expect(found.body.id).toBe(f.input.requestId)
    await f.auth(request(restarted.server).post('/api/pos/checkout')).send(f.input).expect(200)
    await f.auth(request(restarted.server).post('/api/pos/checkout')).send({ ...f.input, requestId: randomUUID() }).expect(409)
    await assertSingleSale(f)
  })

  it('reprend le solde mixte abandonné après acompte et lecture de salle gzip sans double vente ni stock', async () => {
    const f = await fixture(), lab = await laboratory()
    const floor = await f.auth(request(lab.server).get('/api/floor-state')).set('Accept-Encoding', 'gzip').expect(200)
    expect(floor.headers['content-encoding']).toBe('gzip')
    expect(floor.body.tables[0].id).toBe(f.input.tableId)
    const deposit = { requestId: randomUUID(), tableId: f.input.tableId, coverIds: f.input.coverIds,
      amountCents: 60, expectedOutstandingCents: 260, method: 'CASH', cashReceivedCents: 60 }
    const first = await f.auth(request(lab.server).post('/api/pos/payments')).send(deposit).expect(200)
    expect(first.body).toMatchObject({ status: 'PARTIAL', paidCents: 60, outstandingCents: 200, confirmation: 'manual_declaration' })
    expect(await prisma.posSale.count({ where: { companyId: f.companyId } })).toBe(0)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.productId } })).stock).toBe(10)

    const input = { requestId: randomUUID(), tableId: f.input.tableId, coverIds: f.input.coverIds,
      amountCents: 200, expectedOutstandingCents: 200, method: 'MIXED', cashReceivedCents: 50,
      allocations: [{ method: 'CASH', amountCents: 50 }, { method: 'CARD', amountCents: 150 }] }
    const acquired = deferred(), release = deferred()
    const held = prisma.$transaction(async tx => { await lockFinancialCompany(tx, f.companyId); acquired.resolve(); await release.promise }, { timeout: 15000 })
    await acquired.promise
    const req = outgoing(lab.port, f, '/api/pos/payments', input)
    let stopped: Promise<void> | undefined
    try {
      await until(async () => {
        const rows: any[] = await prisma.$queryRaw`SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory' AND NOT granted AND classid = hashtext(${f.companyId})::oid AND objid = hashtext('pos-ledger')::oid`
        return rows[0].n > 0
      }, 'Le vrai solde mixte ne rejoint pas le verrou de laboratoire')
      req.destroy(); await bounded(lab.interrupted.promise, 'Abandon du solde non observé côté serveur')
      stopped = lab.lifecycle.shutdown(); void stopped.catch(() => {})
      await tick()
      expect(lab.events).not.toContain('frontiere-deconnexion')
      expect(await prisma.paymentAttempt.count({ where: { companyId: f.companyId } })).toBe(1)
    } finally { release.resolve(); await held }
    await bounded(stopped!, 'La lecture gzip ou le solde terminé bloque encore l’arrêt')
    const restarted = await laboratory()
    const found = await f.auth(request(restarted.server).get('/api/pos/payments/' + input.requestId)).expect(200)
    expect(found.body).toMatchObject({ requestId: input.requestId, status: 'SETTLED', paidCents: 260, outstandingCents: 0, confirmation: 'manual_declaration' })
    const replay = await f.auth(request(restarted.server).post('/api/pos/payments')).send(input).expect(200)
    expect(replay.body).toEqual(found.body)
    await f.auth(request(restarted.server).post('/api/pos/payments')).send({ ...input, requestId: randomUUID() }).expect(409)
    expect(await prisma.order.count({ where: { companyId: f.companyId, status: 'PAID' } })).toBe(1)
    expect(await prisma.posSale.count({ where: { companyId: f.companyId } })).toBe(1)
    expect(await prisma.paymentAttempt.count({ where: { companyId: f.companyId } })).toBe(2)
    expect(await prisma.saleOrigin.count({ where: { companyId: f.companyId, kind: 'LINE' } })).toBe(1)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.productId } })).stock).toBe(9)
    const tenders = await prisma.orderTender.findMany({ where: { companyId: f.companyId } })
    expect(tenders.map(t => t.amountCents).sort((a, b) => a - b)).toEqual([50, 60, 150])
    expect(tenders.every(t => t.confirmation === 'manual_declaration')).toBe(true)
    expect(lab.events).toEqual(['travaux-termines', 'audit-termine', 'frontiere-deconnexion'])
  })

  it('attend le rollback réel après des écritures non commises, puis reprend la même référence une seule fois', async () => {
    const f = await fixture(), lab = await laboratory(), written = deferred(), release = deferred(), settled = deferred()
    const realTransaction = prisma.$transaction.bind(prisma) as any
    // Injection de panne uniquement dans la fixture : aucune réponse SQL n'est simulée.
    // La vraie route réalise ses écritures, puis PostgreSQL les annule réellement.
    const spy = vi.spyOn(prisma, '$transaction').mockImplementation(((operation: any, options: any) => {
      let heldHere = false
      const actual = realTransaction(typeof operation === 'function' ? async (tx: any) => {
        const result = await operation(tx)
        if (result?.id === f.input.requestId) {
          expect(await tx.posSale.count({ where: { id: f.input.requestId, companyId: f.companyId } })).toBe(1)
          expect((await tx.product.findUniqueOrThrow({ where: { id: f.productId } })).stock).toBe(9)
          heldHere = true; written.resolve(); await release.promise
          throw Error('LABORATOIRE_ROLLBACK_APRES_ECRITURES')
        }
        return result
      } : operation, options)
      return actual.finally(() => { if (heldHere) settled.resolve() })
    }) as any)
    const req = outgoing(lab.port, f, '/api/pos/checkout', f.input)
    let stopped: Promise<void> | undefined
    try {
      await bounded(written.promise, 'Les vraies écritures de caisse ne sont pas atteintes')
      expect(await prisma.posSale.count({ where: { id: f.input.requestId } })).toBe(0)
      expect((await prisma.product.findUniqueOrThrow({ where: { id: f.productId } })).stock).toBe(10)
      req.destroy(); await bounded(lab.interrupted.promise, 'Abandon avant rollback non observé côté serveur')
      stopped = lab.lifecycle.shutdown(); void stopped.catch(() => {})
      await tick(); expect(lab.events).not.toContain('frontiere-deconnexion')
    } finally { release.resolve(); await bounded(settled.promise, 'Rollback de fixture non terminé'); spy.mockRestore() }
    await bounded(stopped!, 'Un rollback terminé bloque encore le drainage')
    expect(await prisma.posSale.count({ where: { companyId: f.companyId } })).toBe(0)
    expect(await prisma.order.count({ where: { companyId: f.companyId } })).toBe(0)
    expect(await prisma.saleOrigin.count({ where: { companyId: f.companyId } })).toBe(0)
    expect(await prisma.orderTender.count({ where: { companyId: f.companyId } })).toBe(0)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.productId } })).stock).toBe(10)
    const restarted = await laboratory()
    await f.auth(request(restarted.server).post('/api/pos/checkout')).send(f.input).expect(200)
    await f.auth(request(restarted.server).post('/api/pos/checkout')).send(f.input).expect(200)
    await assertSingleSale(f)
  })

  it('conserve la réserve prestataire UNKNOWN après abandon et refuse un second débit fictif', async () => {
    const f = await fixture(), lab = await laboratory(), entered = deferred(), release = deferred()
    vi.stubEnv('PAYPAL_CLIENT_ID', 'fixture-only'); vi.stubEnv('PAYPAL_CLIENT_SECRET', 'fixture-only')
    vi.stubEnv('PAYPAL_MERCHANT_ID', 'F18-fictitious-merchant'); vi.stubEnv('PAYMENT_MERCHANT_COMPANY_ID', f.companyId)
    const order = await prisma.order.create({ data: { companyId: f.companyId, source: 'GUEST', orderNumber: 1, total: 2.6, subtotal: 2.52, taxAmount: .08 } })
    const input = { provider: 'paypal', orderId: order.id, currency: 'EUR', requestId: randomUUID() }
    remote.calls = 0; remote.entered = entered.resolve; remote.held = release.promise
    const req = outgoing(lab.port, f, '/api/payments/charge', input)
    await bounded(entered.promise, 'Le prestataire simulé n’est pas atteint')
    let stopped: Promise<void>
    try {
      const active = await prisma.paymentAttempt.findFirstOrThrow({ where: { companyId: f.companyId, requestId: input.requestId }, include: { allocations: true } })
      expect(active.status).toBe('CREATING'); expect(active.allocations[0].amountCents).toBe(260)
      req.destroy(); await bounded(lab.interrupted.promise, 'Abandon prestataire non observé côté serveur')
      stopped = lab.lifecycle.shutdown(); void stopped.catch(() => {})
      await tick(); expect(lab.events).not.toContain('frontiere-deconnexion')
    } finally { release.resolve() }
    await until(async () => (await prisma.paymentAttempt.findFirst({ where: { companyId: f.companyId, requestId: input.requestId } }))?.status === 'UNKNOWN', 'Réserve incertaine non persistée')
    await bounded(stopped!, 'Arrêt après retour prestataire incertain non confirmé')
    const restarted = await laboratory()
    const replay = await f.auth(request(restarted.server).post('/api/payments/charge')).send(input).expect(200)
    expect(replay.body.status).toBe('unknown'); expect(replay.body.ok).toBe(false)
    expect(replay.body.confirmation).toBe('provider_not_confirmed')
    await f.auth(request(restarted.server).post('/api/payments/charge')).send({ ...input, requestId: randomUUID() }).expect(409)
    expect(remote.calls).toBe(1)
    expect(await prisma.paymentAttempt.count({ where: { companyId: f.companyId } })).toBe(1)
    expect(await prisma.paymentAllocation.count({ where: { companyId: f.companyId } })).toBe(1)
    const allocation = await prisma.paymentAllocation.findFirstOrThrow({ where: { companyId: f.companyId } })
    expect(allocation.orderId).toBe(order.id); expect(allocation.amountCents).toBe(260); expect(allocation.active).toBe(true)
    expect(await prisma.paymentSettlement.count({ where: { companyId: f.companyId } })).toBe(0)
    expect(await prisma.orderTender.count({ where: { companyId: f.companyId } })).toBe(0)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).paidAt).toBeNull()
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.productId } })).stock).toBe(10)
  })
})
