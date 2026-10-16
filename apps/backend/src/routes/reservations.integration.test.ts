import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { requireCompany } from '../middleware/requireCompany'
import reservations from './reservations'
const app = express().use(express.json()).use('/api/reservations', authenticate, requireCompany, reservations)
const companyId = 'reservation-lab-' + randomUUID(), otherId = companyId + '-other', userId = companyId + '-owner'
let token: string, tableId: string, foreignTable: string, foreignCustomer: string
const auth = (r: any) => r.set('Authorization', 'Bearer ' + token).set('x-company-id', companyId)
const body = () => ({ tableId, guestName: 'Groupe fictif', date: '2027-01-10T12:00:00Z', partySize: 2 })
describe('Réservations : concurrence et isolation des relations', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || new URL(process.env.DATABASE_URL!).pathname !== '/creorga_tests') throw new Error('Base fictive obligatoire')
    await prisma.company.createMany({ data: [{ id: companyId, name: 'RÉSERVATION FICTIF A' }, { id: otherId, name: 'RÉSERVATION FICTIF B' }] })
    await prisma.user.create({ data: { id: userId, email: userId + '@localhost.invalid', password: 'unused', firstName: 'Test', lastName: 'Owner' } })
    await prisma.userCompany.create({ data: { companyId, userId, role: 'OWNER' } })
    tableId = (await prisma.table.create({ data: { companyId, name: 'Table fictive A' } })).id
    foreignTable = (await prisma.table.create({ data: { companyId: otherId, name: 'NE JAMAIS DIVULGUER' } })).id
    foreignCustomer = (await prisma.customer.create({ data: { companyId: otherId, firstName: 'Client', lastName: 'Autre société' } })).id
    token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '30m' })
  })
  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { companyId } }); await prisma.table.deleteMany({ where: { companyId: { in: [companyId, otherId] } } }); await prisma.customer.deleteMany({ where: { companyId: otherId } })
    await prisma.userCompany.deleteMany({ where: { companyId } }); await prisma.user.delete({ where: { id: userId } }); await prisma.company.deleteMany({ where: { id: { in: [companyId, otherId] } } }); await prisma.$disconnect()
  })
  it('refuse une table ou un client d’une autre société, y compris à la modification', async () => {
    await auth(request(app).post('/api/reservations')).send({ ...body(), tableId: foreignTable }).expect(404)
    await auth(request(app).post('/api/reservations')).send({ ...body(), customerId: foreignCustomer }).expect(404)
    const created = (await auth(request(app).post('/api/reservations')).send({ ...body(), date: '2027-02-10T12:00:00Z' }).expect(201)).body
    await auth(request(app).put('/api/reservations/' + created.id)).send({ tableId: foreignTable }).expect(404)
    expect((await prisma.reservation.findUniqueOrThrow({ where: { id: created.id } })).tableId).toBe(tableId)
  })
  it('une seule réservation gagne lors de vingt créations concurrentes sur le même créneau', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => auth(request(app).post('/api/reservations')).send(body())))
    expect(results.filter(r => r.status === 201)).toHaveLength(1)
    expect(results.filter(r => r.status === 409)).toHaveLength(19)
  })
  it('une modification ou réactivation ne peut pas contourner le conflit de table', async () => {
    const later = (await auth(request(app).post('/api/reservations')).send({ ...body(), date: '2027-01-10T18:00:00Z' }).expect(201)).body
    await auth(request(app).put('/api/reservations/' + later.id)).send({ date: body().date }).expect(409)
    const open = (await auth(request(app).get('/api/reservations')).expect(200)).body.find((r: any) => r.date === body().date.replace('Z', '.000Z'))
    await auth(request(app).put('/api/reservations/' + open.id + '/status')).send({ status: 'CANCELLED' }).expect(200)
    await auth(request(app).put('/api/reservations/' + later.id)).send({ date: body().date }).expect(200)
    await auth(request(app).put('/api/reservations/' + open.id + '/status')).send({ status: 'CONFIRMED' }).expect(409)
    await auth(request(app).put('/api/reservations/' + later.id)).send({ date: 'incorrecte' }).expect(400)
  })
  it('la base refuse les relations intersociétés même sans passer par HTTP', async () => {
    await expect(prisma.reservation.create({ data: { ...body(), companyId, date: new Date(body().date), tableId: foreignTable } })).rejects.toMatchObject({ code: 'P2003' })
    await expect(prisma.reservation.create({ data: { ...body(), companyId, date: new Date(body().date), customerId: foreignCustomer } })).rejects.toMatchObject({ code: 'P2003' })
  })
  it('le filtre journalier suit Luxembourg, même lors du passage à l’heure d’été', async () => {
    const early = await prisma.reservation.create({ data: { companyId, guestName: 'Minuit Luxembourg fictif', date: new Date('2027-03-27T23:10:00Z') } })
    const late = await prisma.reservation.create({ data: { companyId, guestName: 'Fin de journée fictive', date: new Date('2027-03-28T21:50:00Z') } })
    const next = await prisma.reservation.create({ data: { companyId, guestName: 'Jour suivant fictif', date: new Date('2027-03-28T22:10:00Z') } })
    const rows = (await auth(request(app).get('/api/reservations?date=2027-03-28')).expect(200)).body.map((r: any) => r.id)
    expect(rows).toContain(early.id); expect(rows).toContain(late.id); expect(rows).not.toContain(next.id)
  })
})
