import { describe, it, expect, afterEach } from 'vitest'
import { identifierAppareil, jetonsAppareils } from './deviceAuth'

/** v5.0 — jeton d'appareil ↔ société. */
const ENV = { ...process.env }

afterEach(() => {
  process.env.POS_DEVICE_TOKENS = ENV.POS_DEVICE_TOKENS
  process.env.POS_DEVICE_TOKEN = ENV.POS_DEVICE_TOKEN
  process.env.POS_DEVICE_COMPANY_ID = ENV.POS_DEVICE_COMPANY_ID
  for (const k of ['POS_DEVICE_TOKENS', 'POS_DEVICE_TOKEN', 'POS_DEVICE_COMPANY_ID']) {
    if (ENV[k] === undefined) delete process.env[k]
  }
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
})
