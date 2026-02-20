import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, RefreshCw, Zap, TrendingUp, Activity, BarChart2 } from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useSiteDetail, useLastUpdated } from '../api/hooks'
import StatCard from '../components/ui/StatCard'
import PlatformBadge from '../components/ui/PlatformBadge'
import StatusDot from '../components/ui/StatusDot'
import SeverityBadge from '../components/ui/SeverityBadge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorCard from '../components/ui/ErrorCard'
import {
  cn,
  formatKwh,
  formatKw,
  formatPct,
  formatCapacity,
  formatMwh,
  severityColor,
} from '../lib/utils'
import type { AlarmItem, InverterDevice } from '../types/api'

function prColor(pr: number | null): string {
  if (pr === null) return 'text-slate-400'
  if (pr >= 80) return 'text-emerald-400'
  if (pr >= 60) return 'text-amber-400'
  return 'text-red-400'
}

function InverterCard({
  inv,
  onClick,
}: {
  inv: InverterDevice
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-navy-900 rounded-lg p-3 border border-white/5 text-left w-full hover:border-white/10 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-2 mb-1">
        <StatusDot status={inv.status} size="sm" />
        <span className="text-xs font-semibold text-white truncate flex-1">{inv.name}</span>
      </div>
      <div className="text-sm font-bold text-white tabular-nums">
        {formatKw(inv.power_kw)}
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{inv.energy_today_kwh.toFixed(1)} kWh today</div>
    </button>
  )
}

