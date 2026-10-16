import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import pos from './pos'
import floorRouter, { floorCompanyContext, remplacerPlanDeSalle, getFloorState } from './floorState'
import { canonicalizeFloorPricing } from '../lib/pos-pricing'

const app = express(); app.use(express.json()); app.use('/api/pos', deviceOrUserAuth, requireCompany, floorCompanyContext, pos)
app.use('/api/floor-state', deviceOrUserAuth, requireCompany, floorCompanyContext, floorRouter)
const companyId = 'integration-pos', userId = 'integration-pos-owner', tableId = 'integration-pos-table'
let token: string, productId: string, orderId: string
let databaseVerified = false
const auth = (req: any) => req.set('Authorization', 'Bearer ' + token).set('x-company-id', companyId)
const body = () => ({ requestId: randomUUID(), tableId, coverIds: [`guest:${orderId}`], expectedTotal: 11.7, tip: 0, method: 'cash', cashReceived: 20 })
function nativeBody(legacy = false) {
  const coverId = `native:${randomUUID()}`
  const floor = { tables: [{ id: tableId, name: 'Table recette', seats: 2, section: 'Salle', shape: 'round', status: 'OCCUPEE', x: 0, y: 0, items: [],
    posCovers: [{ id: coverId, label: 'Couvert fictif', items: [{ id: randomUUID(), menuItemId: productId, name: 'Café TTC', price: 11.7, qty: 1, note: '', coverId }] }] } as any],
    chairs: [], photos: [], zones: [], updatedAt: Date.now() }
  if (!legacy) canonicalizeFloorPricing({ tables: [], chairs: [] }, floor, [{ id: productId, name: 'Café TTC', price: 11.7, taxRate: 17, isActive: true }])
  remplacerPlanDeSalle(floor, companyId)
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
    await prisma.product.update({ where: { id: productId }, data: { price: 11.7, taxRate: 17, isActive: true } })
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
  it('ventile cadeau, espèces, pourboire et don sans gonfler la vente ni sa TVA', async () => {
    const gift = await prisma.giftCard.create({ data: { companyId, code: randomUUID(), initialValue: 10, currentBalance: 10 } })
    const result = await auth(request(app).post('/api/pos/checkout')).send({ ...nativeBody(), cashReceived: 5, expectedTotal: 13.8, tip: 2,
      options: { giftCard: { code: gift.code, amount: 10 }, arrondiCaritatif: .1 } }).expect(200)
    const tenders = await prisma.orderTender.findMany({ where: { companyId, saleId: result.body.id }, orderBy: { method: 'asc' } })
    expect(tenders.map(p => ({ method: p.method, amountCents: p.amountCents, tipCents: p.tipCents, charityCents: p.charityCents }))).toEqual([
      { method: 'CASH', amountCents: 170, tipCents: 200, charityCents: 10 }, { method: 'GIFT_CARD', amountCents: 1000, tipCents: 0, charityCents: 0 },
    ])
    expect((await prisma.order.findUniqueOrThrow({ where: { id: result.body.orderIds[0] } })).total).toBe(11.7)
    expect(result.body.taxGroups).toEqual([{ taxRate: 17, baseCents: 1000, taxCents: 170, totalCents: 1170 }])
    expect(result.body.cashChange).toBe(1.2)
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
  it('fige réellement un nouveau brouillon et encaisse son tarif malgré une modification de catalogue', async () => {
    const boot = await auth(request(app).get('/api/pos/bootstrap')).expect(200)
    const tables = boot.body.tables.map((t: any) => ({ ...t, covers: [{ id: randomUUID(), label: 'Nouveau couvert', items: [{ id: randomUUID(), menuItemId: productId, name: 'Faux prix client', price: 0.01, taxRate: 0, qty: 1, note: '', coverId: 'temp' }] }] }))
    const saved = await auth(request(app).put('/api/pos/draft')).set('If-Match', String(boot.body.revision)).send({ tables, seats: [] }).expect(200)
    const item = saved.body.tables[0].posCovers[0].items[0]
    expect(item.price).toBe(11.7); expect(item.taxRate).toBe(17)
    await prisma.product.update({ where: { id: productId }, data: { price: 30, taxRate: 3, isActive: false, name: 'Catalogue changé' } })
    const reloaded = await auth(request(app).get('/api/pos/bootstrap')).expect(200)
    expect(reloaded.body.tables[0].covers.find((c: any) => !c.id.startsWith('guest:')).items[0]).toMatchObject({ price: 11.7, taxRate: 17, name: 'Café TTC' })
    const sale = await auth(request(app).post('/api/pos/checkout')).send({ ...body(), coverIds: [tables[0].covers[0].id] }).expect(200)
    expect(sale.body.total).toBe(11.7); expect(sale.body.tva).toBe(1.7)
  })
  it('requiert une revue explicite des lignes anciennes, puis conserve auteur, motif et prix observé', async () => {
    const input = { ...nativeBody(true), cashReceived: 12 }
    await auth(request(app).post('/api/pos/checkout')).send(input).expect(409)
    const boot = await auth(request(app).get('/api/pos/bootstrap')).expect(200)
    const item = boot.body.tables[0].covers.find((c: any) => !c.id.startsWith('guest:')).items[0]
    expect(item.pricingStatus).toBe('review')
    const review = await auth(request(app).post(`/api/pos/pricing/${item.id}/review`)).set('If-Match', String(boot.body.revision)).send({ productId, price: 11.7, taxRate: 17, reason: 'Ancien tarif papier vérifié pour recette' }).expect(200)
    expect(review.body.posPricing[item.id].review).toMatchObject({ actorId: userId, observedPriceCents: 1170 })
    expect(review.body.posPricing[item.id].source).toBe('legacy-reviewed')
    await auth(request(app).post('/api/pos/checkout')).send(input).expect(200)
  })
  it('refuse la revue par un salarié et l’import d’un faux registre de prix', async () => {
    nativeBody(true)
    const floor = getFloorState(companyId), item = (floor.tables[0] as any).posCovers[0].items[0]
    await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'EMPLOYEE' } })
    try { await auth(request(app).post(`/api/pos/pricing/${item.id}/review`)).set('If-Match', String(floor.updatedAt)).send({ productId, price: 1, taxRate: 0, reason: 'Tentative refusée' }).expect(403) }
    finally { await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'OWNER' } }) }
    await auth(request(app).put('/api/floor-state')).set('If-Match', String(floor.updatedAt)).send({ posPricing: { [item.id]: { priceCents: 1 } } }).expect(400)
    expect(getFloorState(companyId).posPricing).toBeUndefined()
  })
  it('une ancienne projection récupérée ne permet pas de vendre deux fois la même ligne sous un nouveau couvert', async () => {
    const input = { ...nativeBody(), cashReceived: 12 }
    const before = structuredClone(getFloorState(companyId))
    const salesBefore = await prisma.posSale.count({ where: { companyId } })
    const stockBefore = (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock!
    const first = await auth(request(app).post('/api/pos/checkout')).send(input).expect(200)
    const old: any = before.tables[0]
    const replacementCover = `recovered:${randomUUID()}`
    old.posCovers[0].id = replacementCover
    old.posCovers[0].items[0].coverId = replacementCover
    // Reproduit une projection JSON ancienne après perte de réponse/échec disque.
    // La vente PostgreSQL reste intacte et est la source de vérité financière.
    remplacerPlanDeSalle(before, companyId)
    await auth(request(app).post('/api/pos/checkout')).send({ ...input, requestId: randomUUID(), coverIds: [replacementCover] }).expect(409)
    expect(await prisma.posSale.count({ where: { companyId } })).toBe(salesBefore + 1)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(stockBefore - 1)
    expect(await prisma.saleOrigin.count({ where: { companyId, saleId: first.body.id, kind: 'LINE' } })).toBe(1)
    expect((await auth(request(app).get('/api/pos/bootstrap')).expect(200)).body.tables[0].covers.filter((c: any) => !c.id.startsWith('guest:'))).toEqual([])
  })
  it('refuse dans un nouveau brouillon une ligne déjà réglée et déplacée dans un autre couvert', async () => {
    const input = { ...nativeBody(), cashReceived: 12 }
    const old: any = structuredClone(getFloorState(companyId).tables[0])
    await auth(request(app).post('/api/pos/checkout')).send(input).expect(200)
    const boot = await auth(request(app).get('/api/pos/bootstrap')).expect(200)
    const table = boot.body.tables[0], coverId = randomUUID()
    table.covers = [{ ...old.posCovers[0], id: coverId, items: old.posCovers[0].items.map((i: any) => ({ ...i, coverId })) }]
    await auth(request(app).put('/api/pos/draft')).set('If-Match', String(boot.body.revision)).send({ tables: [table], seats: [] }).expect(409)
  })
  it('une ligne QR ne devient pas une deuxième vente native en changeant de couvert', async () => {
    const input = { ...nativeBody(), cashReceived: 12 }
    const guestLine = await prisma.orderItem.findFirstOrThrow({ where: { orderId } })
    const floor: any = getFloorState(companyId), item = floor.tables[0].posCovers[0].items[0]
    floor.posPricing[guestLine.id] = floor.posPricing[item.id]; item.id = guestLine.id
    await auth(request(app).post('/api/pos/checkout')).send(input).expect(409)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).paidAt).toBeNull()
  })
  it('un offert exige un motif responsable, conserve son auteur, son ticket et un seul débit de stock', async () => {
    const input = { ...nativeBody(), expectedTotal: 0, cashReceived: 0, options: { remises: [{ type: 'geste', libelle: 'Offert', montant: 11.7 }] } }
    const beforeStock = (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock!
    await auth(request(app).post('/api/pos/checkout')).send(input).expect(400)
    await prisma.userCompany.update({ where: { userId_companyId: { companyId, userId } }, data: { role: 'WAITER' } })
    const reason = 'Attente prolongée : café offert par le responsable'
    try { await auth(request(app).post('/api/pos/checkout')).send({ ...input, options: { remises: [{ type: 'geste', libelle: reason, montant: 11.7 }] } }).expect(403) }
    finally { await prisma.userCompany.update({ where: { userId_companyId: { companyId, userId } }, data: { role: 'OWNER' } }) }
    const body = { ...input, options: { remises: [{ type: 'geste', libelle: reason, montant: 11.7 }] } }
    const first = (await auth(request(app).post('/api/pos/checkout')).send(body).expect(200)).body
    expect((await auth(request(app).post('/api/pos/checkout')).send(body).expect(200)).body.id).toBe(first.id)
    expect(first).toMatchObject({ total: 0, remises: [{ libelle: reason, montant: 11.7 }] })
    expect((await prisma.posSale.findUniqueOrThrow({ where: { id: first.id } })).userId).toBe(userId)
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock).toBe(beforeStock - 1)
    const receipt = await auth(request(app).get(`/api/pos/sales/${first.id}/receipt`)).expect(200)
    expect(receipt.text).toContain(reason)
  })
})
