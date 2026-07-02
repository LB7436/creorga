import { type Request, type Response, type NextFunction } from 'express'
import logger from '../lib/logger'
import { captureError } from '../lib/monitoring'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error('Erreur non gérée:', err)
  captureError(err, { method: req.method, path: req.path })

  res.status(500).json({
    message: process.env.NODE_ENV === 'production'
      ? 'Erreur interne du serveur'
      : err.message,
  })
}
