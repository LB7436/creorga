import { QueryClient } from '@tanstack/react-query'
import { authDataScope, type AuthScopeState } from './authScope'

interface AuthScopeStore {
  getState(): AuthScopeState
  subscribe(listener: (state: AuthScopeState) => void): () => void
}

function newQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => (error as { code?: string })?.code !== 'ERR_CANCELED' && failureCount < 1,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  })
}

/**
 * Un cache neuf par transition, et non une collection de caches réutilisés.
 * Les callbacks tardifs gardent au pire une référence vers le client retiré ;
 * ils ne peuvent remplir le cache de la nouvelle session/société.
 */
export function createScopedQueryClient(store: AuthScopeStore) {
  let scope = authDataScope(store.getState())
  let snapshot = { client: newQueryClient(), generation: 0 }
  const listeners = new Set<() => void>()
  const unsubscribe = store.subscribe((state) => {
    const nextScope = authDataScope(state)
    if (nextScope === scope) return
    scope = nextScope
    const previous = snapshot.client
    snapshot = { client: newQueryClient(), generation: snapshot.generation + 1 }
    // cancelQueries stoppe également les reprises ; clear retire les mutations
    // et les données. Cela n'annule pas une écriture déjà reçue par le serveur.
    void previous.cancelQueries()
    previous.clear()
    listeners.forEach((listener) => listener())
  })
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    dispose: () => {
      unsubscribe()
      void snapshot.client.cancelQueries()
      snapshot.client.clear()
      listeners.clear()
    },
  }
}
