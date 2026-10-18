import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'
import { fallbackAdminAllowed, isProduction } from '../lib/security'
import logger from '../lib/logger'
import { accessFor, hasCapability, type BusinessMember } from '../lib/business-permissions'
import { routeCapabilities } from '../lib/business-route-policy'

const FALLBACK_COMPANY = {
  id: 'fallback-company',
  name: 'Café um Rond-Point',
  email: 'contact@creorga.local',
}

function admitted(req: Request, res: Response, next: NextFunction, member: BusinessMember) {
  ;(req as any).businessAccess = accessFor(member)
  res.set?.('Cache-Control', 'private, no-store')
  // Le terminal ne reçoit jamais de rôle humain ; ses opérations existantes
  // restent soumises à leurs gardes de ressource et d'action.
  if (req.originalUrl && req.method && member.role !== 'OWNER') {
    const required = routeCapabilities(req.method, req.originalUrl)
    const allowed = required && (Array.isArray(required) ? required.every(capability => hasCapability(req as any, capability)) : required.any.some(capability => hasCapability(req as any, capability)))
    if (!allowed) {
      res.status(403).json({ code: 'CAPABILITY_REQUIRED', message: 'Votre accès ne permet pas cette action.' })
      return
    }
  }
  next()
}

export async function requireCompany(req: Request, res: Response, next: NextFunction) {
  // Accept company from header OR default to the authenticated user's first company
  const user = (req as any).user
  let companyId = (req.headers['x-company-id'] as string) || ''

  // Un ancien jeton signé reste techniquement valide après le passage en
  // production : contrôler l'autorisation de démonstration à chaque requête.
  if (user?.userId === 'fallback-admin') {
    if (!fallbackAdminAllowed()) {
      res.status(401).json({ error: 'Session de démonstration désactivée' })
      return
    }
    ;(req as any).companyId = FALLBACK_COMPANY.id
    ;(req as any).company = FALLBACK_COMPANY
    ;(req as any).role = 'OWNER'
    return admitted(req, res, next, { role: 'OWNER', userId: user.userId, companyId: FALLBACK_COMPANY.id })
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
        if (isProduction() && !device.companyId) {
          res.status(403).json({ error: 'Terminal non rattaché à une société' })
          return
        }
        // v5.0 — Jeton lié à une société (POS_DEVICE_TOKENS ou
        // POS_DEVICE_COMPANY_ID) : la société annoncée doit être la sienne ;
        // sans en-tête, on prend celle du jeton. Un jeton global historique
        // (sans société) est accepté uniquement hors production.
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
        return admitted(req, res, next, { role: 'SERVER', companyId })
      }
      // L'absence d'identité ne crée jamais une adhésion, même en local.
      res.status(401).json({ error: 'Authentification requise' })
      return
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
        return admitted(req, res, next, first)
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
    admitted(req, res, next, membership)
  } catch (error: any) {
    // Les installations locales contiennent aussi des données métier. Une
    // panne ne doit jamais transformer un membre en propriétaire du stockage
    // JSON encore disponible. La démonstration explicite est traitée plus haut.
    logger.error(`[requireCompany] base injoignable, accès refusé: ${error?.message || error}`)
    res.status(503).json({ error: 'Service temporairement indisponible (base de données)' })
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
