import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKwh(kwh: number): string {
  if (kwh >= 1000) return `${(kwh / 1000).toFixed(1)} MWh`
  return `${kwh.toFixed(1)} kWh`
}

export function formatMwh(mwh: number): string {
  if (mwh >= 1000) return `${(mwh / 1000).toFixed(1)} GWh`
  return `${mwh.toFixed(1)} MWh`
}

export function formatKw(kw: number): string {
  if (kw >= 1000) return `${(kw / 1000).toFixed(2)} MW`
  return `${kw.toFixed(1)} kW`
}

export function formatGbp(gbp: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(gbp)
}

export function formatPct(pct: number | null): string {
  if (pct === null) return '—'
  return `${pct.toFixed(1)}%`
}

export function formatCapacity(kwp: number): string {
  if (kwp >= 1000) return `${(kwp / 1000).toFixed(1)} MWp`
  return `${kwp.toFixed(0)} kWp`
}

export function statusColor(status: string): string {
  switch (status) {
    case 'online': return 'text-emerald-400'
    case 'offline': return 'text-red-400'
    case 'standby': return 'text-gray-400'
    case 'fault': return 'text-red-500'
    default: return 'text-gray-400'
  }
}

export function statusDot(status: string): string {
  switch (status) {
    case 'online': return 'bg-emerald-400'
    case 'offline': return 'bg-red-500 animate-pulse'
    case 'standby': return 'bg-gray-500'
    case 'fault': return 'bg-red-500 animate-pulse'
    default: return 'bg-gray-600'
  }
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/30'
    case 'major': return 'text-orange-400 bg-orange-400/10 border-orange-400/30'
    case 'minor': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
    case 'warning': return 'text-blue-400 bg-blue-400/10 border-blue-400/30'
    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30'
  }
}

export function platformColor(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'juggle': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'solaredge': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    case 'solis': return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    case 'fusionsolar': return 'bg-red-500/20 text-red-300 border-red-500/30'
    default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  }
}

export function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    juggle: 'Juggle',
    solaredge: 'SolarEdge',
    solis: 'Solis',
    fusionsolar: 'FusionSolar',
  }
  return labels[platform.toLowerCase()] ?? platform
}

export function getDateRange(days: number): { start: string; end: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}
