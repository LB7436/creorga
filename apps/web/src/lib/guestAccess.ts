export interface GuestAccess { visitId: string; token: string }
const storageKey = (companyId: string, tableId: string) => `creorga-guest-visit:${companyId}:${tableId}`
// Lecture sans consommation du fragment : un ancien callback ne doit jamais
// ranger la nouvelle capacité du navigateur sous son ancien établissement.
export function readStoredGuestAccess(companyId: string | null, tableId: string | null): GuestAccess | null {
  if (!companyId || !tableId) return null
  try {
    const stored = JSON.parse(sessionStorage.getItem(storageKey(companyId, tableId)) || 'null')
    return stored && /^[a-f0-9]{64}$/.test(stored.token) && /^[a-zA-Z0-9_-]{1,100}$/.test(stored.visitId) ? stored : null
  } catch { return null }
}
export function getGuestAccess(companyId: string | null, tableId: string | null): GuestAccess | null {
  if (!companyId || !tableId) return null
  try {
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    const visitId = fragment.get('visit'), token = fragment.get('access')
    if (visitId && token && /^[a-zA-Z0-9_-]{1,100}$/.test(visitId) && /^[a-f0-9]{64}$/.test(token)) {
      const access = { visitId, token }
      sessionStorage.setItem(storageKey(companyId, tableId), JSON.stringify(access))
      history.replaceState(null, '', location.pathname + location.search)
      return access
    }
    return readStoredGuestAccess(companyId, tableId)
  } catch { return null }
}
export function guestHeaders(companyId: string, tableId: string | null): Record<string, string> {
  const access = getGuestAccess(companyId, tableId)
  return access ? { 'x-guest-access': access.token } : {}
}
export function guestScopeKey(companyId: string | null, tableId: string | null) {
  return `${companyId || 'none'}:${tableId || 'none'}:${getGuestAccess(companyId, tableId)?.visitId || 'menu'}`
}
export function bankRedirectAllowed(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && ['checkout.stripe.com', 'www.paypal.com', 'www.sandbox.paypal.com'].includes(url.hostname)
  } catch { return false }
}
