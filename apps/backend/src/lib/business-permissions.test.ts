import { describe, it, expect } from 'vitest'
import { accessFor, hasCapability, validCapabilityOverrides } from './business-permissions'
import { routeCapabilities } from './business-route-policy'

describe('politique explicite de capacités métier', () => {
  it('n’accorde aucun droit à un rôle inconnu, même si des grants ont été injectés', () => {
    expect(accessFor({ role: 'PLATFORM_ADMIN', capabilities: { 'permissions.manage': true } }).capabilities).toEqual([])
  })
  it('ne transforme pas le nom ADMIN en propriétaire ni en accès financier', () => {
    const access = accessFor({ role: 'ADMIN' })
    expect(access.role).toBe('ADMIN')
    expect(access.capabilities).toContain('hr.manage')
    expect(access.capabilities).not.toContain('finance.revenue.read')
    expect(access.capabilities).not.toContain('permissions.manage')
  })
  it('sépare encaissement de service, finance et clôture', () => {
    const server = accessFor({ role: 'SERVER' }), cashier = accessFor({ role: 'CASHIER' })
    expect(server.capabilities).toContain('payments.receive')
    expect(server.capabilities).not.toContain('cash.close')
    expect(cashier.capabilities).toContain('cash.close')
    expect(cashier.capabilities).not.toContain('finance.revenue.read')
  })
  it('une autorisation explicite et son retrait changent le scope sans changer le rôle', () => {
    const base = { companyId: 'cafe', userId: 'employe', role: 'EMPLOYEE', accessVersion: 4 }
    const grant = accessFor({ ...base, capabilities: { 'finance.revenue.read': true } })
    const deny = accessFor({ ...base, accessVersion: 5, capabilities: { 'finance.revenue.read': false } })
    expect(hasCapability({ businessAccess: grant }, 'finance.revenue.read')).toBe(true)
    expect(hasCapability({ businessAccess: deny }, 'finance.revenue.read')).toBe(false)
    expect(grant.revision).not.toBe(deny.revision)
    expect(deny.version).toBe(5)
  })
  it.each([[], null, { 'finance.revenue.read': 'true' }, { 'unknown': true }])('rejette des overrides non stricts %j', value => {
    expect(validCapabilityOverrides(value)).toBe(false)
  })
  it('une politique corrompue ou une adhésion inactive échoue fermée', () => {
    expect(accessFor({ role: 'MANAGER', capabilities: [] }).capabilities).toEqual([])
    expect(accessFor({ role: 'OWNER', isActive: false }).capabilities).toEqual([])
    expect(hasCapability({}, 'finance.revenue.read')).toBe(false)
  })
  it('ne reprend aucune capacité d’une autre société dans le scope', () => {
    expect(accessFor({ role: 'MANAGER', companyId: 'cafe' }).revision).not.toBe(accessFor({ role: 'MANAGER', companyId: 'bar' }).revision)
  })
})
describe('frontière de routes métier', () => {
  it.each(['GET', 'HEAD'])('contrôle aussi %s sur les lectures financières', method => {
    expect(routeCapabilities(method, '/api/stats/today?companyId=bar')).toEqual(['finance.revenue.read'])
    expect(routeCapabilities(method, '/API/STATS/today/')).toEqual(['finance.revenue.read'])
  })
  it('refuse chemins inconnus ou encodages de séparateurs ambigus', () => {
    expect(routeCapabilities('GET', '/api/unknown')).toBeNull()
    expect(routeCapabilities('GET', '/api/pos%2Fsales/id')).toBeNull()
    expect(routeCapabilities('GET', '/api/pos%5Csales/id')).toBeNull()
  })
  it('ne confond pas consultation personnelle et publication du planning', () => {
    expect(routeCapabilities('GET', '/api/hr/shifts')).toEqual(['hr.schedule.read'])
    expect(routeCapabilities('POST', '/api/hr/planning/publish')).toEqual(['hr.schedule.manage'])
  })
  it('distingue visites QR, agencement et service sans promouvoir un administrateur', () => {
    expect(routeCapabilities('GET', '/api/guest-visits')).toEqual(['service.read'])
    expect(routeCapabilities('POST', '/api/guest-visits/visite/link')).toEqual(['service.manage'])
    expect(routeCapabilities('PATCH', '/api/floor-state/tables/table/position')).toEqual(['settings.manage'])
    expect(routeCapabilities('POST', '/api/floor-state/tables/table/items')).toEqual(['service.manage'])
  })
  it('un export CSV exige aussi son droit propre même avec lecture financière', () => {
    expect(routeCapabilities('GET', '/api/accounting/reconciliation?format=csv')).toEqual(['finance.revenue.read', 'exports.read'])
    expect(routeCapabilities('GET', '/api/invoices/invoice/pdf')).toEqual(['invoices.read', 'exports.read'])
  })
  it('sépare quantités et coûts, consultation des tâches et leur gestion', () => {
    expect(routeCapabilities('GET', '/api/accounting/expenses')).toEqual(['finance.costs.read'])
    expect(routeCapabilities('POST', '/api/haccp/tasks')).toEqual(['haccp.manage'])
    expect(routeCapabilities('POST', '/api/haccp/logs')).toEqual(['haccp.record'])
    expect(routeCapabilities('POST', '/api/marketing/campaigns')).toEqual(['marketing.read', 'settings.manage'])
    expect(routeCapabilities('GET', '/api/guest/bill/table')).toEqual(['service.read'])
    expect(routeCapabilities('POST', '/api/guest/pay')).toEqual(['payments.receive'])
    expect(routeCapabilities('PATCH', '/api/guest/orders/order/status')).toEqual(['service.manage'])
  })
})
