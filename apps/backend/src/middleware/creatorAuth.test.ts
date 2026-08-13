import { describe, it, expect, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import { creatorAuth } from './creatorAuth'
import {
  signerAccesCreator,
  signerAttenteTotp,
  chiffrerSecretTotp,
  dechiffrerSecretTotp,
} from '../lib/creatorSecurity'

function makeCtx(authorization?: string) {
  const req: any = { headers: authorization ? { authorization } : {} }
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

// Le test d'étanchéité central de la console : aucun jeton du monde
// « sociétés » ne doit ouvrir une route créateur.
describe('creatorAuth — étanchéité', () => {
  it('un JWT société (signé JWT_SECRET) est refusé en 401', () => {
    process.env.JWT_SECRET = 'secret-societes-0123456789-0123456789'
    const jetonSociete = jwt.sign({ userId: 'u1', email: 'patron@cafe.lu' }, process.env.JWT_SECRET!)
    const { req, res, next } = makeCtx(`Bearer ${jetonSociete}`)

    creatorAuth(req, res, next)

    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
    expect(req.creator).toBeUndefined()
  })

  it("un jeton d'attente TOTP (creator-pending) n'ouvre aucune route protégée", () => {
    const { req, res, next } = makeCtx(`Bearer ${signerAttenteTotp('compte-1')}`)

    creatorAuth(req, res, next)

    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('un jeton créateur valide passe et pose req.creator', () => {
    const { req, res, next } = makeCtx(`Bearer ${signerAccesCreator('compte-1')}`)

    creatorAuth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.creator).toEqual({ accountId: 'compte-1' })
  })

  it('sans Bearer → 401', () => {
    const { req, res, next } = makeCtx()

    creatorAuth(req, res, next)

    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('chiffrement du secret TOTP (AES-256-GCM)', () => {
  it('aller-retour fidèle', () => {
    const blob = chiffrerSecretTotp('CAWLU32UP3Q2DDAVETB2ZG5RAIUJGJGI')
    expect(blob.startsWith('v1:')).toBe(true)
    expect(blob).not.toContain('CAWLU32UP3Q2DDAVETB2ZG5RAIUJGJGI')
    expect(dechiffrerSecretTotp(blob)).toBe('CAWLU32UP3Q2DDAVETB2ZG5RAIUJGJGI')
  })

  it('une altération est détectée (GCM)', () => {
    const blob = chiffrerSecretTotp('SECRETBASE32')
    const morceaux = blob.split(':')
    // On corrompt les données chiffrées.
    morceaux[3] = Buffer.from('corrompu-corrompu').toString('base64')
    expect(() => dechiffrerSecretTotp(morceaux.join(':'))).toThrow()
  })

  it('un format inconnu est refusé', () => {
    expect(() => dechiffrerSecretTotp('v2:abc:def:ghi')).toThrow('Format de secret TOTP inconnu')
  })
})
