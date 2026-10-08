import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'

// Seul le prestataire bancaire est remplacé : autorisations, HTTP et base sont réels.
const remote = vi.hoisted(() => ({ requests: [] as any[] }))
vi.mock('../lib/payments/gateway', () => ({
  SUPPORTED_PROVIDERS: ['stripe', 'sumup', 'mypos', 'viva', 'worldline', 'servipay'],
  getGateway: () => ({ verify: async (id: string) => ({ ok: true, provider: 'stripe', transactionId: id, status: 'succeeded', raw: { secret: 'do-not-expose' } }) }),
  charge: async (body: any) => {
    remote.requests.push(body)
    return { ok: true, provider: body.provider, transactionId: 'provider-' + body.requestId, status: 'pending', requestedAmount: body.amount }
  },
}))
import payments from './payments'

const app = express(); app.use(express.json()); app.use('/api/payments', deviceOrUserAuth, payments)
const a = 'integration-payment-a', b = 'integration-payment-b', userId = 'integration-payment-owner'
let token: string, orderA: string, orderB: string
const auth = (builder: any) => builder.set('Authorization', 'Bearer ' + token).set('x-company-id', a)
const input = (orderId = orderA) => ({ provider: 'sumup', amount: 24, currency: 'EUR', orderId, requestId: randomUUID() })

describe('Paiement : cloisonnement et montant serveur', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || !new URL(process.env.DATABASE_URL!).pathname.endsWith('/creorga_tests')) throw new Error('Base de test isolée obligatoire')
    await prisma.company.createMany({ data: [{ id: a, name: 'Établissement fictif A' }, { id: b, name: 'Établissement fictif B' }] })
    await prisma.user.create({ data: { id: userId, email: 'payment-owner@localhost.invalid', password: 'unused', firstName: 'Test', lastName: 'Owner' } })
    await prisma.userCompany.create({ data: { userId, companyId: a, role: 'OWNER' } })
    token = jwt.sign({ userId, email: 'payment-owner@localhost.invalid' }, process.env.JWT_SECRET!, { expiresIn: '10m' })
  })
  beforeEach(async () => {
    remote.requests.length = 0
    for (const [companyId, setter] of [[a, (id: string) => { orderA = id }], [b, (id: string) => { orderB = id }]] as const) {
      const last = await prisma.order.aggregate({ where: { companyId }, _max: { orderNumber: true } })
      setter((await prisma.order.create({ data: { companyId, orderNumber: (last._max.orderNumber || 0) + 1, total: 24, subtotal: 20, taxAmount: 4 } })).id)
    }
  })
  afterAll(async () => {
    await prisma.paymentAttempt.deleteMany({ where: { companyId: { in: [a, b] } } })
    await prisma.order.deleteMany({ where: { companyId: { in: [a, b] } } })
    await prisma.userCompany.deleteMany({ where: { userId } })
    await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.company.deleteMany({ where: { id: { in: [a, b] } } })
    await prisma.$disconnect()
  })
  it('refuse une commande appartenant à une autre société', async () => {
    expect((await auth(request(app).post('/api/payments/charge')).send(input(orderB))).status).toBe(404)
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
})
