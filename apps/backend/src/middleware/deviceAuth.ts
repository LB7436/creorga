import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { isProduction } from '../lib/security'

/**
 * Auth hybride pour les routes partagées POS/web (orders, payments,
 * floor-state, module-config) :
 *  1. X-Device-Token valide (terminal POS enregistré via POS_DEVICE_TOKEN) → ok
 *  2. Bearer JWT utilisateur valide → ok
 *  3. Hors production → ok (compat dev : POS et web font des fetch sans token)
 *  4. Sinon → 401
 */
export function deviceOrUserAuth(req: Request, res: Response, next: NextFunction) {
  const deviceToken = process.env.POS_DEVICE_TOKEN
  const provided = req.headers['x-device-token']
  if (deviceToken && typeof provided === 'string' && provided === deviceToken) {
    ;(req as any).device = { type: 'pos-terminal' }
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
