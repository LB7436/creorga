import { useQuery, type QueryFunctionContext, type UseQueryOptions } from '@tanstack/react-query'
import { CanceledError } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { authDataScope } from '@/lib/authScope'

type BusinessQueryState = {
  isAuthenticated: boolean
  user: { id: string } | null
  companyId: string | null
  businessAccess: { revision: string; capabilities: string[] } | null
}
export function mayQueryBusinessData(state: BusinessQueryState, capabilities: readonly string[]): boolean {
  return state.isAuthenticated && !!state.user?.id && !!state.companyId && !!state.businessAccess?.revision
    && capabilities.every(capability => state.businessAccess!.capabilities.includes(capability))
}
type BusinessQueryOptions<T> = Omit<UseQueryOptions<T>, 'queryFn' | 'enabled'> & {
  queryFn(context: QueryFunctionContext): Promise<T>
  enabled?: boolean
}

/** Les clés restent celles du cache cloisonné ; aucune capacité n'est déduite du rôle. */
export function useBusinessQuery<T>(capability: string | readonly string[], options: BusinessQueryOptions<T>) {
  const required = typeof capability === 'string' ? [capability] : capability
  const scope = useAuthStore(authDataScope)
  const allowed = useAuthStore(state => mayQueryBusinessData(state, required))
  const assertCurrent = () => {
    const current = useAuthStore.getState()
    if (scope !== authDataScope(current) || !mayQueryBusinessData(current, required)) throw new CanceledError('La lecture n’est plus autorisée dans cet espace.')
  }
  const result = useQuery<T>({
    ...options,
    enabled: allowed && options.enabled !== false,
    queryFn: async context => {
      // refetch() peut être appelé même sur une requête désactivée.
      assertCurrent()
      const data = await options.queryFn(context)
      assertCurrent()
      return data
    },
  })
  // enabled:false n'efface pas les données déjà présentes dans React Query.
  // Ne jamais rendre cet ancien payload pendant une révocation des droits.
  return { ...result, data: allowed ? result.data : undefined }
}
