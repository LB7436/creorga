import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { authDataScope, authSessionKey } from './authScope'

type ScopedRequest = InternalAxiosRequestConfig & { _creorgaScope?: string; _retry?: boolean }

const scopeChanged = () => new axios.CanceledError('La session ou la société a changé. Recommencez dans votre espace actuel.')

export function assertAuthScope(scope: string): void {
  if (scope !== authDataScope(useAuthStore.getState())) throw scopeChanged()
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

export const LOGIN_PATH = '/login'

const isDemoSession = () => {
  if (typeof window === 'undefined') return false
  return (
    window.localStorage.getItem('creorga-demo-mode') === 'true' ||
    window.localStorage.getItem('creorga-demo-state')?.includes('"active":true') === true
  )
}

/**
 * Déconnecte puis renvoie vers /login — sauf si on y est déjà.
 *
 * Sans ce garde, tout composant monté globalement qui appelle `api` avant
 * authentification déclenche une boucle : 401 → refresh KO → `location.href`
 * → rechargement complet → le composant se remonte → 401… Playwright le voyait
 * comme « element was detached from the DOM, retrying » sur la page de login.
 *
 * La déconnexion reste faite dans tous les cas : purger un jeton mort ne
 * recharge pas la page.
 */
export const traiterSessionExpiree = () => {
  if (isDemoSession()) return false
  useAuthStore.getState().logout()
  if (typeof window === 'undefined') return false
  if (window.location.pathname === LOGIN_PATH) return false
  window.location.href = LOGIN_PATH
  return true
}

// Ajouter le token aux requêtes
api.interceptors.request.use((config) => {
  const scoped = config as ScopedRequest
  if (scoped._creorgaScope === undefined) scoped._creorgaScope = authDataScope(useAuthStore.getState())
  else assertAuthScope(scoped._creorgaScope)
  const { accessToken, companyId } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  // Société active.
  //
  // Plusieurs routes la lisent directement dans l'en-tête et répondent 400
  // sans elle — `products.ts` le fait dès sa première ligne. Comme `api` ne
  // l'envoyait pas, `useProducts()` échouait SYSTÉMATIQUEMENT : l'écran
  // Catalogue n'a jamais pu charger un produit. Mesuré en visitant les
  // 129 pages : « HTTP 400 /api/products » sur presque chacune.
  //
  // Ne pas écraser un en-tête déjà posé : `useStats` le fournit lui-même.
  if (companyId && !config.headers['x-company-id']) {
    config.headers['x-company-id'] = companyId
  }
  return config
}, (error) => { throw error }, { synchronous: true })

export function excludesRefresh(url = ''): boolean {
  return /(?:^|\/)auth\/(?:login|register|refresh|logout)(?:[?#]|$)/.test(url)
}

let refreshOperation: { session: string; promise: Promise<{ data: { accessToken: string } }> } | null = null

/** Même rotation pour axios et les téléchargements fetch, y compris entre onglets. */
export function refreshSession(): Promise<{ data: { accessToken: string } }> {
  const state = useAuthStore.getState()
  // Le cookie partagé ne sert pas de connexion implicite depuis une page
  // publique : il ne peut que renouveler l'identité déjà établie dans cet onglet.
  if (!state.isAuthenticated || !state.user?.id || !state.accessToken) return Promise.reject(scopeChanged())
  const session = authSessionKey(state)
  const userId = state.user.id
  if (refreshOperation?.session === session) return refreshOperation.promise
  const assertSession = () => {
    if (session !== authSessionKey(useAuthStore.getState())) throw scopeChanged()
  }
  const renew = async () => {
    assertSession()
    try { return await axios.post('/api/auth/refresh', {}, { withCredentials: true }) }
    catch (error: any) {
      if (error.response?.status !== 409) throw error
      await new Promise((resolve) => setTimeout(resolve, 200))
      assertSession()
      return axios.post('/api/auth/refresh', {}, { withCredentials: true })
    }
  }
  // Le cookie est partagé par les onglets : leur rotation doit être sérialisée.
  const operation = { session, promise: null! as Promise<{ data: { accessToken: string } }> }
  operation.promise = (async () => {
    const response = await (typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('creorga-refresh', renew)
      : renew())
    assertSession()
    if (typeof response.data?.accessToken !== 'string' || !response.data.accessToken) throw new Error('Renouvellement de session incomplet.')
    // Le cookie est partagé entre onglets. Une autre connexion ne doit pas
    // remplacer les droits de l'utilisateur encore affiché dans cet onglet.
    if (userId) {
      let refreshedUserId: unknown
      try {
        const payload = response.data.accessToken.split('.')[1]
        refreshedUserId = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).userId
      } catch { throw scopeChanged() }
      if (refreshedUserId !== userId) throw scopeChanged()
    }
    useAuthStore.getState().setAccessToken(response.data.accessToken)
    return response
  })().finally(() => { if (refreshOperation === operation) refreshOperation = null })
  refreshOperation = operation
  return operation.promise
}

api.interceptors.response.use(
  (response) => {
    const scope = (response.config as ScopedRequest)._creorgaScope
    if (scope !== undefined) assertAuthScope(scope)
    return response
  },
  async (error) => {
    const originalRequest = error.config as ScopedRequest | undefined
    if (originalRequest?._creorgaScope !== undefined) assertAuthScope(originalRequest._creorgaScope)

    if (originalRequest && error.response?.status === 401 && !originalRequest._retry && !excludesRefresh(originalRequest.url)) {
      originalRequest._retry = true
      try {
        const { data } = await refreshSession()
        const { accessToken } = data
        if (originalRequest._creorgaScope !== undefined) assertAuthScope(originalRequest._creorgaScope)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError: any) {
        if (originalRequest._creorgaScope !== undefined) assertAuthScope(originalRequest._creorgaScope)
        // Une panne réseau/serveur n'est pas une révocation de session.
        if (refreshError.response?.status === 401) traiterSessionExpiree()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export default api
