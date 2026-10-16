import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import invoices from './invoices'

const app = express(); app.use(express.json()); app.use('/api/invoices', deviceOrUserAuth, requireCompany, invoices)
const companyId = 'integration-receipt-invoice', otherId = `${companyId}-other`, userId = `${companyId}-owner`
let token: string, customerId: string, otherCustomerId: string
const auth = (r: any) => r.set('Authorization', `Bearer ${token}`).set('x-company-id', companyId)
const issuer = { name: 'Café historique fictif', address: 'Adresse historique fictive', vatNumber: 'TVA-FICTIVE', legalProfile: { legalForm: 'SARL fictive', rcsNumber: 'RCS-FICTIF', authorizationNumber: 'AUTORISATION-FICTIVE' } }
function snapshot(id: string, number: number) {
  // 11,70 à 17 % + 10,30 à 3 %, remise 2,20 répartie : 19,80 TTC, 1,80 TVA.
  return { version: 2, id, numero: number, horodatage: 1792166400000, issuer, currency: 'EUR', confirmation: 'manual_declaration',
    lignes: [{ name: 'Boisson fictive', price: 11.70, qty: 1, taxRate: 17 }, { name: 'Repas fictif', price: 10.30, qty: 1, taxRate: 3 }],
    taxGroups: [{ taxRate: 3, baseCents: 900, taxCents: 27, totalCents: 927 }, { taxRate: 17, baseCents: 900, taxCents: 153, totalCents: 1053 }],
    brut: 22, sousTotal: 18, tva: 1.80, total: 21, pourboire: 1, arrondiCaritatif: 0.20,
    reglements: [{ methode: 'cash', montant: 16 }, { methode: 'GIFT_CARD', montant: 5 }], orderIds: [] }
}
async function sale(suffix: string, number: number, patch = {}) {
  const id = `${companyId}-${suffix}`
  await prisma.posSale.create({ data: { id, companyId, userId, number, snapshot: { ...snapshot(id, number), ...patch } } })
  return id
}
describe('Facture société depuis ticket : une pièce, aucune nouvelle vente', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || !new URL(process.env.DATABASE_URL!).pathname.endsWith('/creorga_tests')) throw new Error('Base de tests obligatoire')
    await prisma.company.createMany({ data: [{ id: companyId, name: 'Nom actuel différent' }, { id: otherId, name: 'Autre société fictive' }] })
    await prisma.user.create({ data: { id: userId, email: 'receipt-invoice@localhost.invalid', firstName: 'Test', lastName: 'Owner', password: 'unused' } })
    await prisma.userCompany.create({ data: { companyId, userId, role: 'OWNER' } })
    customerId = (await prisma.customer.create({ data: { companyId, firstName: '', lastName: '', businessName: 'Entreprise fictive', address: 'Adresse client fictive' } })).id
    otherCustomerId = (await prisma.customer.create({ data: { companyId: otherId, firstName: '', lastName: '', businessName: 'Autre entreprise', address: 'Autre adresse' } })).id
    token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '10m' })
  })
  afterAll(async () => {
    await prisma.invoice.deleteMany({ where: { companyId } })
    await prisma.posSale.deleteMany({ where: { companyId: { in: [companyId, otherId] } } })
    await prisma.customer.deleteMany({ where: { companyId: { in: [companyId, otherId] } } })
    await prisma.userCompany.deleteMany({ where: { userId } }); await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.company.deleteMany({ where: { id: { in: [companyId, otherId] } } }); await prisma.$disconnect()
  })
  it('conserve TTC, remise et TVA, sans facturer à nouveau pourboire ou don', async () => {
    const id = await sale('amounts', 1)
    const before = await prisma.posSale.findUniqueOrThrow({ where: { id } })
    const ordersBefore = await prisma.order.count({ where: { companyId } })
    const result = await auth(request(app).post(`/api/invoices/from-pos/${id}`)).send({ customerId }).expect(201)
    expect(result.body).toMatchObject({ sourcePosSaleId: id, priceBasis: 'TTC', discountCents: 220, subtotal: 18, taxAmount: 1.80, total: 19.80, status: 'DRAFT' })
    expect(result.body.items.map((i: any) => i.unitPrice).sort()).toEqual([10.30, 11.70])
    expect(await prisma.posSale.findUniqueOrThrow({ where: { id } })).toEqual(before)
    expect(await prisma.order.count({ where: { companyId } })).toBe(ordersBefore)
  })
  it('vingt demandes simultanées retrouvent une seule facture et un seul numéro', async () => {
    const id = await sale('concurrent', 2)
    const results = await Promise.all(Array.from({ length: 20 }, () => auth(request(app).post(`/api/invoices/from-pos/${id}`)).send({ customerId })))
    expect(results.every(r => [200, 201].includes(r.status))).toBe(true)
    expect(new Set(results.map(r => r.body.id)).size).toBe(1)
    expect(await prisma.invoice.count({ where: { companyId, sourcePosSaleId: id } } as any)).toBe(1)
  }, 60000)
  it('ne réaffecte pas la facture existante à un autre client', async () => {
    const id = await sale('customer', 3)
    await auth(request(app).post(`/api/invoices/from-pos/${id}`)).send({ customerId }).expect(201)
    const another = await prisma.customer.create({ data: { companyId, firstName: '', lastName: '', businessName: 'Deuxième entreprise', address: 'Fictive' } })
    await auth(request(app).post(`/api/invoices/from-pos/${id}`)).send({ customerId: another.id }).expect(409)
  })
  it('refuse le client étranger, le ticket étranger et le rôle salarié', async () => {
    const id = await sale('scope', 4)
    await auth(request(app).post(`/api/invoices/from-pos/${id}`)).send({ customerId: otherCustomerId }).expect(400)
    await prisma.posSale.create({ data: { id: `${otherId}-sale`, companyId: otherId, userId, number: 1, snapshot: snapshot(`${otherId}-sale`, 1) } })
    await auth(request(app).post(`/api/invoices/from-pos/${otherId}-sale`)).send({ customerId }).expect(404)
    await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'EMPLOYEE' } })
    try { await auth(request(app).post(`/api/invoices/from-pos/${id}`)).send({ customerId }).expect(403) }
    finally { await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'OWNER' } }) }
  })
  it('ne fabrique pas une TVA pour un ancien ticket et refuse un ticket incohérent', async () => {
    const old = await sale('old', 5, { version: 1, issuer: undefined })
    await auth(request(app).post(`/api/invoices/from-pos/${old}`)).send({ customerId }).expect(422)
    const invalid = await sale('invalid', 6, { tva: 2 })
    await auth(request(app).post(`/api/invoices/from-pos/${invalid}`)).send({ customerId }).expect(422)
  })
  it('fige les données financières du ticket même dans un brouillon', async () => {
    const id = await sale('immutable', 7)
    const result = await auth(request(app).post(`/api/invoices/from-pos/${id}`)).send({ customerId }).expect(201)
    await auth(request(app).put(`/api/invoices/${result.body.id}`)).send({ items: [{ description: 'Autre', quantity: 1, unitPrice: 999, taxRate: 17 }] }).expect(409)
    await auth(request(app).put(`/api/invoices/${result.body.id}`)).send({ discountCents: 0 }).expect(409)
    await auth(request(app).put(`/api/invoices/${result.body.id}`)).send({ notes: 'Référence entreprise' }).expect(200)
  })
  it('émet un PDF avec l’émetteur historique et le règlement déclaré, sans nouvelle écriture', async () => {
    const id = await sale('issue', 8)
    const result = await auth(request(app).post(`/api/invoices/from-pos/${id}`)).send({ customerId }).expect(201)
    await auth(request(app).put(`/api/invoices/${result.body.id}/status`)).send({ status: 'SENT' }).expect(409)
    await auth(request(app).put(`/api/invoices/${result.body.id}/status`)).send({ status: 'PAID' }).expect(200)
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: result.body.id } })
    expect(invoice.issuedSnapshot).toMatchObject({ status: 'PAID', company: { name: issuer.name, address: issuer.address }, total: 19.80, taxGroups: snapshot(id, 8).taxGroups })
    expect((invoice.issuedSnapshot as any).notes).toContain('déclaré en caisse')
    expect(Buffer.from(invoice.issuedPdf!).subarray(0, 5).toString()).toBe('%PDF-')
    expect(await prisma.order.count({ where: { companyId } })).toBe(0)
  }, 60000)
  it('la contrainte en base refuse un deuxième lien et un lien intersociétés', async () => {
    const id = await sale('database', 9)
    const result = await auth(request(app).post(`/api/invoices/from-pos/${id}`)).send({ customerId }).expect(201)
    const original = await prisma.invoice.findUniqueOrThrow({ where: { id: result.body.id } })
    await expect(prisma.invoice.create({ data: { companyId, number: 'FORBIDDEN-DUPLICATE', sourcePosSaleId: id, sourceReceipt: original.sourceReceipt! } })).rejects.toMatchObject({ code: 'P2002' })
    const otherSaleId = `${otherId}-constraint`
    await prisma.posSale.create({ data: { id: otherSaleId, companyId: otherId, userId, number: 2, snapshot: snapshot(otherSaleId, 2) } })
    await expect(prisma.invoice.create({ data: { companyId, number: 'FORBIDDEN-SCOPE', sourcePosSaleId: otherSaleId, sourceReceipt: {} } })).rejects.toMatchObject({ code: 'P2003' })
  })
  it('retrouve un ticket clôturé par son numéro sans exposer celui d’une autre société', async () => {
    const id = await sale('closed', 10)
    await prisma.posSale.update({ where: { id }, data: { closedId: 'historical-close' } })
    const listed = await auth(request(app).get('/api/invoices/pos-receipts?search=10')).expect(200)
    expect(listed.body.map((s: any) => s.id)).toEqual([id])
    await auth(request(app).post(`/api/invoices/from-pos/${id}`)).send({ customerId }).expect(201)
    const again = await auth(request(app).get('/api/invoices/pos-receipts?search=10')).expect(200)
    expect(again.body[0].invoice.number).toMatch(/^INV-/)
    await auth(request(app).get('/api/invoices/pos-receipts?search=incorrect')).expect(400)
  })
})
