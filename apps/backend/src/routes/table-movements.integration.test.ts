import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import { floorCompanyContext } from './floorState'
import pos from './pos'
import visits from './guestVisits'
import guest from './guest'
const companyId = 'integration-move-' + randomUUID(), userId = companyId + '-owner'
let token: string, productId: string, number = 0
let entered: (() => void) | undefined, resume: Promise<void> | undefined
const app = express().use(express.json())
app.use('/api/pos', deviceOrUserAuth, requireCompany, floorCompanyContext, async (req, _res, next) => {
  if (req.headers['x-lab-delay']) { entered?.(); await resume }
  next()
}, pos)
app.use('/api/guest-visits', visits); app.use('/api/guest', guest)
const auth = (r: any) => r.set('Authorization', `Bearer ${token}`).set('x-company-id', companyId)
const boot = async () => (await auth(request(app).get('/api/pos/bootstrap')).expect(200)).body
async function fixture() {
  const from = randomUUID(), into = randomUUID(), spare = randomUUID(), before = await boot()
  const table = (id: string) => ({ id, name: id, shape: 'round', seats: 2, x: 0, y: 0, section: 'Salle', status: 'available', covers: [], mergedWith: [] })
  await auth(request(app).put('/api/pos/draft')).set('If-Match', String(before.revision)).send({ tables: [...before.tables, ...[from, into, spare].map(table)], seats: [] }).expect(200)
  const visit = async (tableId: string) => {
    const v = (await auth(request(app).post('/api/guest-visits')).send({ tableId }).expect(201)).body
    const link = (await auth(request(app).post(`/api/guest-visits/${v.id}/link`)).expect(200)).body
    const order = await prisma.order.create({ data: { companyId, source: 'GUEST', publicToken: randomUUID(), guestVisitId: v.id, externalTableId: tableId,
      orderNumber: ++number, guestStatus: 'preparing', subtotal: 10, taxAmount: 1.7, total: 11.7,
      items: { create: [{ productId, productName: 'Café fictif', unitPrice: 11.7, quantity: 1, taxRate: 17 }] } } })
    return { ...v, token: link.token, order }
  }
  return { from, into, spare, a: await visit(from), b: await visit(into) }
}
const bill = (tableId: string, cap: string) => request(app).get(`/api/guest/bill/${tableId}?companyId=${companyId}`).set('x-guest-access', cap)
describe('Transferts et fusions QR transactionnels', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || new URL(process.env.DATABASE_URL!).pathname !== '/creorga_tests') throw new Error('Base fictive obligatoire')
    vi.stubEnv('CREORGA_FLOOR_AUTHORITY', 'postgres')
    await prisma.company.create({ data: { id: companyId, name: 'FUSION FICTIVE' } })
    await prisma.user.create({ data: { id: userId, email: companyId + '@localhost.invalid', password: 'unused', firstName: 'Test', lastName: 'Owner' } })
    await prisma.userCompany.create({ data: { companyId, userId, role: 'OWNER' } })
    const category = await prisma.category.create({ data: { companyId, name: 'FICTIF' } })
    productId = (await prisma.product.create({ data: { companyId, categoryId: category.id, name: 'Café fictif', price: 11.7, taxRate: 17, stock: 100 } })).id
    token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '30m' })
  })
  afterAll(async () => {
    await prisma.serviceCover.deleteMany({ where: { companyId } }); await prisma.serviceSession.deleteMany({ where: { companyId } })
    await prisma.posCoverPayment.deleteMany({ where: { companyId } }); await prisma.posSale.deleteMany({ where: { companyId } })
    await prisma.paymentAllocation.deleteMany({ where: { companyId } }); await prisma.paymentAttempt.deleteMany({ where: { companyId } })
    await prisma.order.deleteMany({ where: { companyId } }); await prisma.guestVisitAccess.deleteMany({ where: { companyId } }); await prisma.guestVisit.deleteMany({ where: { companyId } })
    await prisma.product.deleteMany({ where: { companyId } }); await prisma.category.deleteMany({ where: { companyId } })
    await prisma.userCompany.deleteMany({ where: { companyId } }); await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.company.deleteMany({ where: { id: companyId } }); await prisma.$disconnect(); vi.unstubAllEnvs()
  })
  it('fusionne sans changer les identités, révoque les deux QR et renouvelle séparément chaque groupe', async () => {
    const f = await fixture(), before = await boot()
    const payload = { requestId: randomUUID(), fromTableId: f.from, intoTableId: f.into, kind: 'MERGE', expectedRevision: before.revision }
    const moved = await auth(request(app).post('/api/pos/table-movements')).send(payload).expect(200)
    expect(moved.body.visitIds.sort()).toEqual([f.a.id, f.b.id].sort())
    await bill(f.from, f.a.token).expect(403); await bill(f.into, f.a.token).expect(403); await bill(f.into, f.b.token).expect(403)
    for (const v of [f.a, f.b]) {
      const link = (await auth(request(app).post(`/api/guest-visits/${v.id}/link`)).expect(200)).body
      expect(link.tableId).toBe(f.into)
      expect((await bill(f.into, link.token).expect(200)).body).toMatchObject({ total: 11.7, count: 1, orderIds: [v.order.publicToken] })
      expect((await prisma.order.findUniqueOrThrow({ where: { id: v.order.id } })).guestStatus).toBe('preparing')
    }
    const after = await boot()
    expect(after.tables.find((t: any) => t.id === f.into).covers.map((c: any) => c.id).sort()).toEqual(['guest:' + f.a.order.id, 'guest:' + f.b.order.id].sort())
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(100)
    const replay = await auth(request(app).post('/api/pos/table-movements')).send(payload).expect(200)
    expect(replay.body).toEqual(moved.body)
    await auth(request(app).post('/api/pos/table-movements')).send({ ...payload, intoTableId: f.spare }).expect(409)
  })
  it('conserve acompte, tentative en cours et affectations pendant un transfert puis un solde', async () => {
    const f = await fixture(), cover = 'guest:' + f.a.order.id
    await auth(request(app).post('/api/pos/payments')).send({ requestId: randomUUID(), tableId: f.from, coverIds: [cover], amountCents: 500, expectedOutstandingCents: 1170, method: 'CASH' }).expect(200)
    const attempt = await prisma.paymentAttempt.create({ data: { companyId, scope: 'TABLE', tableId: f.from, guestVisitId: f.a.id, orderId: f.a.order.id,
      requestId: randomUUID(), requestHash: 'fictif', provider: 'paypal', merchantId: 'fictif', amountCents: 670, currency: 'EUR', status: 'UNKNOWN' } })
    const allocation = await prisma.paymentAllocation.create({ data: { companyId, attemptId: attempt.id, orderId: f.a.order.id, amountCents: 670 } })
    const before = await boot()
    await auth(request(app).post('/api/pos/table-movements')).send({ requestId: randomUUID(), fromTableId: f.from, intoTableId: f.spare, kind: 'TRANSFER', expectedRevision: before.revision }).expect(200)
    expect(await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).toEqual(attempt)
    expect(await prisma.paymentAllocation.findUniqueOrThrow({ where: { id: allocation.id } })).toEqual(allocation)
    expect((await boot()).tables.find((t: any) => t.id === f.spare).covers[0].payment).toMatchObject({ paidCents: 500, outstandingCents: 670 })
    const body = { requestId: randomUUID(), tableId: f.spare, coverIds: [cover], amountCents: 670, expectedOutstandingCents: 670, method: 'CARD' }
    await auth(request(app).post('/api/pos/payments')).send(body).expect(409)
    // Le prestataire est simulé : la preuve d'annulation ne constitue pas une transaction réelle.
    await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: 'CANCELLED' } }); await prisma.paymentAllocation.update({ where: { id: allocation.id }, data: { active: false } })
    await auth(request(app).post('/api/pos/payments')).send(body).expect(200)
    await auth(request(app).post('/api/pos/payments')).send(body).expect(200)
    expect(await prisma.posCoverPayment.count({ where: { companyId, coverId: cover } })).toBe(1)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(99)
  })
  it('une seule fusion concurrente gagne ; une révision périmée ne déplace rien', async () => {
    const f = await fixture(), before = await boot()
    const results = await Promise.all([f.into, f.spare].map(intoTableId => auth(request(app).post('/api/pos/table-movements')).send({ requestId: randomUUID(), kind: 'MERGE', fromTableId: f.from, intoTableId, expectedRevision: before.revision })))
    expect(results.map(r => r.status).sort()).toEqual([200, 409])
    const after = await boot()
    expect(after.tables.flatMap((t: any) => t.covers).filter((c: any) => c.id === 'guest:' + f.a.order.id)).toHaveLength(1)
    await auth(request(app).post('/api/pos/table-movements')).send({ requestId: randomUUID(), kind: 'TRANSFER', fromTableId: f.from, intoTableId: f.spare, expectedRevision: before.revision }).expect(409)
  })
  it('refuse une destination inconnue et une société non autorisée sans révoquer les QR', async () => {
    const f = await fixture(), before = await boot(), payload = { requestId: randomUUID(), fromTableId: f.from, intoTableId: 'autre-societe', kind: 'MERGE', expectedRevision: before.revision }
    await auth(request(app).post('/api/pos/table-movements')).send(payload).expect(404)
    await request(app).post('/api/pos/table-movements').set('Authorization', `Bearer ${token}`).set('x-company-id', 'autre-societe').send(payload).expect(403)
    await bill(f.from, f.a.token).expect(200)
  })
  it('un conflit PostgreSQL tardif annule localisation et révocation QR dans la même transaction', async () => {
    const f = await fixture(), before = await boot(), requestId = randomUUID()
    let signal!: () => void, release!: () => void
    const started = new Promise<void>(r => { signal = r }); entered = signal; resume = new Promise<void>(r => { release = r })
    const moving = auth(request(app).post('/api/pos/table-movements')).set('x-lab-delay', 'yes').send({ requestId, kind: 'TRANSFER', fromTableId: f.from, intoTableId: f.spare, expectedRevision: before.revision }).then((r: any) => r)
    await started
    try {
      const tables = structuredClone(before.tables); tables[0].x += 1
      await auth(request(app).put('/api/pos/draft')).set('If-Match', String(before.revision)).send({ tables, seats: before.seats }).expect(200)
    } finally { release() }
    expect((await moving).status).toBe(409)
    await bill(f.from, f.a.token).expect(200)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: f.a.order.id } })).externalTableId).toBe(f.from)
    expect(await prisma.tableMovement.count({ where: { id: requestId } })).toBe(0)
  })
  it('des consignes globales différentes ne relancent jamais la cuisine via une fusion implicite', async () => {
    const f = await fixture(), before = await boot(), tables = structuredClone(before.tables)
    tables.find((t: any) => t.id === f.from).kitchenNote = 'Sans glace, consigne de ce groupe uniquement'
    const saved = await auth(request(app).put('/api/pos/draft')).set('If-Match', String(before.revision)).send({ tables, seats: before.seats }).expect(200)
    await auth(request(app).post('/api/pos/table-movements')).send({ requestId: randomUUID(), kind: 'MERGE', fromTableId: f.from, intoTableId: f.into, expectedRevision: saved.body.updatedAt }).expect(409)
    await bill(f.from, f.a.token).expect(200)
  })
})
