import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import prisma from '../lib/prisma'
import * as safeJson from '../lib/safe-json'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import { floorCompanyContext } from './floorState'
import pos from './pos'
import guest from './guest'
import visits from './guestVisits'
import orders from './orders'
const companyId = 'integration-allocation-' + randomUUID(), owner = companyId + '-owner'
let token: string, productId: string, number = 0
const app = express().use(express.json())
app.use('/api/pos', deviceOrUserAuth, requireCompany, floorCompanyContext, pos)
app.use('/api/guest', guest); app.use('/api/guest-visits', visits); app.use('/api/orders', deviceOrUserAuth, orders)
const auth = (r: any) => r.set('Authorization', 'Bearer ' + token).set('x-company-id', companyId)
const boot = async () => (await auth(request(app).get('/api/pos/bootstrap')).expect(200)).body
async function fixture(deposit = true) {
  const a = randomUUID(), b = randomUUID(), before = await boot()
  const table = (id: string) => ({ id, name: 'Allocation fictive', shape: 'round', seats: 4, x: 0, y: 0, section: 'Salle', status: 'available', covers: [], mergedWith: [] })
  await auth(request(app).put('/api/pos/draft')).set('If-Match', String(before.revision)).send({ tables: [...before.tables, table(a), table(b)], seats: before.seats }).expect(200)
  const visit = (await auth(request(app).post('/api/guest-visits')).send({ tableId: a }).expect(201)).body
  const cap = (await auth(request(app).post(`/api/guest-visits/${visit.id}/link`)).expect(200)).body.token
  const order = await prisma.order.create({ data: { companyId, source: 'GUEST', publicToken: randomUUID(), guestVisitId: visit.id, externalTableId: a,
    orderNumber: ++number, guestStatus: 'preparing', subtotal: 9.71, taxAmount: .29, total: 10,
    items: { create: [{ productId, productName: 'Café historique', unitPrice: 3.5, quantity: 3, taxRate: 3, notes: 'Sans sucre' }] } }, include: { items: true } })
  if (deposit) await auth(request(app).post('/api/pos/payments')).send({ requestId: randomUUID(), tableId: a, coverIds: ['guest:' + order.id], amountCents: 500, expectedOutstandingCents: 1000, method: 'CASH' }).expect(200)
  const tender = await prisma.orderTender.findFirst({ where: { companyId, orderId: order.id } })
  const keys = [randomUUID(), randomUUID(), randomUUID()].sort()
  const body = { requestId: randomUUID(), orderId: order.id, expectedRevision: (await boot()).revision, reason: 'Choix explicite de trois groupes fictifs',
    groups: keys.map((key, i) => ({ key, tableId: i === 2 ? b : a, label: 'Groupe ' + i, kitchenNote: i === 0 ? 'Sans sel' : 'Normal', barNote: i === 0 ? 'Sans glace' : 'Avec glace', lines: [{ itemId: order.items[0].id, qty: 1 }] })),
    tenderDecisions: tender ? [{ tenderId: tender.id, parts: [{ groupKey: keys[0], amountCents: 200 }, { groupKey: keys[1], amountCents: 300 }] }] : [] }
  return { a, b, visit, cap, order, tender, keys, body }
}
const preview = async (body: any) => (await auth(request(app).post('/api/pos/financial-allocations/preview')).send(body).expect(200)).body
const confirm = (body: any, hash: string) => auth(request(app).post('/api/pos/financial-allocations')).send({ ...body, confirmHash: hash, managerAcknowledged: true })
describe('Répartition financière QR : autorité, groupes et provenances', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || new URL(process.env.DATABASE_URL!).pathname !== '/creorga_tests') throw Error('Base fictive obligatoire')
    vi.stubEnv('CREORGA_FLOOR_AUTHORITY', 'postgres')
    await prisma.company.create({ data: { id: companyId, name: 'ALLOCATION FICTIVE' } })
    await prisma.user.create({ data: { id: owner, email: companyId + '@localhost.invalid', password: 'unused', firstName: 'Test', lastName: 'Owner' } })
    await prisma.userCompany.create({ data: { companyId, userId: owner, role: 'OWNER' } })
    const category = await prisma.category.create({ data: { companyId, name: 'FICTIF' } })
    productId = (await prisma.product.create({ data: { companyId, categoryId: category.id, name: 'Café fictif', price: 3.5, taxRate: 3, stock: 100 } })).id
    token = jwt.sign({ userId: owner }, process.env.JWT_SECRET!, { expiresIn: '30m' })
  })
  afterAll(async () => {
    await (prisma as any).serviceAllocation?.deleteMany({ where: { companyId } })
    await prisma.invoice.deleteMany({ where: { companyId } })
    await prisma.serviceCover.deleteMany({ where: { companyId } }); await prisma.serviceSession.deleteMany({ where: { companyId } })
    await prisma.posCoverPayment.deleteMany({ where: { companyId } }); await prisma.posSale.deleteMany({ where: { companyId } })
    await prisma.paymentAllocation.deleteMany({ where: { companyId } }); await prisma.paymentAttempt.deleteMany({ where: { companyId } }); await prisma.order.deleteMany({ where: { companyId } })
    await prisma.guestVisitAccess.deleteMany({ where: { companyId } }); await prisma.guestVisit.deleteMany({ where: { companyId } })
    await prisma.product.deleteMany({ where: { companyId } }); await prisma.category.deleteMany({ where: { companyId } })
    await prisma.userCompany.deleteMany({ where: { companyId } }); await prisma.user.deleteMany({ where: { id: owner } })
    await prisma.company.deleteMany({ where: { id: companyId } }); await prisma.$disconnect(); vi.unstubAllEnvs()
  })
  it('trois groupes partagent remise et acompte, règlent séparément sans nouvelle vente ni préparation et restent privés', async () => {
    const f = await fixture(), original = await prisma.order.findUniqueOrThrow({ where: { id: f.order.id }, include: { items: true } })
    const p = await preview(f.body)
    expect(p.plan.groups.map((g: any) => g.outstandingCents)).toEqual([134, 33, 333])
    expect(await prisma.order.count({ where: { companyId, id: f.order.id } })).toBe(1)
    const done = (await confirm(f.body, p.confirmHash).expect(200)).body
    expect((await confirm(f.body, p.confirmHash).expect(200)).body).toEqual(done)
    expect(await prisma.order.findUniqueOrThrow({ where: { id: f.order.id }, include: { items: true } })).toEqual(original)
    await request(app).get(`/api/guest/bill/${f.a}?companyId=${companyId}`).set('x-guest-access', f.cap).expect(403)
    const after = await boot(), shares = after.tables.flatMap((t: any) => t.covers).filter((c: any) => c.allocationId === f.body.requestId)
    expect(shares).toHaveLength(3)
    expect(shares.map((s: any) => s.payment.outstandingCents).sort((a: number, b: number) => a - b)).toEqual([33, 134, 333])
    for (let i = 0; i < f.keys.length; i++) {
      const g = done.groups.find((g: any) => g.id === f.keys[i]), amountCents = [134, 33, 333][i]
      const link = (await auth(request(app).post(`/api/guest-visits/${g.visitId}/link`)).expect(200)).body
      const bill = (await request(app).get(`/api/guest/bill/${g.tableId}?companyId=${companyId}`).set('x-guest-access', link.token).expect(200)).body
      expect(bill).toMatchObject({ total: amountCents / 100, count: 1 })
      const tracked = (await request(app).get(`/api/guest/orders/${g.id}?companyId=${companyId}`).set('x-guest-access', link.token).expect(200)).body
      expect(tracked.items).toHaveLength(1); expect(tracked.items[0].qty).toBe(1)
      await request(app).get(`/api/guest/orders/${f.order.publicToken}?companyId=${companyId}`).set('x-guest-access', link.token).expect(404)
      const pay = { requestId: randomUUID(), tableId: g.tableId, coverIds: ['guest:share:' + g.id], amountCents, expectedOutstandingCents: amountCents, method: 'CARD' }
      await auth(request(app).post('/api/pos/payments')).send(pay).expect(200)
      await auth(request(app).post('/api/pos/payments')).send(pay).expect(200)
      expect((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).paidAt !== null).toBe(i === 2)
    }
    expect(await prisma.orderTender.findUniqueOrThrow({ where: { id: f.tender!.id } })).toEqual(f.tender)
    expect((await prisma.orderTender.aggregate({ where: { companyId, orderId: f.order.id }, _sum: { amountCents: true } }))._sum.amountCents).toBe(1000)
    expect(await prisma.saleOrigin.count({ where: { companyId, kind: 'ORDER', sourceId: f.order.id } })).toBe(1)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(97)
    const sale: any = (await prisma.posSale.findFirstOrThrow({ where: { companyId, origins: { some: { kind: 'ORDER', sourceId: f.order.id } } } })).snapshot
    expect(sale).toMatchObject({ total: 10, sousTotal: 9.71, tva: .29, remise: .5 })
    expect((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).guestStatus).toBe('preparing')
  })
  it('refuse un ancien original entièrement couvert par ses règlements mais sans clôture, sans inventer de vente', async () => {
    const f = await fixture(false)
    const attempt = await prisma.paymentAttempt.create({ data: { companyId, orderId: f.order.id, requestId: randomUUID(), requestHash: 'historique-fictif', provider: 'manual', merchantId: 'manual:' + companyId, amountCents: 1000, currency: 'EUR', status: 'DECLARED' } })
    const tender = await prisma.orderTender.create({ data: { companyId, orderId: f.order.id, attemptId: attempt.id, actorId: owner, method: 'CASH', amountCents: 1000, cashReceivedCents: 1000, cashChangeCents: 0, confirmation: 'manual_declaration' } })
    const body = { ...f.body, tenderDecisions: [{ tenderId: tender.id, parts: [{ groupKey: f.keys[0], amountCents: 334 }, { groupKey: f.keys[1], amountCents: 333 }, { groupKey: f.keys[2], amountCents: 333 }] }] }
    const response = await auth(request(app).post('/api/pos/financial-allocations/preview')).send(body).expect(409)
    expect(response.body.error).toMatch(/solde|rapprochement|clôture/i)
    expect(await prisma.serviceAllocation.count({ where: { companyId, orderId: f.order.id } })).toBe(0)
    expect(await prisma.saleOrigin.count({ where: { companyId, kind: 'ORDER', sourceId: f.order.id } })).toBe(0)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).paidAt).toBeNull()
    expect((await prisma.orderTender.findUniqueOrThrow({ where: { id: tender.id } })).amountCents).toBe(1000)
  })
  it('refuse responsable absent, révision périmée, décision implicite et paiement incertain sans libérer sa réserve', async () => {
    const f = await fixture(), p = await preview(f.body)
    await prisma.userCompany.update({ where: { userId_companyId: { userId: owner, companyId } }, data: { role: 'WAITER' } })
    try { await confirm(f.body, p.confirmHash).expect(403) } finally { await prisma.userCompany.update({ where: { userId_companyId: { userId: owner, companyId } }, data: { role: 'OWNER' } }) }
    await auth(request(app).post('/api/pos/financial-allocations/preview')).send({ ...f.body, tenderDecisions: [] }).expect(409)
    const attempt = await prisma.paymentAttempt.create({ data: { companyId, orderId: f.order.id, requestId: randomUUID(), requestHash: 'fictif', provider: 'paypal', merchantId: 'fictif', amountCents: 500, currency: 'EUR', status: 'UNKNOWN' } })
    const reserve = await prisma.paymentAllocation.create({ data: { companyId, orderId: f.order.id, attemptId: attempt.id, amountCents: 500 } })
    await confirm(f.body, p.confirmHash).expect(409)
    expect(await prisma.paymentAllocation.findUniqueOrThrow({ where: { id: reserve.id } })).toEqual(reserve)
    expect(await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } })).toEqual(attempt)
    await request(app).get(`/api/guest/bill/${f.a}?companyId=${companyId}`).set('x-guest-access', f.cap).expect(200)
  })
  it('une confirmation concurrente gagne une fois ; aucune modification ni paiement par l’ancienne commande ne contourne les groupes', async () => {
    const f = await fixture(false), p = await preview(f.body)
    const alternative = { ...f.body, requestId: randomUUID() }, otherPreview = await preview(alternative)
    const results = await Promise.all([confirm(f.body, p.confirmHash), confirm(alternative, otherPreview.confirmHash)])
    expect(results.map(r => r.status).sort(), JSON.stringify(results.map(r => r.body))).toEqual([200, 409])
    await auth(request(app).post(`/api/orders/${f.order.id}/checkout`)).send({ requestId: randomUUID(), paymentMethod: 'CARD' }).expect(409)
    await auth(request(app).put(`/api/orders/${f.order.id}/items/${f.order.items[0].id}`)).send({ quantity: 4 }).expect(409)
    await request(app).post('/api/pos/financial-allocations/preview').set('Authorization', 'Bearer ' + token).set('x-company-id', 'foreign').send(f.body).expect(403)
    await prisma.$executeRawUnsafe('UPDATE "Order" SET "total" = 10.01 WHERE id = $1', f.order.id).then(() => { throw Error('Écriture financière acceptée') }, e => expect(String(e)).toMatch(/immutable|allocation/i))
    const after = await boot(), tables = structuredClone(after.tables)
    const share = tables.flatMap((t: any) => t.covers).find((c: any) => c.allocationId === results.find(r => r.status === 200)!.body.requestId)
    share.items[0].qty = 5
    await auth(request(app).put('/api/pos/draft')).set('If-Match', String(after.revision)).send({ tables, seats: after.seats }).expect(409)
  })
  it('un nouvel acompte invalide l’aperçu, puis les paiements mixtes et concurrents conservent les parts exactes', async () => {
    const f = await fixture(false), p = await preview(f.body)
    await auth(request(app).post('/api/pos/payments')).send({ requestId: randomUUID(), tableId: f.a, coverIds: ['guest:' + f.order.id], amountCents: 100, expectedOutstandingCents: 1000, method: 'CASH' }).expect(200)
    await confirm(f.body, p.confirmHash).expect(409)
    const tender = await prisma.orderTender.findFirstOrThrow({ where: { companyId, orderId: f.order.id } })
    const body = { ...f.body, expectedRevision: (await boot()).revision, tenderDecisions: [{ tenderId: tender.id, parts: [{ groupKey: f.keys[0], amountCents: 100 }] }] }
    const next = await preview(body), done = (await confirm(body, next.confirmHash).expect(200)).body
    const g = done.groups.find((g: any) => g.id === f.keys[0]), pay = { requestId: randomUUID(), tableId: g.tableId, coverIds: ['guest:share:' + g.id], amountCents: 234, expectedOutstandingCents: 234, method: 'MIXED', cashReceivedCents: 200,
      allocations: [{ method: 'CASH', amountCents: 100 }, { method: 'CARD', amountCents: 134 }] }
    const replays = await Promise.all(Array.from({ length: 20 }, () => auth(request(app).post('/api/pos/payments')).send(pay)))
    expect(replays.some(r => r.status === 200)).toBe(true)
    expect(replays.every(r => [200, 409].includes(r.status))).toBe(true)
    const confirmed = replays.find(r => r.status === 200)!.body
    expect(confirmed).toMatchObject({ outstandingCents: 0, cashChangeCents: 100, confirmation: 'manual_declaration', sales: [] })
    for (let i = 0; i < 20; i++) expect((await auth(request(app).post('/api/pos/payments')).send(pay).expect(200)).body).toEqual(confirmed)
    expect((await prisma.orderTender.aggregate({ where: { companyId, orderId: f.order.id }, _sum: { amountCents: true } }))._sum.amountCents).toBe(334)
    const other = done.groups.find((g: any) => g.id === f.keys[1])
    const base = { tableId: other.tableId, coverIds: ['guest:share:' + other.id], amountCents: 333, expectedOutstandingCents: 333, method: 'CARD' }
    const concurrent = await Promise.all([1, 2].map(() => auth(request(app).post('/api/pos/payments')).send({ ...base, requestId: randomUUID() })))
    expect(concurrent.map(r => r.status).sort()).toEqual([200, 409])
    const kitchen = (await auth(request(app).get('/api/pos/kitchen')).expect(200)).body.tickets.filter((t: any) => t.id === 'guest:' + f.order.id)
    expect(kitchen).toHaveLength(1); expect(kitchen[0].items[0].qty).toBe(3)
    expect(kitchen[0].routing).toHaveLength(3)
    expect(kitchen[0].routing.map((r: any) => r.barNote)).toContain('Sans glace')
    await prisma.$executeRawUnsafe('UPDATE "OrderItem" SET quantity = 8 WHERE id = $1', f.order.items[0].id).then(() => { throw Error('Quantité historique réécrite') }, e => expect(String(e)).toMatch(/immutable|allocation/i))
  })
  it('un document déjà émis impose une correction explicite sans modifier le PDF ni l’acompte', async () => {
    const f = await fixture(), pdf = await PDFDocument.create(); pdf.addPage()
    const invoice = await prisma.invoice.create({ data: { companyId, orderId: f.order.id, number: 'FICTIF-EMIS-' + randomUUID(), issuedAt: new Date(), status: 'SENT', total: 10, issuedPdf: Buffer.from(await pdf.save()) } })
    const response = await auth(request(app).post('/api/pos/financial-allocations/preview')).send(f.body)
    expect(response.status).toBe(409)
    expect(response.body.error).toMatch(/document.*émis|émis.*document/i)
    expect(await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).toEqual(invoice)
    expect(await prisma.orderTender.findUniqueOrThrow({ where: { id: f.tender!.id } })).toEqual(f.tender)
    await request(app).get(`/api/guest/bill/${f.a}?companyId=${companyId}`).set('x-guest-access', f.cap).expect(200)
  })
  it('ne calcule pas sur une lecture périmée pendant l’attente du verrou de commande', async () => {
    const f = await fixture(false)
    let locked!: () => void, change!: () => void
    const entered = new Promise<void>(r => { locked = r }), resume = new Promise<void>(r => { change = r })
    const writer = prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext(${'order-payment:' + f.order.id}))::text`
      locked(); await resume
      await tx.orderItem.update({ where: { id: f.order.items[0].id }, data: { quantity: 4 } })
      await tx.order.update({ where: { id: f.order.id }, data: { total: 13.5, subtotal: 13.11, taxAmount: .39 } })
    }, { timeout: 10000 })
    await entered
    const waiting = auth(request(app).post('/api/pos/financial-allocations/preview')).send(f.body).then((r: any) => r)
    try {
      let blocked = false
      for (let i = 0; i < 100; i++) {
        const rows: any = await prisma.$queryRaw`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = current_database() AND wait_event = 'advisory'`
        if (rows[0].count > 0) { blocked = true; break }
        await new Promise(r => setTimeout(r, 20))
      }
      expect(blocked).toBe(true)
    } finally { change() }
    await writer
    expect((await waiting).status).toBe(409)
    expect(await prisma.serviceAllocation.count({ where: { companyId, orderId: f.order.id } })).toBe(0)
  })
  it('la vente finale conserve les centimes de TVA historiques même si PostgreSQL retourne les lignes dans un autre ordre', async () => {
    const f = await fixture(false), lowId = f.order.id + '-a', highId = f.order.id + '-z'
    await prisma.order.update({ where: { id: f.order.id }, data: { total: .21, subtotal: .19, taxAmount: .02, items: { deleteMany: {}, create: [
      { id: highId, productId, productName: 'FICTIF taux 17', unitPrice: .11, quantity: 1, taxRate: 17 },
      { id: lowId, productId, productName: 'FICTIF taux 3', unitPrice: .11, quantity: 1, taxRate: 3 },
    ] } } })
    const body = { ...f.body, groups: [
      { ...f.body.groups[0], lines: [{ itemId: lowId, qty: 1 }] },
      { ...f.body.groups[1], lines: [{ itemId: highId, qty: 1 }] },
    ] }
    const p = await preview(body), done = (await confirm(body, p.confirmHash).expect(200)).body
    for (const g of done.groups) await auth(request(app).post('/api/pos/payments')).send({ requestId: randomUUID(), tableId: g.tableId, coverIds: ['guest:share:' + g.id], amountCents: g.outstandingCents, expectedOutstandingCents: g.outstandingCents, method: 'CARD' }).expect(200)
    const sale: any = (await prisma.posSale.findFirstOrThrow({ where: { companyId, origins: { some: { kind: 'ORDER', sourceId: f.order.id } } } })).snapshot
    expect(sale).toMatchObject({ total: .21, sousTotal: .19, tva: .02, remise: .01 })
    expect(sale.taxGroups.reduce((n: number, g: any) => n + g.taxCents, 0)).toBe(Math.round(sale.tva * 100))
    expect((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).taxAmount).toBe(.02)
  })
  it('un ancien miroir JSON fictif ne réintroduit pas la commande répartie dans l’addition du personnel', async () => {
    const f = await fixture(false), p = await preview(f.body)
    const done = (await confirm(f.body, p.confirmHash).expect(200)).body
    // Seule la lecture de l'ancienne pièce JSON est remplacée : aucun profil ou
    // fichier historique ouvert/écrit. Les groupes et montants viennent du vrai PG.
    const read = safeJson.safeReadJson
    const spy = vi.spyOn(safeJson, 'safeReadJson').mockImplementation((file, fallback) => file.endsWith('guest-orders.json') ? [{ id: f.order.publicToken, companyId, tableId: f.a, status: 'preparing', paid: false, total: 10, items: [], createdAt: Date.now(), updatedAt: Date.now() }] as any : read(file, fallback))
    try {
      const bill = (await auth(request(app).get(`/api/guest/bill/${f.a}?companyId=${companyId}`)).expect(200)).body
      const here = done.groups.filter((g: any) => g.tableId === f.a)
      expect(bill.total).toBe(here.reduce((n: number, g: any) => n + g.outstandingCents, 0) / 100)
      expect(bill.count).toBe(here.length)
      expect(bill.orderIds).not.toContain(f.order.publicToken)
    } finally { spy.mockRestore() }
  })
})
