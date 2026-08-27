import { useAuthStore } from '@/stores/authStore'

/**
 * `fetch` qui porte le jeton — pour les appels que `lib/api.ts` (axios) ne
 * couvre pas : téléversements de fichiers, flux, réponses binaires.
 *
 * Pourquoi ne pas tout basculer sur axios : les 56 appels concernés exploitent
 * la sémantique de `Response` (`.ok`, `.status`, `.json()`, `.blob()`). Les
 * réécrire en axios changerait la forme des réponses dans 27 fichiers, donc le
 * risque de régression. Ici la signature reste celle de `fetch` : seul
 * l'en-tête `Authorization` s'ajoute.
 *
 * Le rejeu après rafraîchissement reproduit celui de l'intercepteur axios
 * (`api.ts`) : sans lui, un jeton d'accès expiré — 15 min — ferait retomber ces
 * appels dans le silence que ce correctif supprime.
 */

export const BACKEND_URL =
  (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

const avecJeton = (init: RequestInit, jeton: string | null): RequestInit => {
  const headers = new Headers(init.headers)
  if (jeton) headers.set('Authorization', `Bearer ${jeton}`)
  const companyId = useAuthStore.getState().companyId
  if (companyId && !headers.has('x-company-id')) headers.set('x-company-id', companyId)
  return { ...init, headers, credentials: init.credentials ?? 'include' }
}

/** Rafraîchit le jeton d'accès. Renvoie null si la session est bel et bien morte. */
const rafraichirJeton = async (): Promise<string | null> => {
  try {
    const reponse = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (!reponse.ok) return null
    const { accessToken } = await reponse.json()
    if (!accessToken) return null
    useAuthStore.getState().setAccessToken(accessToken)
    return accessToken
  } catch {
    return null
  }
}

export async function fetchAuth(
  entree: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const jeton = useAuthStore.getState().accessToken
  const reponse = await fetch(entree, avecJeton(init, jeton))
  if (reponse.status !== 401) return reponse

  const nouveauJeton = await rafraichirJeton()
  if (!nouveauJeton) {
    // Ne jamais avaler : l'appelant enveloppe souvent l'appel dans un
    // `catch {}` muet, c'est précisément ce qui rendait ces fonctionnalités
    // mortes sans le moindre signal.
    console.error(
      `[fetchAuth] 401 non récupérable sur ${typeof entree === 'string' ? entree : String(entree)} — session expirée`,
    )
    return reponse
  }
  return fetch(entree, avecJeton(init, nouveauJeton))
}
