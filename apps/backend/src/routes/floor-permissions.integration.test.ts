import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import { errorHandler } from '../middleware/errorHandler'
import { lockFinancialCompany } from '../lib/financial-lock'
import { floorHash, saveFloorWorkspace } from '../lib/floor-workspace'
import type { Capability } from '../lib/business-permissions'
import floorRouter, { floorCompanyContext } from './floorState'
import pos from './pos'
import companies from './companies'

const mirrors = vi.hoisted(() => ({ directory: '' }))
vi.mock('../middleware/audit-log', async importActual => ({
  ...await importActual<typeof import('../middleware/audit-log')>(),
  dataPath: (filename: string) => {
    if (!mirrors.directory) throw Error('Répertoire de miroirs fictifs absent')
    return path.join(mirrors.directory, filename)
  },
}))

// Uniquement des sociétés et identités UUID créées par cette suite. Toutes les
// fixtures sont conservées ; aucun nettoyage, reset, seed ni service démarré.
const owner = randomUUID()
const app = express().use(express.json())
app.use('/api/companies', companies)
app.use('/api/pos', authenticate, requireCompany, floorCompanyContext, pos)
app.use('/api/floor-state', deviceOrUserAuth, requireCompany, floorCompanyContext, floorRouter)
app.use(errorHandler)
const as = (r: any, companyId: string, userId: string) => r.set('Authorization', `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '15m' })}`).set('x-company-id', companyId)

