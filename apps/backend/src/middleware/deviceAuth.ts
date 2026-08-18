import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { timingSafeEqual } from 'crypto'
import { isProduction } from '../lib/security'

/**
 * Auth hybride pour les routes partagées POS/web (orders, payments,
 * floor-state, module-config) :
 *  1. X-Device-Token valide (terminal POS enregistré) → ok
 *  2. Bearer JWT utilisateur valide → ok
 *  3. Hors production → ok (compat dev : POS et web font des fetch sans token)
 *  4. Sinon → 401
 *
 * v5.0 — jeton d'appareil ↔ société. Le jeton global `POS_DEVICE_TOKEN`
 * ouvrait TOUTES les sociétés de l'installation (il suffisait d'annoncer un
 * autre `x-company-id`). Deux formes sont désormais lues :
 *  - `POS_DEVICE_TOKENS="<companyId>:<jeton>,<companyId2>:<jeton2>"` : un jeton
 *    par société ; `req.device.companyId` est posé et `requireCompany` refuse
 *    toute autre société (403).
 *  - `POS_DEVICE_TOKEN` (historique) : accepté tel quel ; s'il est accompagné de
 *    `POS_DEVICE_COMPANY_ID`, il est lié à cette société, sinon il reste global
 *    (comportement d'avant, signalé au démarrage).
 */

export interface DeviceIdentity {
  type: 'pos-terminal'
  /** Société à laquelle le jeton est lié ; absent = jeton global historique. */
  companyId?: string
}

function egal(a: string, b: string) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/** Table jeton → société, relue à chaque appel (les tests changent l'env). */
export function jetonsAppareils(): { token: string; companyId?: string }[] {
  const liste: { token: string; companyId?: string }[] = []
  const multi = process.env.POS_DEVICE_TOKENS || ''
  for (const part of multi.split(',')) {
    const [companyId, token] = part.split(':').map((s) => s?.trim())
    if (companyId && token) liste.push({ companyId, token })
  }
  const global = process.env.POS_DEVICE_TOKEN
  if (global) liste.push({ token: global, companyId: process.env.POS_DEVICE_COMPANY_ID?.trim() || undefined })
  return liste
}

/** Identité d'appareil correspondant au jeton présenté, ou null. */
export function identifierAppareil(provided: unknown): DeviceIdentity | null {
  if (typeof provided !== 'string' || !provided) return null
  for (const entree of jetonsAppareils()) {
    if (egal(entree.token, provided)) return { type: 'pos-terminal', companyId: entree.companyId }
  }
  return null
}

export function deviceOrUserAuth(req: Request, res: Response, next: NextFunction) {
  const device = identifierAppareil(req.headers['x-device-token'])
  if (device) {
    ;(req as any).device = device
    return next()
  }

  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET!) as { userId: string; email: string }
      ;(req as any).user = payload
      return next()
    } catch {
      // token invalide → on continue vers le fallback dev / 401
    }
  }

  if (!isProduction()) return next()

  res.status(401).json({ message: 'Authentification requise (token device ou utilisateur)' })
}
