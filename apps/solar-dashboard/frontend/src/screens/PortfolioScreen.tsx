import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, TrendingUp, Zap, Activity, Bell, ChevronDown } from 'lucide-react'
import { useDashboard, useLastUpdated } from '../api/hooks'
import StatCard from '../components/ui/StatCard'
import PlatformBadge from '../components/ui/PlatformBadge'
import StatusDot from '../components/ui/StatusDot'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorCard from '../components/ui/ErrorCard'
import {
  cn,
  formatKwh,
  formatKw,
  formatPct,
  formatGbp,
  formatCapacity,
  formatMwh,
} from '../lib/utils'
import type { SiteOverview, PlatformFilter, StatusFilter, SortField } from '../types/api'

const PLATFORM_FILTERS: { label: string; value: PlatformFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Juggle', value: 'juggle' },
  { label: 'SolarEdge', value: 'solaredge' },
  { label: 'Solis', value: 'solis' },
  { label: 'FusionSolar', value: 'fusionsolar' },
]

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Online', value: 'online' },
  { label: 'Offline', value: 'offline' },
]

const SORT_OPTIONS: { label: string; value: SortField }[] = [
  { label: 'Name', value: 'name' },
  { label: 'Today kWh', value: 'today_kwh' },
  { label: 'PR %', value: 'pr_pct' },
]

function prBadgeClass(pr: number | null): string {
  if (pr === null) return 'bg-gray-700 text-gray-400'
  if (pr >= 80) return 'bg-emerald-500/20 text-emerald-300'
  if (pr >= 60) return 'bg-amber-500/20 text-amber-300'
  return 'bg-red-500/20 text-red-300'
}

function SiteRow({ site, onClick }: { site: SiteOverview; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-navy-800 rounded-xl p-3.5 border border-white/5 flex items-center gap-3 active:scale-[0.99] transition-transform text-left hover:border-white/10"
    >
      {/* Status dot */}
      <StatusDot status={site.status} size="md" />

      {/* Name + platform */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white text-sm truncate">{site.name}</span>
          <PlatformBadge platform={site.platform} />
        </div>
        <span className="text-xs text-slate-500 mt-0.5 block">
          {formatCapacity(site.capacity_kwp)}
        </span>
      </div>

      {/* Energy + power */}
      <div className="text-right flex-shrink-0">
        <div className="text-base font-bold text-white tabular-nums">
          {formatKwh(site.today_kwh)}
        </div>
        <div className="text-xs text-slate-400 tabular-nums">
          {formatKw(site.current_kw)}
        </div>
      </div>

      {/* PR badge + alert count */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full font-semibold tabular-nums',
            prBadgeClass(site.pr_pct)
          )}
        >
          {formatPct(site.pr_pct)}
        </span>
        {site.alert_count > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-500/20 text-red-300">
            {site.alert_count}
          </span>
        )}
      </div>
    </button>
  )
}

