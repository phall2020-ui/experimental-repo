import React from 'react'
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Stack,
  Chip,
  Typography,
  Card,
  CardContent,
  Grid,
  TableSortLabel,
  Tooltip,
  Dialog,
} from '@mui/material'
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material'
import { Link } from 'react-router-dom'
import { useTickets, useUpdateTicket } from '../lib/hooks'
import { sortTickets, loadCfg, saveCfg, type PriorityCfg } from '../lib/prioritise'
import CreateTicket from '../components/CreateTicket'
import AdvancedSearch from '../components/AdvancedSearch'
import { listSites, listUsers, listIssueTypes, listFieldDefinitions, type SiteOpt, type UserOpt, type IssueTypeOpt, type FieldDefOpt } from '../lib/directory'
import { useNotifications } from '../lib/notifications'
import { exportToCSV, exportToJSON } from '../lib/export'
import { UserAvatar, EmptyState, Skeleton } from '../components/ui'
import type { Ticket } from '../lib/api'

const TicketRow: React.FC<{
  ticket: Ticket
  users: UserOpt[]
}> = ({ ticket, users }) => {
  const { showNotification } = useNotifications()
  const updateTicket = useUpdateTicket()
  const assignedUser = users.find(u => u.id === ticket.assignedUserId)
  
  const quickUpdate = async (field: string, value: any) => {
    try {
      await updateTicket.mutateAsync({ id: ticket.id, patch: { [field]: value } })
      showNotification('success', 'Ticket updated')
    } catch (e: any) {
      showNotification('error', e?.message || 'Failed to update ticket')
    }
  }

  const isOverdue = ticket.dueAt && new Date(ticket.dueAt) < new Date()
  const isDueSoon = ticket.dueAt && !isOverdue && (new Date(ticket.dueAt).getTime() - Date.now()) < 24 * 60 * 60 * 1000
  
  return (
    <TableRow hover>
      <TableCell>
        <Select
          value={ticket.priority}
          onChange={(e) => quickUpdate('priority', e.target.value)}
          size="small"
          disabled={updateTicket.isPending}
          aria-label={`Priority for ticket ${ticket.id}`}
        >
          {(['P1','P2','P3','P4'] as const).map(p => (
            <MenuItem key={p} value={p}>{p}</MenuItem>
          ))}
        </Select>
      </TableCell>
      <TableCell>
        <Link to={`/tickets/${ticket.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', mb: 0.5 }}>
            {ticket.description}
          </Typography>
        </Link>
        {ticket.details && (
          <Typography variant="caption" color="text.secondary">
            {ticket.details}
          </Typography>
        )}
        {ticket.dueAt && (
          <Box sx={{ mt: 0.5 }}>
            <Chip
              label={`Due: ${new Date(ticket.dueAt).toLocaleDateString()}`}
              size="small"
              color={isOverdue ? 'error' : isDueSoon ? 'warning' : 'success'}
              sx={{ fontSize: '0.65rem' }}
            />
          </Box>
        )}
      </TableCell>
      <TableCell>
        <Select
          value={ticket.status}
          onChange={(e) => quickUpdate('status', e.target.value)}
          size="small"
          disabled={updateTicket.isPending}
          aria-label={`Status for ticket ${ticket.id}`}
        >
          {['NEW','TRIAGE','IN_PROGRESS','PENDING','RESOLVED','CLOSED'].map(s => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Select>
      </TableCell>
      <TableCell>
        <Chip label={ticket.typeKey} size="small" variant="outlined" />
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          <UserAvatar name={assignedUser?.name} email={assignedUser?.email} size={24} />
          <Select
            value={ticket.assignedUserId || ''}
            onChange={(e) => quickUpdate('assignedUserId', e.target.value || null)}
            size="small"
            disabled={updateTicket.isPending}
            aria-label={`Assigned user for ticket ${ticket.id}`}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">Unassigned</MenuItem>
            {users.map(u => (
              <MenuItem key={u.id} value={u.id}>{u.name || u.email}</MenuItem>
            ))}
          </Select>
        </Stack>
      </TableCell>
      <TableCell>
        <Typography variant="caption">
          {new Date(ticket.createdAt).toLocaleString()}
        </Typography>
      </TableCell>
      <TableCell>
        <Button
          component={Link}
          to={`/tickets/${ticket.id}`}
          size="small"
          aria-label={`Open ticket ${ticket.id}`}
        >
          Open
        </Button>
      </TableCell>
    </TableRow>
  )
}

export default function Dashboard() {
  const { showNotification } = useNotifications()
  const [status, setStatus] = React.useState('')
  const [priority, setPriority] = React.useState('')
  const [type, setType] = React.useState('')
  const [siteId, setSiteId] = React.useState('')
  const [assignedUserId, setAssignedUserId] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [customFieldKey, setCustomFieldKey] = React.useState('')
  const [customFieldValue, setCustomFieldValue] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [showCreate, setShowCreate] = React.useState(false)
  const [showFilters, setShowFilters] = React.useState(false)
  const [showAdvancedSearch, setShowAdvancedSearch] = React.useState(false)
  const [pageSize, setPageSize] = React.useState(50)
  const [sites, setSites] = React.useState<SiteOpt[]>([])
  const [users, setUsers] = React.useState<UserOpt[]>([])
  const [types, setTypes] = React.useState<IssueTypeOpt[]>([])
  const [fieldDefs, setFieldDefs] = React.useState<FieldDefOpt[]>([])
  const [sortColumn, setSortColumn] = React.useState<string>('')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc')
  const userId = localStorage.getItem('userId') || ''
  const [cfg, setCfg] = React.useState<PriorityCfg>(() => loadCfg(userId || 'default'))
  
  const params = React.useMemo(() => ({
    status: status || undefined,
    priority: priority || undefined,
    type: type || undefined,
    siteId: siteId || undefined,
    assignedUserId: assignedUserId || undefined,
    search: search || undefined,
    limit: pageSize,
  }), [status, priority, type, siteId, assignedUserId, search, pageSize])

  const { data: tickets = [], isLoading, refetch } = useTickets(params)
  
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
        setCustomFieldKey(filters.customFieldKey || '')
        setCustomFieldValue(filters.customFieldValue || '')
        setPageSize(filters.pageSize || 50)
      } catch {}
    }
  }, [])

  // Save filters to localStorage
  React.useEffect(() => {
    localStorage.setItem('dashboardFilters', JSON.stringify({
      status, priority, type, siteId, assignedUserId, search, pageSize, dateFrom, dateTo, customFieldKey, customFieldValue
    }))
  }, [status, priority, type, siteId, assignedUserId, search, pageSize, dateFrom, dateTo])

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

  const handleAdvancedSearch = (query: string) => {
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
      // Date filters are now supported by backend
      if (dateFrom) params.createdFrom = dateFrom
      if (dateTo) params.createdTo = dateTo
      // Custom field filtering
      if (customFieldKey && customFieldValue) {
        params.cf_key = customFieldKey
        params.cf_val = customFieldValue
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
  }, [status, priority, type, siteId, assignedUserId, pageSize, customFieldKey, customFieldValue])
  
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
    setCustomFieldKey('')
    setCustomFieldValue('')
    setCursor(undefined)
    localStorage.removeItem('dashboardFilters')
    showNotification('info', 'Filters cleared')
  }

  const activeFilters = [status, priority, type, siteId, assignedUserId, search, dateFrom, dateTo, customFieldKey && customFieldValue ? 'customField' : ''].filter(Boolean).length

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

  const saveConfig = () => { 
    saveCfg(userId || 'default', cfg)
    refetch()
  }

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
    <Grid container spacing={3}>
      <Grid item xs={12} lg={9}>
        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              <TextField
                placeholder="Search description/details/type..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                size="small"
                sx={{ flex: 1, minWidth: 200 }}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                inputProps={{ 'aria-label': 'Search tickets' }}
              />
              
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select value={status} onChange={e => setStatus(e.target.value)} label="Status">
                  <MenuItem value="">All statuses</MenuItem>
                  {['NEW','TRIAGE','IN_PROGRESS','PENDING','RESOLVED','CLOSED'].map(s => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Tooltip title="Advanced search">
                <IconButton onClick={() => setShowAdvancedSearch(true)} aria-label="Advanced search">
                  <SearchIcon />
                </IconButton>
              </Tooltip>
              
              <Button
                variant={showFilters ? 'contained' : 'outlined'}
                startIcon={showFilters ? <ExpandLessIcon /> : <FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
                aria-label="Toggle filters"
              >
                Filters {activeFilters > 0 && `(${activeFilters})`}
              </Button>
              
              <Box sx={{ flexGrow: 1 }} />
              
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <Select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} aria-label="Page size">
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>
              
              <Tooltip title="Export to CSV">
                <IconButton onClick={() => handleExport('csv')} aria-label="Export to CSV">
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreate(true)}>
                Create Ticket
              </Button>
              
              <Tooltip title="Refresh">
                <IconButton onClick={() => refetch()} aria-label="Refresh tickets">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>

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
                <>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                    <label style={{fontSize: 12}}>Custom Field</label>
                    <select 
                      value={customFieldKey} 
                      onChange={e => {
                        setCustomFieldKey(e.target.value)
                        setCustomFieldValue('')
                      }} 
                      style={{width: 150}} 
                      aria-label="Select custom field"
                    >
                      <option value="">No custom field filter</option>
                      {fieldDefs.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                  </div>
                  {customFieldKey && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
                      <label style={{fontSize: 12}}>
                        {fieldDefs.find(f => f.key === customFieldKey)?.label || 'Value'}
                      </label>
                      {(() => {
                        const field = fieldDefs.find(f => f.key === customFieldKey)
                        if (field?.datatype === 'enum' && field.enumOptions) {
                          return (
                            <select 
                              value={customFieldValue} 
                              onChange={e => setCustomFieldValue(e.target.value)}
                              style={{width: 150}}
                              aria-label="Custom field value"
                            >
                              <option value="">Select value...</option>
                              {field.enumOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          )
                        } else if (field?.datatype === 'boolean') {
                          return (
                            <select 
                              value={customFieldValue} 
                              onChange={e => setCustomFieldValue(e.target.value)}
                              style={{width: 150}}
                              aria-label="Custom field value"
                            >
                              <option value="">Select value...</option>
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          )
                        } else {
                          return (
                            <input 
                              type={field?.datatype === 'number' ? 'number' : field?.datatype === 'date' ? 'date' : 'text'}
                              value={customFieldValue}
                              onChange={e => setCustomFieldValue(e.target.value)}
                              style={{width: 150}}
                              placeholder="Enter value..."
                              aria-label="Custom field value"
                            />
                          )
                        }
                      })()}
                    </div>
                  )}
                </>
              )}
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
                {customFieldKey && customFieldValue && <span className="chip" style={{fontSize: 11}}>{fieldDefs.find(f => f.key === customFieldKey)?.label || customFieldKey}: {customFieldValue} <button onClick={() => { setCustomFieldKey(''); setCustomFieldValue('') }} style={{marginLeft: 4, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}} aria-label="Remove custom field filter">×</button></span>}
                {search && <span className="chip" style={{fontSize: 11}}>Search: "{search}" <button onClick={() => setSearch('')} style={{marginLeft: 4, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}} aria-label="Remove search filter">×</button></span>}
              </div>
            )}
          </div>
        )}

            <Typography variant="body2" color="text.secondary">
              Showing {sortedTickets.length} ticket{sortedTickets.length !== 1 ? 's' : ''}
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={sortColumn === 'priority'}
                        direction={sortColumn === 'priority' ? sortDirection : 'desc'}
                        onClick={() => handleSort('priority')}
                      >
                        Priority
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortColumn === 'description'}
                        direction={sortColumn === 'description' ? sortDirection : 'desc'}
                        onClick={() => handleSort('description')}
                      >
                        Description
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortColumn === 'status'}
                        direction={sortColumn === 'status' ? sortDirection : 'desc'}
                        onClick={() => handleSort('status')}
                      >
                        Status
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Assigned</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortColumn === 'createdAt'}
                        direction={sortColumn === 'createdAt' ? sortDirection : 'desc'}
                        onClick={() => handleSort('createdAt')}
                      >
                        Created
                      </TableSortLabel>
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Skeleton variant="table" rows={5} />
                      </TableCell>
                    </TableRow>
                  ) : sortedTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <EmptyState
                          icon="search"
                          title="No tickets found"
                          description="Try adjusting your filters or create a new ticket"
                          action={{
                            label: 'Create Ticket',
                            onClick: () => setShowCreate(true)
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedTickets.map(t => (
                      <TicketRow key={t.id} ticket={t} users={users} />
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </Paper>
      </Grid>

      <Grid item xs={12} lg={3}>
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Statistics</Typography>
              
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>By Status</Typography>
              <Stack spacing={0.5}>
                {Object.entries(stats.byStatus).map(([s, count]) => (
                  <Box key={s} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{s}:</Typography>
                    <Typography variant="body2" fontWeight={600}>{count}</Typography>
                  </Box>
                ))}
              </Stack>
              
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>By Priority</Typography>
              <Stack spacing={0.5}>
                {Object.entries(stats.byPriority).map(([p, count]) => (
                  <Box key={p} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{p}:</Typography>
                    <Typography variant="body2" fontWeight={600}>{count}</Typography>
                  </Box>
                ))}
              </Stack>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Total: {stats.total} tickets
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>My Prioritisation</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Configure how your dashboard orders tickets
              </Typography>
              
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Boost if assigned"
                  value={cfg.boostAssignedToMe}
                  onChange={e => setCfg({...cfg, boostAssignedToMe: Number(e.target.value)})}
                />
                
                <Typography variant="caption" color="text.secondary">Priority weights</Typography>
                {(['P1','P2','P3','P4'] as const).map(p => (
                  <TextField
                    key={p}
                    fullWidth
                    size="small"
                    type="number"
                    label={p}
                    value={cfg.weightPriority[p]}
                    onChange={e => setCfg({...cfg, weightPriority: {...cfg.weightPriority, [p]: Number(e.target.value)}})}
                  />
                ))}
                
                <Button variant="contained" onClick={saveConfig} fullWidth>
                  Save Configuration
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} maxWidth="md" fullWidth>
        <CreateTicket
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false)
            refetch()
          }}
        />
      </Dialog>
      
      {showAdvancedSearch && (
        <AdvancedSearch
          isOpen={showAdvancedSearch}
          onClose={() => setShowAdvancedSearch(false)}
          onSearch={handleAdvancedSearch}
          initialQuery={search}
        />
      )}
    </Grid>
  )
}
