import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { requireCompany } from '../middleware/requireCompany'
import crm from './crm'

const app = express(); app.use(express.json()); app.use('/api/crm', authenticate, requireCompany, crm)
const companyId = 'integration-crm-financial', ownerId = `${companyId}-owner`, employeeId = `${companyId}-employee`
let owner: string, employee: string, customerId: string
let testDatabaseReady = false
const auth = (r: any, token = owner) => r.set('Authorization', `Bearer ${token}`).set('x-company-id', companyId)
describe('CRM : création de crédit et accès aux codes cadeaux', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || !new URL(process.env.DATABASE_URL!).pathname.endsWith('/creorga_tests')) throw new Error('Base de tests obligatoire')
    testDatabaseReady = true
    await prisma.company.create({ data: { id: companyId, name: 'CRM financier fictif' } })
    await prisma.user.createMany({ data: [ownerId, employeeId].map(id => ({ id, email: `${id}@localhost.invalid`, firstName: 'Recette', lastName: 'CRM', password: 'unused' })) })
    await prisma.userCompany.createMany({ data: [{ companyId, userId: ownerId, role: 'OWNER' }, { companyId, userId: employeeId, role: 'EMPLOYEE' }] })
    owner = jwt.sign({ userId: ownerId }, process.env.JWT_SECRET!, { expiresIn: '10m' })
    employee = jwt.sign({ userId: employeeId }, process.env.JWT_SECRET!, { expiresIn: '10m' })
    customerId = (await prisma.customer.create({ data: { companyId, firstName: 'Client', lastName: 'fictif', walletBalance: 10 } })).id
  })
  beforeEach(async () => { await prisma.customer.update({ where: { id: customerId }, data: { walletBalance: 10 } }) })
  afterAll(async () => {
    if (!testDatabaseReady) return
    await prisma.giftCard.deleteMany({ where: { companyId } }); await prisma.customer.deleteMany({ where: { companyId } })
    await prisma.userCompany.deleteMany({ where: { companyId } }); await prisma.user.deleteMany({ where: { id: { in: [ownerId, employeeId] } } })
    await prisma.company.deleteMany({ where: { id: companyId } }); await prisma.$disconnect()
  })
  it('un salarié ne peut pas émettre du crédit cadeau ni lire tous les codes utilisables', async () => {
    await auth(request(app).post('/api/crm/gift-cards'), employee).send({ initialValue: 50 }).expect(403)
    await auth(request(app).get('/api/crm/gift-cards'), employee).expect(403)
    expect(await prisma.giftCard.count({ where: { companyId } })).toBe(0)
  })
  it('un propriétaire peut émettre une carte à valeur positive exacte', async () => {
    const created = await auth(request(app).post('/api/crm/gift-cards')).send({ initialValue: 12.34, reason: 'Émission fictive de recette' }).expect(201)
    expect(created.body.currentBalance).toBe(12.34)
    await auth(request(app).get(`/api/crm/gift-cards/${created.body.code}`), employee).expect(403)
  })
  it('un montant inférieur au centime ne crée pas une carte de valeur zéro', async () => {
    await auth(request(app).post('/api/crm/gift-cards')).send({ initialValue: 0.001 }).expect(400)
  })
  it('un salarié ne peut pas créditer ni débiter un portefeuille', async () => {
    await auth(request(app).post(`/api/crm/customers/${customerId}/wallet`), employee).send({ amount: 100 }).expect(403)
    await auth(request(app).post(`/api/crm/customers/${customerId}/wallet`), employee).send({ amount: -1 }).expect(403)
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).walletBalance).toBe(10)
  })
  it('deux débits concurrents ne dépensent pas deux fois le même solde', async () => {
    const results = await Promise.all([1, 2].map(() => auth(request(app).post(`/api/crm/customers/${customerId}/wallet`)).send({ amount: -8 })))
    expect(results.map(r => r.status).sort()).toEqual([200, 409])
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).walletBalance).toBe(2)
  })
})
