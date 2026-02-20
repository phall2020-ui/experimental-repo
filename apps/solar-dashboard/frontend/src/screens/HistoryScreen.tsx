import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSiteHistory, usePortfolioHistory } from '../api/hooks'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatKwh, formatMwh, formatPct, formatGbp, getDateRange } from '../lib/utils'
import StatCard from '../components/ui/StatCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorCard from '../components/ui/ErrorCard'
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react'
import type { HistoryPoint } from '../types/api'

type RangeOption = 7 | 30 | 90 | 365 | 'custom'
type Metric = 'generation' | 'revenue' | 'pr'

const RANGE_CHIPS: { label: string; value: RangeOption }[] = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: '12 months', value: 365 },
  { label: 'Custom', value: 'custom' },
]

const METRIC_TABS: { label: string; value: Metric }[] = [
  { label: 'Generation (kWh)', value: 'generation' },
  { label: 'Revenue (£)', value: 'revenue' },
  { label: 'PR%', value: 'pr' },
]

const METRIC_COLOR: Record<Metric, string> = {
  generation: '#F59E0B',
  revenue: '#10B981',
  pr: '#3B82F6',
}

function formatXLabel(dateStr: string, rangeDays: number): string {
  const d = new Date(dateStr)
  if (rangeDays <= 30) {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

function CustomTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  metric: Metric
}) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  let formatted: string
  if (metric === 'generation') formatted = formatKwh(val)
  else if (metric === 'revenue') formatted = formatGbp(val)
  else formatted = formatPct(val)

  return (
    <div className="bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-sm">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-white font-semibold">{formatted}</p>
    </div>
  )
}

