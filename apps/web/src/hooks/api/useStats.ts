import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

/**
 * Statistiques — contrat RÉEL de `apps/backend/src/routes/stats.ts`.
 *
 * L'ancienne version de ce fichier décrivait un contrat qui n'a jamais existé :
 * elle appelait `/stats/revenue` et `/stats/dashboard` (routes inexistantes,
 * 404 garanti) et déclarait des champs jamais renvoyés (`customers`,
 * `occupancyRate`, `comparisonYesterday`). Aucun écran ne l'utilisait.
 *
 * ⚠️ `stats.ts` ne passe PAS par le middleware `requireCompany` (qui retombe
 * sur la première société de l'utilisateur) : il lit `x-company-id` directement
 * et répond 400 si l'en-tête manque. On le fournit donc explicitement.
 *
 * Les trois routes ne comptent que les commandes au statut `PAID`, datées par
 * `paidAt`.
 */

export interface TodayStats {
  revenue: number
  orderCount: number
  /** revenue / orderCount, ou 0 si aucune commande. */
  avgTicket: number
  tablesTotal: number
  tablesOccupied: number
  tablesFree: number
}

export interface WeekRevenuePoint {
  /** Format AAAA-MM-JJ. */
  date: string
  revenue: number
  orders: number
}

export interface TopProductStat {
  /** Absent si le produit a été supprimé depuis la commande. */
  product: { id: string; name: string; price: number } | null | undefined
  totalQuantity: number | null
}

function useCompanyId() {
  return useAuthStore((s) => s.companyId)
}

export function useTodayStats() {
  const companyId = useCompanyId()
  return useQuery<TodayStats>({
    queryKey: ['stats', 'today', companyId],
    queryFn: () =>
      api.get('/stats/today', { headers: { 'x-company-id': companyId! } }).then((r) => r.data),
    enabled: Boolean(companyId),
    refetchInterval: 60_000,
  })
}

export function useWeekStats() {
  const companyId = useCompanyId()
  return useQuery<WeekRevenuePoint[]>({
    queryKey: ['stats', 'week', companyId],
    queryFn: () =>
      api.get('/stats/week', { headers: { 'x-company-id': companyId! } }).then((r) => r.data),
    enabled: Boolean(companyId),
  })
}

export function useTopProductsToday() {
  const companyId = useCompanyId()
  return useQuery<TopProductStat[]>({
    queryKey: ['stats', 'products', 'top', companyId],
    queryFn: () =>
      api.get('/stats/products/top', { headers: { 'x-company-id': companyId! } }).then((r) => r.data),
    enabled: Boolean(companyId),
  })
}
