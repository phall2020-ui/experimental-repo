import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTicket, updateTicket, listTicketHistory, createRecurringTicket, updateRecurringTicket, type TicketHistoryEntry, type RecurringTicketConfig, type Ticket } from '../lib/api'
import { listSites, listUsers, listIssueTypes, listFieldDefinitions, type SiteOpt, type UserOpt, type IssueTypeOpt, type FieldDefOpt } from '../lib/directory'
import Comments from '../components/Comments'
import CustomFieldsForm from '../components/CustomFieldsForm'
import { useNotifications } from '../lib/notifications'
import { STATUS_OPTIONS } from '../lib/statuses'
import { useRecurringByOrigin } from '../hooks/useTickets'
import { filterFieldDefs, sanitizeCustomFieldValues } from '../lib/customFields'

type FrequencyValue = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

const FREQUENCY_OPTIONS: { value: FrequencyValue; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
]

// User avatar component
const UserAvatar: React.FC<{ user?: UserOpt; size?: number }> = ({ user, size = 32 }) => {
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
        marginRight: 8
      }}
      title={user.name || user.email}
    >
      {initials}
    </div>
  )
}
export default function TicketView() {
  const { id } = useParams()
  const nav = useNavigate()
  const [t, setT] = React.useState<any>(null)
  const [err, setErr] = React.useState<string | null>(null)
  const [sites, setSites] = React.useState<SiteOpt[]>([])
  const [users, setUsers] = React.useState<UserOpt[]>([])
  const [types, setTypes] = React.useState<IssueTypeOpt[]>([])
  const [fieldDefs, setFieldDefs] = React.useState<FieldDefOpt[]>([])
  const [history, setHistory] = React.useState<TicketHistoryEntry[]>([])
  const { showNotification } = useNotifications()
  const { data: recurringConfig, refetch: refetchRecurring, isFetching: recurringLoading } = useRecurringByOrigin(id)
  const [recurringEnabled, setRecurringEnabled] = React.useState(false)
  const [recurringError, setRecurringError] = React.useState<string | null>(null)
  const [recurringForm, setRecurringForm] = React.useState({
    frequency: 'MONTHLY' as FrequencyValue,
    intervalValue: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    leadTimeDays: 7,
  })
  const [recurringHydrated, setRecurringHydrated] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [initialData, setInitialData] = React.useState<any>(null)
  const [autoSaving, setAutoSaving] = React.useState(false)
  
  const load = async () => {
    if (!id) return
    setRecurringHydrated(false)
    try {
      const data = await getTicket(id)
      const ticketData = {
        ...data,
        assignedUserId: data.assignedUserId ?? '',
        customFields: sanitizeCustomFieldValues(data.customFields)
      }
      setT(ticketData)
      setInitialData(JSON.parse(JSON.stringify(ticketData)))
      setHasChanges(false)
      const h = await listTicketHistory(id)
      setHistory(h)
    } catch (e: any) {
      showNotification('error', e?.message || 'Failed to load ticket')
    }
  }
  
  React.useEffect(() => {
    load()
    Promise.all([listSites(), listUsers(), listIssueTypes(), listFieldDefinitions()]).then(([s, u, ty, f]) => {
      setSites(s); setUsers(u); setTypes(ty); setFieldDefs(filterFieldDefs(f))
    }).catch(e => console.error('Failed to load dropdowns', e))
  }, [id])

  // Auto-save function
  const performAutoSave = React.useCallback(async () => {
    if (!t || !id) return
    
    setAutoSaving(true)
    try {
      const payload: any = { 
        siteId: t.siteId,
        type: t.typeKey,
        description: t.description, 
        details: t.details, 
        status: t.status, 
        priority: t.priority 
      }
      if (t.assignedUserId !== undefined) payload.assignedUserId = t.assignedUserId
      if (t.dueAt !== undefined) payload.dueAt = t.dueAt
      const sanitizedCustomFields = sanitizeCustomFieldValues(t.customFields)
      if (Object.keys(sanitizedCustomFields).length > 0) {
        payload.custom_fields = sanitizedCustomFields
      }
      await updateTicket(id, payload)
      
      // Save recurring settings
      if (recurringEnabled) {
        const recurringPayload = {
          frequency: recurringForm.frequency,
          intervalValue: recurringForm.intervalValue,
          startDate: recurringForm.startDate,
          endDate: recurringForm.endDate || undefined,
          leadTimeDays: recurringForm.leadTimeDays,
          isActive: true,
          description: t.description,
          priority: t.priority,
          details: t.details || undefined,
          assignedUserId: t.assignedUserId || undefined,
          customFields: sanitizedCustomFields,
        }
        if (recurringConfig) {
          await updateRecurringTicket(recurringConfig.id, recurringPayload)
        } else {
          await createRecurringTicket({
            originTicketId: t.id,
            siteId: t.siteId,
            typeKey: t.typeKey,
            ...recurringPayload
          })
        }
      } else if (recurringConfig && !recurringEnabled) {
        // Disable recurring if checkbox unchecked
        await updateRecurringTicket(recurringConfig.id, { isActive: false })
      }
      
      setHasChanges(false)
      setInitialData(JSON.parse(JSON.stringify(t)))
      await refetchRecurring()
    } catch (e) {
      console.error('Auto-save failed:', e)
    } finally {
      setAutoSaving(false)
    }
  }, [t, id, recurringEnabled, recurringForm, recurringConfig, refetchRecurring])

  // Track changes
  React.useEffect(() => {
    if (!t || !initialData || !recurringHydrated) return
    
    const ticketChanged = JSON.stringify(t) !== JSON.stringify(initialData)
    
    let recurringChanged = false
    if (recurringConfig) {
      // If config exists, check if enabled state or form changed
      recurringChanged = recurringEnabled !== recurringConfig.isActive ||
        recurringForm.frequency !== recurringConfig.frequency ||
        recurringForm.intervalValue !== recurringConfig.intervalValue ||
        recurringForm.startDate !== recurringConfig.startDate.slice(0, 10) ||
        recurringForm.endDate !== (recurringConfig.endDate ? recurringConfig.endDate.slice(0, 10) : '') ||
        recurringForm.leadTimeDays !== recurringConfig.leadTimeDays
    } else {
      // If no config, any enabled state is a change
      recurringChanged = recurringEnabled
    }
    
    setHasChanges(ticketChanged || recurringChanged)
  }, [t, initialData, recurringEnabled, recurringForm, recurringConfig, recurringHydrated])

  // Auto-save on unmount
  React.useEffect(() => {
    return () => {
      if (hasChanges) {
        performAutoSave()
      }
    }
  }, [hasChanges, performAutoSave])

  // Handle browser back button and page unload
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        performAutoSave()
        e.preventDefault()
        e.returnValue = ''
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges, performAutoSave])

  // Auto-save on navigation (back button)
  React.useEffect(() => {
    const handlePopState = () => {
      if (hasChanges) {
        performAutoSave()
      }
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [hasChanges, performAutoSave])

  // Debounced auto-save (2 seconds after changes)
  React.useEffect(() => {
    if (!hasChanges) return
    
    const timer = setTimeout(() => {
      performAutoSave()
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [hasChanges, t, recurringEnabled, recurringForm])
  
  React.useEffect(() => {
    if (!t || recurringHydrated) return

    if (recurringConfig) {
      setRecurringEnabled(recurringConfig.isActive)
      setRecurringForm({
        frequency: recurringConfig.frequency,
        intervalValue: recurringConfig.intervalValue,
        startDate: recurringConfig.startDate.slice(0, 10),
        endDate: recurringConfig.endDate ? recurringConfig.endDate.slice(0, 10) : '',
        leadTimeDays: recurringConfig.leadTimeDays,
      })
    } else {
      setRecurringEnabled(false)
      const baseStart = t.dueAt ? new Date(t.dueAt) : new Date()
      const startDate = baseStart.toISOString().slice(0, 10)
      setRecurringForm({
        frequency: 'MONTHLY' as FrequencyValue,
        intervalValue: 1,
        startDate,
        endDate: '',
        leadTimeDays: 7,
      })
    }
    setRecurringHydrated(true)
  }, [recurringConfig, t, recurringHydrated])
  
  // Removed manual save - now using auto-save on unmount

  const isRecurringActive = recurringEnabled

  const derivedDueDate = React.useMemo(() => {
    if (isRecurringActive && recurringForm.startDate) {
      return new Date(`${recurringForm.startDate}T00:00:00Z`)
    }
    return t?.dueAt ? new Date(t.dueAt) : undefined
  }, [isRecurringActive, recurringForm.startDate, t?.dueAt])

  React.useEffect(() => {
    if (!isRecurringActive || !recurringForm.startDate) return
    setT((prev: Ticket | null): Ticket | null => {
      if (!prev) return prev
      const iso = new Date(`${recurringForm.startDate}T00:00:00Z`).toISOString()
      if (prev.dueAt === iso) return prev
      return { ...prev, dueAt: iso }
    })
  }, [isRecurringActive, recurringForm.startDate])

  // Removed manual recurring save - now using auto-save on unmount
  if (!t) return <div className="container"><div className="panel">Loading…</div></div>
  const sanitizedCustomFields = sanitizeCustomFieldValues(t.customFields)
  return (
    <div className="container text-modern">
      <div className="panel text-modern">
        <div className="row" style={{justifyContent:'space-between'}}>
          <div className="h1">Ticket</div>
          <button onClick={()=>nav(-1)}>← Back</button>
        </div>
        {err && <div className="row" style={{color:'#ffb3b3'}}>{err}</div>}
        <div className="row" style={{marginTop:12}}>
          <label style={{width:150}}>Site</label>
          <select value={t.siteId} onChange={e=>setT({...t, siteId:e.target.value})} style={{flex:1}}>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="row" style={{marginTop:12}}>
          <label style={{width:150}}>Issue Type</label>
          <select value={t.typeKey} onChange={e=>setT({...t, typeKey:e.target.value})} style={{flex:1}}>
            {types.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
        </div>
        <div className="row" style={{marginTop:12}}>
          <label style={{width:150}}>Description</label>
          <input style={{flex:1}} value={t.description} onChange={e=>setT({...t, description:e.target.value})} />
        </div>
        <div className="row" style={{marginTop:12}}>
          <label style={{width:150}}>Details</label>
          <textarea style={{flex:1, height:100}} value={t.details||''} onChange={e=>setT({...t, details:e.target.value})} />
        </div>
        <div className="row" style={{marginTop:12}}>
          <label style={{width:150}}>Status</label>
          <select value={t.status} onChange={e=>setT({...t, status:e.target.value})}>
            {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <label style={{width:100}}>Priority</label>
          <select value={t.priority} onChange={e=>setT({...t, priority:e.target.value})}>
            {['P1','P2','P3','P4'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="row" style={{marginTop:12}}>
          <label style={{width:150}}>Assigned User</label>
          <div style={{flex:1, display: 'flex', alignItems: 'center', gap: 8}}>
            <UserAvatar user={users.find(u => u.id === t.assignedUserId)} size={32} />
            <select value={t.assignedUserId || ''} onChange={e=>setT({...t, assignedUserId: e.target.value || ''})} style={{flex:1}}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </select>
          </div>
        </div>

        <div className="row" style={{marginTop:12}}>
          <label style={{width:150}}>Due Date</label>
          <input 
            type="datetime-local" 
            value={derivedDueDate ? derivedDueDate.toISOString().slice(0, 16) : ''} 
            onChange={e => {
              if (isRecurringActive) return
              setT((prev: Ticket | null): Ticket | null => {
                if (!prev) return prev
                return { ...prev, dueAt: e.target.value ? new Date(e.target.value).toISOString() : null }
              })
            }} 
            style={{flex:1, opacity: isRecurringActive ? 0.5 : 1, cursor: isRecurringActive ? 'not-allowed' : 'text'}}
            disabled={isRecurringActive}
          />
          {derivedDueDate && (() => {
            const dueDate = derivedDueDate
            const now = new Date()
            const isOverdue = dueDate < now
            const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
            const isDueSoon = hoursUntilDue > 0 && hoursUntilDue <= 24
            return (
              <span style={{
                marginLeft: 8,
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 12,
                background: isOverdue ? '#ff4444' : isDueSoon ? '#ffaa00' : '#44ff44',
                color: '#000',
                fontWeight: 600
              }}>
                {isOverdue ? `Overdue by ${Math.floor(-hoursUntilDue)}h` : isDueSoon ? `Due in ${Math.floor(hoursUntilDue)}h` : 'On track'}
              </span>
            )
          })()}
          {isRecurringActive && (
            <span style={{ marginLeft: 12, fontSize: 12, color: '#94a3b8' }}>
              Controlled by recurring schedule start date.
            </span>
          )}
        </div>

        <div style={{marginTop:24, paddingTop:16, borderTop:'1px solid #1c2532'}}>
          <div className="row" style={{alignItems:'center', marginBottom:12}}>
            <div style={{fontWeight:600}}>Recurring Schedule</div>
            <div className="spacer" />
            <label style={{display:'flex', alignItems:'center', gap:8}}>
              <input
                type="checkbox"
                checked={recurringEnabled}
                onChange={e => {
                  const checked = e.target.checked
                  setRecurringEnabled(checked)
                  if (checked) {
                    const baseDate = recurringConfig
                      ? new Date(recurringConfig.startDate)
                      : t?.dueAt
                        ? new Date(t.dueAt)
                        : new Date()
                    const start = baseDate.toISOString().split('T')[0]
                    setRecurringForm(prev => ({
                      ...prev,
                      startDate: start,
                    }))
                    setT((prev: Ticket | null): Ticket | null => {
                      if (!prev) return prev
                      const iso = new Date(`${start}T00:00:00Z`).toISOString()
                      return { ...prev, dueAt: iso }
                    })
                  }
                }}
              />
              <span>Enable recurring schedule</span>
            </label>
          </div>
          {recurringError && <div style={{ color: '#ffb3b3', marginBottom: 8 }}>{recurringError}</div>}
          {!recurringConfig && !recurringEnabled && (
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
              This ticket does not currently have a recurring schedule. Enable the toggle above to configure one.
            </div>
          )}
          {recurringConfig && !recurringEnabled && (
            <div style={{ fontSize: 13, color: '#facc15', marginBottom: 8 }}>
              The existing recurring schedule is disabled. Toggle it back on to resume automated generation.
            </div>
          )}
          <div style={{display:'grid', gap:12, opacity: recurringEnabled || recurringConfig ? 1 : 0.6}}>
            <div className="row" style={{gap:12}}>
              <label style={{width:150}}>Frequency</label>
              <select
                value={recurringForm.frequency}
                onChange={e => setRecurringForm(prev => ({ ...prev, frequency: e.target.value as FrequencyValue }))}
                style={{flex:1}}
                disabled={!recurringEnabled && !recurringConfig}
              >
                {FREQUENCY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <label style={{width:150}}>Interval</label>
              <input
                type="number"
                min={1}
                value={recurringForm.intervalValue}
                onChange={e => setRecurringForm(prev => ({ ...prev, intervalValue: Math.max(1, Number(e.target.value) || 1) }))}
                style={{width:120}}
                disabled={!recurringEnabled && !recurringConfig}
              />
            </div>
            <div className="row" style={{gap:12}}>
              <label style={{width:150}}>Start Date</label>
              <input
                type="date"
                value={recurringForm.startDate}
                onChange={e => setRecurringForm(prev => ({ ...prev, startDate: e.target.value }))}
                style={{flex:1}}
                disabled={!recurringEnabled && !recurringConfig}
              />
              <label style={{width:150}}>End Date</label>
              <input
                type="date"
                value={recurringForm.endDate}
                onChange={e => setRecurringForm(prev => ({ ...prev, endDate: e.target.value }))}
                style={{flex:1}}
                disabled={!recurringEnabled && !recurringConfig}
              />
            </div>
            <div className="row" style={{gap:12}}>
              <label style={{width:150}}>Lead time (days)</label>
              <input
                type="number"
                min={0}
                value={recurringForm.leadTimeDays}
                onChange={e => setRecurringForm(prev => ({ ...prev, leadTimeDays: Math.max(0, Number(e.target.value) || 0) }))}
                style={{width:150}}
                disabled={!recurringEnabled && !recurringConfig}
              />
            </div>
            {recurringConfig && !recurringLoading && (
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Next ticket creation: {new Date(recurringConfig.nextScheduledAt).toLocaleString()}
                {(() => {
                  const dueDate = new Date(recurringConfig.nextScheduledAt)
                  dueDate.setDate(dueDate.getDate() + recurringConfig.leadTimeDays)
                  return ` • Due date ${dueDate.toLocaleDateString()}`
                })()}
                {recurringConfig.lastGeneratedAt && ` • Last generated ${new Date(recurringConfig.lastGeneratedAt).toLocaleDateString()}`}
              </div>
            )}
          </div>
          <div style={{marginTop:12, fontSize:13, color:'#64748b', fontStyle:'italic'}}>
            {autoSaving ? '💾 Saving recurring settings...' : hasChanges ? 'Changes auto-save in 2 seconds' : 'Changes automatically saved'}
          </div>
        </div>
        
        {fieldDefs.length > 0 && (
          <div style={{marginTop:16, paddingTop:16, borderTop:'1px solid #1c2532'}}>
            <label style={{display:'block', marginBottom:8, fontWeight:600}}>Custom Fields</label>
            <CustomFieldsForm
              fieldDefs={fieldDefs}
              values={sanitizedCustomFields}
              onChange={(customFields) => setT({...t, customFields: sanitizeCustomFieldValues(customFields)})}
            />
          </div>
        )}

        <div style={{marginTop:16, fontSize:13, color:'#64748b', fontStyle:'italic', textAlign:'right'}}>
          {autoSaving ? '💾 Saving...' : hasChanges ? '● Unsaved changes - auto-saving in 2s' : '✓ All changes saved'}
        </div>
      </div>
      
      <Comments ticketId={id!} />
      <div className="panel text-modern" style={{padding:16, marginTop:12}}>
        <div style={{fontWeight:700, marginBottom:8}}>Update history</div>
        {history.length === 0 ? (
          <div className="subtle">No updates yet.</div>
        ) : (
          <div style={{display:'grid', gap:12}}>
            {history.map(h => {
              const actorUser = users.find(u => u.id === h.actorUserId)
              return (
                <div
                  key={h.id}
                  className="bar"
                  style={{
                    display:'grid',
                    gap:6,
                    padding:12,
                    background:'#ffffff',
                    borderRadius:6,
                    border: '1px solid #e3e8ef',
                    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)'
                  }}
                >
                  <div className="row" style={{alignItems: 'center'}}>
                    <UserAvatar user={actorUser} size={24} />
                    <div className="subtle">
                      {new Date(h.at).toLocaleString()} · {actorUser ? (actorUser.name || actorUser.email) : (h.actorUserId || 'System')}
                    </div>
                  </div>
                  <ul style={{margin:0, paddingLeft:18}}>
                    {Object.entries(h.changes).map(([k, v]) => (
                      <li key={k}><strong>{k}</strong>: {String(v.from ?? '—')} → {String(v.to ?? '—')}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="panel text-modern" style={{padding:16, marginTop:12}}>
        <div style={{fontWeight:600, marginBottom:8}}>Timestamps</div>
        <div style={{display:'grid', gap:8, fontSize:14}}>
          <div className="row">
            <span style={{width:150, color:'#999'}}>Created:</span>
            <span>{new Date(t.createdAt).toLocaleString()}</span>
          </div>
          <div className="row">
            <span style={{width:150, color:'#999'}}>Updated:</span>
            <span>{new Date(t.updatedAt).toLocaleString()}</span>
          </div>
          {derivedDueDate && (
            <div className="row">
              <span style={{width:150, color:'#999'}}>Due:</span>
              <span>{derivedDueDate.toLocaleString()}</span>
              {isRecurringActive && <span style={{ marginLeft: 6, color: '#64748b', fontSize: 12 }}>(via recurring)</span>}
            </div>
          )}
          {t.firstResponseAt && (
            <div className="row">
              <span style={{width:150, color:'#999'}}>First Response:</span>
              <span>{new Date(t.firstResponseAt).toLocaleString()}</span>
            </div>
          )}
          {t.resolvedAt && (
            <div className="row">
              <span style={{width:150, color:'#999'}}>Resolved:</span>
              <span>{new Date(t.resolvedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