export default function PortfolioScreen() {
  const navigate = useNavigate()
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboard()
  const lastUpdated = useLastUpdated(data?.timestamp)

  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [showSortMenu, setShowSortMenu] = useState(false)

  const filteredSites = useMemo<SiteOverview[]>(() => {
    if (!data?.sites) return []
    let sites = [...data.sites]

    if (platformFilter !== 'all') {
      sites = sites.filter((s) => s.platform.toLowerCase() === platformFilter)
    }
    if (statusFilter !== 'all') {
      sites = sites.filter((s) =>
        statusFilter === 'online'
          ? s.status === 'online' || s.status === 'standby'
          : s.status === 'offline' || s.status === 'unknown'
      )
    }

    sites.sort((a, b) => {
      if (sortField === 'name') return a.name.localeCompare(b.name)
      if (sortField === 'today_kwh') return b.today_kwh - a.today_kwh
      if (sortField === 'pr_pct') {
        const pa = a.pr_pct ?? -1
        const pb = b.pr_pct ?? -1
        return pb - pa
      }
      return 0
    })

    return sites
  }, [data?.sites, platformFilter, statusFilter, sortField])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <LoadingSpinner className="w-12 h-12" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center gap-4 p-6">
        <ErrorCard
          message={
            error instanceof Error
              ? error.message
              : 'Failed to load dashboard data'
          }
        />
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-solar-500 text-navy-950 rounded-lg font-semibold text-sm active:scale-95 transition-transform"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    )
  }

  const { portfolio, revenue } = data

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      {/* Sort menu backdrop */}
      {showSortMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowSortMenu(false)}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 pt-5 pb-28 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Solar Portfolio</h1>
            <p className="text-xs text-slate-500 mt-0.5">Updated {lastUpdated}</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-lg bg-navy-800 border border-white/5 text-slate-400 hover:text-white transition-colors active:scale-95 disabled:opacity-40"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Today's Generation"
            value={formatMwh(portfolio.generation_today_mwh)}
            icon={<TrendingUp size={16} />}
          />
          <StatCard
            label="Current Output"
            value={
              portfolio.total_capacity_mwp > 1
                ? `${(data.sites.reduce((s, x) => s + x.current_kw, 0) / 1000).toFixed(2)} MW`
                : formatKw(data.sites.reduce((s, x) => s + x.current_kw, 0))
            }
            icon={<Zap size={16} />}
          />
          <StatCard
            label="Fleet PR"
            value={formatPct(portfolio.fleet_pr_pct)}
            icon={<Activity size={16} />}
          />
          <StatCard
            label="Active Alerts"
            value={portfolio.active_alerts}
            icon={<Bell size={16} />}
            className={portfolio.active_alerts > 0 ? 'border-red-500/40' : ''}
            sub={
              portfolio.critical_alerts > 0
                ? `${portfolio.critical_alerts} critical`
                : undefined
            }
            trend={portfolio.critical_alerts > 0 ? 'down' : 'neutral'}
          />
        </div>

        {/* System status bar */}
        <div className="bg-navy-800 rounded-xl px-4 py-3 border border-white/5 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span className="text-sm text-slate-300">
              <span className="font-semibold text-white">{portfolio.sites_online}</span> online
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
            <span className="text-sm text-slate-300">
              <span className="font-semibold text-white">{portfolio.sites_offline}</span> offline
            </span>
          </div>
          <div className="ml-auto text-xs text-slate-500">
            {portfolio.total_sites} sites · {formatCapacity(portfolio.total_capacity_mwp * 1000)}
          </div>
        </div>

        {/* Filter bar */}
        <div className="space-y-2">
          {/* Platform chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {PLATFORM_FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setPlatformFilter(value)}
                className={cn(
                  'flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                  platformFilter === value
                    ? 'bg-solar-500 text-navy-950 border-solar-500 font-semibold'
                    : 'bg-navy-800 text-slate-400 border-white/10 hover:text-white'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Status + sort row */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              {STATUS_FILTERS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={cn(
                    'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                    statusFilter === value
                      ? 'bg-navy-700 text-white border-white/20'
                      : 'bg-navy-800 text-slate-500 border-white/5 hover:text-white'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="relative ml-auto">
              <button
                onClick={() => setShowSortMenu((p) => !p)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border bg-navy-800 text-slate-400 border-white/5 hover:text-white transition-colors"
              >
                Sort: {SORT_OPTIONS.find((o) => o.value === sortField)?.label}
                <ChevronDown size={12} />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 bg-navy-800 border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden min-w-[130px]">
                  {SORT_OPTIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => {
                        setSortField(value)
                        setShowSortMenu(false)
                      }}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-xs font-medium transition-colors',
                        sortField === value
                          ? 'text-solar-400 bg-solar-500/10'
                          : 'text-slate-300 hover:bg-white/5'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Site count sub-header */}
        <p className="text-xs text-slate-500">
          {filteredSites.length} site{filteredSites.length !== 1 ? 's' : ''}
          {platformFilter !== 'all' || statusFilter !== 'all' ? ' (filtered)' : ''}
        </p>

        {/* Site list */}
        <div className="space-y-2">
          {filteredSites.length === 0 ? (
            <div className="bg-navy-800 rounded-xl p-6 border border-white/5 text-center text-slate-500 text-sm">
              No sites match the current filters
            </div>
          ) : (
            filteredSites.map((site) => (
              <SiteRow
                key={site.plant_uid}
                site={site}
                onClick={() =>
                  navigate(`/sites/${encodeURIComponent(site.plant_uid)}`)
                }
              />
            ))
          )}
        </div>

        {/* Revenue card */}
        <div className="bg-navy-800 rounded-xl p-4 border border-white/5">
          <h2 className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">
            Today's Revenue
          </h2>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold text-white">
                {formatGbp(revenue.today_gbp)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                MTD: {formatGbp(revenue.mtd_gbp)}
              </div>
            </div>
            {revenue.current_ssp_gbp_mwh !== null && (
              <div className="text-right">
                <div className="text-sm font-semibold text-solar-400">
                  {formatGbp(revenue.current_ssp_gbp_mwh)}
                  <span className="text-xs text-slate-400 font-normal">/MWh</span>
                </div>
                <div className="text-xs text-slate-500">Current SSP</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
