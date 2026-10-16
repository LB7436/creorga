import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import Stripe from 'stripe'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'

// Seul le prestataire bancaire est remplacé : autorisations, HTTP et base sont réels.
const remote = vi.hoisted(() => ({ requests: [] as any[], evidence: undefined as any, failCreation: false, ok: true, provider: 'paypal', externalId: undefined as string | undefined, status: 'succeeded' }))
vi.mock('../lib/payments/gateway', () => ({
  SUPPORTED_PROVIDERS: ['paypal', 'stripe', 'sumup', 'mypos', 'viva', 'worldline', 'servipay'],
  getGateway: () => ({ verify: async (id: string) => ({ ok: remote.ok, provider: remote.provider, transactionId: remote.externalId || id, status: remote.status, evidence: remote.evidence, raw: { secret: 'do-not-expose' } }),
    capture: async (id: string) => ({ ok: remote.ok, provider: 'paypal', transactionId: id, status: remote.status, evidence: remote.evidence }) }),
  charge: async (body: any) => {
    remote.requests.push(body)
    if (remote.failCreation) throw new Error('timeout-after-provider-acceptance')
    return { ok: true, provider: body.provider, transactionId: 'provider-' + body.requestId, status: 'pending', requestedAmount: body.amount }
  },
}))
import payments, { paypalWebhook, stripePaymentWebhook } from './payments'
import guest from './guest'
import orders from './orders'

vi.mock('../lib/payments/paypal', () => ({ PayPalClient: class { async verifyWebhook(headers: any) { return headers['paypal-transmission-sig'] === 'fixture-verified' } } }))
const app = express()
app.post('/api/payments/webhooks/stripe', express.raw({ type: 'application/json' }), stripePaymentWebhook)
app.use(express.json())
app.post('/api/payments/webhooks/paypal', (req, res, next) => typeof paypalWebhook === 'function' ? paypalWebhook(req, res) : res.sendStatus(501))
app.use('/api/payments', deviceOrUserAuth, payments)
app.use('/api/guest', guest)
app.use('/api/orders', deviceOrUserAuth, orders)
const a = 'integration-payment-a', b = 'integration-payment-b', userId = 'integration-payment-owner'
let token: string, orderA: string, orderB: string
const auth = (builder: any) => builder.set('Authorization', 'Bearer ' + token).set('x-company-id', a)
const input = (orderId = orderA) => ({ provider: 'sumup', amount: 24, currency: 'EUR', orderId, requestId: randomUUID() })
async function cleanup() {
  const where = { companyId: { in: [a, b] } }
  await prisma.paymentWebhook.deleteMany({ where })
  await prisma.paymentAllocation.deleteMany({ where })
  await prisma.paymentSettlement.deleteMany({ where })
  await prisma.paymentAttempt.deleteMany({ where })
  await prisma.order.deleteMany({ where })
  await prisma.table.deleteMany({ where })
  await prisma.userCompany.deleteMany({ where: { userId } })
  await prisma.user.deleteMany({ where: { id: userId } })
  await prisma.company.deleteMany({ where: { id: { in: [a, b] } } })
}

