import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// PostgreSQL réel, client dédié. La faute ne vise que nos UUID fictifs et
// intervient après le vrai INSERT afin de contrôler le rollback.
vi.mock('../lib/prisma', async () => {
  const { PrismaClient } = await import('@prisma/client')
  return { default: new PrismaClient() }
})
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import invoices from './invoices'

const prefix = 'credit-rejection-fictive-' + randomUUID()
const companyA = prefix + '-a', companyB = prefix + '-b', ownerId = prefix + '-owner', employeeId = prefix + '-employee'
const app = express().use(express.json()).use('/api/invoices', deviceOrUserAuth, requireCompany, invoices)
const failAfterCreate = new Set<string>()
prisma.$use(async (params, next) => {
  const result = await next(params)
  if (params.model === 'CreditNote' && params.action === 'create' && failAfterCreate.has(params.args.data.id)) throw Error('Panne FICTIVE après INSERT de l’avoir')
  return result
})
const token = (userId = ownerId) => jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '30m' })
const call = (invoiceId: string, body: any, companyId = companyA, userId = ownerId) => request(app).post(`/api/invoices/${invoiceId}/credit-notes`)
  .set('Authorization', 'Bearer ' + token(userId)).set('x-company-id', companyId).send(body)
const input = (amountCents?: number) => ({ requestId: randomUUID(), reason: 'Correction commerciale FICTIVE', ...(amountCents === undefined ? {} : { amountCents }) })
const rows = (invoiceId: string) => prisma.creditNote.findMany({ where: { invoiceId } })
const noProof = (response: any) => { expect(response.body.code).toBeUndefined(); expect(response.body.outcome).toBeUndefined(); expect(response.body.requestId).toBeUndefined() }
async function issued(companyId = companyA) {
  const created = await request(app).post('/api/invoices').set('Authorization', 'Bearer ' + token()).set('x-company-id', companyId)
    .send({ items: [{ description: 'Café FICTIF', quantity: 1, unitPrice: 8.76, taxRate: 17 }] }).expect(201)
  await request(app).put(`/api/invoices/${created.body.id}/status`).set('Authorization', 'Bearer ' + token()).set('x-company-id', companyId).send({ status: 'SENT' }).expect(200)
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: created.body.id } })
  expect(Number(invoice.total)).toBe(10.25)
  return invoice
}

