import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { isProduction } from './security'

/**
 * Secrets et jetons de la console créateur.
 *
 * Étanchéité avec les comptes sociétés garantie trois fois :
 *  1. secret JWT distinct (CREATOR_JWT_SECRET, jamais JWT_SECRET) — un jeton
 *     société échoue mathématiquement à la vérification ici, et inversement ;
 *  2. claim de type (`typ: 'creator'`) vérifié en plus, défense en profondeur
 *     si un jour les secrets étaient confondus ;
 *  3. table CreatorAccount sans aucun lien avec User/UserCompany.
 */

const DEV_JWT_SECRET = 'dev-creator-jwt-jamais-valable-en-production-0123456789'
const DEV_TOTP_KEY = 'dev-creator-totp-jamais-valable-en-production-0123456789'

/** En production, la console n'est montée que si ses secrets sont posés. */
export function creatorConfigure(): boolean {
  if (!isProduction()) return true
  return (
    (process.env.CREATOR_JWT_SECRET || '').length >= 32 &&
    (process.env.CREATOR_TOTP_KEY || '').length >= 32
  )
}

function secretJwt(): string {
  const s = process.env.CREATOR_JWT_SECRET || ''
  if (s.length >= 32) return s
  if (isProduction()) throw new Error('CREATOR_JWT_SECRET manquant ou trop court (< 32) en production')
  return DEV_JWT_SECRET
}

function cleTotp(): Buffer {
  const s = process.env.CREATOR_TOTP_KEY || ''
  if (isProduction() && s.length < 32) {
    throw new Error('CREATOR_TOTP_KEY manquant ou trop court (< 32) en production')
  }
  return crypto.createHash('sha256').update(s || DEV_TOTP_KEY).digest()
}

export type CreatorTokenType = 'creator' | 'creator-pending'
export interface CreatorPayload {
  accountId: string
  typ: CreatorTokenType
}

/** Jeton d'accès complet — 15 minutes. */
export function signerAccesCreator(accountId: string): string {
  return jwt.sign({ accountId, typ: 'creator' }, secretJwt(), { expiresIn: '15m' })
}

/** Jeton intermédiaire entre mot de passe et TOTP — 5 minutes, n'ouvre rien. */
export function signerAttenteTotp(accountId: string): string {
  return jwt.sign({ accountId, typ: 'creator-pending' }, secretJwt(), { expiresIn: '5m' })
}

export function verifierJetonCreator(token: string): CreatorPayload | null {
  try {
    const p = jwt.verify(token, secretJwt()) as any
    if (p?.typ !== 'creator' && p?.typ !== 'creator-pending') return null
    if (typeof p?.accountId !== 'string' || !p.accountId) return null
    return { accountId: p.accountId, typ: p.typ }
  } catch {
    return null
  }
}

// ─── Secret TOTP chiffré au repos (AES-256-GCM) ─────────────────────────
// Format : v1:<iv b64>:<tag b64>:<données b64> — l'authentification GCM
// détecte toute altération ou mauvaise clé.

export function chiffrerSecretTotp(secret: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', cleTotp(), iv)
  const donnees = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), donnees.toString('base64')].join(':')
}

export function dechiffrerSecretTotp(blob: string): string {
  const [version, ivB64, tagB64, donneesB64] = String(blob).split(':')
  if (version !== 'v1' || !ivB64 || !tagB64 || !donneesB64) {
    throw new Error('Format de secret TOTP inconnu')
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', cleTotp(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(donneesB64, 'base64')), decipher.final()]).toString('utf8')
}
