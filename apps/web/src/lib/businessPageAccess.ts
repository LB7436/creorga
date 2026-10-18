import type { BusinessAccess } from '@/types'
export function pageCapability(pathname: string): string | null {
  if (pathname === '/' || pathname === '/pos' || pathname === '/pos/dashboard') return 'finance.revenue.read'
  if (pathname.startsWith('/pos/floor')) return 'service.read'
  if (pathname === '/qrmenu' || pathname === '/clients' || pathname.startsWith('/ads/regie')) return 'settings.manage'
  if (pathname.startsWith('/accounting/caisse')) return 'cash.close'
  if (pathname.startsWith('/accounting/depenses')) return 'finance.costs.read'
  if (pathname.startsWith('/accounting') || pathname.startsWith('/sales')) return 'finance.revenue.read'
  if (pathname.startsWith('/invoices')) return 'invoices.read'
  if (pathname.startsWith('/admin/users')) return 'hr.manage'
  if (pathname.startsWith('/admin/catalog')) return 'catalog.prices.write'
  if (pathname.startsWith('/admin') || pathname.startsWith('/settings/modules') || pathname.startsWith('/setup')) return 'settings.manage'
  if (pathname.startsWith('/inventory/achats') || pathname.startsWith('/inventory/commandes') || pathname.startsWith('/inventory/fournisseurs')) return 'finance.costs.read'
  if (pathname.startsWith('/inventory') || pathname === '/standalone/stock') return 'inventory.quantities.read'
  if (pathname.startsWith('/crm')) return 'crm.customers.read'
  if (pathname.startsWith('/hr/team')) return 'hr.manage'
  if (pathname.startsWith('/hr/planning') || pathname.startsWith('/standalone/planning')) return 'hr.schedule.read'
  if (pathname.startsWith('/hr')) return 'hr.self'
  if (pathname.startsWith('/haccp')) return 'haccp.record'
  if (pathname.startsWith('/ai')) return 'assistant.use'
  return null
}
export function mayOpenBusinessPage(pathname: string, access: BusinessAccess | null): boolean {
  // Abonnement et journal propriétaire ne sont pas une console de plateforme.
  // La délégation de ces parcours n'est pas qualifiée dans le contrat actuel.
  if (pathname.startsWith('/owner')) return access?.role === 'OWNER' && access.capabilities.includes('settings.manage')
  if (pathname.startsWith('/admin/users')) return ['hr.manage', 'permissions.manage'].some(value => access?.capabilities.includes(value))
  if (pathname.startsWith('/hr/equipe')) return ['hr.manage', 'hr.self'].some(value => access?.capabilities.includes(value))
  const capability = pageCapability(pathname)
  return !capability || access?.capabilities.includes(capability) === true
}
