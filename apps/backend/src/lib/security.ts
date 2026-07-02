import rateLimit from 'express-rate-limit'

export const isProduction = () => process.env.NODE_ENV === 'production'

const WEAK_SECRETS = [
  'dev-jwt-secret-creorga-change-in-production',
  'dev-refresh-secret-creorga-change-in-production',
]

/**
 * En production, on refuse de démarrer avec des secrets faibles ou absents.
 * En dev, on laisse passer (les défauts sont posés dans index.ts).
 */
export function assertProductionSecrets() {
  if (!isProduction()) return
  const jwt = process.env.JWT_SECRET || ''
  const refresh = process.env.JWT_REFRESH_SECRET || ''
  const problems: string[] = []
  if (jwt.length < 32 || WEAK_SECRETS.includes(jwt)) {
    problems.push('JWT_SECRET manquant, trop court (<32) ou valeur de dev')
  }
  if (refresh.length < 32 || WEAK_SECRETS.includes(refresh)) {
    problems.push('JWT_REFRESH_SECRET manquant, trop court (<32) ou valeur de dev')
  }
  if (process.env.FALLBACK_ADMIN_ENABLED === 'true') {
    problems.push('FALLBACK_ADMIN_ENABLED=true est interdit en production')
  }
  if (problems.length) {
    throw new Error(`[security] Démarrage refusé en production:\n - ${problems.join('\n - ')}`)
  }
}

/**
 * Le fallback admin (login sans DB) n'est autorisé qu'en dev,
 * ou explicitement via FALLBACK_ADMIN_ENABLED=true (jamais en prod).
 */
export function fallbackAdminAllowed() {
  if (isProduction()) return false
  return process.env.FALLBACK_ADMIN_ENABLED !== 'false'
}

/**
 * CORS strict : liste blanche depuis ALLOWED_ORIGINS (séparés par des virgules)
 * + FRONTEND_URL. En dev uniquement, tout localhost/127.0.0.1 est accepté.
 */
export function buildCorsOrigin() {
  const fromEnv = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const allowed = new Set([...fromEnv, process.env.FRONTEND_URL || ''])
  allowed.delete('')

  return (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) => {
    // Requêtes sans Origin (curl, server-to-server, apps natives)
    if (!origin) return cb(null, true)
    if (allowed.has(origin)) return cb(null, true)
    if (!isProduction() && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return cb(null, true)
    }
    cb(new Error(`Origine non autorisée: ${origin}`))
  }
}

/** Anti brute-force sur le login : 10 tentatives / 5 min / IP. */
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives, réessayez dans quelques minutes.' },
})

/** Quota IA : les routes agent/IA coûtent des tokens — 60 req / min / IP. */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Quota IA atteint, réessayez dans une minute.' },
})

/** Limiteur générique API publique (portail client) : 300 req / min / IP. */
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de requêtes.' },
})
