import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/prisma', async () => {
  const { PrismaClient } = await import('@prisma/client')
  return { default: new PrismaClient() }
})
// Le chemin manuel n'a aucune raison d'appeler un acquéreur. Toute tentative
// accidentelle est bloquée avant un appel externe et fait échouer la recette.
const remote = vi.hoisted(() => ({ calls: 0 }))
vi.mock('../lib/payments/gateway', async original => ({ ...await original<typeof import('../lib/payments/gateway')>(),
  getGateway: () => { remote.calls++; throw Error('Connecteur externe interdit dans la recette manuelle') },
}))
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import payments from './payments'
import invoices from './invoices'

const prefix = 'manual-refusal-fictive-' + randomUUID()
const companyA = prefix + '-a', companyB = prefix + '-b', noDrawerCompany = prefix + '-no-drawer'
const ownerId = prefix + '-owner', employeeId = prefix + '-employee'
const app = express().use(express.json()).use('/api/invoices', deviceOrUserAuth, requireCompany, invoices).use('/api/payments', deviceOrUserAuth, payments)
const failAfterMovement = new Set<string>(), failAfterRefund = new Set<string>()
prisma.$use(async (params, next) => {
  const result = await next(params)
  if (params.action === 'create' && ((params.model === 'CashMovement' && failAfterMovement.has(params.args.data.id)) || (params.model === 'ManualRefund' && failAfterRefund.has(params.args.data.id)))) throw Error('Panne FICTIVE après écriture SQL manuelle')
  return result
})
let orderNumber = 1
const drawers = new Map<string, string>()
const token = (userId = ownerId) => jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '30m' })
const auth = (r: any, companyId = companyA, userId = ownerId) => r.set('Authorization', 'Bearer ' + token(userId)).set('x-company-id', companyId)
const call = (body: any, companyId = companyA, userId = ownerId) => auth(request(app).post('/api/payments/manual-refunds'), companyId, userId).send(body)
const noProof = (response: any) => { expect([undefined, 'CAPABILITY_REQUIRED']).toContain(response.body.code); expect(response.body.outcome).toBeUndefined(); expect(response.body.requestId).toBeUndefined() }
async function fixture(companyId = companyA, method: 'CASH' | 'CARD' = 'CASH', tenderCents = 225, creditCents = 250) {
  const order = await prisma.order.create({ data: { companyId, orderNumber: orderNumber++, subtotal: 8.76, taxAmount: 1.49, total: 10.25, status: 'PAID', paidAt: new Date() } })
  const invoiceResult = await auth(request(app).post('/api/invoices'), companyId).send({ orderId: order.id, items: [{ description: 'Service FICTIF', quantity: 1, unitPrice: 8.76, taxRate: 17 }] }).expect(201)
  await auth(request(app).put(`/api/invoices/${invoiceResult.body.id}/status`), companyId).send({ status: 'SENT' }).expect(200)
  const creditResult = await auth(request(app).post(`/api/invoices/${invoiceResult.body.id}/credit-notes`), companyId).send({ requestId: randomUUID(), amountCents: creditCents, reason: 'Correction FICTIVE du service' }).expect(201)
  const manualAttempt = await prisma.paymentAttempt.create({ data: { companyId, orderId: order.id, requestId: randomUUID(), requestHash: 'manual-fixture', provider: 'manual', merchantId: 'manual:' + companyId, amountCents: tenderCents, currency: 'EUR', status: 'DECLARED' } })
  const tender = await prisma.orderTender.create({ data: { companyId, orderId: order.id, attemptId: manualAttempt.id, actorId: ownerId, method, amountCents: tenderCents, confirmation: 'manual_declaration', cashDrawerId: method === 'CASH' ? drawers.get(companyId) : undefined } })
  return { companyId, order, tender, invoice: await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceResult.body.id } }), credit: await prisma.creditNote.findUniqueOrThrow({ where: { id: creditResult.body.id } }) }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
