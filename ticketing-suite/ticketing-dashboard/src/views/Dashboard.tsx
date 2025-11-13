import React from 'react'
import { bulkDeleteTickets, bulkUpdateTickets, listTickets, type Ticket } from '../lib/api'
import { sortTickets, loadCfg, saveCfg, type PriorityCfg } from '../lib/prioritise'
import { Link, useNavigate } from 'react-router-dom'
import CreateTicket from '../components/CreateTicket'
import AdvancedSearch from '../components/AdvancedSearch'
import SavedViews from '../components/SavedViews'
import BulkOperations from '../components/BulkOperations'
import TicketQuickView from '../components/TicketQuickView'
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp'
import { EmptyState } from '../components/ui/EmptyState'
import { StatusChip } from '../components/ui/StatusChip'
import { listSites, listUsers, listIssueTypes, listFieldDefinitions, type SiteOpt, type UserOpt, type IssueTypeOpt, type FieldDefOpt } from '../lib/directory'
import { useNotifications } from '../lib/notifications'
import { exportToCSV, exportToJSON } from '../lib/export'
import { useKeyboardShortcuts, SHORTCUT_CATEGORIES, type KeyboardShortcut } from '../hooks/useKeyboardShortcuts'
import { useSavedViews, type SavedView } from '../hooks/useSavedViews'
import { useRecurringTickets } from '../hooks/useTickets'
import type { RecurringTicketConfig } from '../lib/api'
import { STATUS_OPTIONS, STATUS_LABELS } from '../lib/statuses'

const CONTROL_HEIGHT = 36

const baseButtonStyle: React.CSSProperties = {
  padding: '0 16px',
  borderRadius: 12,
  border: '1px solid #d6d9dd',
  background: '#f8fafc',
  color: '#1e293b',
  fontSize: 13,
  fontWeight: 600,
  height: CONTROL_HEIGHT,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  letterSpacing: 0.1,
  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border 0.15s ease, background 0.15s ease, color 0.15s ease',
  cursor: 'pointer'
}

const primaryButtonStyle: React.CSSProperties = {
  ...baseButtonStyle,
  background: '#2563eb',
  color: '#ffffff',
  border: '1px solid #1d4ed8'
}

const segmentContainerStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: 4,
  borderRadius: 999,
  background: '#f1f5f9',
  border: '1px solid #d5dce5',
  height: CONTROL_HEIGHT
}

const segmentButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#475569',
  fontSize: 12,
  fontWeight: 600,
  padding: '6px 14px',
  borderRadius: 999,
  cursor: 'pointer',
  height: CONTROL_HEIGHT - 8,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s ease, color 0.2s ease, transform 0.15s ease'
}

const segmentButtonActiveStyle: React.CSSProperties = {
  background: '#ffffff',
  color: '#1e3a8a',
  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.12)'
}

const StatusFilter: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div style={segmentContainerStyle} role="group" aria-label="Filter by status">
    <button
      type="button"
      onClick={() => onChange('')}
      style={{ ...segmentButtonStyle, ...(value === '' ? segmentButtonActiveStyle : {}) }}
      aria-pressed={value === ''}
    >
      All
    </button>
    {STATUS_OPTIONS.map(option => {
      const isActive = value === option.value
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          style={{ ...segmentButtonStyle, ...(isActive ? segmentButtonActiveStyle : {}) }}
          aria-pressed={isActive}
        >
          {option.label}
        </button>
      )
    })}
  </div>
)

// User avatar component
const UserAvatar: React.FC<{ user?: UserOpt; size?: number; showMargin?: boolean }> = ({ user, size = 24, showMargin = true }) => {
  if (!user) return <span style={{ fontSize: size * 0.6 }}>—</span>
  const initials = (user.name || user.email || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#5b9cff',
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 600,
        marginRight: showMargin ? 6 : 0
      }}
      title={user.name || user.email}
    >
      {initials}
    </div>
  )
}

const TABLE_COLUMN_WIDTHS = {
  select: 50,
  id: 90,
  description: 320,
  priority: 90,
  status: 130,
  type: 130,
  assigned: 90,
  site: 120,
  due: 130
} as const

