import { createHash } from 'node:crypto'

// Contrat métier versionné, distinct des comptes de plateforme. Aucune migration
// implicite des employés historiques en caissiers ou administrateurs.
export const CAPABILITIES = [
  'finance.revenue.read', 'finance.costs.read', 'finance.manage',
  'inventory.quantities.read', 'inventory.adjust', 'catalog.read', 'catalog.prices.write',
  'service.read', 'service.manage', 'payments.receive', 'discounts.grant', 'complimentary.grant',
  'orders.cancel', 'refunds.declare', 'cash.open', 'cash.close', 'invoices.read', 'invoices.write',
  'exports.read', 'hr.manage', 'hr.self', 'hr.schedule.read', 'hr.schedule.manage',
  'settings.manage', 'permissions.manage', 'assistant.use', 'assistant.business.read',
  'haccp.record', 'haccp.manage', 'crm.customers.read', 'marketing.read', 'reputation.read',
] as const
export type Capability = typeof CAPABILITIES[number]
export const BUSINESS_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SERVER', 'CASHIER', 'EMPLOYEE'] as const
const employee: Capability[] = ['catalog.read', 'service.read', 'inventory.quantities.read', 'hr.self', 'hr.schedule.read', 'assistant.use', 'assistant.business.read', 'haccp.record']
const server: Capability[] = [...employee, 'service.manage', 'payments.receive', 'crm.customers.read']
const manager: Capability[] = CAPABILITIES.filter(c => c !== 'permissions.manage')
const defaults: Record<string, readonly Capability[]> = {
  OWNER: CAPABILITIES, MANAGER: manager, SERVER: server, WAITER: server,
  CASHIER: [...server, 'cash.open', 'cash.close'], EMPLOYEE: employee,
  ADMIN: [...employee, 'hr.manage', 'hr.schedule.manage', 'settings.manage', 'inventory.adjust', 'catalog.prices.write', 'haccp.manage', 'crm.customers.read'],
}
export interface BusinessAccess { role: string; capabilities: Capability[]; revision: string; version: number }
export interface BusinessMember { role?: string | null; capabilities?: unknown; accessVersion?: number; isActive?: boolean; userId?: string; companyId?: string }
export function validCapabilityOverrides(value: unknown): value is Partial<Record<Capability, boolean>> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.entries(value).every(([key, enabled]) => (CAPABILITIES as readonly string[]).includes(key) && typeof enabled === 'boolean')
}
export function accessFor(member: BusinessMember): BusinessAccess {
  const role = member.role || '', version = Number.isSafeInteger(member.accessVersion) && member.accessVersion! >= 0 ? member.accessVersion! : 0
  const knownRole = Object.prototype.hasOwnProperty.call(defaults, role)
  const enabled = new Set<Capability>(member.isActive === false || !knownRole ? [] : defaults[role])
  // Une politique corrompue n'élève jamais un compte. Le propriétaire conserve
  // ses capacités prévues ; seul un changement de rôle explicite peut les retirer.
  if (knownRole && role !== 'OWNER' && member.isActive !== false) {
    if (!validCapabilityOverrides(member.capabilities ?? {})) enabled.clear()
    else for (const [key, grant] of Object.entries(member.capabilities ?? {})) {
      if (grant) enabled.add(key as Capability); else enabled.delete(key as Capability)
    }
  }
  const capabilities = [...enabled].sort()
  const revision = createHash('sha256').update(JSON.stringify([1, member.companyId, member.userId, role, version, capabilities])).digest('hex')
  return { role, capabilities, revision, version }
}
export function hasCapability(req: { businessAccess?: BusinessAccess }, capability: Capability): boolean {
  return req.businessAccess?.capabilities.includes(capability) === true
}
