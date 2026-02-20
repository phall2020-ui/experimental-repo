import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useRevenue } from '../api/hooks'
import StatCard from '../components/ui/StatCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorCard from '../components/ui/ErrorCard'
import PlatformBadge from '../components/ui/PlatformBadge'
import { formatGbp } from '../lib/utils'

export default function RevenueScreen() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const { data, isLoading, isError, error } = useRevenue(date)

  const sortedSites = data
    ? [...data.sites].sort((a, b) => b.revenue_gbp - a.revenue_gbp)
    : []

  const total = sortedSites.reduce((sum, s) => sum + s.revenue_gbp, 0)

  return (
    <div className="bg-navy-900 min-h-screen text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-navy-900/95 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <h1 className="flex-1 text-lg font-semibold text-white">Revenue</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-navy-800 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500/50 [color-scheme:dark]"
        />
      </div>

      <div className="p-4 flex flex-col gap-5">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : isError ? (
          <ErrorCard message={(error as Error)?.message ?? 'Failed to load revenue data'} />
        ) : !data ? null : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Today's Revenue"
                value={`£${data.today_gbp.toFixed(0)}`}
              />
              <StatCard
                label="Current SSP"
                value={
                  data.current_ssp_gbp_mwh != null
                    ? `${data.current_ssp_gbp_mwh.toFixed(2)}`
                    : '—'
                }
                unit={data.current_ssp_gbp_mwh != null ? '£/MWh' : undefined}
              />
            </div>

            {/* Hourly SSP chart */}
            {data.hourly_ssp.length > 0 && (
              <div className="bg-navy-800 rounded-xl p-4 border border-white/5">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-3">
                  Hourly SSP
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={data.hourly_ssp}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="hour"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0f1729',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)} £/MWh`, 'SSP']}
                    />
                    <Line
                      type="monotone"
                      dataKey="ssp_gbp_mwh"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#F59E0B' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Per-site revenue table */}
            {sortedSites.length > 0 && (
              <div className="bg-navy-800 rounded-xl border border-white/5 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/5">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
                    Site Revenue
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-4 py-2 font-medium">Site</th>
                      <th className="px-4 py-2 font-medium">Platform</th>
                      <th className="text-right px-4 py-2 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSites.map((site, i) => (
                      <tr
                        key={site.plant_uid}
                        className={`border-t border-white/5 ${
                          i % 2 === 0 ? '' : 'bg-white/[0.02]'
                        }`}
                      >
                        <td className="px-4 py-2.5 text-white font-medium truncate max-w-[140px]">
                          {site.name}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <PlatformBadge platform={(site as any).platform ?? 'unknown'} />
                        </td>
                        <td className="px-4 py-2.5 text-right text-white">
                          {formatGbp(site.revenue_gbp)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-white/10 bg-white/5">
                      <td className="px-4 py-2.5 text-white font-bold" colSpan={2}>
                        Total
                      </td>
                      <td className="px-4 py-2.5 text-right text-white font-bold">
                        {formatGbp(total)}
                      </td>
                    </tr>
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
