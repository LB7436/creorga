import { type Request, type Response, type NextFunction } from 'express'
import logger from '../lib/logger'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error('Erreur non gérée:', err)

  res.status(500).json({
    message: process.env.NODE_ENV === 'production'
      ? 'Erreur interne du serveur'
      : err.message,
  })
}
