import type { RequestHandler } from 'express'
import type { Prisma } from '@prisma/client'
import { accessFor, hasCapability, type BusinessAccess, type BusinessMember, type Capability } from './business-permissions'

export class BusinessPermissionError extends Error {
  readonly status = 403
  constructor() { super('Votre accès à cette opération a été retiré ou n’est pas autorisé.') }
}

/** Relire après les verrous métier ; FOR SHARE sérialise une révocation concurrente. */
export async function transactionBusinessAccess(tx: Prisma.TransactionClient, companyId: string, userId: string): Promise<BusinessAccess> {
  if (!companyId || !userId) throw new BusinessPermissionError()
  const members = await tx.$queryRaw<BusinessMember[]>`SELECT "role", "capabilities", "accessVersion", "isActive" FROM "UserCompany" WHERE "companyId" = ${companyId} AND "userId" = ${userId} AND "isActive" = true FOR SHARE`
  if (!members[0]) throw new BusinessPermissionError()
  return accessFor({ ...members[0], companyId, userId })
}

export async function assertTransactionCapabilities(tx: Prisma.TransactionClient, req: { companyId: string; user?: { userId?: string }; businessAccess?: BusinessAccess }, ...capabilities: Capability[]): Promise<BusinessAccess> {
  const access = await transactionBusinessAccess(tx, req.companyId, req.user?.userId || '')
  if (!capabilities.every(capability => access.capabilities.includes(capability))) throw new BusinessPermissionError()
  req.businessAccess = access
  return access
}

export function requireCapabilities(...capabilities: Capability[]): RequestHandler {
  return (req: any, res, next) => {
    if (!capabilities.every(capability => hasCapability(req, capability))) {
      res.status(403).json({ message: 'Cette opération n’est pas autorisée pour votre accès.' })
      return
    }
    next()
  }
}
