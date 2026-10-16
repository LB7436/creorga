import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'
import { useAuthStore } from '@/stores/authStore'
import { readFinancialRequest, preserveFinancialRequest, forgetFinancialRequest } from '@/lib/financial-request'

export type CashDrawer = {
  id: string
  openedAt: string
  closedAt: string | null
  openAmount: number
  closeAmount: number | null
  totalSales: number
  discrepancy: number | null
  notes: string | null
  ledgerVersion?: number | null
  closeSnapshot?: any
  user?: { id: string; firstName: string; lastName: string }
}

export type Expense = {
  id: string
  category: string
  amount: number
  taxRate: number
  description: string
  receiptUrl: string | null
  date: string
  createdAt: string
  user?: { id: string; firstName: string; lastName: string }
}

export type TaxReport = {
  period: { startDate?: string; endDate?: string }
  totalRevenue: number
  totalTax: number
  totalWithTax: number
  orderCount: number
  byTaxRate: Record<string, { base: number; tax: number; total: number }>
}

export function useCashDrawers() {
  return useQuery<CashDrawer[]>({
    queryKey: ['accounting', 'cash-drawers'],
    queryFn: () => api.get('/accounting/cash-drawers').then((response) => response.data),
  })
}

export function useOpenCashDrawer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { requestId?: string; openAmount: number; notes?: string }) => api.post('/accounting/cash-drawers/open', data).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'cash-drawers'] })
      toastSuccess('Caisse ouverte sur le serveur')
    },
    onError: (error: any) => toastError(error?.response?.data?.message || "Impossible d'ouvrir la caisse"),
  })
}

export function useCloseCashDrawer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, closeAmount, notes }: { id: string; closeAmount: number; notes?: string }) => {
      const { user, companyId } = useAuthStore.getState()
      const key = `creorga-financial-v1:close:${companyId}:${user?.id}:${id}`
      const body = readFinancialRequest(key) || { requestId: crypto.randomUUID(), closeAmount, ...(notes ? { notes } : {}) }
      preserveFinancialRequest(key, body)
      return api.put(`/accounting/cash-drawers/${id}/close`, body).then((response) => {
        forgetFinancialRequest(key, body.requestId); return response.data
      }).catch(error => {
        // Refus explicite avant écriture : le comptage/motif peut être corrigé.
        // Un timeout ou un 409 ne libère jamais une référence incertaine.
        if ([400, 422].includes(error.response?.status)) forgetFinancialRequest(key, body.requestId)
        throw error
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'cash-drawers'] })
      toastSuccess('Clôture enregistrée définitivement')
    },
    onError: (error: any) => toastError(error?.response?.data?.message || 'Clôture impossible'),
  })
}

export function useExpenses(category?: string) {
  return useQuery<Expense[]>({
    queryKey: ['accounting', 'expenses', category || 'all'],
    queryFn: () => api.get('/accounting/expenses', { params: category ? { category } : undefined }).then((response) => response.data),
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { category: string; amount: number; taxRate: number; description: string; receiptUrl?: string | null; date?: string }) =>
      api.post('/accounting/expenses', data).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'expenses'] })
      toastSuccess('Dépense enregistrée sur le serveur')
    },
    onError: (error: any) => toastError(error?.response?.data?.message || "Impossible d'enregistrer la dépense"),
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/accounting/expenses/${id}`).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'expenses'] })
      toastSuccess('Dépense supprimée')
    },
    onError: (error: any) => toastError(error?.response?.data?.message || 'Suppression impossible'),
  })
}

export function useTaxReport(startDate: string, endDate: string) {
  return useQuery<TaxReport>({
    queryKey: ['accounting', 'tax-report', startDate, endDate],
    queryFn: () => api.get('/accounting/tax-report', { params: { startDate, endDate } }).then((response) => response.data),
    enabled: Boolean(startDate && endDate),
  })
}