describe('Avoir : preuve restrictive de refus avant émission, sans effacement ni remboursement', () => {
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!)
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || url.hostname !== '127.0.0.1' || url.port !== '5450' || url.pathname !== '/creorga_tests') throw Error('Seule creorga_tests sur loopback:5450 est autorisée')
    await prisma.company.createMany({ data: [companyA, companyB].map(id => ({ id, name: 'AVOIRS FICTIFS', address: 'Adresse de recette fictive' })) })
    await prisma.user.createMany({ data: [ownerId, employeeId].map(id => ({ id, email: id + '@fixture.invalid', password: 'unused', firstName: 'Avoir', lastName: 'FICTIF' })) })
    await prisma.userCompany.createMany({ data: [{ companyId: companyA, userId: ownerId, role: 'OWNER' }, { companyId: companyB, userId: ownerId, role: 'OWNER' }, { companyId: companyA, userId: employeeId, role: 'EMPLOYEE' }] })
  })
  // Toutes les fixtures et pièces de preuve sont conservées : aucune purge.
  afterAll(async () => { failAfterCreate.clear(); await prisma.$disconnect() })

  it('un dépassement 11 EUR sur 10,25 EUR retourne la preuve liée à la demande et ne crée rien', async () => {
    const invoice = await issued(), body = input(1100)
    const result = await call(invoice.id, body).expect(409)
    expect(result.body).toMatchObject({ code: 'CREDIT_AMOUNT_EXCEEDS_AVAILABLE', outcome: 'NOT_ISSUED', requestId: body.requestId,
      companyId: companyA, actorId: ownerId, invoiceId: invoice.id, amountCents: 1100, availableCents: 1025, reason: body.reason })
    expect(await rows(invoice.id)).toEqual([])
    expect(await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).toEqual(invoice)
  })

  it('rejouer le refus exact reste sans émission ; une nouvelle référence corrigée crée seulement 2,50 EUR', async () => {
    const invoice = await issued(), refused = input(1100)
    const first = await call(invoice.id, refused).expect(409), replay = await call(invoice.id, refused).expect(409)
    expect(replay.body).toEqual(first.body)
    expect(replay.body.outcome).toBe('NOT_ISSUED')
    const corrected = input(250), accepted = await call(invoice.id, corrected).expect(201)
    expect(accepted.body).toMatchObject({ id: corrected.requestId, totalCents: 250, baseCents: 214, taxCents: 36 })
    expect(await rows(invoice.id)).toHaveLength(1)
    expect(await prisma.creditNote.findUnique({ where: { id: refused.requestId } })).toBeNull()
    expect(await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).toEqual(invoice)
  })

  it('huit dépassements concurrents d’une même demande sont tous refusés sans numéro ni pièce persistés', async () => {
    const invoice = await issued(), body = input(1100)
    const results = await Promise.all(Array.from({ length: 8 }, () => call(invoice.id, body)))
    expect(results.every(r => r.status === 409 && r.body.outcome === 'NOT_ISSUED' && r.body.requestId === body.requestId)).toBe(true)
    expect(await rows(invoice.id)).toEqual([])
    expect(await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).toEqual(invoice)
  })

  it('un succès dont la réponse était perdue est rejoué comme la même pièce, jamais comme un refus modifiable', async () => {
    const invoice = await issued(), body = input(250)
    const created = await call(invoice.id, body).expect(201)
    const replay = await call(invoice.id, body).expect(200)
    expect(replay.body).toEqual(created.body); noProof(replay)
    expect(await rows(invoice.id)).toHaveLength(1)
  })

  it('une collision avec un avoir existant ne fournit jamais la preuve de non-émission', async () => {
    const invoice = await issued(), body = input(250)
    await call(invoice.id, body).expect(201)
    const collision = await call(invoice.id, { ...body, amountCents: 1100 }).expect(409)
    noProof(collision)
    expect((await rows(invoice.id)).map(c => c.totalCents)).toEqual([250])
  })

  it('une référence émise sur une autre facture reste une collision, même si le nouveau montant dépasse le solde', async () => {
    const first = await issued(), second = await issued(), body = input(250)
    await call(first.id, body).expect(201)
    noProof(await call(second.id, { ...body, amountCents: 1100 }).expect(409))
    expect(await rows(second.id)).toEqual([])
  })

  it('ne transforme pas une référence d’une autre société en preuve de non-émission', async () => {
    const first = await issued(), second = await issued(companyB), body = input(250)
    await call(first.id, body).expect(201)
    noProof(await call(second.id, { ...body, amountCents: 1100 }, companyB).expect(409))
    expect(await rows(second.id)).toEqual([])
  })

  it('deux sociétés reçoivent seulement leur propre solde et leur propre preuve', async () => {
    const first = await issued(), second = await issued(companyB)
    const results = await Promise.all([call(first.id, input(1100)), call(second.id, input(1200), companyB)])
    expect(results[0].body).toMatchObject({ companyId: companyA, actorId: ownerId, invoiceId: first.id, amountCents: 1100, availableCents: 1025 })
    expect(results[1].body).toMatchObject({ companyId: companyB, actorId: ownerId, invoiceId: second.id, amountCents: 1200, availableCents: 1025 })
  })

  it('un original non émis ou corrompu ne donne pas de preuve de refus définitif', async () => {
    const draft = await prisma.invoice.create({ data: { companyId: companyA, number: 'DRAFT-' + randomUUID(), total: 10.25 } })
    noProof(await call(draft.id, input(1100)).expect(422))
    const invoice = await issued()
    await prisma.invoice.update({ where: { id: invoice.id }, data: { issuedPdfHash: 'integrity-fictive-invalid' } })
    noProof(await call(invoice.id, input(1100)).expect(422))
    expect(await rows(invoice.id)).toEqual([])
  })

  it('ne certifie pas une entrée invalide, un salarié ni un document d’une autre société', async () => {
    const invoice = await issued()
    noProof(await call(invoice.id, { ...input(1100), requestId: 'not-a-uuid' }).expect(400))
    noProof(await call(invoice.id, input(1100), companyA, employeeId).expect(403))
    noProof(await call(invoice.id, input(1100), companyB).expect(404))
    noProof(await call(invoice.id, input(1100), companyB, employeeId).expect(403))
    expect(await rows(invoice.id)).toEqual([])
  })

  it('un solde nul demandé sans montant reste générique ; un montant positif explicitement excessif est prouvé', async () => {
    const invoice = await issued()
    await call(invoice.id, input()).expect(201)
    noProof(await call(invoice.id, input()).expect(409))
    const body = input(1), excess = await call(invoice.id, body).expect(409)
    expect(excess.body).toMatchObject({ code: 'CREDIT_AMOUNT_EXCEEDS_AVAILABLE', outcome: 'NOT_ISSUED', requestId: body.requestId, availableCents: 0, amountCents: 1 })
    expect(await rows(invoice.id)).toHaveLength(1)
  })

  it('une faute après le vrai INSERT rollback la pièce mais renvoie seulement 503 ; le même UUID peut être repris', async () => {
    const invoice = await issued(), body = input(250)
    failAfterCreate.add(body.requestId)
    try { noProof(await call(invoice.id, body).expect(503)); expect(await rows(invoice.id)).toEqual([]) }
    finally { failAfterCreate.delete(body.requestId) }
    await call(invoice.id, body).expect(201)
    expect((await rows(invoice.id)).map(c => c.id)).toEqual([body.requestId])
    expect(await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).toEqual(invoice)
  })

  it('des refus et émissions concurrents ne créent aucun centime et ne changent pas la TVA originale', async () => {
    const invoice = await issued()
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => call(invoice.id, input(i % 2 ? 1100 : 100))))
    expect(results.filter(r => r.status === 201)).toHaveLength(4)
    const refused = results.filter(r => r.status === 409)
    expect(refused).toHaveLength(4)
    expect(refused.every(r => r.body.outcome === 'NOT_ISSUED' && r.body.amountCents > r.body.availableCents)).toBe(true)
    const credits = await rows(invoice.id)
    expect(credits.reduce((sum, c) => sum + c.totalCents, 0)).toBe(400)
    expect(new Set(credits.map(c => c.number)).size).toBe(4)
    expect(await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).toEqual(invoice)
  })
})
