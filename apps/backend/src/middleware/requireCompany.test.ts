import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// La base est simulée injoignable : findFirst rejette systématiquement.
const findFirst = vi.fn()
vi.mock('../lib/prisma', () => ({
  default: { userCompany: { findFirst: (...a: any[]) => findFirst(...a) } },
}))
vi.mock('../lib/logger', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { requireCompany } from './requireCompany'

const ENV = process.env.NODE_ENV

function makeCtx() {
  const req: any = { headers: {}, user: { userId: 'user-lambda' } }
  const res: any = {
    statusCode: 0,
    body: undefined as any,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json(b: any) {
      this.body = b
      return this
    },
  }
  const next = vi.fn()
  return { req, res, next }
}

describe('requireCompany — base de données injoignable', () => {
  beforeEach(() => {
    findFirst.mockReset()
    findFirst.mockRejectedValue(new Error("Can't reach database server"))
  })
  afterEach(() => {
    process.env.NODE_ENV = ENV
  })

  it("en PRODUCTION : refuse en 503 et n'accorde AUCUN rôle", async () => {
    process.env.NODE_ENV = 'production'
    const { req, res, next } = makeCtx()

    await requireCompany(req, res, next)

    expect(res.statusCode).toBe(503)
    expect(next).not.toHaveBeenCalled()
    // Le cœur de la faille : aucune élévation de privilèges.
    expect(req.role).toBeUndefined()
    expect(req.companyId).toBeUndefined()
    expect(req.company).toBeUndefined()
  })

  it('hors production : le mode dégradé volontaire reste disponible', async () => {
    process.env.NODE_ENV = 'development'
    const { req, res, next } = makeCtx()

    await requireCompany(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.statusCode).toBe(0)
    expect(req.role).toBe('OWNER')
    expect(req.companyId).toBe('fallback-company')
  })

  it("en production, l'admin de repli court-circuite avant tout appel base", async () => {
    process.env.NODE_ENV = 'production'
    const { req, res, next } = makeCtx()
    req.user = { userId: 'fallback-admin' }

    await requireCompany(req, res, next)

    // Ce chemin est volontaire et verrouillé en amont par fallbackAdminAllowed()
    // dans routes/auth.ts : aucun jeton fallback-admin ne peut être émis en prod.
    expect(next).toHaveBeenCalledTimes(1)
    expect(findFirst).not.toHaveBeenCalled()
  })
})
