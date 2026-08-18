import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'
import { isProduction } from '../lib/security'
import logger from '../lib/logger'

const FALLBACK_COMPANY = {
  id: 'fallback-company',
  name: 'Café um Rond-Point',
  email: 'contact@creorga.local',
}

export async function requireCompany(req: Request, res: Response, next: NextFunction) {
  // Accept company from header OR default to the authenticated user's first company
  const user = (req as any).user
  let companyId = (req.headers['x-company-id'] as string) || ''

  // Fallback admin token → grant access to fallback company without DB
  if (user?.userId === 'fallback-admin') {
    ;(req as any).companyId = FALLBACK_COMPANY.id
    ;(req as any).company = FALLBACK_COMPANY
    ;(req as any).role = 'OWNER'
    return next()
  }

  try {
    // Requêtes sans utilisateur (montage derrière deviceOrUserAuth) : un
    // terminal POS présente un jeton d'installation, sans identité — il n'y a
    // aucune adhésion à vérifier. Ne JAMAIS poursuivre vers la recherche
    // d'adhésion avec un userId indéfini : Prisma ignore un filtre undefined,
    // la requête renverrait l'adhésion d'un autre membre (élévation silencieuse).
    if (!user?.userId) {
      if ((req as any).device) {
        const device = (req as any).device as { type: string; companyId?: string }
        // v5.0 — Jeton lié à une société (POS_DEVICE_TOKENS ou
        // POS_DEVICE_COMPANY_ID) : la société annoncée doit être la sienne ;
        // sans en-tête, on prend celle du jeton. Un jeton global historique
        // (sans société) garde l'ancien contrôle d'existence.
        if (device.companyId) {
          if (companyId && companyId !== device.companyId) {
            res.status(403).json({ error: 'Ce terminal n’est pas rattaché à cette société' })
            return
          }
          companyId = device.companyId
        }
        if (!companyId) {
          res.status(400).json({ error: 'x-company-id header requis' })
          return
        }
        const company = await prisma.company.findUnique({ where: { id: companyId } })
        if (!company) {
          res.status(403).json({ error: 'Accès refusé à cette société' })
          return
        }
        ;(req as any).companyId = companyId
        ;(req as any).company = company
        ;(req as any).role = null
        return next()
      }
      if (isProduction()) {
        res.status(401).json({ error: 'Authentification requise' })
        return
      }
      // Compat dev de deviceOrUserAuth : requête sans aucun jeton hors production.
      ;(req as any).companyId = companyId || FALLBACK_COMPANY.id
      ;(req as any).company = FALLBACK_COMPANY
      ;(req as any).role = 'OWNER'
      return next()
    }

    // If no header passed, pick the user's first active company.
    if (!companyId && user?.userId) {
      const first = await prisma.userCompany.findFirst({
        where: { userId: user.userId, isActive: true },
        include: { company: true },
      })
      if (first) {
        ;(req as any).companyId = first.companyId
        ;(req as any).company = first.company
        ;(req as any).role = first.role
        return next()
      }
    }

    if (!companyId) {
      res.status(400).json({ error: 'x-company-id header requis' })
      return
    }

    const membership = await prisma.userCompany.findFirst({
      where: { userId: user?.userId, companyId, isActive: true },
      include: { company: true },
    })
    if (!membership) {
      res.status(403).json({ error: 'Accès refusé à cette société' })
      return
    }

    ;(req as any).companyId = companyId
    ;(req as any).company = membership.company
    ;(req as any).role = membership.role
    next()
  } catch (error: any) {
    // Base injoignable.
    //
    // En production, NE JAMAIS basculer sur la société de repli : cela accordait
    // le rôle OWNER à n'importe quel porteur d'un jeton valide dès que la base
    // tombait. Une grande partie de l'état applicatif (plan de salle, config des
    // modules, stock, régie pub, agent) vit dans data/*.json et reste servie sans
    // base — l'élévation de privilèges était donc réellement exploitable.
    // Une panne de base doit se traduire par un 503, pas par une promotion.
    if (isProduction()) {
      logger.error(`[requireCompany] base injoignable, accès refusé: ${error?.message || error}`)
      res.status(503).json({ error: 'Service temporairement indisponible (base de données)' })
      return
    }

    // Hors production uniquement : mode dégradé volontaire, pour pouvoir
    // travailler sans Docker/Postgres sur une machine de développement.
    logger.warn(`[requireCompany] base injoignable, repli dev sur la société fallback: ${error?.message || error}`)
    ;(req as any).companyId = FALLBACK_COMPANY.id
    ;(req as any).company = FALLBACK_COMPANY
    ;(req as any).role = 'OWNER'
    next()
  }
}

/**
 * Exige un rôle précis sur la société courante. À chaîner APRÈS `requireCompany`,
 * qui pose `req.role` depuis `UserCompany`. Renvoie 403 sinon.
 *
 * Jusqu'ici le seul contrôle de rôle du backend était inline dans companies.ts :
 * les routes les plus sensibles (sauvegardes intégrales, journal d'audit global,
 * purge RGPD) étaient accessibles à TOUT membre authentifié, rôle STAFF compris.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as any).role
    if (!role || !roles.includes(role)) {
      res.status(403).json({ error: 'Action réservée au propriétaire' })
      return
    }
    next()
  }
}
