import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { requireCompany, requireRole } from '../middleware/requireCompany'
import portal from './portalConfig'
import companies from './companies'
const app = express().use(express.json()).use('/api/portal-config', (req, res, next) => req.method === 'GET' ? next()
  : authenticate(req, res, () => { void requireCompany(req, res, () => requireRole('OWNER')(req, res, next)) }), portal)
app.use('/api/companies', companies)
const companyId = 'portal-lab-' + randomUUID(), otherId = companyId + '-other', userId = companyId + '-owner'
let token: string
const auth = (r: any) => r.set('Authorization', 'Bearer ' + token).set('x-company-id', companyId)
describe('Configuration portail : reprise, concurrence et isolation PostgreSQL', () => {
  beforeAll(async () => {
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || new URL(process.env.DATABASE_URL!).pathname !== '/creorga_tests') throw Error('Base fictive obligatoire')
    await prisma.company.createMany({ data: [{ id: companyId, name: 'PORTAIL FICTIF A' }, { id: otherId, name: 'PORTAIL FICTIF B' }] })
    await prisma.user.create({ data: { id: userId, email: userId + '@fixture.invalid', password: 'unused', firstName: 'Fictif', lastName: 'Owner' } })
    await prisma.userCompany.create({ data: { companyId, userId, role: 'OWNER' } })
    token = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '30m' })
  })
  afterAll(async () => {
    await prisma.portalConfiguration.deleteMany({ where: { companyId: { in: [companyId, otherId] } } })
    await prisma.userCompany.deleteMany({ where: { userId } }); await prisma.user.deleteMany({ where: { id: userId } })
    await prisma.company.deleteMany({ where: { id: { in: [companyId, otherId] } } }); await prisma.$disconnect()
  })
  it('une remise à zéro conserve une révision durable supérieure pour les portails déjà ouverts', async () => {
    const before = (await auth(request(app).patch('/api/portal-config')).send({ toggles: { menu: false }, welcomeMessage: 'FICTIF avant reset' }).expect(200)).body
    const rowBefore = await prisma.portalConfiguration.findUniqueOrThrow({ where: { companyId } })
    const reset = (await auth(request(app).post('/api/portal-config/reset')).send({}).expect(200)).body
    expect(reset.updatedAt).toBeGreaterThan(before.updatedAt); expect(reset.toggles.menu).toBe(true)
    const row = await prisma.portalConfiguration.findUniqueOrThrow({ where: { companyId } })
    expect(row.id).toBe(rowBefore.id); expect(row.createdAt).toEqual(rowBefore.createdAt)
    const read = (await request(app).get('/api/portal-config?companyId=' + companyId).expect(200)).body
    expect(read.updatedAt).toBe(reset.updatedAt); expect(read.welcomeMessage).toBe('')
  })
  it('douze PATCH concurrents de clés distinctes ne se perdent pas et ont des révisions distinctes', async () => {
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => auth(request(app).patch('/api/portal-config')).send({ games: { ['fixture' + i]: true } }).expect(200)))
    const row = await prisma.portalConfiguration.findUniqueOrThrow({ where: { companyId } })
    for (let i = 0; i < 12; i++) expect(row.games).toHaveProperty('fixture' + i, true)
    expect(new Set(results.map(r => r.body.updatedAt)).size).toBe(12)
  })
  it('le profil métier peut sauvegarder sans effacer les réglages ludiques', async () => {
    const before = (await prisma.portalConfiguration.findUniqueOrThrow({ where: { companyId } })).games
    await auth(request(app).patch('/api/portal-config')).send({ accentColor: '#123456' }).expect(200)
    expect((await prisma.portalConfiguration.findUniqueOrThrow({ where: { companyId } })).games).toEqual(before)
  })
  it('l’onboarding société partage la révision du portail, même si son horloge précédente était en avance', async () => {
    const previous = await prisma.portalConfiguration.update({ where: { companyId }, data: { updatedAt: new Date(Date.now() + 60_000) } })
    await auth(request(app).put('/api/companies/' + companyId)).send({ name: 'PORTAIL FICTIF A', portalAccentColor: '#654321' }).expect(200)
    const row = await prisma.portalConfiguration.findUniqueOrThrow({ where: { companyId } })
    expect(row.updatedAt.getTime()).toBeGreaterThan(previous.updatedAt.getTime()); expect(row.accentColor).toBe('#654321')
  })
  it('refuse les écritures anonymes ou d’une autre société sans modifier sa configuration', async () => {
    await prisma.portalConfiguration.create({ data: { companyId: otherId, welcomeMessage: 'AUTRE FICTIF inchangé' } })
    await request(app).post('/api/portal-config/reset?companyId=' + companyId).send({}).expect(401)
    await request(app).post('/api/portal-config/reset').set('Authorization', 'Bearer ' + token).set('x-company-id', otherId).send({}).expect(403)
    expect((await prisma.portalConfiguration.findUniqueOrThrow({ where: { companyId: otherId } })).welcomeMessage).toBe('AUTRE FICTIF inchangé')
  })
})