const input = (f: Fixture, amountCents = 250) => ({ requestId: randomUUID(), creditNoteId: f.credit.id, tenderId: f.tender.id, method: f.tender.method, amountCents, reason: 'Retour FICTIF autorisé', reference: 'JUSTIFICATIF-FICTIF' })
const refunds = (f: Fixture) => prisma.manualRefund.findMany({ where: { companyId: f.companyId, creditNoteId: f.credit.id } })
const assertNoWrites = async (f: Fixture, body: any) => {
  expect(await prisma.manualRefund.findUnique({ where: { id: body.requestId } })).toBeNull()
  expect(await prisma.cashMovement.findUnique({ where: { id: body.requestId } })).toBeNull()
  expect(await prisma.creditNote.findUniqueOrThrow({ where: { id: f.credit.id } })).toEqual(f.credit)
  expect(await prisma.invoice.findUniqueOrThrow({ where: { id: f.invoice.id } })).toEqual(f.invoice)
  expect(await prisma.orderTender.findUniqueOrThrow({ where: { id: f.tender.id } })).toEqual(f.tender)
  expect(await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).toEqual(f.order)
}
async function reserve(f: Fixture, status: 'UNKNOWN' | 'REVIEW' | 'SUCCEEDED', amountCents = 100) {
  const attempt = await prisma.paymentAttempt.create({ data: { companyId: f.companyId, orderId: f.order.id, requestId: randomUUID(), requestHash: 'FICTIF', provider: 'paypal', merchantId: 'merchant-fictive', amountCents: 1025, currency: 'EUR', status: 'SUCCEEDED', externalId: 'origin-fictive-' + randomUUID() } })
  const settlement = await prisma.paymentSettlement.create({ data: { companyId: f.companyId, orderId: f.order.id, attemptId: attempt.id, provider: 'paypal', merchantId: 'merchant-fictive', captureId: 'capture-fictive-' + randomUUID(), amountCents: 1025, currency: 'EUR' } })
  return prisma.refundAttempt.create({ data: { id: randomUUID(), companyId: f.companyId, creditNoteId: f.credit.id, settlementId: settlement.id, actorId: ownerId, reason: 'Réservation FICTIVE préexistante', requestHash: 'reserved-fictive', provider: 'paypal', merchantId: 'merchant-fictive', captureId: settlement.captureId, currency: 'EUR', amountCents, status,
    allocations: { create: [{ orderId: f.order.id, amountCents }] } }, include: { allocations: true } })
}

