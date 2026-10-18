export const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002'
let token = ''
let companyId = ''
let generation = 0
let refresh: { generation: number; promise: Promise<void> } | null = null
let endingSession: Promise<void> | null = null
export function setSession(accessToken: string, company: string) { generation++; token = accessToken; companyId = company; invalidateBusinessAccess() }
export function clearSession() { generation++; token = ''; companyId = ''; invalidateBusinessAccess() }
export const sessionGeneration = () => generation
export function assertSession(expected: number) { if (generation !== expected) throw new Error('La session de caisse a changé. Reprenez dans votre espace actuel.') }
export const sessionCompany = () => companyId
export const sessionHeaders = (): Record<string, string> => ({ ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(companyId ? { 'X-Company-Id': companyId } : {}) })
export async function api<T = any>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  if (path === '/auth/login' && endingSession) await endingSession
  const expected = generation, previousToken = token, previousCompany = companyId, rights = accessEpoch()
  const res = await fetch(`${BACKEND}/api${path}`, { ...options, credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...sessionHeaders(), ...options.headers } })
  assertSession(expected)
  if (res.status === 401 && retry && token && !path.startsWith('/auth/')) {
    if (previousToken !== token) return api<T>(path, options, false)
    if (!refresh || refresh.generation !== expected) {
    const promise = (async () => {
      const task = async () => {
        assertSession(expected)
        let response = await fetch(`${BACKEND}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
        assertSession(expected)
        if (response.status === 409) {
          await new Promise(resolve => setTimeout(resolve, 250))
          assertSession(expected)
          response = await fetch(`${BACKEND}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
          assertSession(expected)
        }
        const body = await response.json()
        assertSession(expected)
        if (!response.ok) throw new Error(body.message || 'Session expirée : reconnectez-vous.')
        // A shared cookie may have rotated in another tab. Verify the identity before adopting it.
        let expectedUser: string | undefined
        try { expectedUser = JSON.parse(atob(previousToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).userId } catch {}
        if (!expectedUser || typeof body.accessToken !== 'string') throw new Error('Identité de session non vérifiable : reconnectez-vous.')
        const identityResponse = await fetch(`${BACKEND}/api/auth/me`, { credentials: 'include', headers: { Authorization: `Bearer ${body.accessToken}` } })
        const identity = await identityResponse.json()
        assertSession(expected)
        if (!identityResponse.ok || identity.user?.id !== expectedUser || !identity.companies?.some((m: any) => (m.companyId || m.company?.id) === previousCompany)) {
          throw new Error('Le compte du navigateur a changé : reconnectez cette caisse.')
        }
        token = body.accessToken
      }
      if (globalThis.navigator?.locks) await navigator.locks.request('creorga-refresh', task)
      else await task()
    })()
    refresh = { generation: expected, promise }
    void promise.finally(() => { if (refresh?.promise === promise) refresh = null }).catch(() => {})
    }
    try { await refresh.promise } catch (error) { if (generation === expected) invalidateBusinessAccess(); throw error }
    assertSession(expected)
    return api<T>(path, options, false)
  }
  const body = res.headers.get('content-type')?.includes('application/json') ? await res.json() : await res.text()
  assertSession(expected)
  if (res.status === 401 || res.status === 403) invalidateBusinessAccess()
  if (!res.ok) throw Object.assign(new Error(body.error || body.message || `Erreur serveur (${res.status})`), { status: res.status })
  // Une mutation peut déjà être confirmée : ne jamais la transformer en échec.
  // En revanche, une ancienne lecture ne doit pas repeupler un cache révoqué.
  if ((options.method || 'GET').toUpperCase() === 'GET') assertAccessEpoch(rights)
  return body as T
}

export function endSession() {
  const request = api('/auth/logout', { method: 'POST' }).then(() => {}).catch(() => {})
  endingSession = request
  void request.finally(() => { if (endingSession === request) endingSession = null })
  clearSession()
}
import { accessEpoch, assertAccessEpoch, invalidateBusinessAccess } from './business-access'
