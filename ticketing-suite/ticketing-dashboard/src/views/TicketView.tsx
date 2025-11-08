import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTicket, updateTicket } from '../lib/api'
import { listSites, listUsers, listIssueTypes, type SiteOpt, type UserOpt, type IssueTypeOpt } from '../lib/directory'
export default function TicketView() {
  const { id } = useParams()
  const nav = useNavigate()
  const [t, setT] = React.useState<any>(null)
  const [saving, setSaving] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const [sites, setSites] = React.useState<SiteOpt[]>([])
  const [users, setUsers] = React.useState<UserOpt[]>([])
  const [types, setTypes] = React.useState<IssueTypeOpt[]>([])
  
  const load = async () => { if (!id) return; const data = await getTicket(id); setT(data) }
  
  React.useEffect(() => {
    load()
    Promise.all([listSites(), listUsers(), listIssueTypes()]).then(([s, u, ty]) => {
      setSites(s); setUsers(u); setTypes(ty)
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
      await updateTicket(id, payload); await load()
    } catch (e:any) { setErr(e?.message || 'Failed to save') } finally { setSaving(false) }
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
            {['NEW','TRIAGE','IN_PROGRESS','PENDING','RESOLVED','CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label style={{width:100}}>Priority</label>
          <select value={t.priority} onChange={e=>setT({...t, priority:e.target.value})}>
            {['P1','P2','P3','P4'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="row" style={{marginTop:12}}>
          <label style={{width:150}}>Assigned User</label>
          <select value={t.assignedUserId || ''} onChange={e=>setT({...t, assignedUserId:e.target.value || null})} style={{flex:1}}>
            <option value="">Unassigned</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>
        </div>
        <div className="row" style={{marginTop:16, justifyContent:'flex-end'}}>
          <button className="primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