export default function HistoryScreen() {
  const { plantUid } = useParams<{ plantUid?: string }>()
  const navigate = useNavigate()
  const isSite = !!plantUid

  // Date range state
  const [range, setRange] = useState<RangeOption>(30)
  const defaultDates = useMemo(() => getDateRange(30), [])
  const [customStart, setCustomStart] = useState(defaultDates.start)
  const [customEnd, setCustomEnd] = useState(defaultDates.end)

  const { start, end } = useMemo<{ start: string; end: string }>(() => {
    if (range === 'custom') return { start: customStart, end: customEnd }
    return getDateRange(range)
  }, [range, customStart, customEnd])

  const rangeDays = useMemo(() => {
    if (range === 'custom') {
      const ms = new Date(end).getTime() - new Date(start).getTime()
      return Math.max(1, Math.round(ms / 86_400_000))
    }
    return range
  }, [range, start, end])

  // Metric & table state
  const [metric, setMetric] = useState<Metric>('generation')
  const [tableOpen, setTableOpen] = useState(false)

  // Data fetching — always call both hooks, use the right one
  const siteResult = useSiteHistory(plantUid ?? '', start, end)
  const portfolioResult = usePortfolioHistory(start, end)

  const { data, isLoading, isError, error } = isSite ? siteResult : portfolioResult

  const siteName = (data as { name?: string } | undefined)?.name ?? plantUid ?? ''

  // Normalise to HistoryPoint[]
  const points: HistoryPoint[] = useMemo(() => {
    if (!data) return []
    const maybeWrapped = data as unknown as { points: HistoryPoint[] }
    if (
      typeof maybeWrapped === 'object' &&
      maybeWrapped !== null &&
      'points' in maybeWrapped &&
      Array.isArray(maybeWrapped.points)
    ) {
      return maybeWrapped.points
    }
    if (Array.isArray(data)) return data as unknown as HistoryPoint[]
    return []
  }, [data])

  // Chart data
  const chartData = useMemo(() =>
    points.map(p => ({
      date: formatXLabel(p.date, rangeDays),
      rawDate: p.date,
      generation: p.kwh,
      revenue: p.revenue_gbp ?? 0,
      pr: p.pr_pct ?? null,
    })),
    [points, rangeDays]
  )

  // Summary stats
  const totalKwh = useMemo(() => points.reduce((s, p) => s + p.kwh, 0), [points])
  const avgDailyKwh = points.length > 0 ? totalKwh / points.length : 0
  const validPr = points.filter(p => p.pr_pct !== null)
  const avgPr = validPr.length > 0
    ? validPr.reduce((s, p) => s + (p.pr_pct ?? 0), 0) / validPr.length
    : null

  const metricColor = METRIC_COLOR[metric]

  return (
    <div className="flex flex-col min-h-screen bg-navy-950 text-white pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        {isSite && (
          <button
            onClick={() => navigate(`/sites/${plantUid}`)}
            className="p-1.5 rounded-lg bg-white/5 active:bg-white/10 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold leading-tight">
            {isSite ? siteName : 'Portfolio Trends'}
          </h1>
          {isSite && <p className="text-sm text-gray-400">History</p>}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4">
        {/* Date range chips */}
        <div className="flex gap-2 flex-wrap">
          {RANGE_CHIPS.map(chip => (
            <button
              key={String(chip.value)}
              onClick={() => setRange(chip.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                range === chip.value
                  ? 'bg-amber-500 border-amber-500 text-black'
                  : 'bg-white/5 border-white/10 text-gray-300 active:bg-white/10'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {range === 'custom' && (
          <div className="flex gap-3 items-end">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-400">From</label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-400">To</label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full"
              />
            </div>
          </div>
        )}

        {/* Metric selector tabs */}
        <div className="flex bg-white/5 rounded-xl p-1 gap-1">
          {METRIC_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setMetric(tab.value)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                metric === tab.value
                  ? 'bg-navy-800 text-white shadow'
                  : 'text-gray-400 active:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center items-center h-60">
            <LoadingSpinner />
          </div>
        )}

        {/* Error */}
        {isError && (
          <ErrorCard message={(error as Error)?.message ?? 'Failed to load history data'} />
        )}

        {/* Empty */}
        {!isLoading && !isError && chartData.length === 0 && (
          <div className="flex justify-center items-center h-40 text-gray-500 text-sm">
            No data available for this period
          </div>
        )}

        {/* Data */}
        {!isLoading && !isError && chartData.length > 0 && (
          <>
            {/* Main chart */}
            <div className="bg-navy-800 rounded-xl p-3 border border-white/5">
              <ResponsiveContainer width="100%" height={240}>
                {metric === 'pr' ? (
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2A40" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `${v}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      content={<CustomTooltip metric={metric} />}
                      cursor={{ stroke: '#374151', strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pr"
                      stroke={metricColor}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E2A40" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v =>
                        metric === 'revenue'
                          ? `£${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                          : v >= 1000
                          ? `${(v / 1000).toFixed(0)}M`
                          : String(v)
                      }
                    />
                    <Tooltip
                      content={<CustomTooltip metric={metric} />}
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    />
                    <Bar dataKey={metric} fill={metricColor} radius={[3, 3, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Total"
                value={formatMwh(totalKwh / 1000)}
                sub="generation"
              />
              <StatCard
                label="Avg daily"
                value={formatMwh(avgDailyKwh / 1000)}
                sub="per day"
              />
              <StatCard
                label="Avg PR"
                value={avgPr !== null ? formatPct(avgPr) : '—'}
                sub="performance"
              />
            </div>

            {/* Data table toggle */}
            <button
              onClick={() => setTableOpen(o => !o)}
              className="flex items-center justify-between w-full bg-white/5 rounded-xl px-4 py-3 text-sm font-medium border border-white/5 active:bg-white/10 transition-colors"
            >
              <span>{tableOpen ? 'Hide data' : 'Show data'}</span>
              {tableOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {tableOpen && (
              <div
                className="bg-navy-800 rounded-xl border border-white/5 overflow-hidden"
                style={{ maxHeight: 300, overflowY: 'auto' }}
              >
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-navy-900">
                    <tr className="text-gray-400 text-xs">
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-right font-medium">Generation</th>
                      <th className="px-3 py-2 text-right font-medium">PR%</th>
                      <th className="px-3 py-2 text-right font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {points.map(p => (
                      <tr key={p.date} className="hover:bg-white/5 transition-colors">
                        <td className="px-3 py-2 text-gray-300">
                          {new Date(p.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: rangeDays > 90 ? '2-digit' : undefined,
                          })}
                        </td>
                        <td className="px-3 py-2 text-right text-white">
                          {formatKwh(p.kwh)}
                        </td>
                        <td className="px-3 py-2 text-right text-white">
                          {formatPct(p.pr_pct)}
                        </td>
                        <td className="px-3 py-2 text-right text-white">
                          {p.revenue_gbp !== null ? formatGbp(p.revenue_gbp) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
