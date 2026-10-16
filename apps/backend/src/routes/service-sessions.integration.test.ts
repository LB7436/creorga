import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import floorRouter, { floorCompanyContext, getFloorState, remplacerPlanDeSalle } from './floorState'
import pos from './pos'
import orders from './orders'
const companyId = 'integration-sessions-' + randomUUID(), otherId = companyId + '-other', userId = companyId + '-owner'
let token: string, productId: string
const tableId = 'table-session-1', otherTable = 'table-session-2'
let entered: (() => void) | undefined, resume: Promise<void> | undefined
const app = express().use(express.json())
app.use('/api/floor-state', deviceOrUserAuth, requireCompany, floorCompanyContext, floorRouter)
app.use('/api/pos', deviceOrUserAuth, requireCompany, floorCompanyContext, async (req: any, _res, next) => {
  if (req.headers['x-lab-delay']) { entered?.(); await resume }
  next()
}, pos)
app.use('/api/orders', deviceOrUserAuth, orders)
app.post('/api/delayed', deviceOrUserAuth, requireCompany, floorCompanyContext, async (_req, res) => {
  getFloorState().zones.push({ id: 'slow', name: 'Ne doit pas écraser' }); entered?.(); await resume; res.json(getFloorState())
})
const auth = (r: any, company = companyId) => r.set('Authorization', `Bearer ${token}`).set('x-company-id', company)
describe('Autorité PostgreSQL des sessions et des lignes ouvertes', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || new URL(process.env.DATABASE_URL!).pathname !== '/creorga_tests') throw new Error('Base fictive obligatoire')
    vi.stubEnv('CREORGA_FLOOR_AUTHORITY', 'postgres')
    await prisma.company.createMany({ data: [{ id: companyId, name: 'SESSION FICTIVE' }, { id: otherId, name: 'AUTRE FICTIVE' }] })
    await prisma.user.create({ data: { id: userId, email: `${companyId}@localhost.invalid`, password: 'unused', firstName: 'Test', lastName: 'Owner' } })
    await prisma.userCompany.create({ data: { userId, companyId, role: 'OWNER' } })
    const category = await prisma.category.create({ data: { companyId, name: 'FICTIF' } })
    productId = (await prisma.product.create({ data: { companyId, categoryId: category.id, name: 'Café fictif', price: 11.7, taxRate: 17, stock: 100 } })).id
    token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '30m' })
    remplacerPlanDeSalle({ tables: [], chairs: [], photos: [], zones: [{ id: 'original', name: 'ORIGINAL FICTIF' }], updatedAt: 1000 }, companyId)
  })
  afterAll(async () => {
    await (prisma as any).serviceCover?.deleteMany({ where: { companyId } }); await (prisma as any).serviceSession?.deleteMany({ where: { companyId } })
    await prisma.posCoverPayment.deleteMany({ where: { companyId } }); await prisma.posSale.deleteMany({ where: { companyId } })
    await prisma.paymentAllocation.deleteMany({ where: { companyId } }); await prisma.paymentAttempt.deleteMany({ where: { companyId } }); await prisma.order.deleteMany({ where: { companyId } })
    await prisma.product.deleteMany({ where: { companyId } }); await prisma.category.deleteMany({ where: { companyId } })
    await prisma.userCompany.deleteMany({ where: { userId } }); await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.company.deleteMany({ where: { id: { in: [companyId, otherId] } } }); await prisma.$disconnect(); vi.unstubAllEnvs()
  })
  it('préserve la copie initiale en PostgreSQL et ne retourne pas un cache périmé', async () => {
    const first = await auth(request(app).get('/api/floor-state')).expect(200)
    expect(first.body.storageAuthority).toBe('postgres')
    remplacerPlanDeSalle({ ...first.body, zones: [{ id: 'fake-cache', name: 'Cache périmé' }] }, companyId)
    const second = await auth(request(app).get('/api/floor-state')).expect(200)
    expect(second.body.zones).toEqual([{ id: 'original', name: 'ORIGINAL FICTIF' }])
  })
  it('deux versions concurrentes ne perdent pas la modification confirmée', async () => {
    let signal!: () => void, release!: () => void
    const started = new Promise<void>(r => { signal = r }); resume = new Promise<void>(r => { release = r }); entered = signal
    const slow = auth(request(app).post('/api/delayed')).send({}).then((r: any) => r)
    await started
    const saved = await auth(request(app).post('/api/floor-state/zones')).send({ name: 'Prioritaire PG' }).expect(200)
    release(); expect((await slow).status).toBe(409)
    expect((await auth(request(app).get('/api/floor-state')).expect(200)).body.zones).toEqual(saved.body.zones)
  })
  it('isole la salle et refuse une configuration de salarié', async () => {
    await auth(request(app).get('/api/floor-state'), otherId).expect(403)
    await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'EMPLOYEE' } })
    try { await auth(request(app).post('/api/floor-state/zones')).send({ name: 'Interdit' }).expect(403) }
    finally { await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'OWNER' } }) }
  })
  it('un acompte natif puis un solde mixte produisent une seule vente et un seul débit de stock', async () => {
    const coverId = randomUUID(), lineId = randomUUID()
    const boot = (await auth(request(app).get('/api/pos/bootstrap')).expect(200)).body
    const table = (id: string, covers: any[]) => ({ id, name: id, shape: 'round', seats: 2, x: 0, y: 0, section: 'Salle', mergedWith: [], status: covers.length ? 'occupied' : 'available', covers })
    const covers = [{ id: coverId, label: 'Fictif', items: [{ id: lineId, menuItemId: productId, name: 'Prix client ignoré', price: .01, qty: 2, note: '', coverId }] }]
    await auth(request(app).put('/api/pos/draft')).set('If-Match', String(boot.revision)).send({ tables: [table(tableId, covers), table(otherTable, [])], seats: [] }).expect(200)
    const body = { requestId: randomUUID(), tableId, coverIds: [coverId], amountCents: 500, method: 'CASH', cashReceivedCents: 1000, expectedOutstandingCents: 2340 }
    const partial = await auth(request(app).post('/api/pos/payments')).send(body).expect(200)
    expect(partial.body).toMatchObject({ confirmation: 'manual_declaration', paidCents: 500, outstandingCents: 1840, status: 'PARTIAL' })
    expect(await prisma.order.count({ where: { companyId } })).toBe(1)
    expect(await prisma.posSale.count({ where: { companyId } })).toBe(0)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(100)
    await auth(request(app).post('/api/pos/checkout')).send({ requestId: randomUUID(), tableId, coverIds: [coverId], expectedTotal: 23.4, method: 'cash', tip: 0, cashReceived: 30 }).expect(409)
    const after = (await auth(request(app).get('/api/pos/bootstrap')).expect(200)).body
    expect(after.tables.find((t: any) => t.id === tableId).covers[0].payment).toMatchObject({ paidCents: 500, outstandingCents: 1840 })
    const nativeOrder = await prisma.order.findFirstOrThrow({ where: { companyId } })
    await auth(request(app).post(`/api/orders/${nativeOrder.id}/checkout`)).send({ requestId: randomUUID(), paymentMethod: 'CARD' }).expect(409)
    const original = after.tables.find((t: any) => t.id === tableId), destination = after.tables.find((t: any) => t.id === otherTable)
    const changed = structuredClone(after.tables); changed.find((t: any) => t.id === tableId).covers[0].items[0].qty = 3
    const rejected = await auth(request(app).put('/api/pos/draft')).set('If-Match', String(after.revision)).send({ tables: changed, seats: [] })
    expect(rejected.status, JSON.stringify(rejected.body)).toBe(409)
    const moved = after.tables.map((t: any) => t.id === tableId ? { ...original, covers: [] } : t.id === otherTable ? { ...destination, covers: original.covers } : t)
    await auth(request(app).put('/api/pos/draft')).set('If-Match', String(after.revision)).send({ tables: moved, seats: [] }).expect(200)
    const linked = await prisma.serviceCover.findUniqueOrThrow({ where: { companyId_coverId: { companyId, coverId } }, include: { session: true } })
    expect(linked.session.tableId).toBe(otherTable)
    expect(await prisma.order.count({ where: { companyId } })).toBe(1)
    const completed = { ...body, tableId: otherTable, requestId: randomUUID(), amountCents: 1840, method: 'MIXED', cashReceivedCents: 1000, expectedOutstandingCents: 1840, allocations: [{ method: 'CASH', amountCents: 840 }, { method: 'CARD', amountCents: 1000 }] }
    const final = await auth(request(app).post('/api/pos/payments')).send(completed).expect(200)
    expect(final.body).toMatchObject({ paidCents: 2340, outstandingCents: 0, status: 'SETTLED', cashChangeCents: 160 })
    const replays = await Promise.all(Array.from({ length: 20 }, () => auth(request(app).post('/api/pos/payments')).send(completed)))
    expect(replays.every(r => r.status === 200)).toBe(true)
    expect(await prisma.order.count({ where: { companyId } })).toBe(1)
    expect(await prisma.posSale.count({ where: { companyId } })).toBe(1)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(98)
    expect((await prisma.orderTender.aggregate({ where: { companyId }, _sum: { amountCents: true } }))._sum.amountCents).toBe(2340)
    const sale: any = (await prisma.posSale.findFirstOrThrow({ where: { companyId } })).snapshot
    expect(sale).toMatchObject({ total: 23.4, sousTotal: 20, tva: 3.4, confirmation: 'manual_declaration' })
    expect((await auth(request(app).get('/api/pos/bootstrap')).expect(200)).body.tables.flatMap((t: any) => t.covers)).toEqual([])
    await auth(request(app).get(`/api/pos/payments/${completed.requestId}`), otherId).expect(403)
    await auth(request(app).post('/api/pos/payments')).send({ ...completed, amountCents: 1841 }).expect(409)
  }, 60000)
  it('une seule référence gagne quand deux caisses demandent le même solde', async () => {
    const boot = (await auth(request(app).get('/api/pos/bootstrap')).expect(200)).body, coverId = randomUUID()
    const tables = boot.tables.map((t: any) => t.id !== tableId ? t : { ...t, covers: [{ id: coverId, label: 'Concurrence', items: [{ id: randomUUID(), menuItemId: productId, name: 'Café', price: 11.7, qty: 1, coverId, note: '' }] }] })
    await auth(request(app).put('/api/pos/draft')).set('If-Match', String(boot.revision)).send({ tables, seats: [] }).expect(200)
    const bodies = Array.from({ length: 2 }, () => ({ requestId: randomUUID(), tableId, coverIds: [coverId], amountCents: 1170, expectedOutstandingCents: 1170, method: 'CARD' }))
    const results = await Promise.all(bodies.map(b => auth(request(app).post('/api/pos/payments')).send(b)))
    expect(results.map(r => r.status).sort()).toEqual([200, 409])
    expect(await prisma.order.count({ where: { companyId } })).toBe(2)
    expect(await prisma.posSale.count({ where: { companyId } })).toBe(2)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(97)
  })
  it('un conflit de salle annule aussi la commande, les affectations et le stock', async () => {
    const boot = (await auth(request(app).get('/api/pos/bootstrap')).expect(200)).body, coverId = randomUUID()
    const tables = boot.tables.map((t: any) => t.id !== tableId ? t : { ...t, covers: [{ id: coverId, label: 'Conflit', items: [{ id: randomUUID(), menuItemId: productId, name: 'Café', price: 11.7, qty: 1, coverId, note: '' }] }] })
    await auth(request(app).put('/api/pos/draft')).set('If-Match', String(boot.revision)).send({ tables, seats: [] }).expect(200)
    let signal!: () => void, release!: () => void
    const started = new Promise<void>(r => { signal = r }); resume = new Promise<void>(r => { release = r }); entered = signal
    const pending = auth(request(app).post('/api/pos/payments')).set('x-lab-delay', 'yes').send({ requestId: randomUUID(), tableId, coverIds: [coverId], amountCents: 1170, expectedOutstandingCents: 1170, method: 'CASH' }).then((r: any) => r)
    await started
    await auth(request(app).post('/api/floor-state/zones')).send({ name: 'Nouvelle révision concurrente' }).expect(200)
    const count = await prisma.orderTender.count({ where: { companyId } })
    release(); expect((await pending).status).toBe(409)
    expect(await prisma.orderTender.count({ where: { companyId } })).toBe(count)
    expect(await prisma.order.count({ where: { companyId } })).toBe(2)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(97)
  })
  it('un acompte QR en caisse garde la commande et un transfert non qualifié est explicitement refusé', async () => {
    const order = await prisma.order.create({ data: { companyId, source: 'GUEST', orderNumber: 3, externalTableId: otherTable, total: 11.7, subtotal: 10, taxAmount: 1.7,
      items: { create: [{ productId, productName: 'QR fictif', unitPrice: 11.7, taxRate: 17, quantity: 1 }] } } })
    const boot = (await auth(request(app).get('/api/pos/bootstrap')).expect(200)).body
    const moved = boot.tables.map((t: any) => ({ ...t, covers: t.id === tableId ? [...t.covers, ...boot.tables.find((b: any) => b.id === otherTable).covers] : t.covers.filter((c: any) => c.id !== 'guest:' + order.id) }))
    await auth(request(app).put('/api/pos/draft')).set('If-Match', String(boot.revision)).send({ tables: moved, seats: [] }).expect(409)
    const body = { requestId: randomUUID(), tableId: otherTable, coverIds: ['guest:' + order.id], amountCents: 500, expectedOutstandingCents: 1170, method: 'CASH' }
    expect((await auth(request(app).post('/api/pos/payments')).send(body).expect(200)).body.outstandingCents).toBe(670)
    const final = await auth(request(app).post('/api/pos/payments')).send({ ...body, requestId: randomUUID(), amountCents: 670, expectedOutstandingCents: 670, method: 'CARD' }).expect(200)
    expect(final.body.sales[0].orderIds).toEqual([order.id])
    expect(await prisma.order.count({ where: { companyId } })).toBe(3)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(96)
  })
})
