import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

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
})

// Refresh automatique du token
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        const { accessToken } = data
        useAuthStore.getState().setAccessToken(accessToken)
        processQueue(null, accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        traiterSessionExpiree()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default api
