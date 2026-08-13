import type { Request, Response, NextFunction } from 'express'
import { verifierJetonCreator } from '../lib/creatorSecurity'

export interface CreatorRequest extends Request {
  creator?: { accountId: string }
}

/**
 * Garde des routes /api/creator/* (hors /auth/login, /auth/totp, /auth/refresh).
 *
 * Un JWT société est signé avec JWT_SECRET : sa vérification échoue ici avant
 * même le contrôle du claim. Un jeton d'attente TOTP (`creator-pending`)
 * n'ouvre aucune route protégée.
 */
export function creatorAuth(req: CreatorRequest, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Jeton créateur requis' })
    return
  }
  const payload = verifierJetonCreator(auth.slice(7))
  if (!payload || payload.typ !== 'creator') {
    res.status(401).json({ message: 'Jeton créateur invalide' })
    return
  }
  req.creator = { accountId: payload.accountId }
  next()
}
