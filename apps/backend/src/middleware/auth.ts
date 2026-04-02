import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import logger from '../lib/logger'

export interface AuthPayload {
  userId: string
  email: string
}

export interface AuthRequest extends Request {
  user?: AuthPayload
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token manquant' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload
    req.user = payload
    next()
  } catch {
    logger.warn('Token invalide ou expiré')
    res.status(401).json({ message: 'Token invalide ou expiré' })
  }
}
