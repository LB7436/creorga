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
const FALLBACK_ENV = process.env.FALLBACK_ADMIN_ENABLED

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
    if (FALLBACK_ENV === undefined) delete process.env.FALLBACK_ADMIN_ENABLED
    else process.env.FALLBACK_ADMIN_ENABLED = FALLBACK_ENV
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

  it('hors production : une panne ne promeut pas non plus un membre en propriétaire', async () => {
    process.env.NODE_ENV = 'development'
    const { req, res, next } = makeCtx()

    await requireCompany(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(503)
    expect(req.role).toBeUndefined()
    expect(req.companyId).toBeUndefined()
  })

  it("en production : un ancien jeton de repli ne confère aucun accès, même encore signé", async () => {
    process.env.NODE_ENV = 'production'
    const { req, res, next } = makeCtx()
    req.user = { userId: 'fallback-admin' }

    await requireCompany(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(401)
    expect(req.role).toBeUndefined()
    expect(req.companyId).toBeUndefined()
    expect(findFirst).not.toHaveBeenCalled()
  })

  it('refuse aussi un ancien jeton de repli si la démonstration a été désactivée en développement', async () => {
    process.env.NODE_ENV = 'development'
    process.env.FALLBACK_ADMIN_ENABLED = 'false'
    const { req, res, next } = makeCtx()
    req.user = { userId: 'fallback-admin' }
    await requireCompany(req, res, next)
    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
    expect(req.role).toBeUndefined()
  })

  it('garde la démonstration explicite disponible avec son jeton autorisé, sans consulter la base', async () => {
    process.env.NODE_ENV = 'development'
    process.env.FALLBACK_ADMIN_ENABLED = 'true'
    const { req, res, next } = makeCtx()
    req.user = { userId: 'fallback-admin' }
    await requireCompany(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    expect(req.role).toBe('OWNER')
    expect(req.companyId).toBe('fallback-company')
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

  it('publie des capacités effectives limitées sans CA pour un employé', async () => {
    const { req, res, next } = makeCtx()
    req.headers['x-company-id'] = 'societe-a'
    findFirst.mockResolvedValue({ userId: 'user-lambda', companyId: 'societe-a', role: 'EMPLOYEE',
      isActive: true, capabilities: {}, company: { id: 'societe-a' } })
    await requireCompany(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    expect(req.businessAccess?.capabilities).toContain('hr.schedule.read')
    expect(req.businessAccess?.capabilities).not.toContain('finance.revenue.read')
    expect(req.businessAccess?.capabilities).not.toContain('payments.receive')
  })

  it('refuse le CA par URL directe avant le routeur et relit une révocation de droit', async () => {
    const member = { userId: 'user-lambda', companyId: 'societe-a', role: 'EMPLOYEE', isActive: true,
      capabilities: { 'finance.revenue.read': true }, company: { id: 'societe-a' } }
    findFirst.mockResolvedValue(member)
    const allowed = makeCtx()
    Object.assign(allowed.req, { method: 'GET', originalUrl: '/api/stats/today', headers: { 'x-company-id': 'societe-a' } })
    await requireCompany(allowed.req, allowed.res, allowed.next)
    expect(allowed.next).toHaveBeenCalledOnce()
    findFirst.mockResolvedValue({ ...member, capabilities: { 'finance.revenue.read': false } })
    const denied = makeCtx()
    Object.assign(denied.req, { method: 'GET', originalUrl: '/api/stats/today', headers: { 'x-company-id': 'societe-a' } })
    await requireCompany(denied.req, denied.res, denied.next)
    expect(denied.res.statusCode).toBe(403)
    expect(denied.next).not.toHaveBeenCalled()
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

  it('sans utilisateur ni appareil, le mode développement ne confère pas le rôle propriétaire', async () => {
    process.env.NODE_ENV = 'development'
    const { req, res, next } = makeCtx()
    req.user = undefined
    req.headers['x-company-id'] = 'societe-a'
    await requireCompany(req, res, next)
    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
    expect(req.role).toBeUndefined()
    expect(findFirst).not.toHaveBeenCalled()
  })

  it('en production, un appareil non rattaché est refusé avant la recherche de société', async () => {
    process.env.NODE_ENV = 'production'
    const { req, res, next } = makeCtx()
    req.user = undefined
    req.device = { type: 'pos-terminal' }
    req.headers['x-company-id'] = 'societe-a'
    await requireCompany(req, res, next)
    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
    expect(companyFindUnique).not.toHaveBeenCalled()
  })
})
