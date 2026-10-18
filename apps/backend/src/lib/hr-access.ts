/** Les droits viennent de l'adhésion validée par requireCompany, jamais du corps. */
import { hasCapability, type BusinessAccess } from './business-permissions'
export function canManageHr(req: { role?: string; businessAccess?: BusinessAccess }): boolean {
  return hasCapability(req, 'hr.manage')
}

export function hrMembershipScope(req: { companyId?: string; role?: string; businessAccess?: BusinessAccess; user?: { userId?: string } }) {
  if (!req.companyId || !req.user?.userId) throw new Error('Contexte RH authentifié requis')
  return { companyId: req.companyId, ...(!canManageHr(req) ? { userId: req.user.userId } : {}) }
}
