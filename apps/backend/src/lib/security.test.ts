import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { assertProductionSecrets, fallbackAdminAllowed, buildCorsOrigin } from './security'

const ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ENV }
})

describe('assertProductionSecrets', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'production'
  })

  it('refuse le démarrage en prod avec un secret de dev', () => {
    process.env.JWT_SECRET = 'dev-jwt-secret-creorga-change-in-production'
    process.env.JWT_REFRESH_SECRET = 'x'.repeat(40)
    expect(() => assertProductionSecrets()).toThrow(/JWT_SECRET/)
  })

  it('refuse un secret trop court', () => {
    process.env.JWT_SECRET = 'court'
    process.env.JWT_REFRESH_SECRET = 'x'.repeat(40)
    expect(() => assertProductionSecrets()).toThrow()
  })

  it('refuse le fallback admin activé en prod', () => {
    process.env.JWT_SECRET = 'a'.repeat(40)
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(40)
    process.env.FALLBACK_ADMIN_ENABLED = 'true'
    expect(() => assertProductionSecrets()).toThrow(/FALLBACK_ADMIN_ENABLED/)
  })

  it('accepte des secrets forts en prod', () => {
    process.env.JWT_SECRET = 'a'.repeat(40)
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(40)
    delete process.env.FALLBACK_ADMIN_ENABLED
    expect(() => assertProductionSecrets()).not.toThrow()
  })

  it('ne bloque jamais en dev', () => {
    process.env.NODE_ENV = 'development'
    process.env.JWT_SECRET = 'dev-jwt-secret-creorga-change-in-production'
    expect(() => assertProductionSecrets()).not.toThrow()
  })
})

describe('fallbackAdminAllowed', () => {
  it('est interdit en production', () => {
    process.env.NODE_ENV = 'production'
    process.env.FALLBACK_ADMIN_ENABLED = 'true'
    expect(fallbackAdminAllowed()).toBe(false)
  })

  it('est autorisé par défaut en dev', () => {
    process.env.NODE_ENV = 'development'
    delete process.env.FALLBACK_ADMIN_ENABLED
    expect(fallbackAdminAllowed()).toBe(true)
  })
})

describe('buildCorsOrigin', () => {
  function check(origin: string | undefined, env: Record<string, string>) {
    Object.assign(process.env, env)
    const fn = buildCorsOrigin()
    return new Promise<boolean>((resolve) => {
      fn(origin, (err, ok) => resolve(!err && ok === true))
    })
  }

  it('accepte les origines de la liste blanche', async () => {
    process.env.NODE_ENV = 'production'
    expect(await check('https://app.creorga.lu', { ALLOWED_ORIGINS: 'https://app.creorga.lu' })).toBe(true)
  })

  it('rejette une origine inconnue en production', async () => {
    process.env.NODE_ENV = 'production'
    expect(await check('https://evil.example.com', { ALLOWED_ORIGINS: 'https://app.creorga.lu' })).toBe(false)
  })

  it('accepte localhost en dev', async () => {
    process.env.NODE_ENV = 'development'
    expect(await check('http://localhost:5175', {})).toBe(true)
  })

  it('rejette localhost en production', async () => {
    process.env.NODE_ENV = 'production'
    expect(await check('http://localhost:5175', { ALLOWED_ORIGINS: 'https://app.creorga.lu' })).toBe(false)
  })
})