describe('Paiement : cloisonnement et montant serveur', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || !new URL(process.env.DATABASE_URL!).pathname.endsWith('/creorga_tests')) throw new Error('Base de test isolée obligatoire')
    await cleanup()
    await prisma.company.createMany({ data: [{ id: a, name: 'Établissement fictif A' }, { id: b, name: 'Établissement fictif B' }] })
    await prisma.user.create({ data: { id: userId, email: 'payment-owner@localhost.invalid', password: 'unused', firstName: 'Test', lastName: 'Owner' } })
    await prisma.userCompany.create({ data: { userId, companyId: a, role: 'OWNER' } })
    token = jwt.sign({ userId, email: 'payment-owner@localhost.invalid' }, process.env.JWT_SECRET!, { expiresIn: '10m' })
  })
  beforeEach(async () => {
    vi.stubEnv('PAYMENT_MERCHANT_COMPANY_ID', a); vi.stubEnv('PAYPAL_MERCHANT_ID', 'merchant-test')
    vi.stubEnv('PAYPAL_CLIENT_ID', 'fixture-only'); vi.stubEnv('PAYPAL_CLIENT_SECRET', 'fixture-only')
    vi.stubEnv('STRIPE_PAYMENT_KEY', 'fixture-only'); vi.stubEnv('STRIPE_PAYMENT_WEBHOOK_SECRET', 'fixture-signing-secret'); vi.stubEnv('STRIPE_MERCHANT_ID', 'stripe-merchant-test')
    remote.evidence = undefined; remote.failCreation = false
    remote.ok = true; remote.provider = 'paypal'; remote.externalId = undefined; remote.status = 'succeeded'
    remote.requests.length = 0
    for (const [companyId, setter] of [[a, (id: string) => { orderA = id }], [b, (id: string) => { orderB = id }]] as const) {
      const last = await prisma.order.aggregate({ where: { companyId }, _max: { orderNumber: true } })
      setter((await prisma.order.create({ data: { companyId, orderNumber: (last._max.orderNumber || 0) + 1, total: 24, subtotal: 20, taxAmount: 4 } })).id)
    }
  })
  afterAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE === 'creorga_tests') await cleanup()
    await prisma.$disconnect()
    vi.unstubAllEnvs()
  })
  it('refuse une commande appartenant à une autre société', async () => {
    expect((await auth(request(app).post('/api/payments/charge')).send(input(orderB))).status).toBe(404)
  })
  it('refuse les opérations financières au rôle cuisine avant tout appel bancaire', async () => {
    const created = await auth(request(app).post('/api/payments/charge')).send(input())
    expect(created.status).toBe(200)
    await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId: a } }, data: { role: 'KITCHEN' } })
    remote.requests.length = 0
    try {
      expect((await auth(request(app).post('/api/payments/charge')).send(input())).status).toBe(403)
      expect((await auth(request(app).post(`/api/payments/attempts/${created.body.attemptId}/capture`))).status).toBe(403)
      expect((await auth(request(app).post(`/api/payments/attempts/${created.body.attemptId}/reconcile`))).status).toBe(403)
      expect((await auth(request(app).get(`/api/payments/attempts/${created.body.attemptId}`))).status).toBe(403)
      expect(remote.requests).toHaveLength(0)
      expect((await prisma.order.findUniqueOrThrow({ where: { id: orderA } })).paidAt).toBeNull()
    } finally {
      await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId: a } }, data: { role: 'OWNER' } })
    }
  })
  it('refuse un prix navigateur différent du solde serveur', async () => {
    const result = await auth(request(app).post('/api/payments/charge')).send({ ...input(), amount: 1 })
    expect(result.status).toBe(409)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderA } })).paidAt).toBeNull()
  })
  it('refuse la devise différente de la société', async () => {
    expect((await auth(request(app).post('/api/payments/charge')).send({ ...input(), currency: 'USD' })).status).toBe(400)
  })
  it('refuse un retour navigateur vers un domaine arbitraire', async () => {
    expect((await auth(request(app).post('/api/payments/charge')).send({ ...input(), returnUrl: 'https://attacker.invalid/paid' })).status).toBe(400)
  })
  it('ne relance pas une commande déjà payée', async () => {
    await prisma.order.update({ where: { id: orderA }, data: { status: 'PAID', paidAt: new Date() } })
    expect((await auth(request(app).post('/api/payments/charge')).send(input())).status).toBe(409)
  })
  it('exige une référence stable pour éviter un nouveau débit lors d’un rejeu', async () => {
    const { requestId, ...body } = input()
    expect((await auth(request(app).post('/api/payments/charge')).send(body)).status).toBe(400)
  })
  it('ne vérifie pas une transaction arbitraire sans tentative autorisée', async () => {
    expect((await auth(request(app).get('/api/payments/verify/stripe/other-transaction'))).status).toBe(404)
  })
  it('rejoue une demande sans créer deux demandes bancaires', async () => {
    const body = input()
    const responses = await Promise.all(Array.from({ length: 6 }, () => auth(request(app).post('/api/payments/charge')).send(body)))
    expect(responses.every(r => [200, 202].includes(r.status))).toBe(true)
    expect(new Set(responses.map(r => r.body.attemptId)).size).toBe(1)
    expect(remote.requests).toHaveLength(1)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderA } })).paidAt).toBeNull()
  })
  it('réserve le solde contre deux références concurrentes', async () => {
    const responses = await Promise.all([input(), input()].map(body => auth(request(app).post('/api/payments/charge')).send(body)))
    expect(responses.map(r => r.status).sort()).toEqual([200, 409])
    expect(remote.requests).toHaveLength(1)
  })
  it('refuse un appel anonyme même avec un identifiant de société', async () => {
    expect((await request(app).post('/api/payments/charge').set('x-company-id', a).send(input())).status).toBe(401)
  })
  it('une capture sans montant ou marchand vérifié ne marque jamais payé', async () => {
    const created = await auth(request(app).post('/api/payments/charge')).send({ ...input(), provider: 'paypal' })
    expect(created.status).toBe(200)
    expect((await auth(request(app).post(`/api/payments/attempts/${created.body.attemptId}/capture`))).status).toBe(409)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderA } })).paidAt).toBeNull()
  })
  it('un rapprochement payé crée une seule écriture même rejoué', async () => {
    const created = await auth(request(app).post('/api/payments/charge')).send({ ...input(), provider: 'paypal' })
    remote.evidence = { amountCents: 2400, currency: 'EUR', merchantId: 'merchant-test', orderId: orderA, attemptId: created.body.attemptId, captureId: randomUUID() }
    const first = await auth(request(app).post(`/api/payments/attempts/${created.body.attemptId}/reconcile`))
    expect(first.status).toBe(200); expect(first.body.status).toBe('succeeded'); expect(first.body.confirmation).toBe('provider_verified')
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderA } })).paidAt).not.toBeNull()
    await auth(request(app).post(`/api/payments/attempts/${created.body.attemptId}/reconcile`)).expect(200)
    expect(await (prisma as any).paymentSettlement.count({ where: { companyId: a, orderId: orderA } })).toBe(1)
    expect(first.body.raw).toBeUndefined()
  })
  it.each([{ amountCents: 1 }, { currency: 'USD' }, { merchantId: 'other-merchant' }, { orderId: 'other-order' }])('rejette une preuve incohérente %j', async mismatch => {
    const created = await auth(request(app).post('/api/payments/charge')).send({ ...input(), provider: 'paypal' })
    remote.evidence = { amountCents: 2400, currency: 'EUR', merchantId: 'merchant-test', orderId: orderA, attemptId: created.body.attemptId, captureId: randomUUID(), ...mismatch }
    expect((await auth(request(app).post(`/api/payments/attempts/${created.body.attemptId}/reconcile`))).status).toBe(409)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderA } })).paidAt).toBeNull()
  })
  it('après timeout une nouvelle référence ne déclenche pas un autre débit', async () => {
    remote.failCreation = true
    const body = { ...input(), provider: 'paypal' }
    const created = await auth(request(app).post('/api/payments/charge')).send(body)
    expect(created.status).toBe(202); expect(created.body.status).toBe('unknown')
    await auth(request(app).post('/api/payments/charge')).send({ ...body, requestId: randomUUID() }).expect(409)
    expect(remote.requests).toHaveLength(1)
  })
  it.each(['error', 'other-provider', 'other-transaction'])('refuse une réponse bancaire contradictoire : %s', async kind => {
    const created = await auth(request(app).post('/api/payments/charge')).send({ ...input(), provider: 'paypal' })
    remote.evidence = { amountCents: 2400, currency: 'EUR', merchantId: 'merchant-test', orderId: orderA, attemptId: created.body.attemptId, captureId: randomUUID() }
    if (kind === 'error') remote.ok = false
    if (kind === 'other-provider') remote.provider = 'stripe'
    if (kind === 'other-transaction') remote.externalId = 'other-transaction'
    expect((await auth(request(app).post(`/api/payments/attempts/${created.body.attemptId}/reconcile`))).status).toBe(409)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderA } })).paidAt).toBeNull()
  })
  it('rejette un webhook non vérifié sans marquer payé', async () => {
    expect((await request(app).post('/api/payments/webhooks/paypal').send({ id: 'forged-event', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {} })).status).toBe(401)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderA } })).paidAt).toBeNull()
  })
  it('deux notifications vérifiées du même événement produisent une seule affectation', async () => {
    const created = await auth(request(app).post('/api/payments/charge')).send({ ...input(), provider: 'paypal' })
    remote.evidence = { amountCents: 2400, currency: 'EUR', merchantId: 'merchant-test', orderId: orderA, attemptId: created.body.attemptId, captureId: randomUUID() }
    const event = { id: randomUUID(), event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { supplementary_data: { related_ids: { order_id: created.body.transactionId } } } }
    await request(app).post('/api/payments/webhooks/paypal').set('paypal-transmission-sig', 'fixture-verified').send(event).expect(200)
    await request(app).post('/api/payments/webhooks/paypal').set('paypal-transmission-sig', 'fixture-verified').send(event).expect(200)
    expect(await prisma.paymentSettlement.count({ where: { companyId: a, orderId: orderA } })).toBe(1)
    expect(await prisma.paymentWebhook.count({ where: { companyId: a, eventId: event.id, status: 'PROCESSED' } })).toBe(1)
  })
  it('réserve et rapproche plusieurs tournées QR sans nouveau débit sur rejeu', async () => {
    const table = await prisma.table.create({ data: { companyId: a, name: 'Table recette multi-tournées', capacity: 2 } })
    await prisma.order.update({ where: { id: orderA }, data: { source: 'GUEST', externalTableId: table.id } })
    const next = await prisma.order.aggregate({ where: { companyId: a }, _max: { orderNumber: true } })
    const second = await prisma.order.create({ data: { companyId: a, source: 'GUEST', externalTableId: table.id, orderNumber: (next._max.orderNumber || 0) + 1, total: 12, subtotal: 10, taxAmount: 2 } })
    const input = { companyId: a, tableId: table.id, provider: 'paypal', requestId: randomUUID(), total: 1 }
    const created = await auth(request(app).post('/api/guest/pay')).send(input)
    expect(created.status).toBe(200); expect(created.body.amount).toBe(36)
    await auth(request(app).post('/api/guest/pay')).send(input).expect(200)
    expect(remote.requests).toHaveLength(1)
    await auth(request(app).post(`/api/orders/${second.id}/checkout`)).send({ paymentMethod: 'CASH', cashReceived: 20 }).expect(409)
    const primary = await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: created.body.attemptId } })
    remote.evidence = { amountCents: 3600, currency: 'EUR', merchantId: 'merchant-test', orderId: primary.orderId, attemptId: primary.id, captureId: randomUUID() }
    const event = { id: randomUUID(), event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { supplementary_data: { related_ids: { order_id: created.body.transactionId } } } }
    await request(app).post('/api/payments/webhooks/paypal').set('paypal-transmission-sig', 'fixture-verified').send(event).expect(200)
    expect(await prisma.order.count({ where: { id: { in: [orderA, second.id] }, status: 'PAID' } })).toBe(2)
    expect(await prisma.paymentSettlement.count({ where: { attemptId: primary.id } })).toBe(1)
    await prisma.table.delete({ where: { id: table.id } })
  })
  it('vérifie la signature Stripe sur le corps brut et déduplique l’événement', async () => {
    const created = await auth(request(app).post('/api/payments/charge')).send({ ...input(), provider: 'stripe' })
    expect(created.status).toBe(200)
    remote.provider = 'stripe'
    remote.evidence = { amountCents: 2400, currency: 'EUR', merchantId: 'stripe-merchant-test', orderId: orderA, attemptId: created.body.attemptId, captureId: randomUUID() }
    const payload = JSON.stringify({ id: randomUUID(), object: 'event', type: 'checkout.session.completed', data: { object: { id: created.body.transactionId } } })
    await request(app).post('/api/payments/webhooks/stripe').set('Content-Type', 'application/json').set('stripe-signature', 'forged').send(payload).expect(401)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderA } })).paidAt).toBeNull()
    const client = new Stripe('fixture-only')
    const signature = client.webhooks.generateTestHeaderString({ payload, secret: 'fixture-signing-secret' })
    for (let i = 0; i < 2; i++) await request(app).post('/api/payments/webhooks/stripe').set('Content-Type', 'application/json').set('stripe-signature', signature).send(payload).expect(200)
    expect(await prisma.paymentSettlement.count({ where: { attemptId: created.body.attemptId } })).toBe(1)
  })
  it('une capture partielle vérifiée puis le solde espèces ne créent pas deux ventes', async () => {
    const created = await auth(request(app).post('/api/payments/charge')).send({ ...input(), provider: 'paypal', amount: undefined, partialAmountCents: 500 }).expect(200)
    expect(created.body.amount).toBe(5)
    remote.evidence = { amountCents: 500, currency: 'EUR', merchantId: 'merchant-test', orderId: orderA, attemptId: created.body.attemptId, captureId: randomUUID() }
    await auth(request(app).post(`/api/payments/attempts/${created.body.attemptId}/reconcile`)).expect(200)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderA } })).paidAt).toBeNull()
    const balance = await auth(request(app).get(`/api/orders/${orderA}/payment-balance`)).expect(200)
    expect(balance.body.paidCents).toBe(500); expect(balance.body.outstandingCents).toBe(1900)
    expect(balance.body.payments[0].confirmation).toBe('provider_verified')
    const table = await prisma.table.create({ data: { companyId: a, name: 'Solde partiel QR fictif', capacity: 2 } })
    await prisma.order.update({ where: { id: orderA }, data: { source: 'GUEST', externalTableId: table.id, publicToken: randomUUID() } })
    const bill = await auth(request(app).get(`/api/guest/bill/${table.id}?companyId=${a}`)).expect(200)
    expect(bill.body.total).toBe(19)
    await auth(request(app).post(`/api/orders/${orderA}/checkout`)).send({ requestId: randomUUID(), paymentMethod: 'CASH', cashReceived: 20 }).expect(200)
    const done = await auth(request(app).get(`/api/orders/${orderA}/payment-balance`)).expect(200)
    expect(done.body.outstandingCents).toBe(0); expect(done.body.paidCents).toBe(2400)
    expect(await prisma.order.count({ where: { id: orderA, companyId: a, status: 'PAID' } })).toBe(1)
  })
  it('un refus bancaire simulé est visible à rapprocher sans fausse capture ni libération de réserve', async () => {
    const created = (await auth(request(app).post('/api/payments/charge')).send({ ...input(), provider: 'paypal' }).expect(200)).body
    remote.ok = false; remote.status = 'failed'
    const result = (await auth(request(app).post(`/api/payments/attempts/${created.attemptId}/reconcile`)).expect(200)).body
    expect(result).toMatchObject({ status: 'review', confirmation: 'provider_not_confirmed' })
    expect(result.message).toMatch(/refus.*rapproch/i)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderA } })).paidAt).toBeNull()
    expect(await prisma.paymentSettlement.count({ where: { attemptId: created.attemptId } })).toBe(0)
    expect(await prisma.paymentAllocation.count({ where: { attemptId: created.attemptId, active: true } })).toBe(1)
    await auth(request(app).post('/api/payments/charge')).send({ ...input(), provider: 'paypal' }).expect(409)
  })
  it('un abandon acheteur puis son retour tardif ne vaut jamais annulation bancaire ou paiement', async () => {
    const table = await prisma.table.create({ data: { companyId: a, name: 'Abandon fictif', capacity: 2 } })
    await prisma.order.update({ where: { id: orderA }, data: { source: 'GUEST', externalTableId: table.id, publicToken: randomUUID() } })
    const created = (await auth(request(app).post('/api/guest/pay')).send({ companyId: a, tableId: table.id, provider: 'paypal', requestId: randomUUID() }).expect(200)).body
    remote.ok = false; remote.status = 'pending' // Acheteur ferme la fenêtre ; aucune preuve de remboursement/capture.
    for (let i = 0; i < 2; i++) await auth(request(app).post('/api/guest/paid-confirm')).send({ companyId: a, tableId: table.id, attemptId: created.attemptId }).expect(202)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderA } })).paidAt).toBeNull()
    expect(await prisma.paymentAllocation.count({ where: { attemptId: created.attemptId, active: true } })).toBe(1)
    expect(await prisma.paymentSettlement.count({ where: { attemptId: created.attemptId } })).toBe(0)
    expect(remote.requests).toHaveLength(1)
  })
  it('un webhook vérifié avant le retour puis deux retours navigateur ne créent qu’un seul règlement', async () => {
    const table = await prisma.table.create({ data: { companyId: a, name: 'Retour tardif fictif', capacity: 2 } })
    await prisma.order.update({ where: { id: orderA }, data: { source: 'GUEST', externalTableId: table.id, publicToken: randomUUID() } })
    const created = (await auth(request(app).post('/api/guest/pay')).send({ companyId: a, tableId: table.id, provider: 'paypal', requestId: randomUUID() }).expect(200)).body
    remote.evidence = { amountCents: 2400, currency: 'EUR', merchantId: 'merchant-test', orderId: orderA, attemptId: created.attemptId, captureId: randomUUID() }
    const event = { id: randomUUID(), event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { supplementary_data: { related_ids: { order_id: created.transactionId } } } }
    await request(app).post('/api/payments/webhooks/paypal').set('paypal-transmission-sig', 'fixture-verified').send(event).expect(200)
    for (let i = 0; i < 2; i++) expect((await auth(request(app).post('/api/guest/paid-confirm')).send({ companyId: a, tableId: table.id, attemptId: created.attemptId }).expect(200)).body.ok).toBe(true)
    expect(await prisma.paymentSettlement.count({ where: { attemptId: created.attemptId } })).toBe(1)
    expect(await prisma.orderTender.count({ where: { attemptId: created.attemptId } })).toBe(1)
    expect(await prisma.paymentAllocation.count({ where: { attemptId: created.attemptId, active: true } })).toBe(0)
    expect(remote.requests).toHaveLength(1)
  })
})
