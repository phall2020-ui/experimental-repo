import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Thermometer } from 'lucide-react'
import { useInverters } from '../api/hooks'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorCard from '../components/ui/ErrorCard'
import { statusDot, statusColor, cn } from '../lib/utils'
import type { InverterDevice } from '../types/api'

function inverterBorderClass(status: InverterDevice['status']): string {
  if (status === 'online') return 'border-emerald-500/30'
  if (status === 'offline' || status === 'fault') return 'border-red-500/30'
  return 'border-gray-600/30'
}

function RelativeTime({ timestamp }: { timestamp: string | null }) {
  if (!timestamp) return <span className="text-xs text-slate-500">—</span>
  const diffMin = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60_000)
  let label: string
  if (diffMin < 1) label = 'just now'
  else if (diffMin < 60) label = `${diffMin}m ago`
  else label = `${Math.floor(diffMin / 60)}h ago`
  return <span className="text-xs text-slate-500">{label}</span>
}

export default function InverterScreen() {
  const { plantUid } = useParams<{ plantUid: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useInverters(plantUid ?? '')

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-navy-900">
        <LoadingSpinner />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-4 bg-navy-900 min-h-screen">
        <ErrorCard message={(error as Error)?.message ?? 'Failed to load inverter data'} />
      </div>
    )
  }

  const online = data.filter((d) => d.status === 'online').length
  const offline = data.filter((d) => d.status === 'offline' || d.status === 'fault').length
  const standby = data.filter((d) => d.status === 'standby').length

  // Sort: offline/fault first, then standby, then online
  const sorted = [...data].sort((a, b) => {
    const rank = (s: string) =>
      s === 'offline' || s === 'fault' ? 0 : s === 'standby' ? 1 : 2
    return rank(a.status) - rank(b.status)
  })

  return (
    <div className="bg-navy-900 min-h-screen text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-navy-900/95 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="flex-1 text-base font-semibold text-white truncate">
          Inverters
        </h1>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      <div className="p-4 flex flex-col gap-5">
        {/* Summary row */}
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-white font-medium">{online}</span>
            <span className="text-slate-400">online</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white font-medium">{offline}</span>
            <span className="text-slate-400">offline</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="text-white font-medium">{standby}</span>
            <span className="text-slate-400">standby</span>
          </span>
        </div>

        {/* Inverter grid */}
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
            <span className="text-4xl">⚡</span>
            <span className="text-base">No inverter data available</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {sorted.map((inv) => (
              <div
                key={inv.emig_id}
                className={cn(
                  'bg-navy-800 rounded-xl p-3.5 border flex flex-col gap-2',
                  inverterBorderClass(inv.status)
                )}
              >
                {/* Top row: status dot + name + status text */}
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn('w-2 h-2 rounded-full flex-shrink-0', statusDot(inv.status))}
                  />
                  <span className="text-xs font-medium text-white truncate flex-1">
                    {inv.name}
                  </span>
                  <span className={cn('text-xs capitalize flex-shrink-0', statusColor(inv.status))}>
                    {inv.status}
                  </span>
                </div>

                {/* Power */}
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-white">
                    {inv.power_kw.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400">kW</span>
                </div>

                {/* Energy today */}
                <div className="text-xs text-slate-400">
                  {inv.energy_today_kwh.toFixed(1)} kWh today
                </div>

                {/* DC voltage + Temperature */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {inv.dc_voltage_v != null ? `${inv.dc_voltage_v.toFixed(0)} V` : '— V'}
                  </span>
                  <span className="flex items-center gap-0.5 text-slate-400">
                    <Thermometer size={12} />
                    {inv.temperature_c != null ? `${inv.temperature_c.toFixed(1)} °C` : '—'}
                  </span>
                </div>

                {/* Last reading */}
                <RelativeTime timestamp={inv.last_reading} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
