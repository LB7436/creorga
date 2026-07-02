import * as Sentry from '@sentry/node'
import logger from './logger'

let enabled = false

/**
 * Monitoring d'erreurs (Sentry) — activé uniquement si SENTRY_DSN est défini.
 * Sans DSN, tout est no-op : zéro impact en dev.
 */
export function initMonitoring() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || undefined,
    tracesSampleRate: 0.1,
  })
  enabled = true
  logger.info('[monitoring] Sentry activé')
}

export function captureError(err: unknown, context?: Record<string, unknown>) {
  if (!enabled) return
  Sentry.captureException(err, context ? { extra: context } : undefined)
}
