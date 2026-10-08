import express from 'express'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  userCompany: { findMany: vi.fn() },
  refreshToken: { findUnique: vi.fn(), create: vi.fn() },
}))
vi.mock('../lib/prisma', () => ({ default: db }))
vi.mock('../lib/eventSink', () => ({ push: vi.fn() }))
vi.mock('../lib/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }))
import router from './auth'

const app = express().use(express.json(), cookieParser(), router)
const secret = 'fixture-only-auth-availability-secret'.repeat(2)
const member = { id: 'fixture-member', email: 'member@fixture.invalid', firstName: 'Camille', lastName: 'Test', avatar: null }
const bearer = () => `Bearer ${jwt.sign({ userId: member.id, email: member.email }, secret)}`

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('JWT_SECRET', secret)
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('FALLBACK_ADMIN_ENABLED', 'false')
  db.user.findUnique.mockResolvedValue(member)
  db.userCompany.findMany.mockResolvedValue([{ role: 'STAFF', companyId: 'fixture-company' }])
})
afterEach(() => vi.unstubAllEnvs())

describe('authentification — une panne ne crée aucune identité ni adhésion', () => {
  it.each(['production', 'development'])('/me : échec de lecture utilisateur en %s → 503 sans profil inventé', async (environment) => {
    vi.stubEnv('NODE_ENV', environment)
    vi.stubEnv('FALLBACK_ADMIN_ENABLED', 'true')
    db.user.findUnique.mockRejectedValueOnce(new Error('Database unavailable'))
    const response = await request(app).get('/me').set('Authorization', bearer())
    expect(response.status).toBe(503)
    expect(response.body.code).toBe('AUTH_SERVICE_UNAVAILABLE')
    expect(response.body).not.toHaveProperty('user')
    expect(response.body).not.toHaveProperty('companies')
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  it('/me : échec de lecture des adhésions → 503 sans société de repli', async () => {
    db.userCompany.findMany.mockRejectedValueOnce(new Error('Database unavailable'))
    const response = await request(app).get('/me').set('Authorization', bearer())
    expect(response.status).toBe(503)
    expect(response.body).not.toHaveProperty('companies')
    expect(response.body).not.toHaveProperty('user')
  })

  it('/me conserve le profil et le rôle réellement lus quand la base répond', async () => {
    const response = await request(app).get('/me').set('Authorization', bearer())
    expect(response.status).toBe(200)
    expect(response.body.user).toEqual(member)
    expect(response.body.companies).toEqual([{ role: 'STAFF', companyId: 'fixture-company' }])
  })

  it('/me refuse le jeton de démonstration en production avant tout accès à la base', async () => {
    const token = jwt.sign({ userId: 'fallback-admin', email: 'demo@fixture.invalid' }, secret)
    const response = await request(app).get('/me').set('Authorization', `Bearer ${token}`)
    expect(response.status).toBe(401)
    expect(response.body).not.toHaveProperty('companies')
    expect(db.user.findUnique).not.toHaveBeenCalled()
  })

  it('/refresh : un cookie arbitraire ne devient jamais un compte démo lors d’une panne', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('FALLBACK_ADMIN_ENABLED', 'true')
    db.refreshToken.findUnique.mockRejectedValueOnce(new Error('Database unavailable'))
    const response = await request(app).post('/refresh').set('Cookie', 'refreshToken=unverified-fixture-cookie')
    expect(response.status).toBe(503)
    expect(response.body).not.toHaveProperty('accessToken')
    expect(response.headers['set-cookie']).toBeUndefined()
    expect(db.refreshToken.create).not.toHaveBeenCalled()
  })

  it('/login : une panne est annoncée comme indisponibilité du service', async () => {
    db.user.findUnique.mockRejectedValueOnce(new Error('Database unavailable'))
    const response = await request(app).post('/login').send({ email: member.email, password: 'fixture-only-password' })
    expect(response.status).toBe(503)
    expect(response.body.code).toBe('AUTH_SERVICE_UNAVAILABLE')
    expect(response.body).not.toHaveProperty('accessToken')
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  it('/login : un compte réellement absent garde la réponse 401', async () => {
    db.user.findUnique.mockResolvedValueOnce(null)
    const response = await request(app).post('/login').send({ email: member.email, password: 'fixture-only-password' })
    expect(response.status).toBe(401)
    expect(response.body).not.toHaveProperty('accessToken')
  })
})
