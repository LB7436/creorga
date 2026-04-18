import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'

export interface Customer {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  birthDate?: string
  notes?: string
  loyaltyPoints?: number
  walletBalance?: number
  totalSpent?: number
  visits?: number
  lastVisit?: string
  tags?: string[]
  createdAt?: string
}

export function useCustomers(search?: string) {
  return useQuery<Customer[]>({
    queryKey: ['customers', search ?? 'all'],
    queryFn: () =>
      api
        .get('/customers', { params: search ? { search } : undefined })
        .then((r) => r.data),
  })
}

export function useCustomer(id?: string) {
  return useQuery<Customer>({
    queryKey: ['customers', 'detail', id],
    queryFn: () => api.get(`/customers/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Customer>) =>
      api.post('/customers', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      toastSuccess('Client créé avec succès')
    },
    onError: () => toastError('Impossible de créer le client'),
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      api.patch(`/customers/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      toastSuccess('Client mis à jour')
    },
    onError: () => toastError('Échec de la mise à jour du client'),
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/customers/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      toastSuccess('Client supprimé')
    },
    onError: () => toastError('Échec de la suppression du client'),
  })
}

export function useAddLoyaltyPoints() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, points }: { id: string; points: number }) =>
      api
        .post(`/customers/${id}/loyalty`, { points })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      toastSuccess('Points de fidélité ajoutés')
    },
    onError: () => toastError("Impossible d'ajouter les points"),
  })
}

export function useRechargeWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api
        .post(`/customers/${id}/wallet/recharge`, { amount })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      toastSuccess('Porte-monnaie rechargé')
    },
    onError: () => toastError('Échec du rechargement du porte-monnaie'),
  })
}
