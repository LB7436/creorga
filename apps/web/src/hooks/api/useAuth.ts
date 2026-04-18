import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { toastError, toastSuccess } from '@/lib/toast'

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role?: string
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation<AuthResponse, unknown, LoginPayload>({
    mutationFn: (data) =>
      api.post('/auth/login', data).then((r) => r.data),
    onSuccess: (data) => {
      const store = useAuthStore.getState() as unknown as {
        setAccessToken?: (t: string) => void
        setUser?: (u: AuthUser) => void
        login?: (payload: AuthResponse) => void
      }
      if (store.login) store.login(data)
      else {
        store.setAccessToken?.(data.accessToken)
        store.setUser?.(data.user)
      }
      qc.invalidateQueries({ queryKey: ['auth', 'me'] })
      toastSuccess('Connexion réussie')
    },
    onError: () => toastError('Identifiants incorrects'),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/logout').then((r) => r.data),
    onSuccess: () => {
      useAuthStore.getState().logout()
      qc.clear()
      toastSuccess('Déconnexion réussie')
    },
    onError: () => {
      useAuthStore.getState().logout()
      qc.clear()
    },
  })
}

export function useRefresh() {
  return useMutation<AuthResponse>({
    mutationFn: () => api.post('/auth/refresh').then((r) => r.data),
    onSuccess: (data) => {
      const store = useAuthStore.getState() as unknown as {
        setAccessToken?: (t: string) => void
      }
      store.setAccessToken?.(data.accessToken)
    },
  })
}

export function useMe() {
  return useQuery<AuthUser>({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
    retry: false,
  })
}
