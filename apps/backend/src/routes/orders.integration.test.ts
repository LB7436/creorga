import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import orders from './orders'

const app = express(); app.use(express.json()); app.use('/api/orders', deviceOrUserAuth, orders)
const companyId = 'integration-orders', userId = 'integration-orders-owner'
let token: string, productId: string, orderId: string, itemId: string
const auth = (method: any) => method.set('Authorization', 'Bearer ' + token).set('x-company-id', companyId)
describe('Commande : conservation et encaissement atomique', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || !new URL(process.env.DATABASE_URL!).pathname.endsWith('/creorga_tests')) throw new Error('Base de tests obligatoire')
    await prisma.company.create({ data: { id: companyId, name: 'Café fictif de recette' } })
    await prisma.user.create({ data: { id: userId, email: 'orders-test@localhost.invalid', firstName: 'Test', lastName: 'Owner', password: 'unused' } })
    await prisma.userCompany.create({ data: { userId, companyId, role: 'OWNER' } })
    const category = await prisma.category.create({ data: { companyId, name: 'Café' } })
    productId = (await prisma.product.create({ data: { companyId, categoryId: category.id, name: 'Café TTC', price: 11.7, taxRate: 17 } })).id
    token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '10m' })
  })
  beforeEach(async () => {
    const max = await prisma.order.aggregate({ where: { companyId }, _max: { orderNumber: true } })
    const order = await prisma.order.create({ data: { companyId, userId, orderNumber: (max._max.orderNumber || 0) + 1, total: 11.7, subtotal: 10, taxAmount: 1.7,
      items: { create: { productId, productName: 'Café TTC', quantity: 1, unitPrice: 11.7, taxRate: 17 } } }, include: { items: true } })
    orderId = order.id; itemId = order.items[0].id
  })
  afterAll(async () => {
    await prisma.paymentAttempt.deleteMany({ where: { companyId } })
    await prisma.order.deleteMany({ where: { companyId } })
    await prisma.product.deleteMany({ where: { companyId } }); await prisma.category.deleteMany({ where: { companyId } })
    await prisma.userCompany.deleteMany({ where: { companyId } }); await prisma.user.deleteMany({ where: { id: userId } }); await prisma.company.deleteMany({ where: { id: companyId } })
    await prisma.$disconnect()
  })
  it('un seul encaissement gagne parmi vingt demandes simultanées', async () => {
    const responses = await Promise.all(Array.from({ length: 20 }, () => auth(request(app).post(`/api/orders/${orderId}/checkout`)).send({ paymentMethod: 'CASH', cashReceived: 20 })))
    expect(responses.filter(r => r.status === 200)).toHaveLength(1)
    expect(responses.filter(r => r.status === 409)).toHaveLength(19)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).cashChange).toBe(8.3)
  })
  it('une tentative incertaine empêche un second encaissement manuel', async () => {
    await prisma.paymentAttempt.create({ data: { companyId, orderId, userId, requestId: randomUUID(), requestHash: 'test', provider: 'paypal', merchantId: 'test-only', amountCents: 1170, currency: 'EUR', status: 'UNKNOWN' } })
    expect((await auth(request(app).post(`/api/orders/${orderId}/checkout`)).send({ paymentMethod: 'CASH', cashReceived: 20 })).status).toBe(409)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).paidAt).toBeNull()
  })
  it('un article payé ne change plus de quantité', async () => {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'PAID', paidAt: new Date() } })
    expect((await auth(request(app).put(`/api/orders/${orderId}/items/${itemId}`)).send({ quantity: 2 })).status).toBe(409)
    expect((await prisma.orderItem.findUniqueOrThrow({ where: { id: itemId } })).quantity).toBe(1)
  })
  it('une demande ne remplace ni le prix ni le taux historique d’une ligne', async () => {
    expect((await auth(request(app).put(`/api/orders/${orderId}/items/${itemId}`)).send({ unitPrice: 0.01, taxRate: 0 })).status).toBe(400)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).total).toBe(11.7)
  })
  it('un ajout conserve la logique TTC du catalogue', async () => {
    await auth(request(app).post(`/api/orders/${orderId}/items`)).send({ productId, quantity: 1 }).expect(201)
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
    expect({ total: order.total, ht: order.subtotal, tva: order.taxAmount }).toEqual({ total: 23.4, ht: 20, tva: 3.4 })
  })
  it('ne supprime pas une ligne quand une capture est en cours', async () => {
    await prisma.paymentAttempt.create({ data: { companyId, orderId, userId, requestId: randomUUID(), requestHash: 'test', provider: 'paypal', merchantId: 'test-only', amountCents: 1170, currency: 'EUR', status: 'PENDING' } })
    expect((await auth(request(app).delete(`/api/orders/${orderId}/items/${itemId}`))).status).toBe(409)
    expect(await prisma.orderItem.count({ where: { id: itemId } })).toBe(1)
  })
  it('un acompte espèces puis un solde carte ne déclarent payé que le total réellement enregistré', async () => {
    const part = { requestId: randomUUID(), paymentMethod: 'CASH', partialAmountCents: 500, cashReceived: 10 }
    const first = await auth(request(app).post(`/api/orders/${orderId}/checkout`)).send(part).expect(200)
    expect(first.body.paidAt).toBeNull(); expect(first.body.outstandingCents).toBe(670)
    await auth(request(app).post(`/api/orders/${orderId}/checkout`)).send(part).expect(200)
    const balance = await auth(request(app).get(`/api/orders/${orderId}/payment-balance`)).expect(200)
    expect(balance.body.paidCents).toBe(500); expect(balance.body.payments).toHaveLength(1)
    await auth(request(app).put(`/api/orders/${orderId}/items/${itemId}`)).send({ quantity: 2 }).expect(409)
    const last = await auth(request(app).post(`/api/orders/${orderId}/checkout`)).send({ requestId: randomUUID(), paymentMethod: 'CARD' }).expect(200)
    expect(last.body.status).toBe('PAID'); expect(last.body.outstandingCents).toBe(0)
    const done = await auth(request(app).get(`/api/orders/${orderId}/payment-balance`)).expect(200)
    expect(done.body.payments.map((p: any) => p.amountCents).sort()).toEqual([500, 670])
    expect(done.body.payments.every((p: any) => p.confirmation === 'manual_declaration')).toBe(true)
  })
  it('un paiement mixte partiel conserve espèces et carte sans payer le reste', async () => {
    const first = await auth(request(app).post(`/api/orders/${orderId}/checkout`)).send({ requestId: randomUUID(), paymentMethod: 'MIXED', partialAmountCents: 500,
      allocations: [{ method: 'CASH', amount: 2 }, { method: 'CARD', amount: 3 }], cashReceived: 5 }).expect(200)
    expect(first.body.outstandingCents).toBe(670)
    await auth(request(app).post(`/api/orders/${orderId}/checkout`)).send({ requestId: randomUUID(), paymentMethod: 'CASH', partialAmountCents: 671 }).expect(409)
    const balance = await auth(request(app).get(`/api/orders/${orderId}/payment-balance`)).expect(200)
    expect(balance.body.paidCents).toBe(500); expect(balance.body.payments).toHaveLength(2)
  })
  it('vingt acomptes concurrents ne dépassent pas le solde de la même commande', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => auth(request(app).post(`/api/orders/${orderId}/checkout`)).send({ requestId: randomUUID(), paymentMethod: 'CASH', partialAmountCents: 500, cashReceived: 5 })))
    expect(results.filter(r => r.status === 200)).toHaveLength(2); expect(results.filter(r => r.status === 409)).toHaveLength(18)
    const balance = await auth(request(app).get(`/api/orders/${orderId}/payment-balance`)).expect(200)
    expect(balance.body.paidCents).toBe(1000); expect(balance.body.outstandingCents).toBe(170)
  }, 60000)
})
