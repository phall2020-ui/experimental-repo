import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  sub?: string
  icon?: ReactNode
  className?: string
  trend?: 'up' | 'down' | 'neutral'
  onClick?: () => void
}

export default function StatCard({
  label,
  value,
  unit,
  sub,
  icon,
  className,
  trend,
  onClick,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-navy-800 rounded-xl p-4 flex flex-col gap-1 border border-white/5',
        onClick && 'cursor-pointer active:scale-95 transition-transform',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white">{value}</span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
      {sub && (
        <span
          className={cn(
            'text-xs',
            trend === 'up'
              ? 'text-emerald-400'
              : trend === 'down'
              ? 'text-red-400'
              : 'text-slate-500'
          )}
        >
          {sub}
        </span>
      )}
    </div>
  )
}
