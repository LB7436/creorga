import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SEATED'
  | 'CANCELLED'
  | 'NO_SHOW'

export interface Reservation {
  id: string
  customerId?: string
  customerName: string
  phone?: string
  email?: string
  party: number
  date: string
  time: string
  tableId?: string
  status: ReservationStatus
  notes?: string
  createdAt?: string
}

export interface ReservationFilters {
  date?: string
  status?: ReservationStatus
  from?: string
  to?: string
}

export function useReservations(filters: ReservationFilters = {}) {
  return useQuery<Reservation[]>({
    queryKey: ['reservations', filters],
    queryFn: () =>
      api.get('/reservations', { params: filters }).then((r) => r.data),
  })
}

export function useReservation(id?: string) {
  return useQuery<Reservation>({
    queryKey: ['reservations', 'detail', id],
    queryFn: () => api.get(`/reservations/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useCreateReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Reservation>) =>
      api.post('/reservations', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['tables'] })
      toastSuccess('Réservation créée')
    },
    onError: () => toastError('Impossible de créer la réservation'),
  })
}

export function useUpdateReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<Reservation>
    }) => api.patch(`/reservations/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      toastSuccess('Réservation mise à jour')
    },
    onError: () => toastError('Échec de la mise à jour de la réservation'),
  })
}

export function useCancelReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/reservations/${id}/cancel`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['tables'] })
      toastSuccess('Réservation annulée')
    },
    onError: () => toastError("Impossible d'annuler la réservation"),
  })
}
