import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany } from '../middleware/requireCompany'
import accounting from './accounting'
import orders from './orders'
const app = express(); app.use(express.json()); app.use('/api/accounting', deviceOrUserAuth, requireCompany, accounting); app.use('/api/orders', deviceOrUserAuth, orders)
const userId = 'integration-cash-owner', companies: string[] = []
let token: string, companyId: string
const auth = (r: any) => r.set('Authorization', `Bearer ${token}`).set('x-company-id', companyId)
const open = () => auth(request(app).post('/api/accounting/cash-drawers/open')).send({ requestId: randomUUID(), openAmount: 100 })
describe('Clôture : journal durable, mouvements, comptage et reprise', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || !new URL(process.env.DATABASE_URL!).pathname.endsWith('/creorga_tests')) throw new Error('Base fictive obligatoire')
    await prisma.user.create({ data: { id: userId, email: 'cash@localhost.invalid', password: 'unused', firstName: 'Test', lastName: 'Owner' } })
    token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '20m' })
  })
  beforeEach(async () => {
    companyId = 'integration-cash-' + randomUUID(); companies.push(companyId)
    await prisma.company.create({ data: { id: companyId, name: 'Caisse fictive uniquement' } })
    await prisma.userCompany.create({ data: { userId, companyId, role: 'OWNER' } })
  })
  afterAll(async () => {
    const where = { companyId: { in: companies } }
    if ((prisma as any).cashMovement) await (prisma as any).cashMovement.deleteMany({ where })
    await prisma.paymentAttempt.deleteMany({ where }); await prisma.order.deleteMany({ where }); await prisma.cashDrawer.deleteMany({ where })
    await prisma.userCompany.deleteMany({ where: { userId } }); await prisma.company.deleteMany({ where: { id: { in: companies } } }); await prisma.user.deleteMany({ where: { id: userId } }); await prisma.$disconnect()
  })
  it('une seule ouverture gagne parmi vingt demandes concurrentes', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, open))
    expect(results.filter(r => r.status === 201)).toHaveLength(1)
    expect(results.filter(r => r.status === 409)).toHaveLength(19)
  }, 60000)
  it('compte un acompte espèces même si la commande n’est pas encore payée entièrement', async () => {
    const drawer = (await open().expect(201)).body
    const order = await prisma.order.create({ data: { companyId, orderNumber: 1, total: 11.7, subtotal: 10, taxAmount: 1.7 } })
    await auth(request(app).post(`/api/orders/${order.id}/checkout`)).send({ requestId: randomUUID(), paymentMethod: 'CASH', partialAmountCents: 500, cashReceived: 10 }).expect(200)
    const movement = { requestId: randomUUID(), direction: 'OUT', amountCents: 1000, reason: 'Dépôt fictif au coffre' }
    await auth(request(app).post(`/api/accounting/cash-drawers/${drawer.id}/movements`)).send(movement).expect(201)
    await auth(request(app).post(`/api/accounting/cash-drawers/${drawer.id}/movements`)).send(movement).expect(200)
    const report = await auth(request(app).get(`/api/accounting/cash-drawers/${drawer.id}/report`)).expect(200)
    expect(report.body).toMatchObject({ openingCents: 10000, cashReceiptsCents: 500, movementOutCents: 1000, expectedCents: 9500 })
    const close = { requestId: randomUUID(), closeAmount: 95 }
    const closed = await auth(request(app).put(`/api/accounting/cash-drawers/${drawer.id}/close`)).send(close).expect(200)
    expect(closed.body.discrepancy).toBe(0)
    const repeated = await auth(request(app).put(`/api/accounting/cash-drawers/${drawer.id}/close`)).send(close).expect(200)
    expect(repeated.body).toEqual(closed.body)
    const frozen = await auth(request(app).get(`/api/accounting/cash-drawers/${drawer.id}/report`)).expect(200)
    expect(frozen.body.frozen).toBe(true); expect(frozen.body.expectedCents).toBe(9500)
  })
  it('exige une justification de l’écart et ne réécrit pas une clôture', async () => {
    const drawer = (await open().expect(201)).body
    await auth(request(app).put(`/api/accounting/cash-drawers/${drawer.id}/close`)).send({ requestId: randomUUID(), closeAmount: 99 }).expect(422)
    const close = { requestId: randomUUID(), closeAmount: 99, notes: 'Écart de recette fictif expliqué' }
    await auth(request(app).put(`/api/accounting/cash-drawers/${drawer.id}/close`)).send(close).expect(200)
    await auth(request(app).put(`/api/accounting/cash-drawers/${drawer.id}/close`)).send({ ...close, closeAmount: 100 }).expect(409)
    await auth(request(app).post(`/api/accounting/cash-drawers/${drawer.id}/movements`)).send({ requestId: randomUUID(), direction: 'IN', amountCents: 100, reason: 'Après clôture interdit' }).expect(409)
  })
  it('vingt reprises de clôture rendent exactement le même rapport sans réécriture', async () => {
    const drawer = (await open().expect(201)).body, close = { requestId: randomUUID(), closeAmount: 100 }
    const results = await Promise.all(Array.from({ length: 20 }, () => auth(request(app).put(`/api/accounting/cash-drawers/${drawer.id}/close`)).send(close)))
    expect(results.every(r => r.status === 200)).toBe(true)
    expect(new Set(results.map(r => JSON.stringify(r.body.closeSnapshot))).size).toBe(1)
    expect(results[0].body.closeSnapshot.expectedCents).toBe(10000)
  }, 60000)
  it('refuse les opérations de responsable au salarié et les lectures intersociétés', async () => {
    const drawer = (await open().expect(201)).body
    await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'EMPLOYEE' } })
    await auth(request(app).put(`/api/accounting/cash-drawers/${drawer.id}/close`)).send({ requestId: randomUUID(), closeAmount: 100 }).expect(403)
    await auth(request(app).post(`/api/accounting/cash-drawers/${drawer.id}/movements`)).send({ requestId: randomUUID(), direction: 'OUT', amountCents: 100, reason: 'Retrait interdit' }).expect(403)
    await prisma.userCompany.update({ where: { userId_companyId: { userId, companyId } }, data: { role: 'OWNER' } })
    const other = await prisma.cashDrawer.create({ data: { companyId: companies[0], userId, openAmount: 0, closedAt: new Date() } })
    await auth(request(app).get(`/api/accounting/cash-drawers/${other.id}/report`)).expect(404)
  })
})
