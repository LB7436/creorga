import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { toastError, toastSuccess } from '@/lib/toast'

/**
 * Factures et devis — contrat réel de `apps/backend/src/routes/invoices.ts`.
 *
 * La version précédente était une esquisse jamais consommée qui visait trois
 * routes inexistantes (`/mark-paid`, `/send`, un PDF binaire) et décrivait des
 * lignes `{ name, qty, price }` que le serveur ne connaît pas. Les fonctions
 * correspondantes reviendront aux phases 2 et 3, quand les routes existeront —
 * un crochet qui pointe dans le vide est pire qu'un crochet absent.
 *
 * ⚠️ `taxRate` est un POURCENTAGE (`17`), jamais une fraction (`0.17`).
 * ⚠️ Ne pas envoyer les totaux : le serveur les recalcule depuis les lignes.
 */

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'

export interface LigneDocument {
  id?: string
  description: string
  quantity: number
  unitPrice: number
  /** Pourcentage de TVA : 17, 14, 8, 3 ou 0. */
  taxRate: number
}

export interface ClientLie {
  id: string
  firstName: string
  lastName: string
  email?: string | null
}

export interface Invoice {
  id: string
  companyId: string
  customerId?: string | null
  number: string
  status: InvoiceStatus
  dueDate?: string | null
  subtotal: number
  taxAmount: number
  total: number
  notes?: string | null
  pdfUrl?: string | null
  createdAt: string
  updatedAt: string
  customer?: ClientLie | null
  items: LigneDocument[]
}

export interface Quote {
  id: string
  companyId: string
  customerId?: string | null
  number: string
  status: QuoteStatus
  validUntil?: string | null
  /** Attention : côté serveur ce total est encore HORS TAXES (corrigé en phase 2). */
  total: number
  notes?: string | null
  createdAt: string
  updatedAt: string
  customer?: ClientLie | null
  items: LigneDocument[]
}

export interface InvoiceFilters {
  status?: InvoiceStatus
  customerId?: string
  startDate?: string
  endDate?: string
}

export interface QuoteFilters {
  status?: QuoteStatus
  customerId?: string
}

/** Corps accepté à la création : ni numéro, ni totaux — le serveur s'en charge. */
export interface BrouillonFacture {
  customerId?: string | null
  dueDate?: string | null
  notes?: string | null
  items: LigneDocument[]
}

export interface BrouillonDevis {
  customerId?: string | null
  validUntil?: string | null
  notes?: string | null
  items: LigneDocument[]
}

/**
 * Le serveur renvoie 503 avec un message explicite quand la numérotation est
 * saturée : le montrer plutôt que de l'écraser par un texte générique.
 */
function messageErreur(e: any, defaut: string): string {
  const m = e?.response?.data?.message
  return typeof m === 'string' && m ? m : defaut
}

// ─── Factures ───────────────────────────────────────────────────────────

export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery<Invoice[]>({
    queryKey: ['invoices', filters],
    queryFn: () => api.get('/invoices', { params: filters }).then((r) => r.data),
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
    mutationFn: (data: BrouillonFacture) => api.post('/invoices', data).then((r) => r.data as Invoice),
    onSuccess: (facture) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toastSuccess(`Facture ${facture.number} créée`)
    },
    onError: (e: any) => toastError(messageErreur(e, 'Impossible de créer la facture')),
  })
}

export function useUpdateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: BrouillonFacture & { id: string }) =>
      api.put(`/invoices/${id}`, data).then((r) => r.data as Invoice),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toastSuccess('Facture mise à jour')
    },
    onError: (e: any) => toastError(messageErreur(e, 'Impossible de mettre à jour la facture')),
  })
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      api.put(`/invoices/${id}/status`, { status }).then((r) => r.data as Invoice),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toastSuccess('Statut mis à jour')
    },
    onError: (e: any) => toastError(messageErreur(e, 'Impossible de changer le statut')),
  })
}

// ─── Devis ──────────────────────────────────────────────────────────────

export function useQuotes(filters: QuoteFilters = {}) {
  return useQuery<Quote[]>({
    queryKey: ['quotes', filters],
    queryFn: () => api.get('/invoices/quotes', { params: filters }).then((r) => r.data),
  })
}

export function useCreateQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BrouillonDevis) => api.post('/invoices/quotes', data).then((r) => r.data as Quote),
    onSuccess: (devis) => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      toastSuccess(`Devis ${devis.number} créé`)
    },
    onError: (e: any) => toastError(messageErreur(e, 'Impossible de créer le devis')),
  })
}

export function useUpdateQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<BrouillonDevis> & { id: string; status?: QuoteStatus }) =>
      api.put(`/invoices/quotes/${id}`, data).then((r) => r.data as Quote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      toastSuccess('Devis mis à jour')
    },
    onError: (e: any) => toastError(messageErreur(e, 'Impossible de mettre à jour le devis')),
  })
}

export function useDeleteQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/quotes/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      toastSuccess('Devis supprimé')
    },
    onError: (e: any) => toastError(messageErreur(e, 'Impossible de supprimer le devis')),
  })
}

/**
 * Conversion devis → facture.
 *
 * Le numéro de la facture est attribué par le serveur : c'est lui qui garantit
 * l'unicité entre requêtes concurrentes. Ne jamais en fabriquer un côté client.
 */
export function useConvertQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/invoices/quotes/${id}/convert`).then((r) => r.data as Invoice),
    onSuccess: (facture) => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toastSuccess(`Facture ${facture.number} créée depuis le devis`)
    },
    onError: (e: any) => toastError(messageErreur(e, 'Conversion impossible')),
  })
}
