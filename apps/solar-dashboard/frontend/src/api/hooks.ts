import { useQuery } from '@tanstack/react-query'
import * as api from './client'
import type { SeverityFilter, StatusFilter } from '../types/api'

export const REFETCH_INTERVAL = 60_000

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: api.fetchDashboard,
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 30_000,
  })
}

export function useSiteDetail(uid: string) {
  return useQuery({
    queryKey: ['site', uid],
    queryFn: () => api.fetchSiteDetail(uid),
    refetchInterval: REFETCH_INTERVAL,
    enabled: !!uid,
  })
}

export function useInverters(uid: string) {
  return useQuery({
    queryKey: ['inverters', uid],
    queryFn: () => api.fetchInverters(uid),
    refetchInterval: REFETCH_INTERVAL,
    enabled: !!uid,
  })
}

export function useAlerts(
  severity?: SeverityFilter,
  status: StatusFilter | 'active' | 'acknowledged' = 'active'
) {
  return useQuery({
    queryKey: ['alerts', severity, status],
    queryFn: () =>
      api.fetchAlerts({
        severity: severity === 'all' ? undefined : severity,
        status: status === 'all' ? undefined : status,
      }),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

export function useRevenue(date?: string) {
  return useQuery({
    queryKey: ['revenue', date],
    queryFn: () => api.fetchRevenue(date),
    refetchInterval: REFETCH_INTERVAL,
  })
}

export function useSiteHistory(uid: string, start: string, end: string) {
  return useQuery({
    queryKey: ['history', uid, start, end],
    queryFn: () => api.fetchSiteHistory(uid, start, end),
    enabled: !!uid && !!start && !!end,
  })
}

export function usePortfolioHistory(start: string, end: string) {
  return useQuery({
    queryKey: ['portfolio-history', start, end],
    queryFn: () => api.fetchPortfolioHistory(start, end),
    enabled: !!start && !!end,
  })
}

export function useLastUpdated(timestamp?: string | null): string {
  if (!timestamp) return 'Never'
  const d = new Date(timestamp)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  return `${Math.floor(diffMin / 60)}h ago`
}
