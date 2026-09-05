/** Les droits viennent de l'adhésion validée par requireCompany, jamais du corps. */
export function canManageHr(req: { role?: string }): boolean {
  return req.role === 'OWNER' || req.role === 'MANAGER'
}

export function hrMembershipScope(req: { companyId?: string; role?: string; user?: { userId?: string } }) {
  if (!req.companyId || !req.user?.userId) throw new Error('Contexte RH authentifié requis')
  return { companyId: req.companyId, ...(!canManageHr(req) ? { userId: req.user.userId } : {}) }
}