async function fixture(capabilities: Partial<Record<Capability, boolean>> = {}, options: { role?: string; review?: boolean; discount?: any; offered?: string[] } = {}) {
  const companyId = `floor-permission-fixture-${randomUUID()}`, actor = randomUUID()
  await prisma.company.create({ data: { id: companyId, name: 'DROITS SALLE — FICTIVE CONSERVÉE' } })
  await prisma.user.create({ data: { id: actor, email: `${actor}@fixture.invalid`, password: 'unused-fictitious', firstName: 'Fictif', lastName: 'Salle' } })
  await prisma.userCompany.createMany({ data: [{ companyId, userId: owner, role: 'OWNER' }, { companyId, userId: actor, role: options.role || 'SERVER', capabilities }] })
  const category = await prisma.category.create({ data: { companyId, name: 'FICTIF' } })
  const product = await prisma.product.create({ data: { companyId, categoryId: category.id, name: 'Café fictif', price: 5, taxRate: 17 } })
  const item = { id: 'line', productId: product.id, menuItemId: product.id, name: product.name, price: 5, taxRate: 17, qty: 2, note: '', coverId: 'cover', addedAt: 10 }
  const initial: any = { storageAuthority: 'postgres', updatedAt: 10, tables: [{ id: 'table', name: 'Table fictive', shape: 'round', seats: 2, section: 'Salle fictive', x: 10, y: 10, status: 'OCCUPEE',
    items: [item], posCovers: [{ id: 'cover', label: 'Fictif', items: [item] }], ...(options.discount ? { orderDiscount: options.discount } : {}), ...(options.offered ? { offeredItemIds: options.offered } : {}) }],
    chairs: [], photos: [], zones: [{ id: 'room', name: 'Salle fictive', color: '#6366f1' }],
    posPricing: { line: { version: 1, status: options.review ? 'review' : 'confirmed', source: options.review ? 'legacy-unverified' : 'catalog', productId: product.id, name: product.name, priceCents: 500, taxRate: 17, quotedAt: 10 } },
    posEditor: { rooms: [{ id: 'room', label: 'Salle fictive', color: '#6366f1', x: 20, y: 20, w: 600, h: 636 }], fixtures: [], scenes: [], background: null } }
  await prisma.floorWorkspace.create({ data: { companyId, revision: 10n, snapshot: initial, snapshotHash: floorHash(initial), initialSnapshot: initial, initialHash: floorHash(initial) } })
  const session = await prisma.serviceSession.create({ data: { companyId, tableId: 'table' } })
  await prisma.serviceCover.create({ data: { companyId, coverId: 'cover', sessionId: session.id, items: [item], actorId: actor } })
  const boot = (await as(request(app).get('/api/pos/bootstrap'), companyId, actor).expect(200)).body
  const draft = () => JSON.parse(JSON.stringify({ tables: boot.tables, seats: boot.seats, editor: boot.editor }))
  const send = (body: any, userId = actor) => as(request(app).put('/api/pos/draft'), companyId, userId).set('If-Match', '10').send(body)
  return { companyId, actor, product, initial, boot, draft, send }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
async function unchanged(f: Fixture) {
  const saved = await prisma.floorWorkspace.findUniqueOrThrow({ where: { companyId: f.companyId } })
  expect(saved.revision).toBe(10n); expect(saved.snapshot).toEqual(f.initial); expect(saved.snapshotHash).toBe(floorHash(f.initial))
  expect(await prisma.floorChange.count({ where: { companyId: f.companyId } })).toBe(0)
  const cover = await prisma.serviceCover.findUniqueOrThrow({ where: { companyId_coverId: { companyId: f.companyId, coverId: 'cover' } } })
  expect(cover.state).toBe('OPEN'); expect((cover.items as any[])[0].qty).toBe(2)
}
async function queuedRevocation(f: Fixture, operation: PromiseLike<any>, decision: object) {
  let release!: () => void, arrived!: () => void
  const locked = new Promise<void>(resolve => { arrived = resolve }), finish = new Promise<void>(resolve => { release = resolve })
  const holder = prisma.$transaction(async tx => { await lockFinancialCompany(tx, f.companyId); arrived(); await finish }, { timeout: 15000 })
  await locked
  const pending = operation.then(result => result)
  try {
    await vi.waitFor(async () => {
      const rows = await prisma.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS (SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND classid = hashtext(${f.companyId})::oid AND objid = hashtext('pos-ledger')::oid AND NOT granted) AS waiting`
      expect(rows[0].waiting).toBe(true)
    }, { timeout: 5000, interval: 30 })
    // La décision HTTP et son audit sont confirmés AVANT de laisser le save avancer.
    await as(request(app).patch(`/api/companies/members/${f.actor}`), f.companyId, owner)
      .send({ ...decision, expectedAccessVersion: 0, reason: 'Révocation fictive avant libération du verrou de salle' }).expect(200)
    expect(await prisma.businessPermissionEvent.count({ where: { companyId: f.companyId, userId: f.actor } })).toBe(1)
  } finally { release(); await holder }
  return await pending
}

describe('Salle : révocation complète avant un save en attente PostgreSQL', () => {
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL || 'http://invalid')
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || target.hostname !== '127.0.0.1' || target.port !== '5450' || target.pathname !== '/creorga_tests') throw Error('Base fictive gardée obligatoire')
    mirrors.directory = await mkdtemp(path.join(tmpdir(), 'creorga-floor-permission-mirrors-'))
    vi.stubEnv('CREORGA_FLOOR_AUTHORITY', 'postgres')
    await prisma.user.create({ data: { id: owner, email: `${owner}@fixture.invalid`, password: 'unused-fictitious', firstName: 'Fictif', lastName: 'Propriétaire' } })
  })
  afterAll(async () => { vi.unstubAllEnvs(); await prisma.$disconnect() })

  it.each(['service.manage', 'settings.manage', 'orders.cancel', 'discounts.grant', 'complimentary.grant'] as const)(
    'le PATCH de révocation %s terminé pendant l’attente interdit le commit et tous ses effets', async capability => {
      const grants = { 'settings.manage': true, 'orders.cancel': true, 'discounts.grant': true, 'complimentary.grant': true }
      const f = await fixture(grants), body = f.draft()
      body.tables[0].orderNote = 'Note bloquée fictive'
      if (capability === 'settings.manage') body.tables[0].x += 1
      if (capability === 'orders.cancel') body.tables[0].covers[0].items[0].qty = 1
      if (capability === 'discounts.grant') body.tables[0].orderDiscount = { type: 'percent', value: 10 }
      if (capability === 'complimentary.grant') body.tables[0].offeredItemIds = ['line']
      expect((await queuedRevocation(f, f.send(body), { capabilities: { ...grants, [capability]: false } })).status).toBe(403)
      await unchanged(f)
    })

  it('une désactivation terminée pendant l’attente interdit le brouillon', async () => {
    const f = await fixture(), body = f.draft(); body.tables[0].orderNote = 'Brouillon désactivé'
    expect((await queuedRevocation(f, f.send(body), { isActive: false })).status).toBe(403)
    await unchanged(f)
  })

  it('une revue tarifaire attendue ne survit pas au retrait catalog.prices.write', async () => {
    const f = await fixture({ 'catalog.prices.write': true }, { review: true })
    const operation = as(request(app).post('/api/pos/pricing/line/review'), f.companyId, f.actor).set('If-Match', '10')
      .send({ productId: f.product.id, price: 6, taxRate: 17, reason: 'Contrôle tarifaire fictif' })
    expect((await queuedRevocation(f, operation, { capabilities: { 'catalog.prices.write': false } })).status).toBe(403)
    await unchanged(f)
  })

  it('la configuration du plan attendue relit settings.manage après son retrait', async () => {
    const f = await fixture({ 'settings.manage': true })
    const body = (await as(request(app).get('/api/floor-state'), f.companyId, f.actor).expect(200)).body; body.tables[0].x += 1
    const operation = as(request(app).put('/api/floor-state'), f.companyId, f.actor).set('If-Match', '10').send(body)
    expect((await queuedRevocation(f, operation, { capabilities: { 'settings.manage': false } })).status).toBe(403)
    await unchanged(f)
  })

  it('retient une révocation concurrente sur l’adhésion partagée jusqu’au commit autorisé', async () => {
    const f = await fixture(), draft = structuredClone(f.initial); draft.updatedAt = 11; draft.tables[0].orderNote = 'Commit autorisé avant révocation'
    let release!: () => void, arrived!: () => void, transactionPid = 0
    const saved = new Promise<void>(resolve => { arrived = resolve }), finish = new Promise<void>(resolve => { release = resolve })
    const commit = prisma.$transaction(async tx => {
      transactionPid = (await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`)[0].pid
      await saveFloorWorkspace(tx, f.companyId, f.initial, draft, f.actor, 'PUT /api/pos/draft', {
        companyId: f.companyId, user: { userId: f.actor }, method: 'PUT', originalUrl: '/api/pos/draft', get: () => undefined,
      })
      arrived(); await finish
    }, { timeout: 15000 })
    await saved
    const decision = as(request(app).patch(`/api/companies/members/${f.actor}`), f.companyId, owner)
      .send({ capabilities: { 'service.manage': false }, expectedAccessVersion: 0, reason: 'Révocation concurrente fictive retenue par le commit' }).then((result: any) => result)
    try {
      await vi.waitFor(async () => {
        const rows = await prisma.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE ${transactionPid} = ANY(pg_blocking_pids(pid))) AS waiting`
        expect(rows[0].waiting).toBe(true)
      }, { timeout: 5000, interval: 30 })
      expect(await prisma.businessPermissionEvent.count({ where: { companyId: f.companyId, userId: f.actor } })).toBe(0)
    } finally { release(); await commit }
    expect((await decision).status).toBe(200)
    expect((await prisma.floorWorkspace.findUniqueOrThrow({ where: { companyId: f.companyId } })).snapshot).toEqual(draft)
    expect(await prisma.floorChange.count({ where: { companyId: f.companyId } })).toBe(1)
    await f.send(f.draft()).expect(403)
  })

  it.each([
    ['ajout de remise', undefined, undefined, { type: 'percent', value: 10 }, undefined],
    ['retrait de remise', { type: 'percent', value: 10 }, undefined, null, undefined],
    ['ajout d’offert global', undefined, undefined, { type: 'free', value: 0 }, undefined],
    ['retrait d’offert global', { type: 'free', value: 0 }, undefined, null, undefined],
    ['ajout d’article offert', undefined, undefined, undefined, ['line']],
    ['retrait d’article offert', undefined, ['line'], undefined, []],
  ])('ADMIN ne contourne pas les gestes via un import de plan : %s', async (_label, discount, offered, nextDiscount, nextOffered) => {
    const f = await fixture({}, { role: 'ADMIN', discount, offered: offered as string[] | undefined })
    const body = (await as(request(app).get('/api/floor-state'), f.companyId, f.actor).expect(200)).body
    if (nextDiscount !== undefined) body.tables[0].orderDiscount = nextDiscount
    if (nextOffered !== undefined) body.tables[0].offeredItemIds = nextOffered
    await as(request(app).put('/api/floor-state'), f.companyId, f.actor).set('If-Match', '10').send(body).expect(403)
    await unchanged(f)
  })

  it('une sauvegarde autorisée de service et une sauvegarde propriétaire restent confirmées', async () => {
    for (const ownerSave of [false, true]) {
      const f = await fixture(), body = f.draft(); body.tables[0].orderNote = 'Note autorisée fictive'
      const result = await f.send(body, ownerSave ? owner : f.actor).expect(200)
      const saved: any = (await prisma.floorWorkspace.findUniqueOrThrow({ where: { companyId: f.companyId } })).snapshot
      expect(saved.updatedAt).toBe(result.body.updatedAt); expect(saved.tables[0].orderNote).toBe('Note autorisée fictive')
      expect(await prisma.floorChange.count({ where: { companyId: f.companyId } })).toBe(1)
    }
  })

  it('ne confond pas une disparition de miroir réglé avec une annulation', async () => {
    const f = await fixture()
    await prisma.serviceCover.update({ where: { companyId_coverId: { companyId: f.companyId, coverId: 'cover' } }, data: { state: 'SETTLED' } })
    const boot = (await as(request(app).get('/api/pos/bootstrap'), f.companyId, f.actor).expect(200)).body
    expect(boot.tables[0].covers).toEqual([])
    const body = { tables: boot.tables, seats: boot.seats, editor: boot.editor }; body.tables[0].orderNote = 'Miroir réglé fictif'
    await f.send(body).expect(200)
  })

  it('un en-tête de société voisine ne réutilise pas les droits de l’acteur', async () => {
    const f = await fixture(), other = await fixture(), body = f.draft(); body.tables[0].orderNote = 'Interdit autre société'
    await as(request(app).put('/api/pos/draft'), other.companyId, f.actor).set('If-Match', '10').send(body).expect(403)
    await unchanged(f); await unchanged(other)
  })

  it('préserve le terminal explicitement lié à sa société sans lui inventer une adhésion humaine', async () => {
    const f = await fixture(), token = randomUUID()
    vi.stubEnv('POS_DEVICE_TOKENS', `${f.companyId}:${token}`)
    await request(app).post('/api/floor-state/tables/table/status').set('x-device-token', token).set('x-company-id', f.companyId).send({ status: 'RESERVEE' }).expect(200)
    const saved: any = (await prisma.floorWorkspace.findUniqueOrThrow({ where: { companyId: f.companyId } })).snapshot
    expect(saved.tables[0].status).toBe('RESERVEE')
  })
})
