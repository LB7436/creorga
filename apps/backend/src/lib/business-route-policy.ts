import type { Capability } from './business-permissions'

// Défense commune : aucune route métier inconnue n'est ouverte aux profils
// délégués par simple présence d'une adhésion. Les contrôles d'objet restent requis.
export function routeCapabilities(method: string, rawUrl: string): Capability[] | { any: Capability[] } | null {
  const read = ['GET', 'HEAD'].includes(method.toUpperCase())
  let path: string
  try {
    const raw = rawUrl.split('?')[0]
    if (/%(?:2f|5c|00)/i.test(raw) || raw.includes('\\')) return null
    path = decodeURIComponent(raw).toLowerCase().replace(/\/+$/, '')
  } catch { return null }
  const under = (base: string) => path === base || path.startsWith(base + '/')
  const format = new URLSearchParams(rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : '').getAll('format')
  const exportsFile = read && (format.some(value => ['csv', 'xlsx', 'pdf'].includes(value.toLowerCase())) || /\/(pdf|export|exports)(\/|$)/.test(path))
  if (path === '/api/companies/access' && read) return []
  if (under('/api/companies/members')) return read ? { any: ['hr.manage', 'permissions.manage'] } : ['permissions.manage']
  if (under('/api/companies')) return ['settings.manage']
  if (under('/api/stats')) return ['finance.revenue.read']
  if (under('/api/accounting')) {
    if (under('/api/accounting/expenses')) return read ? exportsFile ? ['finance.costs.read', 'exports.read'] : ['finance.costs.read'] : ['finance.manage']
    if (exportsFile) return ['finance.revenue.read', 'exports.read']
    if (path === '/api/accounting/cash-drawers' && read) return { any: ['cash.open', 'cash.close', 'finance.revenue.read'] }
    if (/^\/api\/accounting\/cash-drawers\/(open)$/.test(path) && !read) return ['cash.open']
    if (/^\/api\/accounting\/cash-drawers\/[^/]+\/(close|report)$/.test(path)) return ['cash.close']
    if (/^\/api\/accounting\/cash-drawers\/[^/]+\/movements$/.test(path)) return ['finance.manage']
    return read ? ['finance.revenue.read'] : ['finance.manage']
  }
  if (under('/api/invoices')) return read ? exportsFile ? ['invoices.read', 'exports.read'] : ['invoices.read'] : ['invoices.write']
  if (under('/api/pos')) {
    if (path === '/api/pos/bootstrap' && read) return ['service.read']
    if (under('/api/pos/settings')) return ['settings.manage']
    if (under('/api/pos/catalog') || under('/api/pos/catalog-import')) return ['catalog.prices.write']
    if (path === '/api/pos/close') return ['cash.close', 'finance.revenue.read']
    if (under('/api/pos/sales') || under('/api/pos/payments') || path === '/api/pos/checkout') return ['payments.receive']
    if (under('/api/pos/financial-allocations')) return ['finance.manage']
    if (under('/api/pos/pricing')) return ['catalog.prices.write']
    if (path === '/api/pos/customers') return ['crm.customers.read']
    if (path === '/api/pos/benefit') return ['payments.receive']
    if (path === '/api/pos/kitchen' && read) return ['service.read']
    if (path === '/api/pos/draft' || under('/api/pos/kitchen') || under('/api/pos/table-movements') || under('/api/pos/service-separations')) return read ? ['service.read'] : ['service.manage']
    return null
  }
  if (under('/api/hr-dossier')) return read ? ['hr.self'] : ['hr.manage']
  if (under('/api/hr')) {
    // L'annuaire serveur filtre déjà la vue personnelle et n'y inclut aucun
    // profil RH. Ne pas transformer cette lecture propre en gestion d'équipe.
    if (path === '/api/hr/team') return read ? { any: ['hr.manage', 'hr.self'] } : ['hr.manage']
    if (under('/api/hr/shifts')) return read ? ['hr.schedule.read'] : ['hr.schedule.manage']
    if (path === '/api/hr/planning/publish') return ['hr.schedule.manage']
    if (/\/leave-requests\/[^/]+\/status$/.test(path)) return ['hr.manage']
    if (under('/api/hr/leave-requests') || under('/api/hr/punch') || path === '/api/hr/punches') return ['hr.self']
    return null
  }
  if (under('/api/inventory')) {
    if (under('/api/inventory/purchase-orders') || under('/api/inventory/suppliers')) return read ? ['finance.costs.read'] : ['inventory.adjust', 'finance.costs.read']
    return read ? ['inventory.quantities.read'] : ['inventory.adjust']
  }
  if (under('/api/products') || under('/api/categories')) return read ? ['catalog.read'] : ['catalog.prices.write']
  if (under('/api/payments')) {
    if (under('/api/payments/refunds') || under('/api/payments/manual-refunds') || under('/api/payments/manual-tenders')) return ['refunds.declare']
    if (under('/api/payments/settlements')) return ['finance.revenue.read']
    return ['payments.receive']
  }
  if (under('/api/orders')) return read ? ['service.read'] : ['service.manage']
  if (under('/api/tables')) return read ? ['service.read'] : ['settings.manage']
  if (under('/api/floor-state')) {
    const suffix = path.slice('/api/floor-state'.length) || '/'
    const layout = suffix === '/' && ['PUT', 'PATCH'].includes(method.toUpperCase())
      || /^\/(zones|photos|background|ai-generate|reset)(\/|$)/.test(suffix)
      || /^\/tables$/.test(suffix) || /^\/tables\/[^/]+(\/position)?$/.test(suffix)
    return read ? ['service.read'] : [layout ? 'settings.manage' : 'service.manage']
  }
  if (under('/api/guest-visits')) return read ? ['service.read'] : ['service.manage']
  // Seulement la branche personnel des routes QR passe par requireCompany.
  // Les convives restent sous le contrat distinct de leur visite.
  if (under('/api/guest')) {
    if (under('/api/guest/bill') && read) return ['service.read']
    if (path === '/api/guest/pay' || path === '/api/guest/paid-confirm') return ['payments.receive']
    if (/^\/api\/guest\/orders\/[^/]+\/status$/.test(path)) return ['service.manage']
    return null
  }
  if (under('/api/reservations')) return read ? ['service.read'] : ['service.manage']
  if (under('/api/agent') || under('/api/ai')) return ['assistant.use']
  if (under('/api/crm')) return ['crm.customers.read']
  if (under('/api/haccp')) return !read && under('/api/haccp/tasks') ? ['haccp.manage'] : ['haccp.record']
  if (under('/api/marketing')) return read ? ['marketing.read'] : ['marketing.read', 'settings.manage']
  if (under('/api/reputation')) return read ? ['reputation.read'] : ['reputation.read', 'settings.manage']
  if (under('/api/modules')) return read ? [] : ['settings.manage']
  if (under('/api/module-config')) return read ? [] : ['settings.manage']
  if (under('/api/portal-config') || under('/api/affichage') || under('/api/ads') || under('/api/events')) return ['settings.manage']
  if (under('/api/rapports-caisse')) return ['finance.revenue.read', 'exports.read']
  // Les archives complètes et fonctions propriétaire ne sont jamais déléguées.
  return null
}
