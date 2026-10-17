import express from 'express'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomBytes, randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import prisma from '../lib/prisma'
import { shutdownEventSink } from '../lib/eventSink'
import auth from './auth'

const app = express().use(express.json(), cookieParser(), auth)
const password = 'Mot-de-passe-de-fixture-sans-acces-reel-123!'
let hashedPassword: string
async function identity(activeMemberships: boolean[] = []) {
  const id = 'admission-fictive-' + randomUUID(), email = id + '@fixture.invalid'
  const user = await prisma.user.create({ data: { id, email, password: hashedPassword, firstName: 'Employé', lastName: 'FICTIF' } })
  const memberships = []
  for (const isActive of activeMemberships) {
    const company = await prisma.company.create({ data: { name: 'ADMISSION FICTIVE ' + randomUUID() } })
    memberships.push(await prisma.userCompany.create({ data: { companyId: company.id, userId: user.id, role: 'EMPLOYEE', isActive } }))
  }
  return { user, memberships }
}
const login = (email: string) => request(app).post('/login').send({ email, password })
const me = (user: { id: string; email: string }) => request(app).get('/me')
  .set('Authorization', 'Bearer ' + jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '5m' }))
async function existingRefresh(userId: string) {
  return prisma.refreshToken.create({ data: { userId, token: randomBytes(64).toString('hex'), expiresAt: new Date(Date.now() + 60_000) } })
}
const expectNoAccessToken = (response: request.Response) => {
  expect(response.body.accessToken === undefined).toBe(true)
  expect(Boolean(response.headers['set-cookie'])).toBe(false)
}

