export const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002'
let token = ''
let companyId = ''
let refresh: Promise<void> | null = null
export function setSession(accessToken: string, company: string) { token = accessToken; companyId = company }
export function clearSession() { token = ''; companyId = '' }
export const sessionCompany = () => companyId
export const sessionHeaders = (): Record<string, string> => ({ ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(companyId ? { 'X-Company-Id': companyId } : {}) })
export async function api<T = any>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const res = await fetch(`${BACKEND}/api${path}`, { ...options, credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...sessionHeaders(), ...options.headers } })
  if (res.status === 401 && retry && token && !path.startsWith('/auth/')) {
    refresh ||= (async () => {
      const task = async () => {
        let response = await fetch(`${BACKEND}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
        if (response.status === 409) {
          await new Promise(resolve => setTimeout(resolve, 250))
          response = await fetch(`${BACKEND}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
        }
        const body = await response.json()
        if (!response.ok) throw new Error(body.message || 'Session expirée : reconnectez-vous.')
        token = body.accessToken
      }
      if (navigator.locks) await navigator.locks.request('creorga-refresh', task)
      else await task()
    })().finally(() => { refresh = null })
    await refresh
    return api<T>(path, options, false)
  }
  const body = res.headers.get('content-type')?.includes('application/json') ? await res.json() : await res.text()
  if (!res.ok) throw Object.assign(new Error(body.error || body.message || `Erreur serveur (${res.status})`), { status: res.status })
  return body as T
}
