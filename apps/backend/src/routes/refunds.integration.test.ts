import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
const remote = vi.hoisted(() => ({ calls: [] as any[], fail: false, evidence: undefined as any }))
vi.mock('../lib/payments/gateway', () => ({ SUPPORTED_PROVIDERS: ['paypal'], charge: async () => {}, getGateway: () => ({
  startRefund: async (r: any) => { remote.calls.push(r); if (remote.fail) throw new Error('timeout-after-refund'); return { id: 'REFUND-' + r.requestId } },
  verifyRefund: async () => remote.evidence,
}) }))
import invoices from './invoices'
import payments from './payments'
import { cashDrawerReport } from '../lib/cash-ledger'
import accounting from './accounting'
const app = express(); app.use(express.json()); app.use('/api/invoices', deviceOrUserAuth, requireCompany, invoices); app.use('/api/payments', deviceOrUserAuth, payments)
app.use('/api/accounting', deviceOrUserAuth, requireCompany, accounting)
const companyId = 'integration-refund', userId = `${companyId}-owner`
let token: string, orderId: string, settlementId: string, creditId: string
const auth = (r: any) => r.set('Authorization', `Bearer ${token}`).set('x-company-id', companyId)
const input = () => ({ requestId: randomUUID(), creditNoteId: creditId, settlementId, amountCents: 300, reason: 'Retour commercial fictif' })
async function cleanup() {
  await prisma.manualRefund.deleteMany({ where: { companyId } }); await prisma.refundAttempt.deleteMany({ where: { companyId } })
  await prisma.creditNote.deleteMany({ where: { companyId } }); await prisma.invoice.deleteMany({ where: { companyId } }); await prisma.orderTender.deleteMany({ where: { companyId } })
  await prisma.posSale.deleteMany({ where: { companyId } }); await prisma.cashMovement.deleteMany({ where: { companyId } }); await prisma.cashDrawer.deleteMany({ where: { companyId } })
  await prisma.paymentAllocation.deleteMany({ where: { companyId } }); await prisma.paymentSettlement.deleteMany({ where: { companyId } }); await prisma.paymentAttempt.deleteMany({ where: { companyId } }); await prisma.order.deleteMany({ where: { companyId } })
  await prisma.userCompany.deleteMany({ where: { userId } }); await prisma.company.deleteMany({ where: { id: companyId } }); await prisma.user.deleteMany({ where: { id: userId } })
}
describe('Remboursement réservé, puis confirmé seulement par preuve prestataire', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || !new URL(process.env.DATABASE_URL!).pathname.endsWith('/creorga_tests')) throw new Error('Base fictive obligatoire')
    await cleanup()
    await prisma.company.create({ data: { id: companyId, name: 'Café fictif', address: 'Adresse de recette' } })
    await prisma.user.create({ data: { id: userId, email: 'refund@localhost.invalid', password: 'unused', firstName: 'Test', lastName: 'Owner' } })
    await prisma.userCompany.create({ data: { companyId, userId, role: 'OWNER' } }); token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '20m' })
  })
  beforeEach(async () => {
    vi.stubEnv('PAYMENT_MERCHANT_COMPANY_ID', companyId); vi.stubEnv('PAYPAL_MERCHANT_ID', 'merchant-fake'); vi.stubEnv('PAYPAL_CLIENT_ID', 'fake'); vi.stubEnv('PAYPAL_CLIENT_SECRET', 'fake')
    remote.calls.length = 0; remote.fail = false; remote.evidence = undefined
    const number = await prisma.order.count({ where: { companyId } })
    const order = await prisma.order.create({ data: { companyId, orderNumber: number + 1, total: 11.7, subtotal: 10, taxAmount: 1.7, status: 'PAID', paidAt: new Date() } }); orderId = order.id
    const attempt = await prisma.paymentAttempt.create({ data: { companyId, orderId, requestId: randomUUID(), requestHash: 'fixture', provider: 'paypal', merchantId: 'merchant-fake', currency: 'EUR', amountCents: 1170, status: 'SUCCEEDED', externalId: 'ORIGIN-' + orderId } })
    settlementId = (await prisma.paymentSettlement.create({ data: { companyId, orderId, attemptId: attempt.id, provider: 'paypal', merchantId: 'merchant-fake', captureId: 'CAPTURE-' + orderId, currency: 'EUR', amountCents: 1170 } })).id
    const invoice = await auth(request(app).post('/api/invoices')).send({ orderId, items: [{ description: 'Boisson fictive', quantity: 1, unitPrice: 10, taxRate: 17 }] }).expect(201)
    await auth(request(app).put(`/api/invoices/${invoice.body.id}/status`)).send({ status: 'SENT' }).expect(200)
    const credit = await auth(request(app).post(`/api/invoices/${invoice.body.id}/credit-notes`)).send({ requestId: randomUUID(), reason: 'Avoir commercial fictif', amountCents: 500 }).expect(201); creditId = credit.body.id
  })
  afterAll(async () => {
    await cleanup(); await prisma.$disconnect(); vi.unstubAllEnvs()
  })
  it('une demande ne signifie pas remboursé ; une preuve exacte confirme une seule fois', async () => {
    const body = input(), created = await auth(request(app).post('/api/payments/refunds')).send(body).expect(202)
    expect(created.body.status).toBe('PENDING'); expect(created.body.confirmation).toBe('not_confirmed')
    remote.evidence = { provider: 'paypal', status: 'succeeded', refundId: created.body.externalId, captureId: 'CAPTURE-' + orderId, amountCents: 300, currency: 'EUR', merchantId: 'merchant-fake' }
    const done = await auth(request(app).post(`/api/payments/refunds/${body.requestId}/reconcile`)).expect(200)
    expect(done.body.status).toBe('SUCCEEDED'); expect(done.body.confirmation).toBe('provider_verified')
    await auth(request(app).post('/api/payments/refunds')).send(body).expect(200)
    await auth(request(app).post(`/api/payments/refunds/${body.requestId}/reconcile`)).expect(200)
    expect(remote.calls).toHaveLength(1)
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).total).toBe(11.7)
    await auth(request(app).post('/api/payments/refunds')).send({ ...input(), amountCents: 201 }).expect(409)
  })
  it('un remboursement espèces déclaré garde le justificatif et une seule sortie de caisse', async () => {
    const drawer = await prisma.cashDrawer.create({ data: { companyId, userId, openAmount: 20, ledgerVersion: 2 } })
    const sale = await prisma.posSale.create({ data: { id: randomUUID(), companyId, userId, number: 1, snapshot: {} } })
    const tender = await prisma.orderTender.create({ data: { companyId, orderId, saleId: sale.id, actorId: userId, method: 'CASH', amountCents: 1170, confirmation: 'manual_declaration', cashDrawerId: drawer.id } })
    const body = { requestId: randomUUID(), creditNoteId: creditId, tenderId: tender.id, amountCents: 300, method: 'CASH', reason: 'Retour fictif validé', reference: 'Bon signé FICTIF-1' }
    const first = await auth(request(app).post('/api/payments/manual-refunds')).send(body).expect(201)
    expect(first.body).toMatchObject({ confirmation: 'manual_declaration', amountCents: 300, status: 'DECLARED' })
    const replay = await Promise.all(Array.from({ length: 20 }, () => auth(request(app).post('/api/payments/manual-refunds')).send(body)))
    expect(replay.every(r => r.status === 200)).toBe(true)
    expect(await prisma.cashMovement.count({ where: { companyId, drawerId: drawer.id } })).toBe(1)
    expect((await cashDrawerReport(prisma, companyId, drawer)).expectedCents).toBe(2870)
    expect((await prisma.orderTender.findUniqueOrThrow({ where: { id: tender.id } })).amountCents).toBe(1170)
    await auth(request(app).post('/api/payments/manual-refunds')).send({ ...body, requestId: randomUUID(), amountCents: 201 }).expect(409)
    const receipt = await auth(request(app).get(`/api/payments/manual-refunds/${body.requestId}/receipt`)).expect(200)
    expect(receipt.text).toContain('Déclaration de remboursement'); expect(receipt.text).toContain('FICTIF-1')
    const report = await auth(request(app).get('/api/accounting/reconciliation')).expect(200)
    expect(report.body.rows.find((r: any) => r.id === body.requestId && r.kind === 'DECLARED_REFUND')).toMatchObject({ refundCents: 300, cashDeltaCents: -300 })
    expect(JSON.stringify(report.body)).not.toContain('pdfHash')
    const csv = await auth(request(app).get('/api/accounting/reconciliation?format=csv')).expect(200)
    expect(csv.text).toContain('DECLARED_REFUND')
  })
  it('une carte déclarée ne crée aucune sortie espèces, reste auditée et plafonnée', async () => {
    const attempt = await prisma.paymentAttempt.create({ data: { companyId, orderId, requestId: randomUUID(), requestHash: 'fictif-carte', provider: 'manual', merchantId: 'manual:' + companyId, currency: 'EUR', amountCents: 1170, status: 'DECLARED' } })
    const tender = await prisma.orderTender.create({ data: { companyId, orderId, attemptId: attempt.id, actorId: userId, method: 'CARD', amountCents: 1170, confirmation: 'manual_declaration' } })
    const body = { requestId: randomUUID(), creditNoteId: creditId, tenderId: tender.id, amountCents: 300, method: 'CARD', reason: 'Retour fictif carte', reference: 'Terminal fictif REF-2' }
    const response = await auth(request(app).post('/api/payments/manual-refunds')).send(body).expect(201)
    expect(response.body.cashMovementId).toBeNull(); expect(response.body.confirmation).toBe('manual_declaration')
    await auth(request(app).post('/api/payments/refunds')).send({ ...input(), amountCents: 201 }).expect(409)
    await auth(request(app).post('/api/payments/manual-refunds')).send({ ...body, amountCents: 1 }).expect(409)
    await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'EMPLOYEE' } })
    try {
      await auth(request(app).post('/api/payments/manual-refunds')).send({ ...body, requestId: randomUUID() }).expect(403)
      await auth(request(app).get('/api/accounting/reconciliation')).expect(403)
      await auth(request(app).get(`/api/payments/manual-refunds/${body.requestId}/receipt`)).expect(403)
    } finally { await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'OWNER' } }) }
    await auth(request(app).post('/api/payments/manual-refunds')).send({ ...body, requestId: randomUUID(), tenderId: 'autre-societe' }).expect(404)
  })
  it('une preuve de refus PayPal reste réservée et identifiée comme à rapprocher', async () => {
    const body = input(), created = await auth(request(app).post('/api/payments/refunds')).send(body).expect(202)
    remote.evidence = { provider: 'paypal', status: 'failed', providerStatus: 'FAILED', refundId: created.body.externalId, captureId: 'CAPTURE-' + orderId, amountCents: 300, currency: 'EUR', merchantId: 'merchant-fake' }
    const result = await auth(request(app).post(`/api/payments/refunds/${body.requestId}/reconcile`)).expect(200)
    expect(result.body).toMatchObject({ status: 'REFUSED_RECONCILIATION', confirmation: 'not_confirmed', reservationHeld: true })
    await auth(request(app).post('/api/payments/refunds')).send({ ...input(), amountCents: 201 }).expect(409)
    expect((await prisma.refundAttempt.findUniqueOrThrow({ where: { id: body.requestId } })).lastProof).not.toBeNull()
  })
  it('un timeout conserve la réservation et n’émet jamais un deuxième remboursement', async () => {
    remote.fail = true
    const body = input(), created = await auth(request(app).post('/api/payments/refunds')).send(body).expect(202)
    expect(created.body.status).toBe('UNKNOWN')
    await auth(request(app).post('/api/payments/refunds')).send(body).expect(200)
    await auth(request(app).post('/api/payments/refunds')).send({ ...input(), amountCents: 300 }).expect(409)
    await auth(request(app).post(`/api/payments/refunds/${body.requestId}/reconcile`)).expect(409)
    expect(remote.calls).toHaveLength(1)
  })
  it.each([{ amountCents: 1 }, { currency: 'USD' }, { merchantId: 'wrong' }, { captureId: 'wrong' }])('refuse une preuve incohérente %j', async mismatch => {
    const body = input(), created = await auth(request(app).post('/api/payments/refunds')).send(body).expect(202)
    remote.evidence = { provider: 'paypal', status: 'succeeded', refundId: created.body.externalId, captureId: 'CAPTURE-' + orderId, amountCents: 300, currency: 'EUR', merchantId: 'merchant-fake', ...mismatch }
    await auth(request(app).post(`/api/payments/refunds/${body.requestId}/reconcile`)).expect(409)
  })
  it('deux références concurrentes ne réservent pas plus que l’avoir', async () => {
    const results = await Promise.all([input(), input()].map(body => auth(request(app).post('/api/payments/refunds')).send(body)))
    expect(results.map(r => r.status).sort()).toEqual([202, 409]); expect(remote.calls).toHaveLength(1)
  })
  it('une capture multi-commandes ne permet pas de rembourser la part d’une autre vente', async () => {
    const settlement = await prisma.paymentSettlement.findUniqueOrThrow({ where: { id: settlementId } })
    const other = await prisma.order.create({ data: { companyId, orderNumber: 10000, total: 9.7, subtotal: 9.7, taxAmount: 0, status: 'PAID', paidAt: new Date() } })
    await prisma.paymentAllocation.createMany({ data: [
      { companyId, attemptId: settlement.attemptId, settlementId, orderId, amountCents: 200, active: false },
      { companyId, attemptId: settlement.attemptId, settlementId, orderId: other.id, amountCents: 970, active: false },
    ] })
    await auth(request(app).post('/api/payments/refunds')).send(input()).expect(409)
    expect(remote.calls).toHaveLength(0)
    await auth(request(app).post('/api/payments/refunds')).send({ ...input(), amountCents: 200 }).expect(202)
    await auth(request(app).post('/api/payments/refunds')).send({ ...input(), amountCents: 1 }).expect(409)
    expect(remote.calls).toHaveLength(1)
  })
  it('réserve les remboursements aux responsables et ne révèle pas une référence hors société', async () => {
    await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'EMPLOYEE' } })
    try {
      await auth(request(app).post('/api/payments/refunds')).send(input()).expect(403)
      await auth(request(app).get('/api/payments/refunds')).expect(403)
    } finally { await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'OWNER' } }) }
    await auth(request(app).post('/api/payments/refunds')).send({ ...input(), settlementId: 'capture-exterieure-inconnue' }).expect(404)
    await auth(request(app).post('/api/payments/refunds/autre-societe/reconcile')).expect(404)
    expect(remote.calls).toHaveLength(0)
  })
})
