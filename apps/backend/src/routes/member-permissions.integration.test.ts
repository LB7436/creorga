import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../lib/prisma'
import companies from './companies'
import { authenticate } from '../middleware/auth'
import { requireCompany } from '../middleware/requireCompany'
import { errorHandler } from '../middleware/errorHandler'

const companyId = `permission-decisions-${randomUUID()}`, otherCompany = `permission-other-${randomUUID()}`
const owner = randomUUID(), employee = randomUUID(), delegate = randomUUID(), manager = randomUUID()
const app = express().use(express.json())
app.use('/api/companies', companies)
app.get('/api/stats/probe', authenticate, requireCompany, (_req, res) => res.json({ fixture: true }))
app.use(errorHandler)
const membership = (userId: string) => ({ userId_companyId: { userId, companyId } })
const as = (r: any, userId = owner, company = companyId) => r.set('Authorization', `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '10m' })}`).set('x-company-id', company)
const update = (id: string, version: number, patch: object, actor = owner) => as(request(app).patch(`/api/companies/members/${id}`), actor)
  .send({ ...patch, expectedAccessVersion: version, reason: 'Décision explicite en laboratoire fictif' })

describe('Décisions de droits : version, audit, concurrence et cloisonnement PostgreSQL', () => {
  beforeAll(async () => {
    const target = new URL(process.env.DATABASE_URL || 'http://invalid')
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || target.hostname !== '127.0.0.1' || target.port !== '5450' || target.pathname !== '/creorga_tests') throw Error('Base laboratoire obligatoire')
    await prisma.company.create({ data: { id: companyId, name: 'DROITS FICTIFS — DONNÉES CONSERVÉES' } })
    await prisma.company.create({ data: { id: otherCompany, name: 'AUTRE SOCIÉTÉ FICTIVE CONSERVÉE' } })
    for (const [id, role] of [[owner, 'OWNER'], [employee, 'EMPLOYEE'], [delegate, 'ADMIN'], [manager, 'MANAGER']]) {
      await prisma.user.create({ data: { id, email: `${id}@fixture.invalid`, password: 'fixture-unused-no-login', firstName: 'Fictif', lastName: role } })
      await prisma.userCompany.create({ data: { userId: id, companyId, role, capabilities: id === delegate ? { 'permissions.manage': true } : {} } })
    }
  })
  afterAll(async () => { await prisma.$disconnect() })

  it('refuse le CA EMPLOYEE puis conserve une attribution et son audit sans changer le rôle', async () => {
    await as(request(app).get('/api/stats/probe'), employee).expect(403)
    const response = await update(employee, 0, { capabilities: { 'finance.revenue.read': true } }).expect(200)
    expect(response.body.role).toBe('EMPLOYEE'); expect(response.body.accessVersion).toBe(1)
    await as(request(app).get('/api/stats/probe'), employee).expect(200)
    const audit = await prisma.businessPermissionEvent.findMany({ where: { companyId, userId: employee } })
    expect(audit).toHaveLength(1); expect(audit[0]).toMatchObject({ actorId: owner, beforeVersion: 0, afterVersion: 1 })
  })
  it('refuse une décision périmée sans nouvel événement ni perte de l’attribution', async () => {
    await update(employee, 0, { capabilities: {} }).expect(409)
    expect((await prisma.userCompany.findUniqueOrThrow({ where: membership(employee) })).accessVersion).toBe(1)
    expect(await prisma.businessPermissionEvent.count({ where: { companyId, userId: employee } })).toBe(1)
  })
  it('deux décisions concurrentes de même version ne produisent qu’un seul changement', async () => {
    const results = await Promise.all([update(employee, 1, { capabilities: { 'finance.revenue.read': false } }), update(employee, 1, { capabilities: { 'finance.revenue.read': false } })])
    expect(results.map(r => r.status).sort()).toEqual([200, 409])
    const row = await prisma.userCompany.findUniqueOrThrow({ where: membership(employee) })
    expect(row.accessVersion).toBe(2)
    expect(await prisma.businessPermissionEvent.count({ where: { companyId, userId: employee } })).toBe(2)
    await as(request(app).get('/api/stats/probe'), employee).expect(403)
  })
  it('refuse l’élévation à OWNER et une capacité inconnue', async () => {
    await update(employee, 2, { role: 'OWNER' }).expect(400)
    await update(employee, 2, { capabilities: { platform: true } }).expect(400)
    expect((await prisma.userCompany.findUniqueOrThrow({ where: membership(employee) })).accessVersion).toBe(2)
  })
  it('un administrateur délégué ne peut attribuer des droits supérieurs aux siens', async () => {
    await update(employee, 2, { capabilities: { 'finance.revenue.read': true } }, delegate).expect(403)
    await update(employee, 2, { capabilities: { 'permissions.manage': true } }, delegate).expect(403)
  })
  it('désactiver un compte supérieur ne contourne pas le plafond de délégation', async () => {
    await update(manager, 0, { isActive: false }, delegate).expect(403)
    expect((await prisma.userCompany.findUniqueOrThrow({ where: membership(manager) })).isActive).toBe(true)
  })
  it('ne modifie ni soi-même ni le propriétaire dans ce parcours', async () => {
    await update(owner, 0, { isActive: false }).expect(403)
    await update(delegate, 0, { capabilities: {} }, delegate).expect(403)
  })
  it('une désactivation révoque les requêtes suivantes du même JWT sans supprimer les données', async () => {
    await update(employee, 2, { isActive: false }).expect(200)
    await as(request(app).get('/api/companies/access'), employee).expect(403)
    expect(await prisma.user.findUnique({ where: { id: employee } })).toBeTruthy()
    expect(await prisma.businessPermissionEvent.count({ where: { companyId, userId: employee } })).toBe(3)
  })
  it('une société ou un utilisateur modifié dans la requête ne donne aucun accès voisin', async () => {
    await as(request(app).get('/api/companies/access'), owner, otherCompany).expect(403)
    await as(request(app).patch(`/api/companies/members/${employee}`), owner, otherCompany).send({ isActive: true, expectedAccessVersion: 3, reason: 'Tentative intersociétés fictive' }).expect(403)
    expect((await prisma.userCompany.findUniqueOrThrow({ where: membership(employee) })).isActive).toBe(false)
  })
})
