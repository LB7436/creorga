import { describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import { signDocumentCapability, verifyDocumentCapability } from './document-link-token'

const secret = 'secret-fictif-de-serveur-uniquement-pour-la-recette-0123456789'
const link = { id: '9c095d8e-7680-4eba-9331-16f6da75d001', companyId: 'company-A', invoiceId: 'invoice-A', documentHash: 'a'.repeat(64), expiresAt: new Date('2026-10-16T12:15:00.000Z') }

describe('Capacité PDF : signature et échéance serveur', () => {
  it('autorise le rejeu avant l’échéance et refuse exactement à l’échéance', () => {
    const token = signDocumentCapability(link, secret)
    expect(verifyDocumentCapability(token, link, secret, new Date('2026-10-16T12:14:59.999Z'))).toBe(true)
    expect(verifyDocumentCapability(token, link, secret, new Date('2026-10-16T12:14:59.999Z'))).toBe(true)
    expect(verifyDocumentCapability(token, link, secret, link.expiresAt)).toBe(false)
    expect(verifyDocumentCapability(token, link, secret, new Date('2026-10-16T12:16:00.000Z'))).toBe(false)
  })
  it.each(['companyId', 'invoiceId', 'documentHash', 'id'] as const)('lie la signature au champ %s et refuse une réassociation', (key) => {
    const token = signDocumentCapability(link, secret)
    expect(verifyDocumentCapability(token, { ...link, [key]: key === 'id' ? '9c095d8e-7680-4eba-9331-16f6da75d002' : 'autre' }, secret, new Date('2026-10-16T12:00:00Z'))).toBe(false)
  })
  it('ne permet pas d’allonger l’échéance ni de changer de secret', () => {
    const token = signDocumentCapability(link, secret)
    const parts = token.split('.')
    parts[2] = String(Number(parts[2]) + 3600)
    expect(verifyDocumentCapability(parts.join('.'), link, secret, new Date('2026-10-16T12:00:00Z'))).toBe(false)
    expect(verifyDocumentCapability(token, link, secret + 'rotation', new Date('2026-10-16T12:00:00Z'))).toBe(false)
  })
  it('n’est jamais utilisable comme JWT de connexion, même avec le secret du serveur', () => {
    expect(() => jwt.verify(signDocumentCapability(link, secret), secret)).toThrow()
    const sessionJwt = jwt.sign({ userId: 'owner', aud: 'invoice-pdf-download' }, secret)
    expect(verifyDocumentCapability(sessionJwt, link, secret, new Date('2026-10-16T12:00:00Z'))).toBe(false)
  })
  it.each(['', 'v1.a.b.c', 'v2.9c095d8e-7680-4eba-9331-16f6da75d001.1792152900.' + 'a'.repeat(43), 'x'.repeat(5000)])('refuse un jeton malformé sans lever une erreur contenant son contenu', (token) => {
    expect(verifyDocumentCapability(token, link, secret, new Date('2026-10-16T12:00:00Z'))).toBe(false)
  })
  it('échoue sans secret robuste au lieu de fabriquer un secret de repli', () => {
    expect(() => signDocumentCapability(link, '')).toThrow(/configuration/i)
  })
})