describe('Admission ERP : une identité sans adhésion active ne reçoit aucune session', () => {
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!)
    if (process.env.CREORGA_TEST_DATABASE !== 'creorga_tests' || url.hostname !== '127.0.0.1' || url.pathname !== '/creorga_tests') throw Error('Base fictive creorga_tests sur loopback obligatoire')
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('FALLBACK_ADMIN_ENABLED', 'false'); vi.stubEnv('SINGLE_TENANT_MODE', 'false')
    hashedPassword = await bcrypt.hash(password, 4)
  })
  // Toutes les identités/entreprises créées ici sont fictives et conservées.
  // Aucun compte de la campagne Chrome, aucune archive ou base réelle modifié.
  afterAll(async () => { vi.restoreAllMocks(); await shutdownEventSink(); await prisma.$disconnect(); vi.unstubAllEnvs() })

  it('refuse un mot de passe valide sans aucune adhésion avant la création d’un refresh token', async () => {
    const { user } = await identity()
    const response = await login(user.email)
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('NO_ACTIVE_COMPANY')
    expect(response.body.message).toMatch(/propriétaire/)
    expectNoAccessToken(response)
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0)
  })

  it('refuse aussi toutes les adhésions désactivées sans inventer de propriétaire', async () => {
    const { user, memberships } = await identity([false, false])
    const response = await login(user.email)
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('NO_ACTIVE_COMPANY')
    expectNoAccessToken(response)
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0)
    expect(await prisma.userCompany.findMany({ where: { userId: user.id } })).toEqual(memberships)
  })

  it('conserve une autre société active et le rôle EMPLOYEE réellement attribué', async () => {
    const { user, memberships } = await identity([false, true])
    const response = await login(user.email).expect(200)
    expect(response.body.companies).toHaveLength(1)
    expect(response.body.companies[0]).toMatchObject({ companyId: memberships[1].companyId, role: 'EMPLOYEE', isActive: true })
    expect(jwt.verify(response.body.accessToken, process.env.JWT_SECRET!)).toMatchObject({ userId: user.id })
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(1)
  })

  it('une réactivation explicite autorise une nouvelle connexion sans modifier le rôle', async () => {
    const { user, memberships } = await identity([false])
    await login(user.email).expect(403)
    await prisma.userCompany.update({ where: { id: memberships[0].id }, data: { isActive: true } })
    const response = await login(user.email).expect(200)
    expect(response.body.companies[0]).toMatchObject({ role: 'EMPLOYEE', isActive: true, companyId: memberships[0].companyId })
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(1)
  })

  it('une panne de lecture des adhésions renvoie 503 sans laisser de refresh token orphelin', async () => {
    const { user } = await identity([true])
    const readMemberships = vi.spyOn(prisma.userCompany, 'findMany').mockRejectedValueOnce(new Error('Panne de laboratoire simulée'))
    try {
      const response = await login(user.email).expect(503)
      expect(response.body.code).toBe('AUTH_SERVICE_UNAVAILABLE')
      expectNoAccessToken(response)
      expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0)
    } finally { readMemberships.mockRestore() }
  })

  it.each([{ flags: [] as boolean[] }, { flags: [false] }])('/me refuse les adhésions absentes ou inactives ($flags)', async ({ flags }) => {
    const { user } = await identity(flags)
    const response = await me(user).expect(403)
    expect(response.body.code).toBe('NO_ACTIVE_COMPANY')
    expect(response.body.user === undefined).toBe(true)
    expect(response.body.companies === undefined).toBe(true)
  })

  it('un refresh sans adhésion active reste refusé sans rotation, prolongation ni destruction du jeton existant', async () => {
    const { user } = await identity([false]), before = await existingRefresh(user.id)
    const response = await request(app).post('/refresh').set('Cookie', 'refreshToken=' + before.token).expect(403)
    expect(response.body.code).toBe('NO_ACTIVE_COMPANY')
    expectNoAccessToken(response)
    expect(await prisma.refreshToken.findMany({ where: { userId: user.id } })).toEqual([before])
  })

  it('une panne de lecture d’adhésions pendant refresh conserve la session existante sans la prolonger', async () => {
    const { user } = await identity([true]), before = await existingRefresh(user.id)
    const readMemberships = vi.spyOn(prisma.userCompany, 'findMany').mockRejectedValueOnce(new Error('Panne de laboratoire simulée'))
    try {
      const response = await request(app).post('/refresh').set('Cookie', 'refreshToken=' + before.token).expect(503)
      expect(response.body.code).toBe('AUTH_SERVICE_UNAVAILABLE')
      expectNoAccessToken(response)
      expect(await prisma.refreshToken.findMany({ where: { userId: user.id } })).toEqual([before])
    } finally { readMemberships.mockRestore() }
  })

  it('un refresh avec une autre adhésion active reste utilisable sans élévation de rôle', async () => {
    const { user, memberships } = await identity([false, true]), before = await existingRefresh(user.id)
    const response = await request(app).post('/refresh').set('Cookie', 'refreshToken=' + before.token).expect(200)
    expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(1)
    expect(await prisma.refreshToken.findUnique({ where: { id: before.id } })).toBeNull()
    const profile = await request(app).get('/me').set('Authorization', 'Bearer ' + response.body.accessToken).expect(200)
    expect(profile.body.companies).toHaveLength(1)
    expect(profile.body.companies[0]).toMatchObject({ companyId: memberships[1].companyId, role: 'EMPLOYEE' })
  })

  it('l’inscription crée toujours atomiquement une société avec son propriétaire et une session', async () => {
    const email = 'signup-admission-' + randomUUID() + '@fixture.invalid', companyName = 'INSCRIPTION FICTIVE ' + randomUUID()
    const response = await request(app).post('/register').send({ email, password, firstName: 'Nouveau', lastName: 'FICTIF', companyName }).expect(201)
    expect(response.body.companies).toHaveLength(1)
    expect(response.body.companies[0]).toMatchObject({ role: 'OWNER', isActive: true, company: { name: companyName } })
    const owner = await prisma.user.findUniqueOrThrow({ where: { email } })
    expect(await prisma.userCompany.count({ where: { userId: owner.id, role: 'OWNER', isActive: true } })).toBe(1)
    expect(await prisma.refreshToken.count({ where: { userId: owner.id } })).toBe(1)
    expect((await me(owner).expect(200)).body.companies[0].role).toBe('OWNER')
  })
})
