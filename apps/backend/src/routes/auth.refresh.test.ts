import express from 'express'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const db = vi.hoisted(() => ({ refreshToken: { findUnique: vi.fn(), deleteMany: vi.fn(), create: vi.fn() }, $transaction: vi.fn() }))
vi.mock('../lib/prisma', () => ({ default: db }))
vi.mock('../lib/eventSink', () => ({ push: vi.fn() }))
vi.mock('../lib/security', () => ({ fallbackAdminAllowed: () => false }))
import router from './auth'
const app = express().use(express.json(), cookieParser(), router)
beforeEach(() => {
  vi.clearAllMocks()
  process.env.JWT_SECRET = 'cle-uniquement-test-rotation-jamais-production'
  db.refreshToken.findUnique.mockResolvedValue({ id: 'r1', userId: 'u1', expiresAt: new Date(Date.now() + 60000), user: { id: 'u1', email: 'test@creorga.test' } })
  db.refreshToken.deleteMany.mockResolvedValue({ count: 1 })
  db.$transaction.mockImplementation((callback) => callback(db))
})
describe('Renouvellement de session', () => {
  it('purge le cookie invalide et donne un message utilisable', async () => {
    db.refreshToken.findUnique.mockResolvedValueOnce(null)
    const res = await request(app).post('/refresh').set('Cookie', 'refreshToken=invalid')
    expect(res.status).toBe(401)
    expect(res.body.code).toBe('SESSION_EXPIRED')
    expect(res.headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970')
  })
  it('refuse aussi un jeton expiré', async () => {
    db.refreshToken.findUnique.mockResolvedValueOnce({ id: 'expired', expiresAt: new Date(1) })
    await request(app).post('/refresh').set('Cookie', 'refreshToken=expired').expect(401)
    expect(db.refreshToken.deleteMany).toHaveBeenCalled()
  })
  it('effectue la rotation dans une seule transaction', async () => {
    const res = await request(app).post('/refresh').set('Cookie', 'refreshToken=valid')
    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeTruthy()
    expect(db.$transaction).toHaveBeenCalledOnce()
    expect(db.refreshToken.create).toHaveBeenCalledOnce()
  })
  it('une course ne crée ni deuxième session ni suppression du nouveau cookie', async () => {
    db.refreshToken.deleteMany.mockResolvedValueOnce({ count: 0 })
    const res = await request(app).post('/refresh').set('Cookie', 'refreshToken=race')
    expect(res.status).toBe(409)
    expect(res.headers['set-cookie']).toBeUndefined()
    expect(db.refreshToken.create).not.toHaveBeenCalled()
  })
  it('une panne temporaire ne vide pas le cookie', async () => {
    db.$transaction.mockRejectedValueOnce(new Error('Database unavailable'))
    const res = await request(app).post('/refresh').set('Cookie', 'refreshToken=temporary')
    expect(res.status).toBe(503)
    expect(res.headers['set-cookie']).toBeUndefined()
  })
})
