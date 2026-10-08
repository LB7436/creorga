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
    mutationFn: (data) =>
      api.post('/auth/login', data).then((r) => r.data),
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
    onMutate: () => ({ session: authSessionKey(useAuthStore.getState()) }),
    mutationFn: () => api.post('/auth/logout').then((r) => r.data),
    onSuccess: (_data, _variables, context) => {
      if (context?.session !== authSessionKey(useAuthStore.getState())) return
      useAuthStore.getState().logout()
      qc.clear()
      toastSuccess('Déconnexion réussie')
    },
    onError: (_error, _variables, context) => {
      if (context?.session !== authSessionKey(useAuthStore.getState())) return
      useAuthStore.getState().logout()
      qc.clear()
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
