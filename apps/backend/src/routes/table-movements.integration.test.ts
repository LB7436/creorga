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
    number = Math.max(number, (await prisma.order.findFirst({ where: { companyId }, orderBy: { orderNumber: 'desc' } }))?.orderNumber || 0)
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
  it('sépare un groupe QR après fusion, sans déplacer l’acompte de l’autre groupe ni rouvrir les anciens QR', async () => {
    const f = await fixture(), cover = 'guest:' + f.a.order.id
    await auth(request(app).post('/api/pos/payments')).send({ requestId: randomUUID(), tableId: f.from, coverIds: [cover], amountCents: 500, expectedOutstandingCents: 1170, method: 'CASH' }).expect(200)
    await auth(request(app).post('/api/pos/table-movements')).send({ requestId: randomUUID(), fromTableId: f.from, intoTableId: f.into, kind: 'MERGE', expectedRevision: (await boot()).revision }).expect(200)
    const before = await boot(), tenders = await prisma.orderTender.findMany({ where: { companyId, orderId: f.a.order.id } })
    const body = { requestId: randomUUID(), kind: 'GROUP', fromTableId: f.into, intoTableId: f.spare, coverId: cover, expectedRevision: before.revision }
    const separated = await auth(request(app).post('/api/pos/service-separations')).send(body).expect(200)
    expect(separated.body.orderIds).toEqual([f.a.order.id])
    const after = await boot()
    expect(after.tables.find((t: any) => t.id === f.spare).covers[0].payment).toMatchObject({ paidCents: 500, outstandingCents: 670 })
    expect(after.tables.find((t: any) => t.id === f.into).covers.map((c: any) => c.id)).toEqual(['guest:' + f.b.order.id])
    expect(await prisma.orderTender.findMany({ where: { companyId, orderId: f.a.order.id } })).toEqual(tenders)
    await bill(f.spare, f.a.token).expect(403)
    for (const [v, table, total] of [[f.a, f.spare, 6.7], [f.b, f.into, 11.7]] as const) {
      const link = (await auth(request(app).post(`/api/guest-visits/${v.id}/link`)).expect(200)).body
      expect((await bill(table, link.token).expect(200)).body).toMatchObject({ total, count: 1, orderIds: [v.order.publicToken] })
    }
    expect((await auth(request(app).post('/api/pos/service-separations')).send(body).expect(200)).body).toEqual(separated.body)
    await auth(request(app).post('/api/pos/service-separations')).send({ ...body, intoTableId: f.from }).expect(409)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: f.a.order.id } })).guestStatus).toBe('preparing')
  })
  it('déplace une partie de ligne native à son prix historique sans nouvelle préparation ni débit de stock', async () => {
    const f = await fixture(), before = await boot(), tables = structuredClone(before.tables), coverId = randomUUID(), lineId = randomUUID()
    const stock = (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock
    tables.find((t: any) => t.id === f.from).covers.push({ id: coverId, label: 'Groupe natif', items: [{ id: lineId, menuItemId: productId, name: 'Café fictif', price: 11.7, qty: 3, note: 'Bar : sans glace ; cuisine : sans sel', coverId }] })
    await auth(request(app).put('/api/pos/draft')).set('If-Match', String(before.revision)).send({ tables, seats: before.seats }).expect(200)
    const kitchen = (await auth(request(app).get('/api/pos/kitchen')).expect(200)).body.tickets.find((t: any) => t.id === coverId)
    await auth(request(app).patch('/api/pos/kitchen/' + coverId)).send({ status: 'ready', updatedAt: kitchen.updatedAt }).expect(200)
    await prisma.product.update({ where: { id: productId }, data: { price: 19, taxRate: 3 } })
    const body = { requestId: randomUUID(), kind: 'LINES', fromTableId: f.from, intoTableId: f.into, coverId, lines: [{ id: lineId, qty: 1 }], expectedRevision: (await boot()).revision }
    const moved = (await auth(request(app).post('/api/pos/service-separations')).send(body).expect(200)).body
    const after = await boot(), src = after.tables.find((t: any) => t.id === f.from), dst = after.tables.find((t: any) => t.id === f.into)
    expect(src.covers.find((c: any) => c.id === coverId).items[0]).toMatchObject({ id: lineId, qty: 2, price: 11.7, taxRate: 17 })
    expect(dst.covers.find((c: any) => c.id === moved.targetCoverId).items[0]).toMatchObject({ qty: 1, price: 11.7, taxRate: 17, note: 'Bar : sans glace ; cuisine : sans sel' })
    // Une sauvegarde anodine ne doit pas transformer un déplacement en commande au bar.
    await auth(request(app).put('/api/pos/draft')).set('If-Match', String(after.revision)).send({ tables: after.tables, seats: after.seats }).expect(200)
    const tickets = (await auth(request(app).get('/api/pos/kitchen')).expect(200)).body.tickets.filter((t: any) => !t.id.startsWith('guest:'))
    expect(tickets.filter((t: any) => t.coverId === coverId)).toHaveLength(1)
    expect(tickets.find((t: any) => t.id === coverId)).toMatchObject({ status: 'ready', items: [{ id: lineId, qty: 3 }], routing: expect.arrayContaining([expect.objectContaining({ tableId: f.from, qty: 2 }), expect.objectContaining({ tableId: f.into, qty: 1 })]) })
    expect(tickets.some((t: any) => t.coverId === moved.targetCoverId)).toBe(false)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(stock)
    expect(await prisma.posCoverPayment.count({ where: { companyId, coverId: { in: [coverId, moved.targetCoverId] } } })).toBe(0)
    await auth(request(app).post('/api/pos/table-movements')).send({ requestId: randomUUID(), kind: 'TRANSFER', fromTableId: f.into, intoTableId: f.spare, expectedRevision: (await boot()).revision }).expect(200)
    const rerouted = (await auth(request(app).get('/api/pos/kitchen')).expect(200)).body.tickets.find((t: any) => t.id === coverId)
    expect(rerouted.routing).toEqual(expect.arrayContaining([expect.objectContaining({ tableId: f.from, qty: 2 }), expect.objectContaining({ tableId: f.spare, qty: 1 })]))
    expect(rerouted.routing.some((r: any) => r.tableId === f.into)).toBe(false)
    const pay = { requestId: randomUUID(), tableId: f.from, coverIds: [coverId], amountCents: 2340, expectedOutstandingCents: 2340, method: 'CASH' }
    await auth(request(app).post('/api/pos/payments')).send(pay).expect(200)
    await auth(request(app).post('/api/pos/payments')).send(pay).expect(200)
    const paySplit = { requestId: randomUUID(), tableId: f.spare, coverIds: [moved.targetCoverId], amountCents: 1170, expectedOutstandingCents: 1170, method: 'CARD' }
    await auth(request(app).post('/api/pos/payments')).send(paySplit).expect(200)
    await auth(request(app).post('/api/pos/payments')).send(paySplit).expect(200)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(stock! - 3)
    const sales = await prisma.posSale.findMany({ where: { companyId, covers: { some: { coverId: { in: [coverId, moved.targetCoverId] } } } } })
    expect(sales).toHaveLength(2)
    expect(sales.reduce((n, s) => n + Math.round((s.snapshot as any).total * 100), 0)).toBe(3510)
    expect(sales.flatMap(s => (s.snapshot as any).lignes).every(l => l.price === 11.7 && l.taxRate === 17)).toBe(true)
    await prisma.product.update({ where: { id: productId }, data: { price: 11.7, taxRate: 17 } })
  })
  it('refuse les découpes financières ambiguës sans modifier lignes, QR ou acompte', async () => {
    const f = await fixture(), before = await boot()
    const bad = { requestId: randomUUID(), kind: 'LINES', fromTableId: f.from, intoTableId: f.spare, coverId: 'guest:' + f.a.order.id, lines: [{ id: 'ligne', qty: 1 }], expectedRevision: before.revision }
    const refused = await auth(request(app).post('/api/pos/service-separations')).send(bad).expect(409)
    expect(refused.body.error).toMatch(/QR.*groupe|groupe.*QR/)
    await bill(f.from, f.a.token).expect(200)
    expect((await boot()).revision).toBe(before.revision)
  })
  it('refuse la découpe d’un acompte natif et les gestes commerciaux, mais transfère son identité complète', async () => {
    const f = await fixture(), initial = await boot(), coverId = randomUUID(), lineId = randomUUID(), tables = structuredClone(initial.tables)
    tables.find((t: any) => t.id === f.from).covers.push({ id: coverId, label: 'Acompte natif', items: [{ id: lineId, menuItemId: productId, name: 'Café fictif', price: 11.7, qty: 2, note: 'Bar sans glace', coverId }] })
    await auth(request(app).put('/api/pos/draft')).set('If-Match', String(initial.revision)).send({ tables, seats: initial.seats }).expect(200)
    await auth(request(app).post('/api/pos/payments')).send({ requestId: randomUUID(), tableId: f.from, coverIds: [coverId], amountCents: 100, expectedOutstandingCents: 2340, method: 'CASH' }).expect(200)
    const before = await boot(), body = { requestId: randomUUID(), kind: 'LINES', fromTableId: f.from, intoTableId: f.spare, coverId, lines: [{ id: lineId, qty: 1 }], expectedRevision: before.revision }
    expect((await auth(request(app).post('/api/pos/service-separations')).send(body).expect(409)).body.error).toMatch(/acompte/)
    expect((await boot()).revision).toBe(before.revision)
    const moved = await auth(request(app).post('/api/pos/service-separations')).send({ requestId: randomUUID(), kind: 'GROUP', fromTableId: f.from, intoTableId: f.spare, coverId, expectedRevision: before.revision }).expect(200)
    expect(moved.body.orderIds).toHaveLength(1)
    expect((await boot()).tables.find((t: any) => t.id === f.spare).covers[0].payment).toMatchObject({ paidCents: 100, outstandingCents: 2240 })
    for (const changes of [{ orderDiscount: { type: 'percent', value: 10 } }, { offeredItemIds: [lineId] }]) {
      const b = await boot(), rows = structuredClone(b.tables); Object.assign(rows.find((t: any) => t.id === f.spare), changes)
      const saved = await auth(request(app).put('/api/pos/draft')).set('If-Match', String(b.revision)).send({ tables: rows, seats: b.seats }).expect(200)
      expect((await auth(request(app).post('/api/pos/service-separations')).send({ requestId: randomUUID(), kind: 'GROUP', fromTableId: f.spare, intoTableId: f.from, coverId, expectedRevision: saved.body.updatedAt }).expect(409)).body.error).toMatch(/Remise|offert/)
    }
  })
  it('une séparation concurrente gagne une fois, reste rejouable et n’est pas lisible dans une autre société', async () => {
    const f = await fixture(), before = await boot(), payload = { requestId: randomUUID(), kind: 'GROUP', fromTableId: f.from, intoTableId: f.spare, coverId: 'guest:' + f.a.order.id, expectedRevision: before.revision }
    const results = await Promise.all([payload, { ...payload, requestId: randomUUID(), intoTableId: f.into }].map(p => auth(request(app).post('/api/pos/service-separations')).send(p)))
    expect(results.map(r => r.status).sort()).toEqual([200, 409])
    const success = results.find(r => r.status === 200)!.body
    await auth(request(app).get('/api/pos/table-movements/' + success.requestId)).expect(200)
    await request(app).get('/api/pos/table-movements/' + success.requestId).set('Authorization', 'Bearer ' + token).set('x-company-id', 'autre-societe').expect(403)
    expect((await boot()).tables.flatMap((t: any) => t.covers).filter((c: any) => c.id === payload.coverId)).toHaveLength(1)
    await bill(f.from, f.a.token).expect(403)
  })
  it('un conflit de révision tardif annule aussi la séparation et les capacités QR', async () => {
    const f = await fixture(), before = await boot(), requestId = randomUUID()
    let signal!: () => void, release!: () => void
    const started = new Promise<void>(r => { signal = r }); entered = signal; resume = new Promise<void>(r => { release = r })
    const moving = auth(request(app).post('/api/pos/service-separations')).set('x-lab-delay', 'yes').send({ requestId, kind: 'GROUP', fromTableId: f.from, intoTableId: f.spare, coverId: 'guest:' + f.a.order.id, expectedRevision: before.revision }).then((r: any) => r)
    await started
    try {
      const tables = structuredClone(before.tables); tables[0].y += 1
      await auth(request(app).put('/api/pos/draft')).set('If-Match', String(before.revision)).send({ tables, seats: before.seats }).expect(200)
    } finally { release() }
    expect((await moving).status).toBe(409)
    await bill(f.from, f.a.token).expect(200)
    expect(await prisma.tableMovement.count({ where: { id: requestId } })).toBe(0)
  })
  it('refuse un déplacement de ligne par brouillon non audité qui relancerait la préparation', async () => {
    const f = await fixture(), before = await boot(), tables = structuredClone(before.tables), a = randomUUID(), b = randomUUID(), id = randomUUID()
    tables.find((t: any) => t.id === f.from).covers.push({ id: a, label: 'Groupe A', items: [{ id, menuItemId: productId, name: 'Café fictif', price: 11.7, qty: 1, note: '', coverId: a }] })
    tables.find((t: any) => t.id === f.spare).covers.push({ id: b, label: 'Groupe B', items: [] })
    await auth(request(app).put('/api/pos/draft')).set('If-Match', String(before.revision)).send({ tables, seats: before.seats }).expect(200)
    const saved = await boot(), rows = structuredClone(saved.tables), line = rows.find((t: any) => t.id === f.from).covers.find((c: any) => c.id === a).items.pop()
    rows.find((t: any) => t.id === f.spare).covers.push({ id: b, label: 'Groupe B', items: [{ ...line, coverId: b }] })
    const refused = await auth(request(app).put('/api/pos/draft')).set('If-Match', String(saved.revision)).send({ tables: rows, seats: saved.seats }).expect(409)
    expect(refused.body.error).toMatch(/séparation/)
    expect((await boot()).revision).toBe(saved.revision)
  })
})
