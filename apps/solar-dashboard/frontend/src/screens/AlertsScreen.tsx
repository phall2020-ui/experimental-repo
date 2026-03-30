import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useAlerts } from '../api/hooks'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorCard from '../components/ui/ErrorCard'
import SeverityBadge from '../components/ui/SeverityBadge'
import PlatformBadge from '../components/ui/PlatformBadge'
import type { SeverityFilter, Alert } from '../types/api'

type StatusTab = 'active' | 'acknowledged' | 'all'

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'all', label: 'All' },
]

const SEVERITY_CHIPS: { key: SeverityFilter; label: string; color: string }[] = [
  { key: 'all', label: 'All', color: 'bg-white/10 text-white border-white/20' },
  { key: 'critical', label: 'Critical', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { key: 'major', label: 'Major', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { key: 'minor', label: 'Minor', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { key: 'warning', label: 'Warning', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
]

const SEVERITY_ORDER: SeverityFilter[] = ['critical', 'major', 'minor', 'warning']

const SEVERITY_LEFT_BORDER: Record<string, string> = {
  critical: 'border-l-red-500',
  major: 'border-l-orange-500',
  minor: 'border-l-yellow-500',
  warning: 'border-l-blue-500',
}

function RelativeTime({ since }: { since: string }) {
  const diffMin = Math.floor((Date.now() - new Date(since).getTime()) / 60_000)
  let label: string
  if (diffMin < 1) label = 'just now'
  else if (diffMin < 60) label = `${diffMin}m ago`
  else if (diffMin < 1440) label = `${Math.floor(diffMin / 60)}h ago`
  else label = `${Math.floor(diffMin / 1440)}d ago`
  return <span className="text-xs text-slate-500">{label}</span>
}

function groupBySeverity(alerts: Alert[]): Map<SeverityFilter, Alert[]> {
  const map = new Map<SeverityFilter, Alert[]>()
  for (const sev of SEVERITY_ORDER) {
    const items = alerts.filter((a) => a.severity === sev)
    if (items.length > 0) map.set(sev, items)
  }
  return map
}

export default function AlertsScreen() {
  const [statusTab, setStatusTab] = useState<StatusTab>('active')
  const [severity, setSeverity] = useState<SeverityFilter>('all')

  const { data: alerts, isLoading, isError, error } = useAlerts(
    severity,
    statusTab
  )

  const activeCount = alerts?.filter((a) => a.status === 'active').length ?? 0
  const grouped = groupBySeverity(alerts ?? [])

  return (
    <div className="bg-navy-900 min-h-screen text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-navy-900/95 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <h1 className="flex-1 text-lg font-semibold text-white">Alerts</h1>
        {activeCount > 0 && (
          <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
            {activeCount}
          </span>
        )}
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* Status tabs */}
        <div className="flex bg-navy-800 rounded-lg p-1 gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                statusTab === tab.key
                  ? 'bg-white/15 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Severity chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SEVERITY_CHIPS.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setSeverity(chip.key)}
              className={`flex-shrink-0 text-xs font-medium px-3 py-1 rounded-full border transition-all ${
                severity === chip.key
                  ? chip.color + ' ring-1 ring-white/20'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : isError ? (
          <ErrorCard message={(error as Error)?.message ?? 'Failed to load alerts'} />
        ) : grouped.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <CheckCircle2 size={48} className="text-emerald-500" />
            <span className="text-base font-medium text-emerald-400">No active alerts</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pb-8">
            {Array.from(grouped.entries()).map(([sev, items]) => (
              <div key={sev}>
                <div className="text-xs uppercase tracking-widest text-slate-500 mb-2 font-semibold">
                  {sev} ({items.length})
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((alert) => (
                    <div
                      key={alert.id}
                      className={`bg-navy-800 rounded-xl border border-white/5 border-l-4 ${
                        SEVERITY_LEFT_BORDER[alert.severity] ?? 'border-l-gray-500'
                      } px-4 py-3 flex flex-col gap-1.5`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-sm font-semibold text-white">{alert.site_name}</span>
                        {alert.device && (
                          <span className="text-xs italic text-slate-400">{alert.device}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 leading-snug">{alert.message}</p>
                      <div className="flex items-center gap-3">
                        <RelativeTime since={alert.since} />
                        <PlatformBadge platform={(alert as any).platform ?? 'unknown'} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
