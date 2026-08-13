import prisma from '../lib/prisma'
import logger from '../lib/logger'

/**
 * Rétention RGPD de la console créateur — purge quotidienne.
 *
 * | Table                | Rétention | Pourquoi                                  |
 * |----------------------|-----------|-------------------------------------------|
 * | ActivityEvent        | 90 j      | minimisation ; les tendances longues      |
 * |                      |           | vivent dans TenantMetricDaily             |
 * | LoginEvent           | 180 j     | sessions / sécurité                       |
 * | ErrorLog             | 30 j      | débogage                                  |
 * | Opportunity DISMISSED| 365 j     | historique commercial épuré               |
 * | CreatorRefreshToken  | 90 j      | journal de connexion console (révoqués/   |
 * | révoqués ou expirés  |           | expirés seulement)                        |
 *
 * TenantMetricDaily n'est jamais purgé : agrégat au niveau société, une ligne
 * par jour.
 */

const JOUR_MS = 24 * 60 * 60 * 1000

export interface BilanPurge {
  activityEvents: number
  loginEvents: number
  errorLogs: number
  opportunites: number
  refreshTokens: number
}

export async function purgerRetention(maintenant: Date = new Date()): Promise<BilanPurge> {
  const seuil = (jours: number) => new Date(maintenant.getTime() - jours * JOUR_MS)

  const [a, l, e, o, r] = await prisma.$transaction([
    prisma.activityEvent.deleteMany({ where: { ts: { lt: seuil(90) } } }),
    prisma.loginEvent.deleteMany({ where: { ts: { lt: seuil(180) } } }),
    prisma.errorLog.deleteMany({ where: { ts: { lt: seuil(30) } } }),
    prisma.opportunity.deleteMany({ where: { status: 'DISMISSED', updatedAt: { lt: seuil(365) } } }),
    prisma.creatorRefreshToken.deleteMany({
      where: {
        OR: [{ revokedAt: { lt: seuil(90) } }, { expiresAt: { lt: seuil(90) } }],
      },
    }),
  ])

  const bilan: BilanPurge = {
    activityEvents: a.count,
    loginEvents: l.count,
    errorLogs: e.count,
    opportunites: o.count,
    refreshTokens: r.count,
  }
  const total = a.count + l.count + e.count + o.count + r.count
  if (total > 0) {
    logger.info(`[creator-retention] purge : ${JSON.stringify(bilan)}`)
  }
  return bilan
}

let premierPassage: NodeJS.Timeout | null = null
let minuteur: NodeJS.Timeout | null = null

export function startCreatorRetention(): void {
  if (minuteur) return
  const lancer = () => {
    purgerRetention().catch((e) => logger.error(`[creator-retention] purge impossible: ${e?.message || e}`))
  }
  // Premier passage 5 min après le démarrage, puis toutes les 24 h.
  premierPassage = setTimeout(lancer, 5 * 60 * 1000)
  premierPassage.unref?.()
  minuteur = setInterval(lancer, JOUR_MS)
  minuteur.unref?.()
}

export function stopCreatorRetention(): void {
  if (premierPassage) {
    clearTimeout(premierPassage)
    premierPassage = null
  }
  if (minuteur) {
    clearInterval(minuteur)
    minuteur = null
  }
}
