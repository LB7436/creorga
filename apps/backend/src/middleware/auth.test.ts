import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { authenticate, type AuthRequest } from './auth'

const REAL_SECRET = 'test-jwt-secret-creorga-'.repeat(2)

function mockReqRes(headers: Record<string, string> = {}) {
  const req = { headers } as unknown as AuthRequest
  const res = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this },
    json(payload: any) { this.body = payload; return this },
  }
  const next = vi.fn()
  return { req, res, next }
}

describe('authenticate middleware', () => {
  const ORIGINAL_SECRET = process.env.JWT_SECRET

  beforeAll(() => {
    process.env.JWT_SECRET = REAL_SECRET
  })
  afterAll(() => {
    process.env.JWT_SECRET = ORIGINAL_SECRET
  })

  it('rejette une route protégée sans token → 401', () => {
    const { req, res, next } = mockReqRes({})
    authenticate(req, res as any, next)
    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejette un token forgé avec un mauvais secret → 401', () => {
    const forged = jwt.sign({ userId: 'u1', email: 'x@x.com' }, 'wrong-secret-entirely')
    const { req, res, next } = mockReqRes({ authorization: `Bearer ${forged}` })
    authenticate(req, res as any, next)
    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('accepte un token valide signé avec le bon secret', () => {
    const valid = jwt.sign({ userId: 'u1', email: 'x@x.com' }, REAL_SECRET)
    const { req, res, next } = mockReqRes({ authorization: `Bearer ${valid}` })
    authenticate(req, res as any, next)
    expect(next).toHaveBeenCalledOnce()
    expect(req.user?.userId).toBe('u1')
  })
})

describe('login — vérification mot de passe', () => {
  it('refuse un mauvais mot de passe (bcrypt compare = false)', async () => {
    const hash = await bcrypt.hash('CorrectHorseBattery123!', 10)
    const valid = await bcrypt.compare('mauvais-mot-de-passe', hash)
    expect(valid).toBe(false)
  })

  it('accepte le bon mot de passe (bcrypt compare = true)', async () => {
    const hash = await bcrypt.hash('CorrectHorseBattery123!', 10)
    const valid = await bcrypt.compare('CorrectHorseBattery123!', hash)
    expect(valid).toBe(true)
  })
})