const TicketRow: React.FC<{
  ticket: Ticket
  users: UserOpt[]
  sites: SiteOpt[]
  types: IssueTypeOpt[]
  recurringSchedule?: RecurringTicketConfig
  isSelected?: boolean
  onToggleSelect?: () => void
  onQuickView?: () => void
}> = ({ ticket, users, sites, types, recurringSchedule, isSelected = false, onToggleSelect, onQuickView }) => {
  const assignedUser = users.find(u => u.id === ticket.assignedUserId)
  const typeLabel = types.find(t => t.key === ticket.typeKey)?.label ?? ticket.typeKey.replace(/_/g, ' ')
  const isClosed = ticket.status === 'CLOSED'
  
  const priorityColorMap: Record<Ticket['priority'], string> = {
    P1: '#dc2626',
    P2: '#f97316',
    P3: '#2563eb',
    P4: '#14b8a6'
  }

  // RAG color coding for due dates
  const effectiveDueDate = React.useMemo(() => {
    if (recurringSchedule) {
      const due = new Date(recurringSchedule.nextScheduledAt)
      due.setDate(due.getDate() + recurringSchedule.leadTimeDays)
      return due
    }
    return ticket.dueAt ? new Date(ticket.dueAt) : undefined
  }, [recurringSchedule, ticket.dueAt])

  const getDueDateColor = () => {
    if (!effectiveDueDate) return undefined
    const dueDate = effectiveDueDate
    const now = new Date()
    const diffMs = dueDate.getTime() - now.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    
    // Red: due in the past or in the next week (7 days)
    if (diffDays < 7) return '#e74c3c'
    // Amber: due in the next month (30 days)
    if (diffDays < 30) return '#f39c12'
    // Green: due beyond 1 month
    return '#27ae60'
  }
  
  return (
    <tr style={{ 
      backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.08)' : undefined,
      borderBottom: '1px solid #e5e7eb',
      opacity: isClosed ? 0.5 : 1,
      color: isClosed ? '#6b7280' : 'inherit'
    }}>
      {onToggleSelect && (
        <td style={{ padding: '12px 8px' }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            aria-label={`Select ticket ${ticket.id}`}
          />
        </td>
      )}
      <td
        style={{
          fontFamily: 'monospace',
          fontSize: 12,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          padding: '12px 8px'
        }}
      >
        <span
          title={ticket.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            cursor: onQuickView ? 'pointer' : 'default'
          }}
          onClick={onQuickView}
        >
          {ticket.id}
        </span>
      </td>
      <td
        className="text-modern"
        style={{
          wordBreak: 'break-word',
          whiteSpace: 'normal',
          lineHeight: 1.5,
          padding: '12px 8px'
        }}
      >
        <div className="linkish"><Link to={`/tickets/${ticket.id}`}>{ticket.description}</Link></div>
        <div className="status">{ticket.details || ''}</div>
      </td>
      <td style={{ padding: '12px 8px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 999,
            background: isClosed ? '#9ca3af' : priorityColorMap[ticket.priority],
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.3
          }}
          title={`Priority ${ticket.priority}`}
          >
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#fff',
              opacity: 0.9
            }}
          />
          {ticket.priority}
        </span>
      </td>
      <td className="text-modern" style={{ padding: '12px 8px' }}>
        <StatusChip status={ticket.status} />
      </td>
      <td className="text-modern" style={{ padding: '12px 8px' }}>{typeLabel}</td>
      <td style={{ padding: '12px 8px' }}>
        <div
          style={{ display: 'flex', justifyContent: 'center' }}
          aria-label={`Assigned user for ticket ${ticket.id}: ${assignedUser ? (assignedUser.name || assignedUser.email) : 'Unassigned'}`}
          >
          <UserAvatar user={assignedUser} size={24} showMargin={false} />
        </div>
      </td>
      <td className="text-modern" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '12px 8px' }}>
        {sites.find(s => s.id === ticket.siteId)?.name || '—'}
      </td>
      <td style={{ padding: '12px 8px' }}>
        {effectiveDueDate ? (
          <span style={{
            padding: '4px 8px',
            borderRadius: 4,
            background: getDueDateColor(),
            color: '#fff',
            fontWeight: 600,
            fontSize: 12,
            display: 'inline-block'
          }}>
            {effectiveDueDate.toLocaleDateString()}
          </span>
        ) : (
          <span style={{ color: '#999' }}>—</span>
        )}
      </td>
    </tr>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { showNotification } = useNotifications()
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [status, setStatus] = React.useState('')
  const [priority, setPriority] = React.useState('')
  const [type, setType] = React.useState('')
  const [siteId, setSiteId] = React.useState('')
  const [assignedUserId, setAssignedUserId] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [showCreate, setShowCreate] = React.useState(false)
  const [showFilters, setShowFilters] = React.useState(false)
  const [showAdvancedSearch, setShowAdvancedSearch] = React.useState(false)
  const [cursor, setCursor] = React.useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = React.useState(true)
  const [pageSize, setPageSize] = React.useState(50)
  const [sites, setSites] = React.useState<SiteOpt[]>([])
  const [users, setUsers] = React.useState<UserOpt[]>([])
  const [types, setTypes] = React.useState<IssueTypeOpt[]>([])
  const [fieldDefs, setFieldDefs] = React.useState<FieldDefOpt[]>([])
  const [customFieldFilters, setCustomFieldFilters] = React.useState<Record<string, string>>({})
  const [isAdmin, setIsAdmin] = React.useState(false)

  React.useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setIsAdmin(payload.role === 'ADMIN')
      } catch {
        setIsAdmin(false)
      }
    } else {
      setIsAdmin(false)
    }
  }, [])
  const [sortColumn, setSortColumn] = React.useState<string>('')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc')
  const userId = localStorage.getItem('userId') || ''
  const [cfg, setCfg] = React.useState<PriorityCfg>(() => loadCfg(userId || 'default'))
  
  // Phase 1 & 2 Features
  const [selectedTicketIds, setSelectedTicketIds] = React.useState<Set<string>>(new Set())
  const [quickViewTicketId, setQuickViewTicketId] = React.useState<string | null>(null)
  const [showShortcutsHelp, setShowShortcutsHelp] = React.useState(false)
  
  // Load dropdown data
  React.useEffect(() => {
    Promise.all([listSites(), listUsers(), listIssueTypes(), listFieldDefinitions()]).then(([s, u, t, f]) => {
      setSites(s); setUsers(u); setTypes(t); setFieldDefs(f)
    }).catch(e => console.error('Failed to load filters', e))
  }, [])

  React.useEffect(() => {
    const handleOpenCreate = () => setShowCreate(true)
    window.addEventListener('open-create-ticket', handleOpenCreate)
    return () => window.removeEventListener('open-create-ticket', handleOpenCreate)
  }, [])

  // Load filters from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('dashboardFilters')
    if (saved) {
      try {
        const filters = JSON.parse(saved)
        setStatus(filters.status || '')
        setPriority(filters.priority || '')
        setType(filters.type || '')
        setSiteId(filters.siteId || '')
        setAssignedUserId(filters.assignedUserId || '')
        setSearch(filters.search || '')
        setDateFrom(filters.dateFrom || '')
        setDateTo(filters.dateTo || '')
        setPageSize(filters.pageSize || 50)
      } catch {}
    }
  }, [])

  // Save filters to localStorage
  const saveFilters = () => {
    localStorage.setItem('dashboardFilters', JSON.stringify({
      status, priority, type, siteId, assignedUserId, search, pageSize, dateFrom, dateTo
    }))
  }

  const handleExport = (format: 'csv' | 'json') => {
    try {
      if (format === 'csv') {
        exportToCSV(visibleTickets, `tickets-${new Date().toISOString().split('T')[0]}.csv`)
        showNotification('success', 'Exported to CSV')
      } else {
        exportToJSON(visibleTickets, `tickets-${new Date().toISOString().split('T')[0]}.json`)
        showNotification('success', 'Exported to JSON')
      }
    } catch (e: any) {
      showNotification('error', e?.message || 'Export failed')
    }
  }

  const handleAdvancedSearch = (query: string, filters: Record<string, any>) => {
    setSearch(query)
  }

  const fetchList = async (resetCursor = false) => {
    setLoading(true)
    try {
      const params: any = {
        status: status || undefined,
        priority: priority || undefined,
        type: type || undefined,
        siteId: siteId || undefined,
        assignedUserId: assignedUserId || undefined,
        search: search || undefined,
        limit: pageSize,
        cursor: resetCursor ? undefined : cursor
      }
      // Date filters
      if (dateFrom) params.createdFrom = dateFrom
      if (dateTo) params.createdTo = dateTo
      
      // Custom field filters
      // Backend supports one cf_key/cf_val pair at a time
      const cfKeys = Object.keys(customFieldFilters).filter(k => customFieldFilters[k])
      if (cfKeys.length > 0) {
        params.cf_key = cfKeys[0]
        params.cf_val = customFieldFilters[cfKeys[0]]
      }
      
      const data = await listTickets(params)
      if (resetCursor) {
        setTickets(data)
        setCursor(data.length > 0 ? data[data.length - 1].id : undefined)
      } else {
        setTickets(prev => [...prev, ...data])
        setCursor(data.length > 0 ? data[data.length - 1].id : undefined)
      }
      setHasMore(data.length === pageSize)
    } catch (e: any) {
      showNotification('error', e?.message || 'Failed to load tickets')
    } finally { setLoading(false) }
  }

  React.useEffect(() => { 
    setCursor(undefined)
    fetchList(true)
    saveFilters()
  }, [status, priority, type, siteId, assignedUserId, pageSize, customFieldFilters])
  
  React.useEffect(() => { 
    const id = setTimeout(() => {
      setCursor(undefined)
      fetchList(true)
      saveFilters()
    }, 350)
    return () => clearTimeout(id) 
  }, [search])

  // Refresh when navigating back to dashboard
  React.useEffect(() => {
    const handleFocus = () => {
      fetchList(true)
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Refresh on mount
  React.useEffect(() => {
    fetchList(true)
  }, [])

  const clearFilters = () => {
    setStatus('')
    setPriority('')
    setType('')
    setSiteId('')
    setAssignedUserId('')
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setCustomFieldFilters({})
    setCursor(undefined)
    localStorage.removeItem('dashboardFilters')
    showNotification('info', 'Filters cleared')
  }

  const activeFilters = [status, priority, type, siteId, assignedUserId, search, dateFrom, dateTo, ...Object.values(customFieldFilters)].filter(Boolean).length

  const siteMap = React.useMemo(() => Object.fromEntries(sites.map(s => [s.id, s])), [sites])
  const userMap = React.useMemo(() => Object.fromEntries(users.map(u => [u.id, u])), [users])

  const sortedTickets = React.useMemo(() => {
    let sorted: Ticket[]
    if (!sortColumn) {
      sorted = sortTickets(tickets, userId || undefined, cfg)
    } else {
      sorted = [...tickets].sort((a, b) => {
        if (sortColumn === 'siteId') {
          const aName = (siteMap[a.siteId]?.name || '').toLowerCase()
          const bName = (siteMap[b.siteId]?.name || '').toLowerCase()
          if (aName < bName) return sortDirection === 'asc' ? -1 : 1
          if (aName > bName) return sortDirection === 'asc' ? 1 : -1
          return 0
        }
        let aVal: any = (a as any)[sortColumn]
        let bVal: any = (b as any)[sortColumn]
        if (sortColumn === 'createdAt' || sortColumn === 'updatedAt' || sortColumn === 'dueAt') {
          aVal = aVal ? new Date(aVal).getTime() : 0
          bVal = bVal ? new Date(bVal).getTime() : 0
        }
        if (typeof aVal === 'string') aVal = aVal.toLowerCase()
        if (typeof bVal === 'string') bVal = bVal.toLowerCase()
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }
    
    // Separate closed and non-closed tickets, then pin closed to bottom
    const openTickets = sorted.filter(t => t.status !== 'CLOSED')
    const closedTickets = sorted.filter(t => t.status === 'CLOSED')
    return [...openTickets, ...closedTickets]
  }, [tickets, sortColumn, sortDirection, userId, cfg, siteMap])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortColumn !== col) return null
    return <span style={{ marginLeft: 4 }}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
  }

  const saveConfig = () => { saveCfg(userId || 'default', cfg); fetchList(true) }

  // Calculate statistics
  const stats = React.useMemo(() => {
    const byStatus: Record<string, number> = {}
    const byPriority: Record<string, number> = {}
    const byUser: Record<string, number> = {}
    sortedTickets.forEach(t => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1
      const key = t.assignedUserId || 'unassigned'
      byUser[key] = (byUser[key] || 0) + 1
    })
    return { byStatus, byPriority, byUser, total: sortedTickets.length }
  }, [sortedTickets])

const statusPalette: Record<string, string> = React.useMemo(() => ({
  AWAITING_RESPONSE: '#5B8DEF',
  ADE_TO_RESPOND: '#6C5CE7',
  ON_HOLD: '#F39C12',
  CLOSED: '#2ECC71'
}), [])

const priorityPalette: Record<Ticket['priority'], string> = {
  P1: '#E74C3C',
  P2: '#E67E22',
  P3: '#F1C40F',
  P4: '#16A085'
}

const userBreakdown = React.useMemo(() => {
  return Object.entries(stats.byUser)
    .sort(([, aCount], [, bCount]) => bCount - aCount)
    .map(([userId, count]) => ({
      userId,
      count,
      label: userId === 'unassigned'
        ? 'Unassigned'
        : (userMap[userId]?.name || userMap[userId]?.email || userId)
    }))
}, [stats.byUser, userMap])

const hexToRgb = React.useCallback((hex: string) => {
  const stripped = hex.replace('#', '')
  const bigint = parseInt(stripped, 16)
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  }
}, [])

const statsCardStyle = React.useCallback((accent: string): React.CSSProperties => {
  const { r, g, b } = hexToRgb(accent)
  const primary = `rgba(${r}, ${g}, ${b}, 0.9)`
  const secondary = `rgba(${r}, ${g}, ${b}, 0.6)`
  return {
    background: `linear-gradient(135deg, ${primary}, ${secondary})`,
    border: `1px solid rgba(${r}, ${g}, ${b}, 0.85)`,
    borderRadius: 16,
    padding: '24px',
    color: '#ffffff',
    textShadow: '0 1px 3px rgba(0, 0, 0, 0.6)',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.45)',
    minHeight: 180
  }
}, [hexToRgb])

  // Phase 1 & 2 Feature Handlers
  const handleToggleSelect = (ticketId: string) => {
    setSelectedTicketIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId)
      } else {
        newSet.add(ticketId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedTicketIds.size === visibleTickets.length) {
      setSelectedTicketIds(new Set())
    } else {
      setSelectedTicketIds(new Set(visibleTickets.map(t => t.id)))
    }
  }

  const handleBulkUpdate = async (updates: any) => {
    const ids = Array.from(selectedTicketIds)
    if (ids.length === 0) return

    const payload: {
      ids: string[]
      status?: Ticket['status']
      priority?: Ticket['priority']
      assignedUserId?: string | null
    } = { ids }

    if (updates.status) payload.status = updates.status
    if (updates.priority) payload.priority = updates.priority
    if (Object.prototype.hasOwnProperty.call(updates, 'assignedUserId')) {
      payload.assignedUserId = updates.assignedUserId === '' ? null : updates.assignedUserId
    }

    try {
      await bulkUpdateTickets(payload)
      showNotification('success', `Updated ${ids.length} ticket${ids.length === 1 ? '' : 's'}`)
      setSelectedTicketIds(new Set())
      fetchList(true)
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to update tickets'
      if (error && typeof error === 'object') {
        error.message = Array.isArray(message) ? message.join(', ') : message
        throw error
      }
      throw new Error(Array.isArray(message) ? message.join(', ') : message)
    }
  }

  const handleBulkDelete = async (ids: string[]) => {
    if (!ids || ids.length === 0) return
    try {
      await bulkDeleteTickets(ids)
      showNotification('success', `Deleted ${ids.length} ticket${ids.length === 1 ? '' : 's'}`)
      setSelectedTicketIds(new Set())
      fetchList(true)
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to delete tickets'
      throw new Error(Array.isArray(message) ? message.join(', ') : message)
    }
  }

  const handleQuickView = (ticketId: string) => {
    setQuickViewTicketId(ticketId)
  }

  const handleQuickViewNavigate = (direction: 'prev' | 'next') => {
    if (!quickViewTicketId) return
    const currentIndex = visibleTickets.findIndex(t => t.id === quickViewTicketId)
    if (currentIndex === -1) return
    
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1
    if (newIndex >= 0 && newIndex < visibleTickets.length) {
      setQuickViewTicketId(visibleTickets[newIndex].id)
    }
  }

  const handleApplyView = (view: SavedView) => {
    const filters = view.filters
    setStatus(filters.status || '')
    setPriority(filters.priority || '')
    setType(filters.type || '')
    setSiteId(filters.siteId || '')
    
    // Handle special markers
    if (filters.assignedUserId === 'current-user') {
      setAssignedUserId(userId)
    } else if (filters.assignedUserId === 'unassigned') {
      setAssignedUserId('')
    } else {
      setAssignedUserId(filters.assignedUserId || '')
    }
    
    setSearch(filters.search || '')
    setDateFrom(filters.dateFrom || '')
    setDateTo(filters.dateTo || '')
    setCustomFieldFilters(filters.customFieldFilters || {})
    
    if (view.sortColumn) {
      setSortColumn(view.sortColumn)
      setSortDirection(view.sortDirection || 'desc')
    }
    
    showNotification('info', `Applied view: ${view.name}`)
  }

  // Keyboard Shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'c',
      description: 'Create new ticket',
      action: () => setShowCreate(true),
      category: SHORTCUT_CATEGORIES.ACTIONS
    },
    {
      key: '/',
      description: 'Focus search',
      action: () => document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus(),
      category: SHORTCUT_CATEGORIES.NAVIGATION
    },
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      action: () => setShowShortcutsHelp(true),
      category: SHORTCUT_CATEGORIES.GENERAL
    },
    {
      key: 'r',
      description: 'Refresh tickets',
      action: () => fetchList(true),
      category: SHORTCUT_CATEGORIES.ACTIONS
    },
    {
      key: 'Escape',
      description: 'Clear selection / Close dialogs',
      action: () => {
        setSelectedTicketIds(new Set())
        setQuickViewTicketId(null)
      },
      category: SHORTCUT_CATEGORIES.GENERAL
    },
    {
      key: 'a',
      ctrl: true,
      description: 'Select all tickets',
      action: () => handleSelectAll(),
      category: SHORTCUT_CATEGORIES.ACTIONS
    }
  ]

  useKeyboardShortcuts(shortcuts)

  const { data: recurringSchedules = [] } = useRecurringTickets()
  const recurringScheduleMap = React.useMemo(() => {
    const map = new Map<string, RecurringTicketConfig>()
    recurringSchedules.forEach(schedule => {
      if (schedule.originTicketId) {
        map.set(schedule.originTicketId, schedule)
      }
    })
    return map
  }, [recurringSchedules])

  const upcomingRecurringMap = React.useMemo(() => {
    const now = new Date()
    const map = new Map<string, RecurringTicketConfig>()
    recurringScheduleMap.forEach((schedule, ticketId) => {
      if (!schedule.isActive) return
      const triggerDate = new Date(schedule.nextScheduledAt)
      if (triggerDate > now) {
        map.set(ticketId, schedule)
      }
    })
    return map
  }, [recurringScheduleMap])

  const visibleTickets = React.useMemo(
    () => sortedTickets.filter(t => !upcomingRecurringMap.has(t.id)),
    [sortedTickets, upcomingRecurringMap]
  )

  const selectedTickets = visibleTickets.filter(t => selectedTicketIds.has(t.id))
  const quickViewIndex = quickViewTicketId ? visibleTickets.findIndex(t => t.id === quickViewTicketId) : -1

  React.useEffect(() => {
    setSelectedTicketIds(prev => {
      const filtered = new Set(Array.from(prev).filter(id => !upcomingRecurringMap.has(id)))
      return filtered.size === prev.size ? prev : filtered
    })
  }, [upcomingRecurringMap])

  React.useEffect(() => {
    if (quickViewTicketId && upcomingRecurringMap.has(quickViewTicketId)) {
      setQuickViewTicketId(null)
    }
  }, [quickViewTicketId, upcomingRecurringMap])
  const buttonHoverIn = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(-2px)'
    e.currentTarget.style.boxShadow = '0 8px 16px rgba(15, 23, 42, 0.12)'
    e.currentTarget.style.border = '1px solid #94a3b8'
  }, [])

  const buttonHoverOut = React.useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(0)'
    e.currentTarget.style.boxShadow = 'none'
    const originalBorder = e.currentTarget.dataset.border ?? '#d6d9dd'
    e.currentTarget.style.border = originalBorder
  }, [])

  return (
    <div className="container text-modern" style={{ overflowX: 'hidden', maxWidth: '1400px', padding: '32px 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="panel text-modern" style={{ padding: '24px' }}>
        <div
          className="row"
          style={{
            marginBottom: 16,
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              position: 'relative',
              flex: 1,
              minWidth: 220,
              maxWidth: 340
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
                fontSize: 14
              }}
            >
              🔍
            </span>
          <input 
              placeholder="Search tickets..."
            value={search} 
              onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchList(true)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 34px',
                borderRadius: 999,
                border: '1px solid #d7dbe3',
                background: '#ffffff',
                color: '#111827',
                boxShadow: '0 4px 10px rgba(15, 23, 42, 0.06)',
                height: CONTROL_HEIGHT
              }}
            aria-label="Search tickets"
          />
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <StatusFilter value={status} onChange={setStatus} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Rows</span>
              <div style={segmentContainerStyle} role="group" aria-label="Rows per page">
                {[10, 25, 50, 100].map(size => {
                  const isActive = pageSize === size
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPageSize(size)}
                      style={{ ...segmentButtonStyle, ...(isActive ? segmentButtonActiveStyle : {}) }}
                      aria-pressed={isActive}
                    >
                      {size}
          </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/recurring')}
              style={{ ...baseButtonStyle }}
              data-border="1px solid #d6d9dd"
              onMouseEnter={buttonHoverIn}
              onMouseLeave={buttonHoverOut}
            >
              Future Activities
          </button>
            <button
              onClick={() => setShowAdvancedSearch(true)}
              aria-label="Advanced search"
              style={{ ...baseButtonStyle }}
              data-border="1px solid #d6d9dd"
              onMouseEnter={buttonHoverIn}
              onMouseLeave={buttonHoverOut}
            >
              Advanced
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              aria-label="Toggle filters"
              style={{ ...baseButtonStyle }}
              data-border="1px solid #d6d9dd"
              onMouseEnter={buttonHoverIn}
              onMouseLeave={buttonHoverOut}
            >
              Filters {activeFilters > 0 && `(${activeFilters})`}
            </button>
            <button
              onClick={() => handleExport('csv')}
              aria-label="Export to CSV"
              style={{ ...baseButtonStyle }}
              data-border="1px solid #d6d9dd"
              onMouseEnter={buttonHoverIn}
              onMouseLeave={buttonHoverOut}
            >
              CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              aria-label="Export to JSON"
              style={{ ...baseButtonStyle }}
              data-border="1px solid #d6d9dd"
              onMouseEnter={buttonHoverIn}
              onMouseLeave={buttonHoverOut}
            >
              JSON
            </button>
            <button
              onClick={() => fetchList(true)}
              aria-label="Refresh tickets"
              style={{ ...primaryButtonStyle }}
              data-border="1px solid #1d4ed8"
              onMouseEnter={buttonHoverIn}
              onMouseLeave={buttonHoverOut}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Saved Views */}
        <div style={{marginBottom: 12}}>
          <SavedViews
            currentFilters={{
              status, priority, type, siteId, assignedUserId, search,
              dateFrom, dateTo, customFieldFilters
            }}
            onApplyView={handleApplyView}
          />
        </div>

        {showFilters && (
          <div style={{padding: 12, background: '#1a1a1a', borderRadius: 4, marginBottom: 12, border: '1px solid #2a2a2a'}}>
            <div className="row" style={{marginBottom: 8, flexWrap: 'wrap', gap: 8}}>
              <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                <label style={{fontSize: 12}}>Priority</label>
                <select value={priority} onChange={e=>setPriority(e.target.value)} style={{width: 120}} aria-label="Filter by priority">
                  <option value="">All priorities</option>
                {['P1','P2','P3','P4'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                <label style={{fontSize: 12}}>Type</label>
                <select value={type} onChange={e=>setType(e.target.value)} style={{width: 150}} aria-label="Filter by type">
                  <option value="">All types</option>
                  {types.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                <label style={{fontSize: 12}}>Site</label>
                <select value={siteId} onChange={e=>setSiteId(e.target.value)} style={{width: 150}} aria-label="Filter by site">
                  <option value="">All sites</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                <label style={{fontSize: 12}}>Assigned User</label>
                <select value={assignedUserId} onChange={e=>setAssignedUserId(e.target.value)} style={{width: 180}} aria-label="Filter by assigned user">
                  <option value="">All users</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                </select>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                <label style={{fontSize: 12}}>Created From</label>
                <input 
                  type="date" 
                  value={dateFrom} 
                  onChange={e=>setDateFrom(e.target.value)} 
                  style={{width: 150}}
                  aria-label="Filter by created date from"
                />
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                <label style={{fontSize: 12}}>Created To</label>
                <input 
                  type="date" 
                  value={dateTo} 
                  onChange={e=>setDateTo(e.target.value)} 
                  style={{width: 150}}
                  aria-label="Filter by created date to"
                />
              </div>
              {fieldDefs.length > 0 && (
                <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                  <label style={{fontSize: 12}}>Custom Field</label>
                  <select 
                    value={Object.keys(customFieldFilters)[0] || ''} 
                    onChange={e => {
                      const key = e.target.value
                      if (!key) {
                        setCustomFieldFilters({})
                      } else {
                        const field = fieldDefs.find(f => f.key === key)
                        if (field?.enumOptions && field.enumOptions.length > 0) {
                          setCustomFieldFilters({ [key]: field.enumOptions[0] })
                        } else {
                          setCustomFieldFilters({ [key]: '' })
                        }
                      }
                    }}
                    style={{width: 180}}
                    aria-label="Select custom field to filter"
                  >
                    <option value="">No custom field filter</option>
                    {fieldDefs.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
              )}
              {Object.keys(customFieldFilters).length > 0 && (() => {
                const cfKey = Object.keys(customFieldFilters)[0]
                const field = fieldDefs.find(f => f.key === cfKey)
                if (!field) return null
                
                return (
                  <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                    <label style={{fontSize: 12}}>Value</label>
                    {field.datatype === 'enum' && field.enumOptions ? (
                      <select
                        value={customFieldFilters[cfKey] || ''}
                        onChange={e => setCustomFieldFilters({ [cfKey]: e.target.value })}
                        style={{width: 150}}
                        aria-label={`Filter by ${field.label}`}
                      >
                        {field.enumOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.datatype === 'number' ? 'number' : field.datatype === 'date' ? 'date' : 'text'}
                        value={customFieldFilters[cfKey] || ''}
                        onChange={e => setCustomFieldFilters({ [cfKey]: e.target.value })}
                        style={{width: 150}}
                        aria-label={`Filter by ${field.label}`}
                      />
                    )}
                  </div>
                )
              })()}
              <div style={{display: 'flex', alignItems: 'flex-end'}}>
                <button onClick={clearFilters} style={{height: 32}} aria-label="Clear all filters">Clear All</button>
              </div>
            </div>
            {activeFilters > 0 && (
              <div style={{marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                {status && <span className="chip" style={{fontSize: 11}}>Status: {status} <button onClick={() => setStatus('')} style={{marginLeft: 4, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}} aria-label={`Remove status filter ${status}`}>×</button></span>}
                {priority && <span className="chip" style={{fontSize: 11}}>Priority: {priority} <button onClick={() => setPriority('')} style={{marginLeft: 4, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}} aria-label={`Remove priority filter ${priority}`}>×</button></span>}
                {type && <span className="chip" style={{fontSize: 11}}>Type: {type} <button onClick={() => setType('')} style={{marginLeft: 4, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}} aria-label={`Remove type filter ${type}`}>×</button></span>}
                {siteId && <span className="chip" style={{fontSize: 11}}>Site: {sites.find(s => s.id === siteId)?.name} <button onClick={() => setSiteId('')} style={{marginLeft: 4, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}} aria-label={`Remove site filter`}>×</button></span>}
                {assignedUserId && <span className="chip" style={{fontSize: 11}}>Assigned: {users.find(u => u.id === assignedUserId)?.name || users.find(u => u.id === assignedUserId)?.email} <button onClick={() => setAssignedUserId('')} style={{marginLeft: 4, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}} aria-label={`Remove assigned user filter`}>×</button></span>}
                {dateFrom && <span className="chip" style={{fontSize: 11}}>From: {dateFrom} <button onClick={() => setDateFrom('')} style={{marginLeft: 4, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}} aria-label={`Remove date from filter`}>×</button></span>}
                {dateTo && <span className="chip" style={{fontSize: 11}}>To: {dateTo} <button onClick={() => setDateTo('')} style={{marginLeft: 4, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}} aria-label={`Remove date to filter`}>×</button></span>}
                {Object.keys(customFieldFilters).map(cfKey => {
                  const field = fieldDefs.find(f => f.key === cfKey)
                  return customFieldFilters[cfKey] && (
                    <span key={cfKey} className="chip" style={{fontSize: 11}}>
                      {field?.label || cfKey}: {customFieldFilters[cfKey]} 
                      <button 
                        onClick={() => setCustomFieldFilters(prev => {
                          const newFilters = { ...prev }
                          delete newFilters[cfKey]
                          return newFilters
                        })} 
                        style={{marginLeft: 4, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}} 
                        aria-label={`Remove custom field filter ${field?.label || cfKey}`}
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
                {search && <span className="chip" style={{fontSize: 11}}>Search: "{search}" <button onClick={() => setSearch('')} style={{marginLeft: 4, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}} aria-label="Remove search filter">×</button></span>}
              </div>
            )}
          </div>
        )}

        <div style={{marginBottom: 16, fontSize: 13, color: '#64748b', fontWeight: 500}}>
          Showing {visibleTickets.length} ticket{visibleTickets.length !== 1 ? 's' : ''}
        </div>

        <div style={{ overflowX: 'auto', marginLeft: '-24px', marginRight: '-24px', paddingLeft: '24px', paddingRight: '24px' }}>
        <table style={{ tableLayout: 'fixed', width: '100%', borderSpacing: '0 8px' }}>
          <colgroup>
            <col style={{ width: TABLE_COLUMN_WIDTHS.select }} />
            <col style={{ width: TABLE_COLUMN_WIDTHS.id }} />
            <col style={{ width: TABLE_COLUMN_WIDTHS.description }} />
            <col style={{ width: TABLE_COLUMN_WIDTHS.priority }} />
            <col style={{ width: TABLE_COLUMN_WIDTHS.status }} />
            <col style={{ width: TABLE_COLUMN_WIDTHS.type }} />
            <col style={{ width: TABLE_COLUMN_WIDTHS.assigned }} />
            <col style={{ width: TABLE_COLUMN_WIDTHS.site }} />
            <col style={{ width: TABLE_COLUMN_WIDTHS.due }} />
          </colgroup>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={visibleTickets.length > 0 && selectedTicketIds.size === visibleTickets.length}
                  onChange={handleSelectAll}
                  aria-label="Select all tickets"
                />
              </th>
              <th style={{cursor: 'pointer'}} onClick={() => handleSort('id')}>
                Ticket ID <SortIcon col="id" />
              </th>
              <th style={{cursor: 'pointer'}} onClick={() => handleSort('description')}>
                Description <SortIcon col="description" />
              </th>
              <th style={{cursor: 'pointer'}} onClick={() => handleSort('priority')}>
                Priority <SortIcon col="priority" />
              </th>
              <th style={{cursor: 'pointer'}} onClick={() => handleSort('status')}>
                Status <SortIcon col="status" />
              </th>
              <th style={{cursor: 'pointer'}} onClick={() => handleSort('typeKey')}>
                Type <SortIcon col="typeKey" />
              </th>
              <th style={{cursor: 'pointer'}} onClick={() => handleSort('assignedUserId')}>
                Assigned <SortIcon col="assignedUserId" />
              </th>
              <th style={{cursor: 'pointer'}} onClick={() => handleSort('siteId')}>
                Site <SortIcon col="siteId" />
              </th>
              <th style={{cursor: 'pointer'}} onClick={() => handleSort('dueAt')}>
                Due Date <SortIcon col="dueAt" />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && visibleTickets.length === 0 ? <tr><td colSpan={9}>Loading…</td></tr>
            : visibleTickets.length === 0 ? (
              <tr><td colSpan={9}>
                <EmptyState
                  icon="filter"
                  title="No tickets found"
                  description={activeFilters > 0 ? "No tickets match your current filters." : "No tickets have been created yet."}
                  action={activeFilters > 0 ? {
                    label: "Clear Filters",
                    onClick: clearFilters
                  } : {
                    label: "Create First Ticket",
                    onClick: () => setShowCreate(true)
                  }}
                  suggestions={activeFilters > 0 ? [
                    "Try adjusting your filter criteria",
                    "Clear some filters to see more results",
                    "Check if the date range is too narrow"
                  ] : undefined}
                />
              </td></tr>
            )
            : visibleTickets.map(t => (
                <TicketRow 
                  key={t.id} 
                  ticket={t} 
                  users={users}
                  sites={sites}
                  types={types}
                  recurringSchedule={recurringScheduleMap.get(t.id)}
                  isSelected={selectedTicketIds.has(t.id)}
                  onToggleSelect={() => handleToggleSelect(t.id)}
                  onQuickView={() => handleQuickView(t.id)}
                />
              ))}
          </tbody>
        </table>
        </div>

        {hasMore && sortedTickets.length > 0 && (
          <div style={{marginTop: 20, textAlign: 'center'}}>
            <button 
              onClick={() => fetchList(false)} 
              disabled={loading}
              style={{minWidth: 140, padding: '10px 20px'}}
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      <div className="panel text-modern" style={{ padding: '24px' }}>
        <div className="panel text-modern" style={{ padding: '24px' }}>
        <div className="h1" style={{ marginBottom: 20, fontSize: '24px' }}>Statistics</div>
        <div
          style={{
            display: 'grid',
            gap: 20,
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
          }}
        >
          <div style={statsCardStyle('#5B8DEF')}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, letterSpacing: 0.3 }}>
              Status Breakdown
            </div>
            {Object.entries(stats.byStatus).length === 0 && (
              <div style={{ fontSize: 12, fontWeight: 600 }}>No tickets yet.</div>
            )}
            {Object.entries(stats.byStatus).map(([statusKey, count]) => {
              const percent = stats.total ? Math.round((count / stats.total) * 100) : 0
              const label = STATUS_LABELS[statusKey as keyof typeof STATUS_LABELS] || statusKey
              const barColor = statusPalette[statusKey] || 'rgba(255,255,255,0.4)'
              return (
                <div key={statusKey} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                    <span>{label}</span>
                    <span>{count} · {percent}%</span>
        </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 6 }}>
                    <div
                      style={{
                        width: `${Math.max(percent, 5)}%`,
                        maxWidth: '100%',
                        background: barColor,
                        height: '100%',
                        borderRadius: 6,
                        transition: 'width 0.3s ease'
                      }}
                    />
            </div>
        </div>
              )
            })}
          </div>

          <div style={statsCardStyle('#6C5CE7')}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, letterSpacing: 0.3 }}>
              Priority Snapshot
            </div>
            {Object.entries(stats.byPriority).length === 0 && (
              <div style={{ fontSize: 12, fontWeight: 600 }}>No tickets yet.</div>
            )}
            {Object.entries(stats.byPriority)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([priorityKey, count]) => {
                const percent = stats.total ? Math.round((count / stats.total) * 100) : 0
                const barColor = priorityPalette[priorityKey as Ticket['priority']] || 'rgba(255,255,255,0.35)'
                return (
                  <div key={priorityKey} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                      <span>Priority {priorityKey}</span>
                      <span>{count} · {percent}%</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 6 }}>
                      <div
                        style={{
                          width: `${Math.max(percent, 5)}%`,
                          maxWidth: '100%',
                          background: barColor,
                          height: '100%',
                          borderRadius: 6,
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>

          <div style={statsCardStyle('#16A085')}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, letterSpacing: 0.3 }}>
              Tickets by Assignee
            </div>
            {userBreakdown.length === 0 && (
              <div style={{ fontSize: 12, fontWeight: 600 }}>No assignments yet.</div>
            )}
            {userBreakdown.slice(0, 6).map((entry, index) => {
              const percent = stats.total ? Math.round((entry.count / stats.total) * 100) : 0
              const accent = ['#1ABC9C', '#48C9B0', '#76D7C4', '#A3E4D7', '#D0ECE7', '#E8F8F5'][index] || 'rgba(255,255,255,0.35)'
              return (
                <div key={entry.userId} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4, fontWeight: 600 }}>
                    <span>{entry.label}</span>
                    <span>{entry.count} · {percent}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 6 }}>
                    <div
                      style={{
                        width: `${Math.max(percent, 5)}%`,
                        maxWidth: '100%',
                        background: accent,
                        height: '100%',
                        borderRadius: 6,
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              )
            })}
            {userBreakdown.length > 6 && (
              <div style={{ fontSize: 11.5, marginTop: 6, fontWeight: 600 }}>
                Showing top 6 assignees of {userBreakdown.length}
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: 14, color: '#475569', marginTop: 20, fontWeight: 600 }}>
          Total: {stats.total} ticket{stats.total === 1 ? '' : 's'}
        </div>
        </div>
        </div>
        {/* My prioritisation section disabled per user request */}
        {/* <div className="panel">
        <div className="h1" style={{marginBottom:8}}>My prioritisation</div>
        <div className="muted" style={{marginBottom:12}}>Configure how your dashboard orders tickets. This only affects your view.</div>
        <div className="row" style={{marginBottom:8}}>
          <label style={{width:140}}>Boost if assigned</label>
          <input type="number" value={cfg.boostAssignedToMe} onChange={e=>setCfg({...cfg, boostAssignedToMe:Number(e.target.value)})} />
        </div>
        <div style={{marginBottom:8}}>
          <div className="muted">Priority weights</div>
          {(['P1','P2','P3','P4'] as const).map(p => (
            <div key={p} className="row" style={{marginTop:6}}>
              <label style={{width:60}}>{p}</label>
              <input type="number" value={cfg.weightPriority[p]} onChange={e=>setCfg({...cfg, weightPriority: {...cfg.weightPriority, [p]: Number(e.target.value)}})} />
            </div>
          ))}
        </div>
        <div style={{marginBottom:8}}>
          <div className="muted">Status weights</div>
          {STATUS_OPTIONS.map(s => (
            <div key={s.value} className="row" style={{marginTop:6}}>
              <label style={{width:120}}>{s.label}</label>
              <input type="number" value={(cfg.weightStatus as any)[s.value]||0} onChange={e=>setCfg({...cfg, weightStatus: {...cfg.weightStatus, [s.value]: Number(e.target.value)}})} />
            </div>
          ))}
        </div>
        <div style={{marginBottom:8}}>
          <div className="muted">Type boosts (comma-separated: TYPE=WEIGHT)</div>
          <input placeholder="FAULT=10, SECURITY=6" onBlur={e=>{
            const map: Record<string, number> = {}
            e.target.value.split(',').map(s=>s.trim()).filter(Boolean).forEach(pair => {
              const [k,v] = pair.split('=').map(x=>x.trim())
              if (k && v) map[k]=Number(v)
            })
            setCfg({...cfg, typeBoosts: map})
          }} />
        </div>
        <div className="row">
          <button className="primary" onClick={saveConfig}>Save</button>
        </div>
      </div> */}
      </div>

      {showCreate && (
        <CreateTicket
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false)
            fetchList(true)
          }}
        />
      )}
      {showAdvancedSearch && (
        <AdvancedSearch
          isOpen={showAdvancedSearch}
          onClose={() => setShowAdvancedSearch(false)}
          onSearch={handleAdvancedSearch}
          initialQuery={search}
        />
      )}

      {/* Phase 1 & 2 Features */}
      <BulkOperations
        selectedTickets={selectedTickets}
        onClearSelection={() => setSelectedTicketIds(new Set())}
        onBulkUpdate={handleBulkUpdate}
        users={users}
        canDelete={isAdmin}
        onBulkDelete={handleBulkDelete}
      />

      <TicketQuickView
        ticketId={quickViewTicketId}
        open={!!quickViewTicketId}
        onClose={() => setQuickViewTicketId(null)}
        onNavigate={handleQuickViewNavigate}
        canNavigate={{
          prev: quickViewIndex > 0,
          next: quickViewIndex < sortedTickets.length - 1
        }}
        users={users}
        sites={sites}
        types={types}
      />

      <KeyboardShortcutsHelp
        open={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
        shortcuts={shortcuts}
      />
    </div>
  )
}
