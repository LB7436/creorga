import { usePOS } from '../store/posStore'

export type BusinessRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SERVER' | 'CASHIER' | 'EMPLOYEE' | 'WAITER'
export type BusinessAccess = { role: BusinessRole; capabilities: string[]; revision: string; version: number }
let epoch = 0
export const accessEpoch = () => epoch
export function parseBusinessAccess(value: unknown): BusinessAccess | null {
  const access = value as BusinessAccess | null
  if (!access || !['OWNER', 'ADMIN', 'MANAGER', 'SERVER', 'CASHIER', 'EMPLOYEE', 'WAITER'].includes(access.role) || typeof access.revision !== 'string' || !access.revision.trim()
    || !Array.isArray(access.capabilities) || access.capabilities.some(key => typeof key !== 'string')
    || !Number.isSafeInteger(access.version) || access.version < 0) return null
  return { role: access.role, revision: access.revision, capabilities: [...new Set(access.capabilities)].sort(),
    version: access.version }
}
export const hasCapability = (capability: string, access: BusinessAccess | null = usePOS.getState().businessAccess) => Boolean(access?.capabilities.includes(capability))
export function requireCapability(capability: string) {
  if (!hasCapability(capability)) throw Object.assign(new Error('Accès non autorisé : cette action nécessite une permission active. Les brouillons et références en attente sont conservés.'), { status: 403 })
}
export function adoptBusinessAccess(value: unknown) {
  const next = parseBusinessAccess(value), previous = usePOS.getState().businessAccess
  if (previous && next && next.version < previous.version) return false
  const changed = JSON.stringify(previous) !== JSON.stringify(next)
  if (!changed) return true
  epoch++
  usePOS.setState(state => ({ businessAccess: next,
    ...(next && state.currentStaff ? { currentStaff: { ...state.currentStaff, role: next.role } } : {}),
    ...(changed || !hasCapability('finance.revenue.read', next) ? { ventes: [], clotures: [], financialDataReady: false } : {}),
  }))
  return true
}
export function invalidateBusinessAccess() {
  epoch++
  // Ne jamais effacer les commandes, les places ou les clés d'idempotence :
  // une révocation ne prouve pas qu'une opération financière a échoué.
  usePOS.setState({ businessAccess: null, ventes: [], clotures: [], financialDataReady: false })
}
export function assertAccessEpoch(expected: number) {
  if (epoch !== expected) throw new Error('Les permissions de caisse ont changé. Actualisez les droits avant de consulter ces données.')
}
