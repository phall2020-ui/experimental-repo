import React from 'react'
import { listTickets, type Ticket } from '../lib/api'
import { sortTickets, loadCfg, saveCfg, type PriorityCfg } from '../lib/prioritise'
import { Link, useNavigate } from 'react-router-dom'
import CreateTicket from '../components/CreateTicket'
import AdvancedSearch from '../components/AdvancedSearch'
import { listSites, listUsers, listIssueTypes, listFieldDefinitions, type SiteOpt, type UserOpt, type IssueTypeOpt, type FieldDefOpt } from '../lib/directory'
import { useNotifications } from '../lib/notifications'
import { exportToCSV, exportToJSON } from '../lib/export'

const StatusFilter: React.FC<{value:string,onChange:(v:string)=>void}> = ({value,onChange}) => (
  <select value={value} onChange={e=>onChange(e.target.value)}>
    <option value="">All statuses</option>
    {['NEW','TRIAGE','IN_PROGRESS','PENDING','RESOLVED','CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
  </select>
)

// User avatar component
const UserAvatar: React.FC<{ user?: UserOpt; size?: number }> = ({ user, size = 24 }) => {
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
        marginRight: 6
      }}
      title={user.name || user.email}
    >
      {initials}
    </div>
  )
}

const TicketRow: React.FC<{
  ticket: Ticket
  users: UserOpt[]
  onUpdate: () => void
}> = ({ ticket, users, onUpdate }) => {
  const [quickSaving, setQuickSaving] = React.useState(false)
  const { showNotification } = useNotifications()
  const assignedUser = users.find(u => u.id === ticket.assignedUserId)
  
  const quickUpdate = async (field: string, value: any) => {
    setQuickSaving(true)
    try {
      const { updateTicket } = await import('../lib/api')
      await updateTicket(ticket.id, { [field]: value })
      showNotification('success', 'Ticket updated')
      onUpdate()
    } catch (e: any) {
      showNotification('error', e?.message || 'Failed to update ticket')
    } finally {
      setQuickSaving(false)
    }
  }

  const isOverdue = ticket.dueAt && new Date(ticket.dueAt) < new Date()
  const isDueSoon = ticket.dueAt && !isOverdue && (new Date(ticket.dueAt).getTime() - Date.now()) < 24 * 60 * 60 * 1000
  
  return (
    <tr>
      <td>
        <select 
          value={ticket.priority} 
          onChange={e => quickUpdate('priority', e.target.value)}
          style={{fontSize: 11, padding: 2}}
          disabled={quickSaving}
          aria-label={`Priority for ticket ${ticket.id}`}
        >
          {['P1','P2','P3','P4'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </td>
      <td>
        <div className="linkish"><Link to={`/tickets/${ticket.id}`}>{ticket.description}</Link></div>
        <div className="status">{ticket.details || ''}</div>
        {ticket.dueAt && (
          <div style={{ marginTop: 4, fontSize: 11 }}>
            <span style={{
              padding: '2px 6px',
              borderRadius: 4,
              background: isOverdue ? '#e74c3c' : isDueSoon ? '#f1c40f' : '#2ecc71',
              color: '#000',
              fontWeight: 600
            }}>
              Due: {new Date(ticket.dueAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </td>
      <td>
        <select 
          value={ticket.status} 
          onChange={e => quickUpdate('status', e.target.value)}
          style={{fontSize: 11, padding: 2}}
          disabled={quickSaving}
          aria-label={`Status for ticket ${ticket.id}`}
        >
          {['NEW','TRIAGE','IN_PROGRESS','PENDING','RESOLVED','CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td>{ticket.typeKey}</td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <UserAvatar user={assignedUser} size={20} />
        <select 
          value={ticket.assignedUserId || ''} 
          onChange={e => quickUpdate('assignedUserId', e.target.value || null)}
            style={{fontSize: 11, padding: 2, minWidth: 120, flex: 1}}
          disabled={quickSaving}
            aria-label={`Assigned user for ticket ${ticket.id}`}
        >
          <option value="">Unassigned</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
        </select>
        </div>
      </td>
      <td>{new Date(ticket.createdAt).toLocaleString()}</td>
      <td><Link to={`/tickets/${ticket.id}`} aria-label={`Open ticket ${ticket.id}`}>Open →</Link></td>
    </tr>
  )
}

export default function Dashboard() {
  const nav = useNavigate()
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
  const [sortColumn, setSortColumn] = React.useState<string>('')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc')
  const userId = localStorage.getItem('userId') || ''
  const [cfg, setCfg] = React.useState<PriorityCfg>(() => loadCfg(userId || 'default'))
  
  // Load dropdown data
  React.useEffect(() => {
    Promise.all([listSites(), listUsers(), listIssueTypes(), listFieldDefinitions()]).then(([s, u, t, f]) => {
      setSites(s); setUsers(u); setTypes(t); setFieldDefs(f)
    }).catch(e => console.error('Failed to load filters', e))
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
        exportToCSV(sortedTickets, `tickets-${new Date().toISOString().split('T')[0]}.csv`)
        showNotification('success', 'Exported to CSV')
      } else {
        exportToJSON(sortedTickets, `tickets-${new Date().toISOString().split('T')[0]}.json`)
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

  const sortedTickets = React.useMemo(() => {
    if (!sortColumn) return sortTickets(tickets, userId || undefined, cfg)
    const sorted = [...tickets].sort((a, b) => {
      let aVal: any = (a as any)[sortColumn]
      let bVal: any = (b as any)[sortColumn]
      if (sortColumn === 'createdAt' || sortColumn === 'updatedAt') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [tickets, sortColumn, sortDirection, userId, cfg])

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
    sortedTickets.forEach(t => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1
    })
    return { byStatus, byPriority, total: sortedTickets.length }
  }, [sortedTickets])

  return (
    <div className="grid">
      <div className="panel">
        <div className="row" style={{marginBottom:12, flexWrap: 'wrap', gap: 8}}>
          <input 
            placeholder="Search description/details/type..." 
            value={search} 
            onChange={e=>setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchList(true)}
            style={{flex: 1, minWidth: 200}}
            aria-label="Search tickets"
          />
          <StatusFilter value={status} onChange={setStatus} />
          <button onClick={() => setShowAdvancedSearch(true)} aria-label="Advanced search">
            🔍 Advanced
          </button>
          <button onClick={() => setShowFilters(!showFilters)} aria-label="Toggle filters">
            {showFilters ? '▼' : '▶'} Filters {activeFilters > 0 && `(${activeFilters})`}
          </button>
          <div className="spacer" />
          <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} style={{width: 80}} aria-label="Page size">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button onClick={() => handleExport('csv')} aria-label="Export to CSV">📥 CSV</button>
          <button onClick={() => handleExport('json')} aria-label="Export to JSON">📥 JSON</button>
          <button className="primary" onClick={() => setShowCreate(true)}>+ Create Ticket</button>
          <button onClick={() => fetchList(true)} aria-label="Refresh tickets">Refresh</button>
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

        <div style={{marginBottom: 8, fontSize: 12, color: '#999'}}>
          Showing {sortedTickets.length} ticket{sortedTickets.length !== 1 ? 's' : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style={{cursor: 'pointer'}} onClick={() => handleSort('priority')}>
                Priority <SortIcon col="priority" />
              </th>
              <th style={{cursor: 'pointer'}} onClick={() => handleSort('description')}>
                Description <SortIcon col="description" />
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
              <th style={{cursor: 'pointer'}} onClick={() => handleSort('createdAt')}>
                Created <SortIcon col="createdAt" />
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && sortedTickets.length === 0 ? <tr><td colSpan={7}>Loading…</td></tr>
            : sortedTickets.length === 0 ? <tr><td colSpan={7}>No tickets found.</td></tr>
            : sortedTickets.map(t => (
                <TicketRow key={t.id} ticket={t} users={users} onUpdate={() => fetchList(true)} />
              ))}
          </tbody>
        </table>

        {hasMore && sortedTickets.length > 0 && (
          <div style={{marginTop: 12, textAlign: 'center'}}>
            <button 
              onClick={() => fetchList(false)} 
              disabled={loading}
              style={{minWidth: 120}}
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="h1" style={{marginBottom:8}}>Statistics</div>
        <div style={{marginBottom: 16}}>
          <div style={{fontSize: 14, marginBottom: 8}}>By Status:</div>
          {Object.entries(stats.byStatus).map(([s, count]) => (
            <div key={s} className="row" style={{marginBottom: 4, fontSize: 12}}>
              <span style={{width: 120}}>{s}:</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
        <div style={{marginBottom: 16}}>
          <div style={{fontSize: 14, marginBottom: 8}}>By Priority:</div>
          {Object.entries(stats.byPriority).map(([p, count]) => (
            <div key={p} className="row" style={{marginBottom: 4, fontSize: 12}}>
              <span style={{width: 60}}>{p}:</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
        <div style={{fontSize: 12, color: '#999', marginTop: 16}}>
          Total: {stats.total} tickets
        </div>
      </div>
      <div className="panel">
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
          {['NEW','TRIAGE','IN_PROGRESS','PENDING','RESOLVED','CLOSED'].map(s => (
            <div key={s} className="row" style={{marginTop:6}}>
              <label style={{width:120}}>{s}</label>
              <input type="number" value={(cfg.weightStatus as any)[s]||0} onChange={e=>setCfg({...cfg, weightStatus: {...cfg.weightStatus, [s]: Number(e.target.value)}})} />
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
    </div>
  )
}