function AlarmRow({ alarm }: { alarm: AlarmItem }) {
  const since = (() => {
    try {
      const d = new Date(alarm.since)
      return d.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return alarm.since
    }
  })()

  return (
    <div
      className={cn(
        'rounded-lg p-3 border',
        severityColor(alarm.severity)
      )}
    >
      <div className="flex items-start gap-2">
        <SeverityBadge severity={alarm.severity} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium leading-snug">{alarm.message}</p>
          {alarm.device && (
            <p className="text-xs text-slate-400 mt-0.5">{alarm.device}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">Since {since}</p>
        </div>
      </div>
    </div>
  )
}

export default function SiteDetailScreen() {
  const { plantUid } = useParams<{ plantUid: string }>()
  const navigate = useNavigate()
  const uid = decodeURIComponent(plantUid ?? '')

  const { data, isLoading, isError, error, refetch, isFetching } = useSiteDetail(uid)
  const lastUpdated = useLastUpdated(data?.last_updated)

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
            error instanceof Error ? error.message : 'Failed to load site data'
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

  const { generation, performance, inverters, alarms, hourly_generation } = data

  // Detect irradiance data availability
  const hasIrradiance = hourly_generation.some((h) => h.irradiance_wm2 !== null)

  // Normalise hourly data for chart (scale irradiance to same ballpark as kWh for overlay)
  const maxKwh = Math.max(...hourly_generation.map((h) => h.kwh), 1)
  const chartData = hourly_generation.map((h) => ({
    hour: h.hour,
    kwh: h.kwh,
    irr: h.irradiance_wm2,
  }))

  return (
    <div className="min-h-screen bg-navy-950 text-white overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-28 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            className="mt-0.5 p-2 rounded-lg bg-navy-800 border border-white/5 text-slate-400 hover:text-white transition-colors flex-shrink-0 active:scale-95"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-white truncate">{data.name}</h1>
              <PlatformBadge platform={data.platform} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatCapacity(data.capacity_kwp)} · Updated {lastUpdated}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-0.5 p-2 rounded-lg bg-navy-800 border border-white/5 text-slate-400 hover:text-white transition-colors flex-shrink-0 active:scale-95 disabled:opacity-40"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Generation KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Today"
            value={formatKwh(generation.today_kwh)}
            icon={<TrendingUp size={16} />}
          />
          <StatCard
            label="Current Power"
            value={formatKw(generation.current_kw)}
            icon={<Zap size={16} />}
          />
          <StatCard
            label="Peak Today"
            value={formatKw(generation.peak_kw)}
            icon={<BarChart2 size={16} />}
          />
          <StatCard
            label="Month to Date"
            value={
              generation.mtd_mwh !== null
                ? formatMwh(generation.mtd_mwh)
                : '—'
            }
            icon={<Activity size={16} />}
          />
        </div>

        {/* Performance row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-navy-800 rounded-xl p-3 border border-white/5 text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">PR</div>
            <div className={cn('text-xl font-bold tabular-nums', prColor(performance.pr_pct))}>
              {formatPct(performance.pr_pct)}
            </div>
          </div>
          <div className="bg-navy-800 rounded-xl p-3 border border-white/5 text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Sp. Yield</div>
            <div className="text-xl font-bold text-white tabular-nums">
              {performance.specific_yield !== null
                ? `${performance.specific_yield.toFixed(1)}`
                : '—'}
            </div>
            {performance.specific_yield !== null && (
              <div className="text-xs text-slate-500">kWh/kWp</div>
            )}
          </div>
          <div className="bg-navy-800 rounded-xl p-3 border border-white/5 text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Irradiance</div>
            <div className="text-xl font-bold text-white tabular-nums">
              {performance.irradiance_kwh_m2 !== null
                ? performance.irradiance_kwh_m2.toFixed(2)
                : '—'}
            </div>
            {performance.irradiance_kwh_m2 !== null && (
              <div className="text-xs text-slate-500">kWh/m²</div>
            )}
          </div>
        </div>

        {/* Hourly chart */}
        <div className="bg-navy-800 rounded-xl p-4 border border-white/5">
          <h2 className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">
            Hourly Generation
          </h2>
          {chartData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
              No hourly data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="kwh"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v}`}
                />
                {hasIrradiance && (
                  <YAxis
                    yAxisId="irr"
                    orientation="right"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 'auto']}
                  />
                )}
                <Tooltip
                  contentStyle={{
                    background: '#0f1729',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'kwh' ? `${value.toFixed(1)} kWh` : `${value} W/m²`,
                    name === 'kwh' ? 'Generation' : 'Irradiance',
                  ]}
                />
                <Bar yAxisId="kwh" dataKey="kwh" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={28} />
                {hasIrradiance && (
                  <Line
                    yAxisId="irr"
                    type="monotone"
                    dataKey="irr"
                    stroke="#60a5fa"
                    strokeWidth={1.5}
                    dot={false}
                    strokeOpacity={0.7}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Inverter summary */}
        <div className="bg-navy-800 rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-white">
              Inverters ({inverters.total})
            </h2>
            <button
              onClick={() =>
                navigate(`/sites/${encodeURIComponent(uid)}/inverters`)
              }
              className="text-xs text-solar-400 hover:text-solar-300 font-medium transition-colors"
            >
              View all ›
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            <span className="text-emerald-400 font-medium">{inverters.online}</span> online
            {inverters.offline > 0 && (
              <>
                {' · '}
                <span className="text-red-400 font-medium">{inverters.offline}</span> offline
              </>
            )}
            {inverters.standby > 0 && (
              <>
                {' · '}
                <span className="text-slate-400 font-medium">{inverters.standby}</span> standby
              </>
            )}
          </p>

          {inverters.devices.length === 0 ? (
            <p className="text-slate-500 text-sm">No inverter data</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {inverters.devices.slice(0, 6).map((inv) => (
                <InverterCard
                  key={inv.emig_id}
                  inv={inv}
                  onClick={() =>
                    navigate(`/sites/${encodeURIComponent(uid)}/inverters`)
                  }
                />
              ))}
            </div>
          )}

          {inverters.devices.length > 6 && (
            <button
              onClick={() =>
                navigate(`/sites/${encodeURIComponent(uid)}/inverters`)
              }
              className="mt-3 w-full text-center text-xs text-solar-400 hover:text-solar-300 font-medium py-2 border border-white/5 rounded-lg transition-colors"
            >
              View all {inverters.total} inverters ›
            </button>
          )}
        </div>

        {/* Alarms section */}
        <div className="bg-navy-800 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-white">Alarms</h2>
            {alarms.critical > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-semibold">
                {alarms.critical} critical
              </span>
            )}
            {alarms.major > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-semibold">
                {alarms.major} major
              </span>
            )}
          </div>

          {alarms.items.length === 0 ? (
            <p className="text-slate-500 text-sm">No active alarms</p>
          ) : (
            <div className="space-y-2">
              {alarms.items.map((alarm: AlarmItem, i: number) => (
                <AlarmRow key={i} alarm={alarm} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
