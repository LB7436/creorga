import { type Request, type Response, type NextFunction } from 'express'
import logger from '../lib/logger'
import { captureError } from '../lib/monitoring'
import { push as pushEvenement } from '../lib/eventSink'

/**
 * Erreur levée par express.json() quand le corps n'est pas du JSON valide.
 * Sans ce cas particulier, un client qui envoie une requête mal formée
 * recevait un 500 « erreur serveur » alors que la faute est côté client —
 * et l'incident partait en alerte Sentry.
 */
function isBodyParserSyntaxError(err: any): boolean {
  return err instanceof SyntaxError && 'body' in err && (err as any).status === 400
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (isBodyParserSyntaxError(err)) {
    logger.warn(`Corps de requête JSON invalide sur ${req.method} ${req.path}`)
    res.status(400).json({ message: 'Corps de requête JSON invalide' })
    return
  }

  logger.error('Erreur non gérée:', err)
  captureError(err, { method: req.method, path: req.path })
  // Console créateur : l'erreur est visible avec son contexte de requête —
  // le transport Winston, lui, n'a que le message.
  pushEvenement('errorLog', {
    method: req.method,
    path: req.path,
    companyId: (req as any).companyId ?? null,
    message: String(err?.message ?? err).slice(0, 2000),
    stack: err?.stack ? String(err.stack).slice(0, 4000) : null,
  })

  res.status(500).json({
    message: process.env.NODE_ENV === 'production'
      ? 'Erreur interne du serveur'
      : err.message,
  })
}
