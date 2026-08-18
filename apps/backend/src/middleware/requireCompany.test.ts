import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// La base est simulée : chaque test configure findFirst (adhésions) et
// companyFindUnique (existence d'une société, chemin appareil POS).
const findFirst = vi.fn()
const companyFindUnique = vi.fn()
vi.mock('../lib/prisma', () => ({
  default: {
    userCompany: { findFirst: (...a: any[]) => findFirst(...a) },
    company: { findUnique: (...a: any[]) => companyFindUnique(...a) },
  },
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

describe('requireCompany — adhésion vérifiée (correctif IDOR x-company-id)', () => {
  beforeEach(() => {
    findFirst.mockReset()
    companyFindUnique.mockReset()
  })
  afterEach(() => {
    process.env.NODE_ENV = ENV
  })

  it("refuse en 403 la société dont l'utilisateur n'est pas membre", async () => {
    const { req, res, next } = makeCtx()
    req.headers['x-company-id'] = 'societe-b'
    findFirst.mockResolvedValue(null) // aucune adhésion (user-lambda, societe-b)

    await requireCompany(req, res, next)

    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
    expect(req.companyId).toBeUndefined()
  })

  it('accorde au membre sa société et son rôle réel', async () => {
    const { req, res, next } = makeCtx()
    req.headers['x-company-id'] = 'societe-a'
    findFirst.mockResolvedValue({
      companyId: 'societe-a',
      role: 'MANAGER',
      company: { id: 'societe-a', name: 'Société A' },
    })

    await requireCompany(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.companyId).toBe('societe-a')
    expect(req.role).toBe('MANAGER')
  })
})

describe('requireCompany — requêtes sans utilisateur (deviceOrUserAuth)', () => {
  beforeEach(() => {
    findFirst.mockReset()
    companyFindUnique.mockReset()
  })
  afterEach(() => {
    process.env.NODE_ENV = ENV
  })

  it('terminal POS : société existante annoncée → accès sans rôle', async () => {
    const { req, res, next } = makeCtx()
    req.user = undefined
    req.device = { type: 'pos-terminal' }
    req.headers['x-company-id'] = 'societe-a'
    companyFindUnique.mockResolvedValue({ id: 'societe-a', name: 'Société A' })

    await requireCompany(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.companyId).toBe('societe-a')
    expect(req.role).toBeNull()
    // Jamais de recherche d'adhésion avec un userId indéfini.
    expect(findFirst).not.toHaveBeenCalled()
  })

  it('v5.0 — terminal lié à une société : une autre société annoncée → 403, sans appel base', async () => {
    const { req, res, next } = makeCtx()
    req.user = undefined
    req.device = { type: 'pos-terminal', companyId: 'societe-a' }
    req.headers['x-company-id'] = 'societe-b'

    await requireCompany(req, res, next)

    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
    expect(companyFindUnique).not.toHaveBeenCalled()
  })

  it('v5.0 — terminal lié à une société : sans en-tête, la société du jeton est prise', async () => {
    const { req, res, next } = makeCtx()
    req.user = undefined
    req.device = { type: 'pos-terminal', companyId: 'societe-a' }
    companyFindUnique.mockResolvedValue({ id: 'societe-a', name: 'Société A' })

    await requireCompany(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.companyId).toBe('societe-a')
  })

  it('terminal POS : société inconnue → 403', async () => {
    const { req, res, next } = makeCtx()
    req.user = undefined
    req.device = { type: 'pos-terminal' }
    req.headers['x-company-id'] = 'societe-fantome'
    companyFindUnique.mockResolvedValue(null)

    await requireCompany(req, res, next)

    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
  })

  it("en production, sans utilisateur ni appareil : 401 — jamais d'appel base", async () => {
    // Le cœur du garde : Prisma ignore un filtre `userId: undefined`, la
    // recherche d'adhésion renverrait l'adhésion d'un autre membre.
    process.env.NODE_ENV = 'production'
    const { req, res, next } = makeCtx()
    req.user = undefined
    req.headers['x-company-id'] = 'societe-a'

    await requireCompany(req, res, next)

    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
    expect(findFirst).not.toHaveBeenCalled()
  })
})
