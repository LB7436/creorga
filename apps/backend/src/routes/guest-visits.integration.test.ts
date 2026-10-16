import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { guestTokenHash } from '../lib/guest-visits'
const remote = vi.hoisted(() => ({ requests: [] as any[] }))
vi.mock('../lib/payments/gateway', () => ({
  SUPPORTED_PROVIDERS: ['paypal', 'stripe'],
  charge: async (input: any) => { remote.requests.push(input); return { ok: true, status: 'pending', provider: input.provider, transactionId: 'fixture-' + input.requestId, redirectUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=fixture' } },
  getGateway: () => ({
    verify: async () => ({ status: 'pending' }),
    capture: async (externalId: string) => {
      const input = remote.requests.find(r => 'fixture-' + r.requestId === externalId)!
      return { ok: true, status: 'succeeded', provider: 'paypal', transactionId: externalId, evidence: {
        amountCents: Math.round(input.amount * 100), currency: input.currency, merchantId: 'fixture-merchant', captureId: 'capture-' + input.requestId,
        orderId: input.orderId, attemptId: input.metadata.attemptId,
      } }
    },
  }),
}))
import guest from './guest'
import visits from './guestVisits'
const app = express(); app.use(express.json()); app.use('/api/guest', guest); app.use('/api/guest-visits', visits)
const companyId = 'visit-test-a', otherCompany = 'visit-test-b', userId = 'visit-test-owner'
let token: string, tableId: string, otherTable: string, productId: string
const staff = (builder: any) => builder.set('Authorization', 'Bearer ' + token).set('x-company-id', companyId)
async function cleanOrders() {
  const where = { companyId: { in: [companyId, otherCompany] } }
  await prisma.paymentAllocation.deleteMany({ where }); await prisma.paymentSettlement.deleteMany({ where }); await prisma.paymentAttempt.deleteMany({ where })
  await prisma.order.deleteMany({ where }); await prisma.guestVisitAccess.deleteMany({ where }); await prisma.guestVisit.deleteMany({ where })
}
async function cleanup() {
  await cleanOrders()
  const where = { companyId: { in: [companyId, otherCompany] } }
  await prisma.product.deleteMany({ where }); await prisma.category.deleteMany({ where }); await prisma.table.deleteMany({ where })
  await prisma.userCompany.deleteMany({ where }); await prisma.user.deleteMany({ where: { id: userId } })
  await prisma.company.deleteMany({ where: { id: { in: [companyId, otherCompany] } } })
}
async function openVisit() {
  const response = await staff(request(app).post('/api/guest-visits')).send({ tableId }).expect(201)
  const link = await staff(request(app).post(`/api/guest-visits/${response.body.id}/link`)).expect(200)
  return link.body as { visitId: string; tableId: string; token: string }
}
function order(access: string, requestId = randomUUID(), qty = 1) {
  return request(app).post('/api/guest/orders').set('x-guest-access', access).send({ companyId, tableId, requestId, items: [{ productId, qty, price: .01 }] })
}
const bill = (access: string, table = tableId, company = companyId) => request(app).get(`/api/guest/bill/${table}?companyId=${company}`).set('x-guest-access', access)
const close = (id: string, acknowledgeOutstanding = false) => staff(request(app).post(`/api/guest-visits/${id}/close`)).send({ reason: 'Groupe terminé — test fictif', acknowledgeOutstanding })

describe('Visites QR : accès révocable et paiements conservés', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || new URL(process.env.DATABASE_URL!).pathname !== '/creorga_tests') throw new Error('Base isolée obligatoire')
    await cleanup()
    await prisma.company.createMany({ data: [{ id: companyId, name: 'Visites fictives A' }, { id: otherCompany, name: 'Visites fictives B' }] })
    await prisma.user.create({ data: { id: userId, email: 'visits@localhost.invalid', password: 'not-used', firstName: 'Test', lastName: 'Owner' } })
    await prisma.userCompany.create({ data: { userId, companyId, role: 'OWNER' } })
    token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '10m' })
    tableId = (await prisma.table.create({ data: { companyId, name: 'Table verte' } })).id
    otherTable = (await prisma.table.create({ data: { companyId, name: 'Autre table' } })).id
    const category = await prisma.category.create({ data: { companyId, name: 'Boissons fictives' } })
    productId = (await prisma.product.create({ data: { companyId, categoryId: category.id, name: 'Café fictif', price: 11.7, taxRate: 17 } })).id
  })
  beforeEach(async () => {
    await cleanOrders(); remote.requests.length = 0
    await prisma.product.update({ where: { id: productId }, data: { price: 11.7, taxRate: 17 } })
    vi.stubEnv('PAYMENT_MERCHANT_COMPANY_ID', companyId); vi.stubEnv('PAYPAL_MERCHANT_ID', 'fixture-merchant')
    vi.stubEnv('PAYPAL_CLIENT_ID', 'fixture'); vi.stubEnv('PAYPAL_CLIENT_SECRET', 'fixture')
  })
  afterAll(async () => { await cleanup(); await prisma.$disconnect(); vi.unstubAllEnvs() })
  it('refuse commande, addition et paiement avec le seul ancien QR permanent', async () => {
    await order('').expect(401)
    await bill('').expect(401)
    await request(app).post('/api/guest/pay').send({ companyId, tableId, requestId: randomUUID(), provider: 'paypal' }).expect(401)
    expect(remote.requests).toHaveLength(0)
  })
  it('ne conserve que l’empreinte du secret, et refuse une autre table/société', async () => {
    const visit = await openVisit()
    const stored = await prisma.guestVisitAccess.findUniqueOrThrow({ where: { tokenHash: guestTokenHash(visit.token) } })
    expect(JSON.stringify(stored)).not.toContain(visit.token)
    await bill(visit.token, otherTable).expect(403)
    // A nonexistent table does not disclose another company's bill either.
    expect([403, 404]).toContain((await bill(visit.token, tableId, otherCompany)).status)
  })
  it('calcule TTC et TVA côté serveur et rejoue sans modifier la commande émise', async () => {
    const visit = await openVisit(), id = randomUUID()
    const created = await order(visit.token, id).expect(201)
    expect(created.body.total).toBe(11.7)
    const stored = await prisma.order.findUniqueOrThrow({ where: { publicToken: id }, include: { items: true } })
    expect(stored.taxAmount).toBe(1.7); expect(stored.items[0].unitPrice).toBe(11.7)
    await prisma.product.update({ where: { id: productId }, data: { price: 20, taxRate: 3 } })
    expect((await order(visit.token, id).expect(201)).body.total).toBe(11.7)
    await order(visit.token, id, 2).expect(409)
    expect(await prisma.order.count({ where: { companyId } })).toBe(1)
  })
  it('ferme les accès sans effacer une créance, puis isole la nouvelle visite', async () => {
    const first = await openVisit(), id = randomUUID()
    await order(first.token, id).expect(201)
    await close(first.visitId).expect(409)
    await close(first.visitId, true).expect(200)
    await bill(first.token).expect(403)
    const second = await openVisit()
    expect((await bill(second.token).expect(200)).body.total).toBe(0)
    await request(app).get(`/api/guest/orders/${id}?companyId=${companyId}`).set('x-guest-access', second.token).expect(404)
    await order(second.token, id).expect(409)
    expect((await staff(request(app).get(`/api/guest/bill/${tableId}?companyId=${companyId}`)).expect(200)).body.total).toBe(11.7)
    expect((await prisma.order.findUniqueOrThrow({ where: { publicToken: id } })).paidAt).toBeNull()
  })
  it('garde les anciennes commandes sans visite accessibles uniquement au personnel', async () => {
    await prisma.order.create({ data: { companyId, orderNumber: 100, total: 24, subtotal: 20, taxAmount: 4, source: 'GUEST', externalTableId: tableId, publicToken: randomUUID() } })
    const visit = await openVisit()
    expect((await bill(visit.token).expect(200)).body.count).toBe(0)
    expect((await staff(request(app).get(`/api/guest/bill/${tableId}?companyId=${companyId}`)).expect(200)).body.total).toBe(24)
  })
  it('ne crée qu’une visite ouverte lors de deux demandes concurrentes', async () => {
    const responses = await Promise.all([0, 1].map(() => staff(request(app).post('/api/guest-visits')).send({ tableId })))
    expect(responses.map(r => r.status).sort()).toEqual([201, 409])
  })
  it('révoque aussi les appels et le suivi après fermeture', async () => {
    const visit = await openVisit(), created = await order(visit.token).expect(201)
    await close(visit.visitId, true).expect(200)
    await request(app).post('/api/guest/call-waiter').set('x-guest-access', visit.token).send({ companyId, tableId, type: 'waiter' }).expect(403)
    await request(app).get(`/api/guest/orders/${created.body.id}?companyId=${companyId}`).set('x-guest-access', visit.token).expect(403)
    await order(visit.token).expect(403)
  })
  it('refuse un lien expiré et permet une nouvelle visite sans réutiliser l’ancien lien', async () => {
    const visit = await openVisit()
    const openedAt = new Date(Date.now() - 10 * 3600_000), expiresAt = new Date(Date.now() - 2 * 3600_000)
    await prisma.guestVisit.update({ where: { id: visit.visitId }, data: { openedAt, expiresAt } })
    await bill(visit.token).expect(403)
    await openVisit(); await bill(visit.token).expect(403)
  })
  it('conserve une tentative en cours et confirme son retour après fermeture de visite', async () => {
    const visit = await openVisit(), created = await order(visit.token).expect(201)
    const body = { companyId, tableId, provider: 'paypal', requestId: randomUUID() }
    const paid = await request(app).post('/api/guest/pay').set('x-guest-access', visit.token).send(body).expect(200)
    const cookie = paid.headers['set-cookie'][0]
    expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('SameSite=Lax')
    expect(JSON.stringify(remote.requests)).not.toContain(visit.token)
    await request(app).post('/api/guest/pay').set('x-guest-access', visit.token).send(body).expect(200)
    expect(remote.requests).toHaveLength(1)
    await close(visit.visitId).expect(409); await close(visit.visitId, true).expect(200)
    await request(app).post('/api/guest/paid-confirm').send({ companyId, tableId, attemptId: paid.body.attemptId }).expect(401)
    const result = await request(app).post('/api/guest/paid-confirm').set('Cookie', cookie.split(';')[0]).send({ companyId, tableId, attemptId: paid.body.attemptId }).expect(200)
    expect(result.body.confirmation).toBe('provider_verified')
    expect((await prisma.order.findUniqueOrThrow({ where: { publicToken: created.body.id } })).paidAt).not.toBeNull()
  })
  it('n’accorde pas les accès de service au rôle cuisine', async () => {
    await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'KITCHEN' } })
    try {
      await staff(request(app).get('/api/guest-visits')).expect(403)
      await staff(request(app).get(`/api/guest/bill/${tableId}?companyId=${companyId}`)).expect(403)
    } finally { await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'OWNER' } }) }
  })
})