describe('Déclaration de remboursement : preuve restrictive de non-enregistrement', () => {
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!)
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || url.hostname !== '127.0.0.1' || url.port !== '5450' || url.pathname !== '/creorga_tests') throw Error('Seule creorga_tests sur loopback:5450 est autorisée')
    await prisma.company.createMany({ data: [companyA, companyB, noDrawerCompany].map(id => ({ id, name: 'REMBOURSEMENTS FICTIFS', address: 'Adresse de recette fictive' })) })
    await prisma.user.createMany({ data: [ownerId, employeeId].map(id => ({ id, email: id + '@fixture.invalid', firstName: 'Retour', lastName: 'FICTIF', password: 'unused' })) })
    await prisma.userCompany.createMany({ data: [...[companyA, companyB, noDrawerCompany].map(companyId => ({ companyId, userId: ownerId, role: 'OWNER' })), { companyId: companyA, userId: employeeId, role: 'EMPLOYEE' }] })
    for (const companyId of [companyA, companyB]) drawers.set(companyId, (await prisma.cashDrawer.create({ data: { companyId, userId: ownerId, ledgerVersion: 2, openAmount: 100 } })).id)
  })
  // Préservation des fixtures, pièces et réservations : aucune purge ni libération.
  afterAll(async () => { failAfterMovement.clear(); failAfterRefund.clear(); await prisma.$disconnect(); expect(remote.calls).toBe(0) })

  it.each(['CASH', 'CARD'] as const)('%s : 2,50 EUR sur un règlement de 2,25 retourne NOT_RECORDED sans écriture', async method => {
    const f = await fixture(companyA, method), body = input(f)
    const result = await call(body).expect(409)
    expect(result.body).toMatchObject({ code: 'MANUAL_REFUND_AMOUNT_EXCEEDS_AVAILABLE', outcome: 'NOT_RECORDED', reservationPolicy: 'UNCHANGED', rejectionBasis: 'TENDER_LIMIT',
      requestId: body.requestId, companyId: companyA, actorId: ownerId, invoiceId: f.invoice.id, creditNoteId: f.credit.id, tenderId: f.tender.id, method, amountCents: 250,
      creditLimitCents: 250, tenderAvailableCents: 225, providerReservedCents: 0, creditAvailableCents: 250, currency: 'EUR', reason: body.reason, reference: body.reference })
    await assertNoWrites(f, body)
  })

  it('une nouvelle référence corrigée à 2,25 crée une seule déclaration et une seule sortie espèces', async () => {
    const f = await fixture(), original = input(f)
    expect((await call(original).expect(409)).body.outcome).toBe('NOT_RECORDED')
    const corrected = input(f, 225), accepted = await call(corrected).expect(201)
    expect(accepted.body).toMatchObject({ id: corrected.requestId, amountCents: 225, status: 'DECLARED', confirmation: 'manual_declaration', cashMovementId: corrected.requestId })
    expect((await refunds(f)).map(row => row.id)).toEqual([corrected.requestId])
    expect(await prisma.cashMovement.findUniqueOrThrow({ where: { id: corrected.requestId } })).toMatchObject({ direction: 'OUT', amountCents: 225, drawerId: drawers.get(companyA) })
    expect(await prisma.manualRefund.findUnique({ where: { id: original.requestId } })).toBeNull()
    expect((await call(original).expect(409)).body.outcome).toBe('NOT_RECORDED')
    expect(await prisma.orderTender.findUniqueOrThrow({ where: { id: f.tender.id } })).toEqual(f.tender)
  })

  it('huit rejeux excessifs concurrents ne créent ni déclaration ni mouvement', async () => {
    const f = await fixture(), body = input(f)
    const results = await Promise.all(Array.from({ length: 8 }, () => call(body)))
    expect(results.every(r => r.status === 409 && r.body.outcome === 'NOT_RECORDED' && r.body.requestId === body.requestId)).toBe(true)
    expect(await refunds(f)).toEqual([]); await assertNoWrites(f, body)
  })

  it('douze rejeux d’une déclaration déjà enregistrée retournent la pièce existante et jamais une preuve de refus', async () => {
    const f = await fixture(), body = input(f, 100)
    const created = await call(body).expect(201)
    const results = await Promise.all(Array.from({ length: 12 }, () => call(body)))
    expect(results.every(r => r.status === 200)).toBe(true)
    for (const response of results) { expect(response.body).toEqual(created.body); noProof(response) }
    expect(await refunds(f)).toHaveLength(1)
    expect(await prisma.cashMovement.count({ where: { id: body.requestId } })).toBe(1)
  })

  it('une collision de body existant garde un refus générique même quand le nouveau montant est excessif', async () => {
    const f = await fixture(), body = input(f, 100)
    await call(body).expect(201)
    noProof(await call({ ...body, amountCents: 250 }).expect(409))
    expect((await refunds(f)).map(r => r.amountCents)).toEqual([100])
  })

  it('une référence déjà présente dans un mouvement sans déclaration exige rapprochement et ne reçoit aucune preuve d’abandon', async () => {
    const f = await fixture(), body = input(f)
    const movement = await prisma.cashMovement.create({ data: { id: body.requestId, companyId: companyA, drawerId: drawers.get(companyA)!, actorId: ownerId, direction: 'OUT', amountCents: 100, reason: 'Mouvement FICTIF préexistant à rapprocher', requestHash: 'existing-fictive' } })
    noProof(await call(body).expect(409))
    expect(await refunds(f)).toEqual([])
    expect(await prisma.cashMovement.findUniqueOrThrow({ where: { id: body.requestId } })).toEqual(movement)
  })

  it('une référence d’une autre société n’est jamais déclarée non enregistrée dans la seconde', async () => {
    const first = await fixture(), second = await fixture(companyB), body = input(first, 100)
    await call(body).expect(201)
    noProof(await call({ ...input(second), requestId: body.requestId }, companyB).expect(409))
    expect(await refunds(second)).toEqual([])
  })

  it.each(['UNKNOWN', 'REVIEW', 'SUCCEEDED'] as const)('un dépassement dû uniquement à une réservation %s garde sa référence et la réservation intactes', async status => {
    const f = await fixture(companyA, 'CARD', 800), reserved = await reserve(f, status), body = input(f, 200)
    noProof(await call(body).expect(409))
    expect(await prisma.refundAttempt.findUniqueOrThrow({ where: { id: reserved.id }, include: { allocations: true } })).toEqual(reserved)
    expect(await refunds(f)).toEqual([]); await assertNoWrites(f, body)
  })

  it.each(['UNKNOWN', 'REVIEW'] as const)('un plafond règlement indépendant peut être prouvé sans toucher la réservation %s', async status => {
    const f = await fixture(), reserved = await reserve(f, status), body = input(f)
    const result = await call(body).expect(409)
    expect(result.body).toMatchObject({ outcome: 'NOT_RECORDED', rejectionBasis: 'TENDER_LIMIT', creditLimitCents: 250, tenderAvailableCents: 225, providerReservedCents: 100, creditAvailableCents: 150, reservationPolicy: 'UNCHANGED' })
    expect(await prisma.refundAttempt.findUniqueOrThrow({ where: { id: reserved.id }, include: { allocations: true } })).toEqual(reserved)
    await assertNoWrites(f, body)
  })

  it('le plafond de l’avoir hors réservations est indépendant et prouvé sans mouvement carte', async () => {
    const f = await fixture(companyA, 'CARD', 800), body = input(f, 300)
    expect((await call(body).expect(409)).body).toMatchObject({ outcome: 'NOT_RECORDED', rejectionBasis: 'CREDIT_LIMIT_EXCLUDING_PROVIDER_RESERVATIONS', creditLimitCents: 250, tenderAvailableCents: 800 })
    await assertNoWrites(f, body)
  })

  it('une méthode ou une origine incompatible reste un refus générique avant toute preuve de plafond', async () => {
    const f = await fixture(companyA, 'CARD'), body = input(f)
    noProof(await call({ ...body, method: 'CASH' }).expect(409))
    const foreignOrigin = await fixture()
    noProof(await call({ ...body, tenderId: foreignOrigin.tender.id }).expect(409))
    await assertNoWrites(f, body)
  })

  it('une caisse absente refuse sans preuve de dépassement et sans créer de mouvement', async () => {
    const f = await fixture(noDrawerCompany), body = input(f, 100)
    noProof(await call(body, noDrawerCompany).expect(409))
    await assertNoWrites(f, body)
  })

  it('validation, droits et cloisonnement ne fournissent jamais la preuve de non-enregistrement', async () => {
    const f = await fixture(), body = input(f)
    noProof(await call({ ...body, requestId: 'invalid' }).expect(400))
    noProof(await call(body, companyA, employeeId).expect(403))
    noProof(await call(body, companyB).expect(404))
    noProof(await call(body, companyB, employeeId).expect(403))
    await assertNoWrites(f, body)
  })

  it.each(['CashMovement', 'ManualRefund'])('une panne après le vrai INSERT %s rollback toutes les écritures ; seul le même UUID est repris', async model => {
    const f = await fixture(), body = input(f, 100), faults = model === 'CashMovement' ? failAfterMovement : failAfterRefund
    faults.add(body.requestId)
    try { noProof(await call(body).expect(503)); await assertNoWrites(f, body) } finally { faults.delete(body.requestId) }
    await call(body).expect(201)
    expect((await refunds(f)).map(r => r.id)).toEqual([body.requestId])
    expect(await prisma.cashMovement.count({ where: { id: body.requestId } })).toBe(1)
  })

  it('huit demandes concurrentes sont plafonnées sans double mouvement ni modification des sources', async () => {
    const f = await fixture(), bodies = Array.from({ length: 8 }, () => input(f, 100))
    const results = await Promise.all(bodies.map(body => call(body)))
    expect(results.filter(r => r.status === 201)).toHaveLength(2)
    const refused = results.filter(r => r.status === 409)
    expect(refused).toHaveLength(6); expect(refused.every(r => r.body.outcome === 'NOT_RECORDED')).toBe(true)
    const saved = await refunds(f)
    expect(saved.reduce((sum, r) => sum + r.amountCents, 0)).toBe(200)
    expect(await prisma.cashMovement.count({ where: { id: { in: bodies.map(body => body.requestId) } } })).toBe(2)
    expect(await prisma.invoice.findUniqueOrThrow({ where: { id: f.invoice.id } })).toEqual(f.invoice)
    expect(await prisma.creditNote.findUniqueOrThrow({ where: { id: f.credit.id } })).toEqual(f.credit)
    expect(await prisma.orderTender.findUniqueOrThrow({ where: { id: f.tender.id } })).toEqual(f.tender)
  })
})
