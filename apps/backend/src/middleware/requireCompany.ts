import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

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
    // DB unreachable → bascule sur la société fallback
    ;(req as any).companyId = FALLBACK_COMPANY.id
    ;(req as any).company = FALLBACK_COMPANY
    ;(req as any).role = 'OWNER'
    next()
  }
}
