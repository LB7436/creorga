import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'

export interface OrderItem {
  id?: string
  productId: string
  name?: string
  qty: number
  price: number
}

export interface Order {
  id: string
  tableId?: string
  status: 'OPEN' | 'PREPARING' | 'READY' | 'SERVED' | 'PAID' | 'CANCELLED'
  total: number
  items: OrderItem[]
  server?: string
  openedAt?: string
  createdAt?: string
  updatedAt?: string
}

export function useOrders(tableId?: string) {
  return useQuery<Order[]>({
    queryKey: ['orders', tableId ?? 'all'],
    queryFn: () =>
      api
        .get('/orders', { params: tableId ? { tableId } : undefined })
        .then((r) => r.data),
  })
}

export function useOrder(id?: string) {
  return useQuery<Order>({
    queryKey: ['orders', 'detail', id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Order>) =>
      api.post('/orders', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toastSuccess('Commande créée avec succès')
    },
    onError: () => toastError('Impossible de créer la commande'),
  })
}

export function useUpdateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Order> }) =>
      api.patch(`/orders/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toastSuccess('Commande mise à jour')
    },
    onError: () => toastError('Échec de la mise à jour de la commande'),
  })
}

export function useDeleteOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/orders/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toastSuccess('Commande supprimée')
    },
    onError: () => toastError('Échec de la suppression de la commande'),
  })
}

export function useOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order['status'] }) =>
      api.patch(`/orders/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: () => toastError('Impossible de changer le statut'),
  })
}

export function useCheckout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      paymentMethod,
      amount,
    }: {
      id: string
      paymentMethod: string
      amount?: number
    }) =>
      api
        .post(`/orders/${id}/checkout`, { paymentMethod, amount })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['tables'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toastSuccess('Encaissement effectué')
    },
    onError: () => toastError("Échec de l'encaissement"),
  })
}
