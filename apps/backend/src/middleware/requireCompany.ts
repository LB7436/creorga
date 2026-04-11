import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

export async function requireCompany(req: Request, res: Response, next: NextFunction) {
  const companyId = req.headers['x-company-id'] as string
  if (!companyId) {
    res.status(400).json({ error: 'x-company-id header requis' })
    return
  }

  const membership = await prisma.userCompany.findFirst({
    where: { userId: (req as any).user.id, companyId, isActive: true },
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
}
