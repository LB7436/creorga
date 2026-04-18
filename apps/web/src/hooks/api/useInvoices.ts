import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'

export type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'

export interface Invoice {
  id: string
  number: string
  customerId?: string
  customerName?: string
  total: number
  tax?: number
  status: InvoiceStatus
  issueDate: string
  dueDate?: string
  paidAt?: string
  items?: { name: string; qty: number; price: number }[]
}

export interface InvoiceFilters {
  status?: InvoiceStatus
  customerId?: string
  from?: string
  to?: string
}

export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery<Invoice[]>({
    queryKey: ['invoices', filters],
    queryFn: () =>
      api.get('/invoices', { params: filters }).then((r) => r.data),
  })
}

export function useInvoice(id?: string) {
  return useQuery<Invoice>({
    queryKey: ['invoices', 'detail', id],
    queryFn: () => api.get(`/invoices/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Invoice>) =>
      api.post('/invoices', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toastSuccess('Facture créée')
    },
    onError: () => toastError('Impossible de créer la facture'),
  })
}

export function useMarkPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      paymentMethod,
    }: {
      id: string
      paymentMethod?: string
    }) =>
      api
        .post(`/invoices/${id}/mark-paid`, { paymentMethod })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toastSuccess('Facture marquée comme payée')
    },
    onError: () => toastError('Impossible de marquer la facture payée'),
  })
}

export function useSendInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, email }: { id: string; email?: string }) =>
      api.post(`/invoices/${id}/send`, { email }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toastSuccess('Facture envoyée')
    },
    onError: () => toastError("Échec de l'envoi de la facture"),
  })
}

export function useDownloadPdf() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.get(`/invoices/${id}/pdf`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `facture-${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      return true
    },
    onError: () => toastError('Impossible de télécharger le PDF'),
  })
}
