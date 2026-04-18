import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'

export type TableStatus = 'LIBRE' | 'OCCUPEE' | 'RESERVEE' | 'NETTOYAGE'
export type TableSection = 'Salle' | 'Bar' | 'Terrasse' | string

export interface Table {
  id: string
  name: string
  seats: number
  section: TableSection
  status: TableStatus
  x?: number
  y?: number
  shape?: 'round' | 'square' | 'rect'
  server?: string
  reservedFor?: string
  reservedAt?: string
}

export function useTables(section?: string) {
  return useQuery<Table[]>({
    queryKey: ['tables', section ?? 'all'],
    queryFn: () =>
      api
        .get('/tables', { params: section ? { section } : undefined })
        .then((r) => r.data),
  })
}

export function useTable(id?: string) {
  return useQuery<Table>({
    queryKey: ['tables', 'detail', id],
    queryFn: () => api.get(`/tables/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useCreateTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Table>) =>
      api.post('/tables', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] })
      toastSuccess('Table créée avec succès')
    },
    onError: () => toastError('Impossible de créer la table'),
  })
}

export function useUpdateTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Table> }) =>
      api.patch(`/tables/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] })
    },
    onError: () => toastError('Échec de la mise à jour de la table'),
  })
}

export function useUpdateTableStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TableStatus }) =>
      api.patch(`/tables/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] })
    },
    onError: () => toastError('Impossible de changer le statut de la table'),
  })
}

export function useDeleteTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tables/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] })
      toastSuccess('Table supprimée')
    },
    onError: () => toastError('Échec de la suppression'),
  })
}
