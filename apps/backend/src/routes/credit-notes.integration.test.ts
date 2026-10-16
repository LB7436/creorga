import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import invoices from './invoices'
import accounting from './accounting'
const app = express(); app.use(express.json()); app.use('/api/invoices', deviceOrUserAuth, requireCompany, invoices)
app.use('/api/accounting', deviceOrUserAuth, requireCompany, accounting)
const companyId = 'integration-credit', userId = `${companyId}-owner`, otherId = `${companyId}-other`
let token: string
const auth = (r: any) => r.set('Authorization', `Bearer ${token}`).set('x-company-id', companyId)
const input = (amountCents?: number) => ({ requestId: randomUUID(), reason: 'Correction commerciale fictive', ...(amountCents ? { amountCents } : {}) })
async function issued() {
  const created = await auth(request(app).post('/api/invoices')).send({ items: [
    { description: 'Repas fictif', quantity: 1, unitPrice: 10, taxRate: 3 },
    { description: 'Boisson fictive', quantity: 1, unitPrice: 10, taxRate: 17 },
  ] }).expect(201)
  await auth(request(app).put(`/api/invoices/${created.body.id}/status`)).send({ status: 'SENT' }).expect(200)
  return prisma.invoice.findUniqueOrThrow({ where: { id: created.body.id } })
}
describe('Avoirs séparés, TVA historique, sans remboursement implicite', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || !new URL(process.env.DATABASE_URL!).pathname.endsWith('/creorga_tests')) throw new Error('Base de tests obligatoire')
    await prisma.company.createMany({ data: [{ id: companyId, name: 'Émetteur fictif original', address: 'Adresse de recette' }, { id: otherId, name: 'Autre société fictive' }] })
    await prisma.user.create({ data: { id: userId, email: 'credit@localhost.invalid', firstName: 'Test', lastName: 'Owner', password: 'unused' } })
    await prisma.userCompany.create({ data: { companyId, userId, role: 'OWNER' } })
    token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '20m' })
  })
  afterAll(async () => {
    // Garde la suite exécutable lors du premier passage rouge sans le nouveau modèle.
    if ((prisma as any).creditNote) await (prisma as any).creditNote.deleteMany({ where: { companyId } })
    await prisma.invoice.deleteMany({ where: { companyId: { in: [companyId, otherId] } } })
    await prisma.userCompany.deleteMany({ where: { userId } }); await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.company.deleteMany({ where: { id: { in: [companyId, otherId] } } }); await prisma.$disconnect()
  })
  it('un avoir intégral ne modifie pas la facture, son PDF, sa vente ou son règlement', async () => {
    const invoice = await issued()
    const result = await auth(request(app).post(`/api/invoices/${invoice.id}/credit-notes`)).send(input()).expect(201)
    expect(result.body).toMatchObject({ invoiceId: invoice.id, totalCents: 2200, baseCents: 2000, taxCents: 200, confirmation: 'credit_note_not_refund' })
    expect(result.body.number).toMatch(/^AVO-/)
    expect(await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).toEqual(invoice)
    expect(await prisma.order.count({ where: { companyId } })).toBe(0)
    expect(await prisma.paymentSettlement.count({ where: { companyId } })).toBe(0)
  })
  it('un avoir partiel puis le solde reconstituent exactement chaque groupe fiscal historique', async () => {
    const invoice = await issued()
    await prisma.company.update({ where: { id: companyId }, data: { name: 'Nouveau nom non historique' } })
    const first = await auth(request(app).post(`/api/invoices/${invoice.id}/credit-notes`)).send(input(333)).expect(201)
    const last = await auth(request(app).post(`/api/invoices/${invoice.id}/credit-notes`)).send(input()).expect(201)
    expect(first.body.totalCents + last.body.totalCents).toBe(2200)
    expect(first.body.baseCents + last.body.baseCents).toBe(2000)
    expect(first.body.taxCents + last.body.taxCents).toBe(200)
    for (const [rate, base, tax, total] of [[3, 1000, 30, 1030], [17, 1000, 170, 1170]]) {
      const groups = [...first.body.taxGroups, ...last.body.taxGroups].filter((g: any) => g.taxRate === rate)
      expect(groups.reduce((s: number, g: any) => s + g.baseCents, 0)).toBe(base)
      expect(groups.reduce((s: number, g: any) => s + g.taxCents, 0)).toBe(tax)
      expect(groups.reduce((s: number, g: any) => s + g.totalCents, 0)).toBe(total)
    }
    await auth(request(app).post(`/api/invoices/${invoice.id}/credit-notes`)).send(input(1)).expect(409)
  })
  it('vingt rejeux simultanés de la même demande ne créent qu’une pièce', async () => {
    const invoice = await issued(), body = input(100)
    const results = await Promise.all(Array.from({ length: 20 }, () => auth(request(app).post(`/api/invoices/${invoice.id}/credit-notes`)).send(body)))
    expect(results.every(r => [200, 201].includes(r.status))).toBe(true)
    expect(new Set(results.map(r => r.body.id)).size).toBe(1)
    await auth(request(app).post(`/api/invoices/${invoice.id}/credit-notes`)).send({ ...body, amountCents: 101 }).expect(409)
  }, 60000)
  it('vingt demandes différentes ne dépassent jamais le montant original', async () => {
    const invoice = await issued()
    const results = await Promise.all(Array.from({ length: 20 }, () => auth(request(app).post(`/api/invoices/${invoice.id}/credit-notes`)).send(input(200))))
    expect(results.filter(r => r.status === 201)).toHaveLength(11)
    expect(results.filter(r => r.status === 409)).toHaveLength(9)
    const listed = await auth(request(app).get(`/api/invoices/${invoice.id}/credit-notes`)).expect(200)
    expect(listed.body.reduce((s: number, r: any) => s + r.totalCents, 0)).toBe(2200)
    expect(new Set(listed.body.map((r: any) => r.number)).size).toBe(11)
  }, 60000)
  it('refuse salarié, autre société et document non émis', async () => {
    const draft = await prisma.invoice.create({ data: { companyId, number: 'UNISSUED', total: 22 } })
    await auth(request(app).post(`/api/invoices/${draft.id}/credit-notes`)).send(input()).expect(422)
    const other = await prisma.invoice.create({ data: { companyId: otherId, number: 'OTHER', total: 22 } })
    await auth(request(app).post(`/api/invoices/${other.id}/credit-notes`)).send(input()).expect(404)
    const invoice = await issued()
    await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'EMPLOYEE' } })
    try { await auth(request(app).post(`/api/invoices/${invoice.id}/credit-notes`)).send(input()).expect(403) }
    finally { await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'OWNER' } }) }
  })
  it('télécharge un vrai PDF original figé de l’avoir et refuse le document étranger', async () => {
    const invoice = await issued()
    const created = await auth(request(app).post(`/api/invoices/${invoice.id}/credit-notes`)).send(input(333)).expect(201)
    const pdf = await auth(request(app).get(`/api/invoices/credit-notes/${created.body.id}/pdf`)).expect(200).expect('Content-Type', /application\/pdf/)
    expect(Number(pdf.headers['content-length'])).toBeGreaterThan(500)
    await request(app).get(`/api/invoices/credit-notes/${created.body.id}/pdf`).set('Authorization', `Bearer ${token}`).set('x-company-id', otherId).expect(403)
  }, 60000)
  it('ne présente pas un ancien rapport fiscal ignorant les avoirs comme un net réconcilié', async () => {
    const invoice = await issued()
    await auth(request(app).post(`/api/invoices/${invoice.id}/credit-notes`)).send(input(333)).expect(201)
    const report = await auth(request(app).get('/api/accounting/tax-report')).expect(409)
    expect(report.body.code).toBe('TAX_CREDITS_RECONCILIATION_REQUIRED')
  })
  it('exporte les pièces signées séparément, sans créer une deuxième vente', async () => {
    const invoice = await issued()
    const credit = await auth(request(app).post(`/api/invoices/${invoice.id}/credit-notes`)).send(input(333)).expect(201)
    const report = await auth(request(app).get('/api/accounting/document-journal')).expect(200)
    expect(report.body.basis).toBe('documents_not_additional_sales_or_bank_receipts')
    const original = report.body.documents.find((d: any) => d.id === invoice.id)
    const correction = report.body.documents.find((d: any) => d.id === credit.body.id)
    expect(original).toMatchObject({ kind: 'INVOICE', totalCents: 2200, sign: 1 })
    expect(correction).toMatchObject({ kind: 'CREDIT_NOTE', sourceInvoiceId: invoice.id, totalCents: 333, sign: -1 })
    expect(await prisma.order.count({ where: { companyId } })).toBe(0)
    await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'EMPLOYEE' } })
    try { await auth(request(app).get('/api/accounting/document-journal')).expect(403) }
    finally { await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'OWNER' } }) }
    await request(app).get('/api/accounting/document-journal').set('Authorization', `Bearer ${token}`).set('x-company-id', otherId).expect(403)
  })
})
