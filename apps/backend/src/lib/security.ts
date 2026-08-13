import rateLimit from 'express-rate-limit'
import crypto from 'crypto'

export const isProduction = () => process.env.NODE_ENV === 'production'

/**
 * Token de service pour les appels internes serveur→serveur (ex. super-ask
 * qui rappelle /api/agent/intent en loopback). Généré au boot, jamais exposé.
 */
export const INTERNAL_API_TOKEN =
  process.env.INTERNAL_API_TOKEN || crypto.randomBytes(24).toString('hex')

export const internalHeaders = () => ({ 'X-Internal-Token': INTERNAL_API_TOKEN })

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

/**
 * Désactive les limiteurs quand RATE_LIMIT_DISABLED=true — uniquement hors
 * production. La suite d'audit API (`npm run test:api`) enchaîne des tentatives
 * de login volontairement fausses (mot de passe erroné, compte inconnu) et
 * épuiserait sinon le quota de 10 tentatives / 5 min dès le premier run.
 * Le garde-fou isProduction() rend l'interrupteur inopérant en production.
 */
function rateLimitBypass(): boolean {
  return !isProduction() && process.env.RATE_LIMIT_DISABLED === 'true'
}

/** Anti brute-force sur le login : 10 tentatives / 5 min / IP. */
export const authLimiter = rateLimit({
  skip: rateLimitBypass,
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives, réessayez dans quelques minutes.' },
})

/** Quota IA : les routes agent/IA coûtent des tokens — 60 req / min / IP. */
/**
 * Limiteur des routes d'assistant.
 *
 * Il était à 60/min, mais CHAQUE page du back-office ouvre deux appels
 * `/api/agent` (le flux temps réel de l'opérateur, plus une exécution) : le
 * plafond réel était donc d'une page toutes les deux secondes. Mesuré en
 * parcourant les 129 pages : le 429 tombe, et l'assistant affiche une erreur
 * alors que la page, elle, s'affiche correctement. Quelqu'un qui enchaîne les
 * modules en démonstration l'atteint.
 *
 * 240/min laisse de la marge à un humain pressé tout en gardant un garde-fou
 * contre une boucle qui s'emballerait.
 */
export const aiLimiter = rateLimit({
  skip: rateLimitBypass,
  windowMs: 60 * 1000,
  limit: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Quota IA atteint, réessayez dans une minute.' },
})

/**
 * Console créateur : un seul utilisateur légitime au monde — le quota peut
 * être bien plus sévère que l'authLimiter des sociétés (5 tentatives / 15 min).
 */
export const creatorAuthLimiter = rateLimit({
  skip: rateLimitBypass,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives sur la console. Réessayez dans 15 minutes.' },
})

/** Limiteur générique API publique (portail client) : 300 req / min / IP. */
export const publicLimiter = rateLimit({
  skip: rateLimitBypass,
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de requêtes.' },
})
