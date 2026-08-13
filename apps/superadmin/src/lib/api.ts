/**
 * Client HTTP de la console créateur.
 *
 * - Tous les chemins sont relatifs à /api/creator (proxy Vite en dev, Caddy
 *   en prod) — jamais d'URL en dur.
 * - Le jeton d'accès (15 min) vit UNIQUEMENT en mémoire : rien dans
 *   localStorage (le précédent `sa_auth` y survivait à tout).
 * - La session longue est un cookie httpOnly `creator_refresh` posé par le
 *   backend ; sur 401, on tente un refresh puis on rejoue la requête une fois.
 */

const BASE = '/api/creator'

let jetonAcces: string | null = null
let surSessionPerdue: (() => void) | null = null

export function definirJeton(jeton: string | null): void {
  jetonAcces = jeton
}

export function jetonPresent(): boolean {
  return jetonAcces !== null
}

/** App.tsx s'enregistre ici pour rebasculer sur /login quand tout échoue. */
export function surPerteDeSession(rappel: () => void): void {
  surSessionPerdue = rappel
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function lireErreur(reponse: globalThis.Response): Promise<ApiError> {
  let message = `Erreur ${reponse.status}`
  try {
    const corps = await reponse.json()
    if (corps?.message) message = corps.message
  } catch {
    // Corps non JSON : message générique.
  }
  return new ApiError(reponse.status, message)
}

/** Tente de renouveler le jeton d'accès depuis le cookie de session. */
export async function rafraichirSession(): Promise<boolean> {
  try {
    const reponse = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!reponse.ok) return false
    const corps = await reponse.json()
    if (typeof corps?.accessToken !== 'string') return false
    jetonAcces = corps.accessToken
    return true
  } catch {
    return false
  }
}

async function requete<T>(methode: string, chemin: string, corps?: unknown, dejaRejouee = false): Promise<T> {
  const reponse = await fetch(`${BASE}${chemin}`, {
    method: methode,
    credentials: 'include',
    headers: {
      ...(corps !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(jetonAcces ? { Authorization: `Bearer ${jetonAcces}` } : {}),
    },
    body: corps !== undefined ? JSON.stringify(corps) : undefined,
  })

  if (reponse.status === 401 && !dejaRejouee && !chemin.startsWith('/auth/')) {
    if (await rafraichirSession()) {
      return requete<T>(methode, chemin, corps, true)
    }
    jetonAcces = null
    surSessionPerdue?.()
    throw new ApiError(401, 'Session expirée')
  }

  if (!reponse.ok) throw await lireErreur(reponse)
  return (await reponse.json()) as T
}

export const creatorApi = {
  get: <T>(chemin: string) => requete<T>('GET', chemin),
  post: <T>(chemin: string, corps?: unknown) => requete<T>('POST', chemin, corps),
  patch: <T>(chemin: string, corps?: unknown) => requete<T>('PATCH', chemin, corps),
  put: <T>(chemin: string, corps?: unknown) => requete<T>('PUT', chemin, corps),
}

// ─── Authentification ─────────────────────────────────────────────────

export interface ReponseLogin {
  totpRequis: boolean
  totpAConfigurer?: boolean
  pendingToken?: string
  accessToken?: string
}

export async function connexion(email: string, password: string): Promise<ReponseLogin> {
  const corps = await requete<ReponseLogin>('POST', '/auth/login', { email, password })
  if (corps.accessToken) jetonAcces = corps.accessToken
  return corps
}

export async function validerTotp(pendingToken: string, code: string): Promise<void> {
  const corps = await requete<{ accessToken: string }>('POST', '/auth/totp', { pendingToken, code })
  jetonAcces = corps.accessToken
}

export async function deconnexion(): Promise<void> {
  try {
    await requete('POST', '/auth/logout')
  } catch {
    // Déjà déconnecté côté serveur : sans importance.
  }
  jetonAcces = null
}
