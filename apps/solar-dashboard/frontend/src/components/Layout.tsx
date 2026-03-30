import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Zap, Bell, TrendingUp } from 'lucide-react'
import { cn } from '../lib/utils'
import { useAlerts } from '../api/hooks'
import type { ReactNode } from 'react'

const tabs = [
  { path: '/', icon: LayoutDashboard, label: 'Portfolio' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
  { path: '/revenue', icon: Zap, label: 'Revenue' },
  { path: '/history', icon: TrendingUp, label: 'Trends' },
]

function AlertBadge() {
  const { data } = useAlerts('all', 'active')
  const count = data?.length ?? 0
  if (!count) return null
  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-bold">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 bg-navy-900 border-r border-white/5 flex-col p-4 z-20">
        <div className="flex items-center gap-2 mb-8 mt-2">
          <div className="w-8 h-8 bg-solar-500 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-navy-950" />
          </div>
          <span className="font-bold text-white text-sm">SolarDash</span>
        </div>
        <nav className="flex flex-col gap-1">
          {tabs.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                location.pathname === path
                  ? 'bg-solar-500/10 text-solar-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon size={18} />
              {label}
              {label === 'Alerts' && <AlertBadge />}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-56 pb-safe overflow-auto">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-navy-900/95 backdrop-blur border-t border-white/10 z-20 safe-bottom">
        <div className="flex">
          {tabs.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors relative',
                location.pathname === path ? 'text-solar-400' : 'text-slate-500'
              )}
            >
              <div className="relative">
                <Icon size={20} />
                {label === 'Alerts' && <AlertBadge />}
              </div>
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
