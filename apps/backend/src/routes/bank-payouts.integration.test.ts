import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import accounting from './accounting'
const app = express().use(express.json()).use('/api/accounting', deviceOrUserAuth, requireCompany, accounting)
const companyId = 'integration-payout-' + randomUUID(), userId = companyId + '-owner'
let token: string, orderId: string, settlementId: string, captureId: string
const auth = (r: any) => r.set('Authorization', `Bearer ${token}`).set('x-company-id', companyId)
const statement = (overrides: any = {}) => ({ requestId: randomUUID(), fictional: true, statementRef: randomUUID(), provider: 'paypal', merchantId: 'merchant-fictif', currency: 'EUR',
  payouts: [{ externalRef: 'PAYOUT-' + randomUUID(), declaredNetCents: 1100, receivedCents: 1100, bankReference: 'RELEVE FICTIF', receivedAt: '2026-10-16T10:00:00Z',
    lines: [{ kind: 'CAPTURE', externalRef: captureId, amountCents: 1170 }, { kind: 'FEE', externalRef: 'FEE-' + randomUUID(), amountCents: 70 }] }], ...overrides })
describe('Versements déclarés fictifs, distincts des ventes et des encaissements', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || new URL(process.env.DATABASE_URL!).pathname !== '/creorga_tests') throw new Error('Base fictive obligatoire')
    vi.stubEnv('CREORGA_PAYOUT_IMPORT_ENABLED', 'true')
    await prisma.company.create({ data: { id: companyId, name: 'VERSEMENTS FICTIFS' } })
    await prisma.user.create({ data: { id: userId, email: companyId + '@localhost.invalid', password: 'unused', firstName: 'Test', lastName: 'Owner' } })
    await prisma.userCompany.create({ data: { companyId, userId, role: 'OWNER' } })
    token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '30m' })
    const order = await prisma.order.create({ data: { companyId, orderNumber: 1, total: 11.7, subtotal: 10, taxAmount: 1.7, status: 'PAID', paidAt: new Date() } }); orderId = order.id
    const attempt = await prisma.paymentAttempt.create({ data: { companyId, orderId, requestId: randomUUID(), requestHash: 'fiction', provider: 'paypal', merchantId: 'merchant-fictif', currency: 'EUR', amountCents: 1170, status: 'SUCCEEDED' } })
    captureId = 'CAPTURE-' + randomUUID()
    settlementId = (await prisma.paymentSettlement.create({ data: { companyId, orderId, attemptId: attempt.id, provider: 'paypal', merchantId: 'merchant-fictif', captureId, amountCents: 1170, currency: 'EUR' } })).id
  })
  afterAll(async () => {
    await prisma.payoutStatement.deleteMany({ where: { companyId } })
    await prisma.paymentSettlement.deleteMany({ where: { companyId } }); await prisma.paymentAttempt.deleteMany({ where: { companyId } }); await prisma.order.deleteMany({ where: { companyId } })
    await prisma.userCompany.deleteMany({ where: { companyId } }); await prisma.user.deleteMany({ where: { id: userId } }); await prisma.company.deleteMany({ where: { id: companyId } })
    await prisma.$disconnect(); vi.unstubAllEnvs()
  })
  it('importe et rapproche manuellement une capture, ses frais et son net sans ajouter une vente', async () => {
    const input = statement(), created = await auth(request(app).post('/api/accounting/payout-statements')).send(input).expect(201)
    const payout = created.body.payouts[0]
    expect(payout).toMatchObject({ status: 'IMPORTED', computedNetCents: 1100, unresolved: [], source: 'FICTIONAL_DECLARATION' })
    const decision = { requestId: randomUUID(), reason: 'Validation de la recette fictive', expectedHash: payout.reviewHash }
    const validated = await auth(request(app).post(`/api/accounting/payouts/${payout.id}/validate`)).send(decision).expect(200)
    expect(validated.body).toMatchObject({ status: 'VALIDATED', confirmation: 'manual_fictional_reconciliation', receivedCents: 1100 })
    await auth(request(app).post(`/api/accounting/payouts/${payout.id}/validate`)).send(decision).expect(200)
    const history = await auth(request(app).get(`/api/accounting/payouts/${payout.id}/history`)).expect(200)
    expect(history.body[0].snapshot.reason).toBe('Validation de la recette fictive')
    await expect(prisma.payoutDecision.update({ where: { id: decision.requestId }, data: { actorId: 'réécriture interdite' } })).rejects.toThrow()
    const duplicate = await auth(request(app).post('/api/accounting/payout-statements')).send({ ...input, requestId: randomUUID() }).expect(200)
    expect(duplicate.body.id).toBe(created.body.id)
    await auth(request(app).post('/api/accounting/payout-statements')).send({ ...input, statementRef: 'CHANGED' }).expect(409)
    const report = await auth(request(app).get('/api/accounting/reconciliation')).expect(200)
    expect(report.body.totals.finalizedSalesCents).toBe(1170)
    expect(report.body.payouts).toMatchObject({ validatedReceivedCents: 1100, importedCount: 1 })
    expect(report.body.rows.find((r: any) => r.kind === 'BANK_PAYOUT' && r.id === payout.id)).toMatchObject({ salesCents: 0, receiptCents: 0, netCents: 1100 })
    expect((await prisma.paymentSettlement.findUniqueOrThrow({ where: { id: settlementId } })).feesCents).toBeNull()
    await auth(request(app).post('/api/accounting/payout-statements')).send(statement()).expect(409)
  })
  it('conserve les lignes inconnues et écarts en non résolus, sans validation forcée', async () => {
    const input = statement(); input.payouts[0].lines[0].externalRef = 'CAPTURE-INCONNUE'; input.payouts[0].receivedCents = 1099
    const created = await auth(request(app).post('/api/accounting/payout-statements')).send(input).expect(201)
    expect(created.body.payouts[0].unresolved).toEqual(expect.arrayContaining(['CAPTURE_UNMATCHED:CAPTURE-INCONNUE', 'BANK_DIFFERENCE']))
    const payout = created.body.payouts[0]
    await auth(request(app).post(`/api/accounting/payouts/${payout.id}/validate`)).send({ requestId: randomUUID(), reason: 'Ne doit pas forcer', expectedHash: payout.reviewHash }).expect(409)
  })
  it('refuse les doublons de lignes atomiquement et les montants/devises/marchands incohérents', async () => {
    const input = statement(); input.payouts[0].lines[0].externalRef = 'CAPTURE-INCONNUE-2'; input.payouts[0].lines.push(input.payouts[0].lines[0])
    await auth(request(app).post('/api/accounting/payout-statements')).send(input).expect(400)
    await auth(request(app).post('/api/accounting/payout-statements')).send(statement({ currency: 'USD' })).expect(409)
    const mismatch = statement({ merchantId: 'autre-marchand' })
    const created = await auth(request(app).post('/api/accounting/payout-statements')).send(mismatch).expect(201)
    expect(created.body.payouts[0].unresolved).toContain('CAPTURE_UNMATCHED:' + captureId)
  })
  it('sérialise deux imports identiques et exige les droits responsables', async () => {
    const input = statement(); input.payouts[0].lines[0].externalRef = 'FICTIF-CONCURRENT'
    const results = await Promise.all([input, { ...input, requestId: randomUUID() }].map(body => auth(request(app).post('/api/accounting/payout-statements')).send(body)))
    expect(results.map(r => r.status).sort()).toEqual([200, 201]); expect(results[0].body.id).toBe(results[1].body.id)
    await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'EMPLOYEE' } })
    try { await auth(request(app).get('/api/accounting/payouts')).expect(403); await auth(request(app).post('/api/accounting/payout-statements')).send(statement()).expect(403) }
    finally { await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'OWNER' } }) }
    await request(app).get('/api/accounting/payouts').set('Authorization', `Bearer ${token}`).set('x-company-id', 'autre-societe').expect(403)
  })
})
