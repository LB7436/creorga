import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export interface TodayStats {
  revenue: number
  orders: number
  customers: number
  averageTicket: number
  occupancyRate: number
  tablesOccupied: number
  tablesTotal: number
  comparisonYesterday?: number
}

export interface RevenuePoint {
  date: string
  label: string
  revenue: number
  previous?: number
}

export interface DashboardKPIs {
  today: TodayStats
  weekRevenue: RevenuePoint[]
  breakdown: { name: string; value: number; color?: string }[]
  topProducts: { name: string; qty: number; revenue: number }[]
  targetToday?: number
}

export type StatsPeriod = 'day' | 'week' | 'month' | 'year'

export function useTodayStats() {
  return useQuery<TodayStats>({
    queryKey: ['stats', 'today'],
    queryFn: () => api.get('/stats/today').then((r) => r.data),
    refetchInterval: 60_000,
  })
}

export function useRevenueStats(period: StatsPeriod = 'week') {
  return useQuery<RevenuePoint[]>({
    queryKey: ['stats', 'revenue', period],
    queryFn: () =>
      api.get('/stats/revenue', { params: { period } }).then((r) => r.data),
  })
}

export function useDashboardKPIs() {
  return useQuery<DashboardKPIs>({
    queryKey: ['stats', 'dashboard'],
    queryFn: () => api.get('/stats/dashboard').then((r) => r.data),
    refetchInterval: 60_000,
  })
}
