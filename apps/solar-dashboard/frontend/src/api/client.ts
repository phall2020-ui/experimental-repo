import type {
  DashboardResponse,
  SiteDetailResponse,
  InverterDevice,
  Alert,
  RevenueResponse,
  HistoryPoint,
} from '../types/api'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export const fetchDashboard = () =>
  apiFetch<DashboardResponse>('/api/v1/mobile/dashboard')

export const fetchSiteDetail = (uid: string) =>
  apiFetch<SiteDetailResponse>(`/api/v1/mobile/sites/${encodeURIComponent(uid)}`)

export const fetchInverters = (uid: string) =>
  apiFetch<InverterDevice[]>(`/api/v1/mobile/sites/${encodeURIComponent(uid)}/inverters`)

export const fetchAlerts = (params?: { severity?: string; status?: string; plant_uid?: string }) => {
  const q = new URLSearchParams(params as Record<string, string>).toString()
  return apiFetch<Alert[]>(`/api/v1/mobile/alerts${q ? '?' + q : ''}`)
}

export const fetchRevenue = (date?: string) =>
  apiFetch<RevenueResponse>(`/api/v1/mobile/revenue${date ? '?date=' + date : ''}`)

export const fetchSiteHistory = (uid: string, start: string, end: string) =>
  apiFetch<HistoryPoint[]>(
    `/api/v1/mobile/sites/${encodeURIComponent(uid)}/history?start=${start}&end=${end}`
  )

export const fetchPortfolioHistory = (start: string, end: string) =>
  apiFetch<HistoryPoint[]>(`/api/v1/mobile/portfolio/history?start=${start}&end=${end}`)
