import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTicket, updateTicket, listTicketHistory, type TicketHistoryEntry } from '../lib/api'
import { listSites, listUsers, listIssueTypes, listFieldDefinitions, type SiteOpt, type UserOpt, type IssueTypeOpt, type FieldDefOpt } from '../lib/directory'
import { STATUS_OPTIONS } from '../lib/statuses'
import Comments from '../components/Comments'
import Attachments from '../components/Attachments'
import CustomFieldsForm from '../components/CustomFieldsForm'
import { useNotifications } from '../lib/notifications'

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
  const [saving, setSaving] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const [sites, setSites] = React.useState<SiteOpt[]>([])
  const [users, setUsers] = React.useState<UserOpt[]>([])
  const [types, setTypes] = React.useState<IssueTypeOpt[]>([])
  const [fieldDefs, setFieldDefs] = React.useState<FieldDefOpt[]>([])
  const [history, setHistory] = React.useState<TicketHistoryEntry[]>([])
  const { showNotification } = useNotifications()
  
  const load = async () => {
    if (!id) return
    try {
      const data = await getTicket(id)
      setT(data)
      const h = await listTicketHistory(id)
      setHistory(h)
    } catch (e: any) {
      showNotification('error', e?.message || 'Failed to load ticket')
    }
  }
  
  React.useEffect(() => {
    load()
    Promise.all([listSites(), listUsers(), listIssueTypes(), listFieldDefinitions()]).then(([s, u, ty, f]) => {
      setSites(s); setUsers(u); setTypes(ty); setFieldDefs(f)
    }).catch(e => console.error('Failed to load dropdowns', e))
  }, [id])
  
  const save = async () => {
    if (!id || !t) return
    setSaving(true); setErr(null)
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
      if (t.customFields && Object.keys(t.customFields).length > 0) {
        payload.custom_fields = t.customFields
      }
      await updateTicket(id, payload)
      showNotification('success', 'Ticket updated successfully')
      await load()
    } catch (e:any) { 
      setErr(e?.message || 'Failed to save')
      showNotification('error', e?.message || 'Failed to save ticket')
    } finally { setSaving(false) }
  }
  if (!t) return <div className="container"><div className="panel">Loading…</div></div>
  return (
    <div className="container">
      <div className="panel">
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
            <select value={t.assignedUserId || ''} onChange={e=>setT({...t, assignedUserId:e.target.value || null})} style={{flex:1}}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </select>
          </div>
        </div>

        <div className="row" style={{marginTop:12}}>
          <label style={{width:150}}>Due Date</label>
          <input 
            type="datetime-local" 
            value={t.dueAt ? new Date(t.dueAt).toISOString().slice(0, 16) : ''} 
            onChange={e=>setT({...t, dueAt:e.target.value ? new Date(e.target.value).toISOString() : null})} 
            style={{flex:1}}
          />
          {t.dueAt && (() => {
            const dueDate = new Date(t.dueAt)
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
        </div>

        <div style={{marginTop:16, paddingTop:16, borderTop:'1px solid #1c2532'}}>
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
            {t.dueAt && (
              <div className="row">
                <span style={{width:150, color:'#999'}}>Due:</span>
                <span>{new Date(t.dueAt).toLocaleString()}</span>
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
        
        {fieldDefs.length > 0 && (
          <div style={{marginTop:16, paddingTop:16, borderTop:'1px solid #1c2532'}}>
            <label style={{display:'block', marginBottom:8, fontWeight:600}}>Custom Fields</label>
            <CustomFieldsForm
              fieldDefs={fieldDefs}
              values={t.customFields || {}}
              onChange={(customFields) => setT({...t, customFields})}
            />
          </div>
        )}

        <div className="row" style={{marginTop:16, justifyContent:'flex-end'}}>
          <button className="primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
      
      <Comments ticketId={id!} />
      <Attachments ticketId={id!} />
      <div className="panel" style={{padding:16, marginTop:12}}>
        <div style={{fontWeight:700, marginBottom:8}}>Update history</div>
        {history.length === 0 ? (
          <div className="subtle">No updates yet.</div>
        ) : (
          <div style={{display:'grid', gap:12}}>
            {history.map(h => {
              const actorUser = users.find(u => u.id === h.actorUserId)
              return (
                <div key={h.id} className="bar" style={{display:'grid', gap:6, padding:8, background:'#0e141c', borderRadius:4, border: '1px solid #1c2532'}}>
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
    </div>
  )
}
