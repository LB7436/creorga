import { describe, it, expect, afterEach, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import { deviceOrUserAuth, identifierAppareil, jetonsAppareils } from './deviceAuth'

/** v5.0 — jeton d'appareil ↔ société. */
const ENV = { ...process.env }

afterEach(() => {
  process.env.POS_DEVICE_TOKENS = ENV.POS_DEVICE_TOKENS
  process.env.POS_DEVICE_TOKEN = ENV.POS_DEVICE_TOKEN
  process.env.POS_DEVICE_COMPANY_ID = ENV.POS_DEVICE_COMPANY_ID
  for (const k of ['POS_DEVICE_TOKENS', 'POS_DEVICE_TOKEN', 'POS_DEVICE_COMPANY_ID', 'JWT_SECRET', 'FALLBACK_ADMIN_ENABLED']) {
    if (ENV[k] === undefined) delete process.env[k]
    else process.env[k] = ENV[k]
  }
  process.env.NODE_ENV = ENV.NODE_ENV
})

describe('deviceAuth — jetons d’appareil', () => {
  it('POS_DEVICE_TOKENS lie chaque jeton à sa société', () => {
    process.env.POS_DEVICE_TOKENS = 'societe-a:jeton-A, societe-b:jeton-B'
    delete process.env.POS_DEVICE_TOKEN
    expect(identifierAppareil('jeton-A')).toEqual({ type: 'pos-terminal', companyId: 'societe-a' })
    expect(identifierAppareil('jeton-B')).toEqual({ type: 'pos-terminal', companyId: 'societe-b' })
    expect(identifierAppareil('jeton-C')).toBeNull()
    expect(identifierAppareil('')).toBeNull()
    expect(identifierAppareil(undefined)).toBeNull()
  })

  it('le jeton global historique reste accepté, sans société sauf POS_DEVICE_COMPANY_ID', () => {
    delete process.env.POS_DEVICE_TOKENS
    process.env.POS_DEVICE_TOKEN = 'jeton-global'
    delete process.env.POS_DEVICE_COMPANY_ID
    expect(identifierAppareil('jeton-global')).toEqual({ type: 'pos-terminal', companyId: undefined })

    process.env.POS_DEVICE_COMPANY_ID = 'societe-a'
    expect(identifierAppareil('jeton-global')).toEqual({ type: 'pos-terminal', companyId: 'societe-a' })
  })

  it('un jeton de même longueur mais différent est refusé (comparaison à temps constant)', () => {
    delete process.env.POS_DEVICE_TOKENS
    process.env.POS_DEVICE_TOKEN = 'abcdef'
    expect(identifierAppareil('abcdeg')).toBeNull()
    expect(jetonsAppareils()).toHaveLength(1)
  })
  it('refuse en production un ancien jeton non rattaché à une société', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.POS_DEVICE_TOKENS; delete process.env.POS_DEVICE_COMPANY_ID
    process.env.POS_DEVICE_TOKEN = 'fixture-legacy-token'
    expect(identifierAppareil('fixture-legacy-token')).toBeNull()
  })
  it.each(['production', 'development'])('refuse un ancien JWT de démonstration désactivée sur les routes POS en %s', (environment) => {
    process.env.NODE_ENV = environment
    process.env.FALLBACK_ADMIN_ENABLED = 'false'
    process.env.JWT_SECRET = 'fixture-only-device-auth-secret'.repeat(2)
    const token = jwt.sign({ userId: 'fallback-admin', email: 'demo@fixture.invalid' }, process.env.JWT_SECRET)
    const req: any = { headers: { authorization: `Bearer ${token}` } }
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    const next = vi.fn()
    deviceOrUserAuth(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
    expect(req.user).toBeUndefined()
  })
})
