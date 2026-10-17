import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api, { refreshSession } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { toastError, toastSuccess } from '@/lib/toast'
import { authSessionKey } from '@/lib/authScope'
import type { User, UserCompany } from '@/types'

export interface LoginPayload {
  email: string
  password: string
}

export type AuthUser = User

export interface AuthResponse {
  accessToken: string
  user: AuthUser
  companies: UserCompany[]
}

export function useLogin() {
  return useMutation<AuthResponse, unknown, LoginPayload, { session: string }>({
    onMutate: () => ({ session: authSessionKey(useAuthStore.getState()) }),
    mutationFn: async (data) => {
      if (useAuthStore.getState().logoutRevocationPending) throw new Error('Révocation serveur précédente non confirmée.')
      return api.post('/auth/login', data).then((r) => r.data)
    },
    onSuccess: (data, _variables, context) => {
      if (context?.session !== authSessionKey(useAuthStore.getState())) return
      useAuthStore.getState().setAuth(data)
      toastSuccess('Connexion réussie')
    },
    onError: (_error, _variables, context) => {
      if (context?.session === authSessionKey(useAuthStore.getState())) toastError('Connexion impossible')
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation<unknown, unknown, void, { session: string }>({
    onMutate: () => {
      // L'accès local disparaît immédiatement, y compris hors réseau. Le
      // marqueur persistant ne contient aucun jeton ni identité privée.
      useAuthStore.getState().beginLogout()
      qc.clear()
      return { session: authSessionKey(useAuthStore.getState()) }
    },
    mutationFn: () => api.post('/auth/logout').then((r) => r.data),
    onSuccess: (_data, _variables, context) => {
      if (context?.session !== authSessionKey(useAuthStore.getState())) return
      useAuthStore.getState().confirmLogoutRevocation()
      qc.clear()
      toastSuccess('Déconnexion réussie')
    },
    onError: (_error, _variables, context) => {
      if (context?.session !== authSessionKey(useAuthStore.getState())) return
      toastError('Accès local verrouillé. Révocation serveur non confirmée : réessayez depuis la page de connexion.')
    },
  })
}

export function useRefresh() {
  return useMutation<{ accessToken: string }>({
    mutationFn: () => refreshSession().then((r) => r.data),
  })
}

export function useMe() {
  return useQuery<{ user: AuthUser; companies: UserCompany[] }>({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
    retry: false,
  })
}
