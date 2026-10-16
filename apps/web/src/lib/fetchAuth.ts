import { useAuthStore } from '@/stores/authStore'
import { assertAuthScope, refreshSession } from './api'
import { authDataScope } from './authScope'
import { assertApiDestination, CONFIGURED_BACKEND_URL } from './apiDestination'

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

export const BACKEND_URL = CONFIGURED_BACKEND_URL

const avecJeton = (init: RequestInit, jeton: string | null, companyId: string | null): RequestInit => {
  const headers = new Headers(init.headers)
  if (jeton) headers.set('Authorization', `Bearer ${jeton}`)
  if (companyId && !headers.has('x-company-id')) headers.set('x-company-id', companyId)
  // Ne jamais laisser une réponse rediriger une requête privée hors de son API.
  return { ...init, headers, credentials: init.credentials ?? 'include', redirect: 'error' }
}

/** Partage la rotation avec axios ; un échec temporaire ne déconnecte pas le compte. */
const rafraichirJeton = async (): Promise<string | null> => {
  try {
    const { data } = await refreshSession()
    return data.accessToken
  } catch {
    return null
  }
}

export async function fetchAuth(
  entree: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  assertApiDestination(entree)
  const state = useAuthStore.getState()
  const scope = authDataScope(state)
  const { accessToken: jeton, companyId } = state
  const reponse = await fetch(entree, avecJeton(init, jeton, companyId))
  assertAuthScope(scope)
  if (reponse.status !== 401) return reponse

  const nouveauJeton = await rafraichirJeton()
  assertAuthScope(scope)
  if (!nouveauJeton) {
    // Ne jamais avaler : l'appelant enveloppe souvent l'appel dans un
    // `catch {}` muet, c'est précisément ce qui rendait ces fonctionnalités
    // mortes sans le moindre signal.
    console.error(
      '[fetchAuth] Renouvellement non confirmé ; vérifiez la connexion et la session.',
    )
    return reponse
  }
  const nouvelleReponse = await fetch(entree, avecJeton(init, nouveauJeton, companyId))
  assertAuthScope(scope)
  return nouvelleReponse
}
