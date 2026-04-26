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

// Fallback demo tables — used when backend is unreachable (fresh clone, no DB).
// Keeps the POS usable even without a running API server.
const FALLBACK_TABLES: Table[] = [
  { id: 'demo-t1',  name: 'T1',  seats: 2, section: 'Salle',    status: 'LIBRE',    x: 80,  y: 80,  shape: 'round' },
  { id: 'demo-t2',  name: 'T2',  seats: 4, section: 'Salle',    status: 'OCCUPEE',  x: 220, y: 80,  shape: 'square' },
  { id: 'demo-t3',  name: 'T3',  seats: 4, section: 'Salle',    status: 'LIBRE',    x: 360, y: 80,  shape: 'square' },
  { id: 'demo-t4',  name: 'T4',  seats: 6, section: 'Salle',    status: 'RESERVEE', x: 140, y: 240, shape: 'rect' },
  { id: 'demo-t5',  name: 'T5',  seats: 4, section: 'Salle',    status: 'LIBRE',    x: 320, y: 240, shape: 'square' },
  { id: 'demo-t6',  name: 'T6',  seats: 2, section: 'Salle',    status: 'NETTOYAGE',x: 460, y: 240, shape: 'round' },
  { id: 'demo-b1',  name: 'Bar', seats: 6, section: 'Bar',      status: 'LIBRE',    x: 80,  y: 80,  shape: 'rect' },
  { id: 'demo-b2',  name: 'B2',  seats: 2, section: 'Bar',      status: 'OCCUPEE',  x: 280, y: 80,  shape: 'round' },
  { id: 'demo-te1', name: 'Te1', seats: 4, section: 'Terrasse', status: 'LIBRE',    x: 80,  y: 80,  shape: 'round' },
  { id: 'demo-te2', name: 'Te2', seats: 4, section: 'Terrasse', status: 'OCCUPEE',  x: 220, y: 80,  shape: 'round' },
  { id: 'demo-te3', name: 'Te3', seats: 2, section: 'Terrasse', status: 'LIBRE',    x: 360, y: 80,  shape: 'round' },
]

export function useTables(section?: string) {
  return useQuery<Table[]>({
    queryKey: ['tables', section ?? 'all'],
    queryFn: async () => {
      try {
        const r = await api.get('/tables', { params: section ? { section } : undefined })
        // Backend might return { tables: [...] } or a bare array
        const data = Array.isArray(r.data) ? r.data : r.data?.tables ?? []
        if (Array.isArray(data) && data.length > 0) return data
        // Empty → serve demo data so the plan isn't blank
        return section ? FALLBACK_TABLES.filter((t) => t.section === section) : FALLBACK_TABLES
      } catch {
        // API down → graceful fallback
        return section ? FALLBACK_TABLES.filter((t) => t.section === section) : FALLBACK_TABLES
      }
    },
    retry: false,
    staleTime: 30_000,
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
