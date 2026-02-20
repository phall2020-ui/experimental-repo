export interface PortfolioSummary {
  total_sites: number
  total_capacity_mwp: number
  generation_today_mwh: number
  generation_mtd_mwh: number
  fleet_pr_pct: number | null
  active_alerts: number
  critical_alerts: number
  sites_online: number
  sites_offline: number
}

export interface SiteOverview {
  plant_uid: string
  name: string
  platform: 'juggle' | 'solaredge' | 'solis' | 'fusionsolar' | string
  capacity_kwp: number
  today_kwh: number
  current_kw: number
  pr_pct: number | null
  status: 'online' | 'offline' | 'standby' | 'unknown'
  alert_count: number
  last_reading: string | null
}

export interface SiteOverviewExtended extends SiteOverview {
  today_mwh: number
  capacity_label: string  // "250 kWp" or "8.6 MWp"
}

export interface RevenueSummary {
  today_gbp: number
  current_ssp_gbp_mwh: number | null
  mtd_gbp: number
}

export interface DashboardResponse {
  timestamp: string
  portfolio: PortfolioSummary
  sites: SiteOverview[]
  revenue: RevenueSummary
}

export interface GenerationData {
  today_kwh: number
  today_mwh: number
  current_kw: number
  peak_kw: number
  mtd_mwh: number | null
  ytd_mwh: number | null
}

export interface PerformanceData {
  pr_pct: number | null
  specific_yield: number | null
  irradiance_kwh_m2: number | null
}

export interface InverterDevice {
  emig_id: string
  name: string
  status: 'online' | 'offline' | 'standby' | 'fault'
  power_kw: number
  energy_today_kwh: number
  dc_voltage_v: number | null
  temperature_c: number | null
  last_reading: string | null
}

export interface InverterSummaryData {
  total: number
  online: number
  offline: number
  standby: number
  devices: InverterDevice[]
}

export interface AlarmItem {
  severity: 'critical' | 'major' | 'minor' | 'warning'
  message: string
  device: string | null
  since: string
}

export interface AlarmData {
  critical: number
  major: number
  minor: number
  warning: number
  items: AlarmItem[]
}

export interface HourlyPoint {
  hour: string  // "06:00"
  kwh: number
  irradiance_wm2: number | null
}

export interface SiteDetailResponse {
  plant_uid: string
  name: string
  platform: string
  capacity_kwp: number
  generation: GenerationData
  performance: PerformanceData
  inverters: InverterSummaryData
  alarms: AlarmData
  hourly_generation: HourlyPoint[]
  last_updated: string | null
}

export interface Alert {
  id: string
  severity: 'critical' | 'major' | 'minor' | 'warning'
  site_name: string
  plant_uid: string
  message: string
  device: string | null
  since: string
  status: 'active' | 'acknowledged' | 'resolved'
}

export interface RevenueResponse {
  date: string
  today_gbp: number
  current_ssp_gbp_mwh: number | null
  sites: Array<{ plant_uid: string; name: string; revenue_gbp: number }>
  hourly_ssp: Array<{ hour: string; ssp_gbp_mwh: number }>
}

export interface HistoryPoint {
  date: string
  kwh: number
  pr_pct: number | null
  irradiance_kwh_m2: number | null
  revenue_gbp: number | null
}

export type SortField = 'name' | 'today_kwh' | 'pr_pct' | 'status' | 'capacity_kwp'
export type PlatformFilter = 'all' | 'juggle' | 'solaredge' | 'solis' | 'fusionsolar'
export type StatusFilter = 'all' | 'online' | 'offline'
export type SeverityFilter = 'all' | 'critical' | 'major' | 'minor' | 'warning'
