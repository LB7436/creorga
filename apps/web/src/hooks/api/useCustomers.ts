import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useBusinessQuery } from './useBusinessQuery'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'

export interface Customer {
  id: string
  firstName: string
  lastName: string
  businessName?: string | null
  address?: string | null
  vatNumber?: string | null
  email?: string
  phone?: string
  birthDate?: string
  notes?: string
  points?: number
  loyaltyPoints?: number
  walletBalance?: number
  totalSpent?: number
  visits?: number
  lastVisit?: string
  tags?: string[]
  createdAt?: string
}

export function useCustomers(search?: string, options: { enabled?: boolean } = {}) {
  return useBusinessQuery<Customer[]>('crm.customers.read', {
    queryKey: ['customers', search ?? 'all'],
    queryFn: ({ signal }) =>
      api
        .get('/crm/customers', { params: { limit: 1000, ...(search ? { search } : {}) }, signal })
        .then((r) => Array.isArray(r.data) ? r.data : r.data.customers),
    enabled: options.enabled,
  })
}

export function useCustomer(id?: string) {
  return useBusinessQuery<Customer>('crm.customers.read', {
    queryKey: ['customers', 'detail', id],
    queryFn: ({ signal }) => api.get(`/crm/customers/${id}`, { signal }).then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    networkMode: 'always',
    mutationFn: (data: Partial<Customer>) =>
      api.post('/crm/customers', data).then((r) => r.data),
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
    networkMode: 'always',
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      api.put(`/crm/customers/${id}`, data).then((r) => r.data),
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
      api.delete(`/crm/customers/${id}`).then((r) => r.data),
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
    mutationFn: ({ id, points, type = 'EARN' }: { id: string; points: number; type?: 'EARN' | 'SPEND' }) =>
      api
        .post(`/crm/customers/${id}/loyalty`, { points, type })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      toastSuccess('Solde de fidélité mis à jour')
    },
    onError: () => toastError("Impossible d'ajouter les points"),
  })
}

export function useRechargeWallet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api
        .post(`/crm/customers/${id}/wallet`, { amount })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      toastSuccess('Porte-monnaie rechargé')
    },
    onError: () => toastError('Échec du rechargement du porte-monnaie'),
  })
}
