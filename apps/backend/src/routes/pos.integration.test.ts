import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import pos from './pos'
import { floorCompanyContext, remplacerPlanDeSalle } from './floorState'

const app = express(); app.use(express.json()); app.use('/api/pos', deviceOrUserAuth, requireCompany, floorCompanyContext, pos)
const companyId = 'integration-pos', userId = 'integration-pos-owner', tableId = 'integration-pos-table'
let token: string, productId: string, orderId: string
let databaseVerified = false
const auth = (req: any) => req.set('Authorization', 'Bearer ' + token).set('x-company-id', companyId)
const body = () => ({ requestId: randomUUID(), tableId, coverIds: [`guest:${orderId}`], expectedTotal: 11.7, tip: 0, method: 'cash', cashReceived: 20 })
function nativeBody() {
  const coverId = `native:${randomUUID()}`
  remplacerPlanDeSalle({ tables: [{ id: tableId, name: 'Table recette', seats: 2, section: 'Salle', shape: 'round', status: 'OCCUPEE', x: 0, y: 0, items: [],
    posCovers: [{ id: coverId, label: 'Couvert fictif', items: [{ id: randomUUID(), menuItemId: productId, name: 'Café TTC', price: 11.7, qty: 1, note: '', coverId }] }] } as any],
    chairs: [], photos: [], zones: [], updatedAt: Date.now() }, companyId)
  return { ...body(), coverIds: [coverId], cashReceived: 2 }
}
describe('Caisse native : verrou commun et centimes', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || !new URL(process.env.DATABASE_URL!).pathname.endsWith('/creorga_tests')) throw new Error('Base de tests obligatoire')
    databaseVerified = true
    await prisma.company.create({ data: { id: companyId, name: 'Caisse fictive de recette' } })
    await prisma.user.create({ data: { id: userId, email: 'pos-test@localhost.invalid', firstName: 'Test', lastName: 'Owner', password: 'unused' } })
    await prisma.userCompany.create({ data: { userId, companyId, role: 'OWNER' } })
    const category = await prisma.category.create({ data: { companyId, name: 'Café' } })
    productId = (await prisma.product.create({ data: { companyId, categoryId: category.id, name: 'Café TTC', price: 11.7, taxRate: 17, stock: 20 } })).id
    await prisma.table.create({ data: { id: tableId, companyId, name: 'Table recette', capacity: 2 } })
    token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '10m' })
  })
  beforeEach(async () => {
    const max = await prisma.order.aggregate({ where: { companyId }, _max: { orderNumber: true } })
    orderId = (await prisma.order.create({ data: { companyId, source: 'GUEST', externalTableId: tableId, publicToken: randomUUID(), orderNumber: (max._max.orderNumber || 0) + 1,
      total: 11.7, subtotal: 10, taxAmount: 1.7, items: { create: { productId, productName: 'Café TTC', quantity: 1, unitPrice: 11.7, taxRate: 17 } } } })).id
    remplacerPlanDeSalle({ tables: [], chairs: [], photos: [], zones: [], updatedAt: Date.now() }, companyId)
  })
  afterAll(async () => {
    if (!databaseVerified) return
    await prisma.posReceiptDelivery.deleteMany({ where: { companyId } }); await prisma.posCoverPayment.deleteMany({ where: { companyId } }); await prisma.posSale.deleteMany({ where: { companyId } })
    await prisma.paymentAttempt.deleteMany({ where: { companyId } }); await prisma.order.deleteMany({ where: { companyId } })
    await prisma.table.deleteMany({ where: { companyId } }); await prisma.product.deleteMany({ where: { companyId } }); await prisma.category.deleteMany({ where: { companyId } })
    await prisma.giftCard.deleteMany({ where: { companyId } })
    await prisma.userCompany.deleteMany({ where: { companyId } }); await prisma.user.deleteMany({ where: { id: userId } }); await prisma.company.deleteMany({ where: { id: companyId } })
    await prisma.$disconnect()
  })
  it('une capture PayPal en cours empêche le règlement à une autre caisse', async () => {
    await prisma.paymentAttempt.create({ data: { companyId, orderId, requestId: randomUUID(), requestHash: 'fixture', provider: 'paypal', merchantId: 'fixture', status: 'PENDING', amountCents: 1170, currency: 'EUR' } })
    expect((await auth(request(app).post('/api/pos/checkout')).send(body())).status).toBe(409)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).paidAt).toBeNull()
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(20)
  })
  it('refuse même un centime manquant dans le total confirmé', async () => {
    expect((await auth(request(app).post('/api/pos/checkout')).send({ ...body(), expectedTotal: 11.69 })).status).toBe(409)
  })
  it('refuse un centime manquant dans les paiements mixtes', async () => {
    expect((await auth(request(app).post('/api/pos/checkout')).send({ ...body(), options: { reglements: [{ methode: 'cash', montant: 5 }, { methode: 'card', montant: 6.69 }] } })).status).toBe(400)
  })
  it('ne réutilise pas une référence pour un autre contenu de règlement', async () => {
    const input = body()
    await auth(request(app).post('/api/pos/checkout')).send(input).expect(200)
    expect((await auth(request(app).post('/api/pos/checkout')).send({ ...input, expectedTotal: 1 })).status).toBe(409)
  })
  it('une carte prépayée règle dix euros sans diminuer la vente ni sa TVA et son rejeu ne redébite pas', async () => {
    const gift = await prisma.giftCard.create({ data: { companyId, code: randomUUID(), initialValue: 10, currentBalance: 10 } })
    const input = { ...nativeBody(), options: { giftCard: { code: gift.code, amount: 10 } } }
    const first = await auth(request(app).post('/api/pos/checkout')).send(input).expect(200)
    expect(first.body.total).toBe(11.7); expect(first.body.sousTotal).toBe(10); expect(first.body.tva).toBe(1.7)
    expect(first.body.remises).toEqual([])
    expect(first.body.reglements).toEqual(expect.arrayContaining([{ methode: 'cash', montant: 1.7 }, { methode: 'GIFT_CARD', montant: 10, giftCardId: gift.id }]))
    expect(first.body.cashChange).toBe(0.3)
    expect((await prisma.order.findFirstOrThrow({ where: { companyId, source: 'POS', id: { in: first.body.orderIds } } })).total).toBe(11.7)
    const repeated = await auth(request(app).post('/api/pos/checkout')).send(input).expect(200)
    expect(repeated.body.id).toBe(first.body.id)
    expect((await prisma.giftCard.findUniqueOrThrow({ where: { id: gift.id } })).currentBalance).toBe(0)
  })
  it('annule le débit de carte cadeau si le total confirmé est incorrect', async () => {
    const gift = await prisma.giftCard.create({ data: { companyId, code: randomUUID(), initialValue: 10, currentBalance: 10 } })
    await auth(request(app).post('/api/pos/checkout')).send({ ...nativeBody(), expectedTotal: 1.7, options: { giftCard: { code: gift.code, amount: 10 } } }).expect(409)
    expect((await prisma.giftCard.findUniqueOrThrow({ where: { id: gift.id } })).currentBalance).toBe(10)
  })
  it('refuse le format historique qui déduisait une carte cadeau de la TVA', async () => {
    await auth(request(app).post('/api/pos/checkout')).send({ ...nativeBody(), expectedTotal: 1.7, options: { remises: [{ type: 'carte_cadeau', code: 'test', libelle: 'Ancien format', montant: 10 }] } }).expect(400)
  })
  it('fige les coordonnées et la ventilation fiscale utilisées par le reçu', async () => {
    await prisma.company.update({ where: { id: companyId }, data: { name: 'Émetteur original', address: 'Adresse originale de recette', vatNumber: 'TVA-FICTIVE' } })
    const result = await auth(request(app).post('/api/pos/checkout')).send({ ...nativeBody(), cashReceived: 12 }).expect(200)
    expect(result.body.taxGroups).toEqual([{ taxRate: 17, baseCents: 1000, taxCents: 170, totalCents: 1170 }])
    expect(result.body.lignes[0].taxRate).toBe(17)
    const before = await auth(request(app).get(`/api/pos/sales/${result.body.id}/receipt`)).expect(200)
    await prisma.company.update({ where: { id: companyId }, data: { name: 'Nom changé après vente', address: 'Autre adresse de recette', vatNumber: 'TVA-CHANGEE' } })
    const after = await auth(request(app).get(`/api/pos/sales/${result.body.id}/receipt`)).expect(200)
    expect(after.text).toBe(before.text); expect(after.text).toContain('Émetteur original'); expect(after.text).toContain('17 %')
  })
})
