import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRecurringTickets } from '../hooks/useTickets'
import { useUsers, useIssueTypes, useSites } from '../hooks/useDirectory'
import { bulkUpdateRecurringTickets, bulkDeleteRecurringTickets, bulkGroupRecurringTickets, type RecurringTicketConfig } from '../lib/api'
import { useNotifications } from '../lib/notifications'

const frequencyLabels: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly'
}

export default function RecurringTickets() {
  const navigate = useNavigate()
  const { data: schedules = [], isLoading, refetch } = useRecurringTickets()
  const { data: users = [] } = useUsers()
  const { data: issueTypes = [] } = useIssueTypes()
  const { data: sites = [] } = useSites()
  const { showNotification } = useNotifications()
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [showBulkMenu, setShowBulkMenu] = React.useState(false)
  const [showGroupDialog, setShowGroupDialog] = React.useState(false)
  const [groupName, setGroupName] = React.useState('')
  const [isNewGroup, setIsNewGroup] = React.useState(true)
  const [showStatusDialog, setShowStatusDialog] = React.useState(false)
  const [showPriorityDialog, setShowPriorityDialog] = React.useState(false)
  const [showAssignDialog, setShowAssignDialog] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState('')

  const upcoming = React.useMemo(() => {
    const now = new Date()
    return schedules
      .filter(schedule => {
        const triggerDate = new Date(schedule.nextScheduledAt)
        return triggerDate > now && schedule.isActive
      })
      .sort((a, b) => new Date(a.nextScheduledAt).getTime() - new Date(b.nextScheduledAt).getTime())
  }, [schedules])

  const existingGroups = React.useMemo(() => {
    const groups = new Set<string>()
    schedules.forEach(schedule => {
      if ((schedule as any).groupName) {
        groups.add((schedule as any).groupName)
      }
    })
    return Array.from(groups).sort()
  }, [schedules])

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(upcoming.map(s => s.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleBulkUpdate = async (updates: any) => {
    try {
      await bulkUpdateRecurringTickets(selectedIds, updates)
      showNotification('success', `Updated ${selectedIds.length} recurring ticket(s)`)
      setSelectedIds([])
      refetch()
    } catch (e: any) {
      console.error('Bulk update error:', e)
      const errorMsg = e?.response?.data?.message || e?.message || 'Failed to update'
      showNotification('error', errorMsg)
    }
  }

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteRecurringTickets(selectedIds)
      showNotification('success', `Deleted ${selectedIds.length} recurring ticket(s)`)
      setSelectedIds([])
      setShowDeleteDialog(false)
      refetch()
    } catch (e: any) {
      console.error('Bulk delete error:', e)
      const errorMsg = e?.response?.data?.message || e?.message || 'Failed to delete'
      showNotification('error', errorMsg)
    }
  }

  const handleBulkGroup = async () => {
    if (!groupName.trim()) {
      showNotification('error', 'Please enter a group name')
      return
    }
    try {
      await bulkGroupRecurringTickets(selectedIds, groupName)
      showNotification('success', `Grouped ${selectedIds.length} recurring ticket(s) as "${groupName}"`)
      setSelectedIds([])
      setShowGroupDialog(false)
      setGroupName('')
      refetch()
    } catch (e: any) {
      console.error('Bulk group error:', e)
      const errorMsg = e?.response?.data?.message || e?.message || 'Failed to group'
      showNotification('error', errorMsg)
    }
  }

  if (isLoading) {
    return (
      <div className="container text-modern">
        <div className="panel text-modern">Loading recurring schedules…</div>
      </div>
    )
  }

  return (
    <div className="container text-modern">
      <div className="panel text-modern">
        <div className="row" style={{ alignItems: 'center', marginBottom: 12 }}>
          <div className="h1">Future Recurring Activities</div>
          <div className="spacer" />
          <button onClick={() => navigate(-1)} style={{ padding: '6px 12px' }}>
            ← Back
          </button>
        </div>
        <p className="text-modern-muted" style={{ marginBottom: 16 }}>
          These recurring tickets have not yet reached their lead time window. Once the lead time is reached,
          they will be generated automatically and appear on the main dashboard.
        </p>

        {upcoming.length === 0 ? (
          <div className="panel text-modern" style={{ background: '#0f172a', border: '1px solid #1e293b', color: '#f8fafc' }}>
            No future activities scheduled.
          </div>
        ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === upcoming.length && upcoming.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{ width: 140 }}>Ticket</th>
                  <th>Description</th>
                  <th style={{ width: 160 }}>Site</th>
                  <th>Type</th>
                  <th>Assigned</th>
                  <th>Creation Date</th>
                  <th>Due Date</th>
                  <th>Frequency</th>
                  <th>Group</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(schedule => {
                  const dueDate = new Date(schedule.nextScheduledAt)
                  dueDate.setDate(dueDate.getDate() + schedule.leadTimeDays)
                  const assignedUser = users.find(u => u.id === schedule.assignedUserId)
                  const issueType = issueTypes.find(t => t.key === schedule.typeKey)
                  const site = sites.find(s => s.id === schedule.siteId)
                  return (
                    <tr key={schedule.id}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(schedule.id)}
                          onChange={() => handleSelectOne(schedule.id)}
                        />
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {schedule.originTicketId ? (
                          <Link to={`/tickets/${schedule.originTicketId}`}>
                            {schedule.originTicketId.slice(0, 8)}
                            {schedule.originTicketId.length > 8 ? '…' : ''}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="text-modern">
                        {schedule.originTicketId ? (
                          <div className="linkish">
                            <Link to={`/tickets/${schedule.originTicketId}`}>
                              {schedule.description}
                            </Link>
                          </div>
                        ) : (
                          schedule.description
                        )}
                      </td>
                      <td className="text-modern">{site?.name || schedule.siteId}</td>
                      <td className="text-modern">{issueType?.label || schedule.typeKey.replace(/_/g, ' ')}</td>
                      <td className="text-modern">{assignedUser ? assignedUser.name || assignedUser.email : 'Unassigned'}</td>
                      <td className="text-modern">{new Date(schedule.nextScheduledAt).toLocaleDateString()}</td>
                      <td className="text-modern">{dueDate.toLocaleDateString()}</td>
                      <td className="text-modern">{frequencyLabels[schedule.frequency] ?? schedule.frequency}</td>
                      <td className="text-modern">
                        {(schedule as any).groupName ? (
                          <span style={{ background: '#5b9cff', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                            {(schedule as any).groupName}
                          </span>
                        ) : (
                          <span style={{ color: '#888' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        )}

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '12px 20px',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 100
          }}>
            <span style={{ color: '#f8fafc', fontSize: 14 }}>
              {selectedIds.length} selected
            </span>
            <button onClick={() => { setShowGroupDialog(true); setIsNewGroup(true); setGroupName('') }}>
              📁 Group
            </button>
            <button onClick={() => setShowStatusDialog(true)}>
              🔄 Change Status
            </button>
            <button onClick={() => setShowPriorityDialog(true)}>
              ⚡ Change Priority
            </button>
            <button onClick={() => setShowAssignDialog(true)}>
              👤 Assign
            </button>
            <button onClick={() => setShowDeleteDialog(true)} style={{ background: '#dc2626', color: 'white' }}>
              🗑️ Delete
            </button>
            <button onClick={() => setSelectedIds([])} style={{ background: 'transparent', border: '1px solid #475569' }}>
              ✕
            </button>
          </div>
        )}

        {/* Group Dialog */}
        {showGroupDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="panel" style={{ width: 400, maxWidth: '90%' }}>
              <h3>Group Recurring Tickets</h3>
              <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
                {isNewGroup ? 'Create a new group' : 'Add to existing group'} for {selectedIds.length} recurring ticket(s).
              </p>
              
              {existingGroups.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <button 
                      onClick={() => { setIsNewGroup(true); setGroupName('') }}
                      style={{ 
                        flex: 1, 
                        background: isNewGroup ? '#5b9cff' : 'transparent',
                        color: isNewGroup ? 'white' : '#666',
                        border: '1px solid #5b9cff'
                      }}
                    >
                      New Group
                    </button>
                    <button 
                      onClick={() => { setIsNewGroup(false); setGroupName('') }}
                      style={{ 
                        flex: 1, 
                        background: !isNewGroup ? '#5b9cff' : 'transparent',
                        color: !isNewGroup ? 'white' : '#666',
                        border: '1px solid #5b9cff'
                      }}
                    >
                      Existing Group
                    </button>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>Group Name</label>
                {isNewGroup ? (
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., Monthly Maintenance"
                    style={{ width: '100%', padding: 8 }}
                    autoFocus
                  />
                ) : (
                  <select
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    style={{ width: '100%', padding: 8 }}
                    autoFocus
                  >
                    <option value="">Select existing group...</option>
                    {existingGroups.map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowGroupDialog(false); setGroupName(''); setIsNewGroup(true) }}>
                  Cancel
                </button>
                <button onClick={handleBulkGroup} style={{ background: '#5b9cff', color: 'white' }}>
                  {isNewGroup ? 'Create Group' : 'Add to Group'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="panel" style={{ width: 400, maxWidth: '90%' }}>
              <h3>Delete Recurring Tickets</h3>
              <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
                Are you sure you want to delete {selectedIds.length} recurring ticket(s)? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </button>
                <button onClick={handleBulkDelete} style={{ background: '#dc2626', color: 'white' }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Dialog */}
        {showStatusDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="panel" style={{ width: 400, maxWidth: '90%' }}>
              <h3>Change Status</h3>
              <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
                Set status for {selectedIds.length} recurring ticket(s).
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>Status</label>
                <select
                  value={selectedValue}
                  onChange={(e) => setSelectedValue(e.target.value)}
                  style={{ width: '100%', padding: 8 }}
                >
                  <option value="">Select status...</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowStatusDialog(false); setSelectedValue('') }}>
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (!selectedValue) {
                      showNotification('error', 'Please select a status')
                      return
                    }
                    handleBulkUpdate({ isActive: selectedValue === 'active' })
                    setShowStatusDialog(false)
                    setSelectedValue('')
                  }} 
                  style={{ background: '#5b9cff', color: 'white' }}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Priority Dialog */}
        {showPriorityDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="panel" style={{ width: 400, maxWidth: '90%' }}>
              <h3>Change Priority</h3>
              <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
                Set priority for {selectedIds.length} recurring ticket(s).
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>Priority</label>
                <select
                  value={selectedValue}
                  onChange={(e) => setSelectedValue(e.target.value)}
                  style={{ width: '100%', padding: 8 }}
                >
                  <option value="">Select priority...</option>
                  <option value="P1">P1 - Critical</option>
                  <option value="P2">P2 - High</option>
                  <option value="P3">P3 - Medium</option>
                  <option value="P4">P4 - Low</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowPriorityDialog(false); setSelectedValue('') }}>
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (!selectedValue) {
                      showNotification('error', 'Please select a priority')
                      return
                    }
                    handleBulkUpdate({ priority: selectedValue })
                    setShowPriorityDialog(false)
                    setSelectedValue('')
                  }} 
                  style={{ background: '#5b9cff', color: 'white' }}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Dialog */}
        {showAssignDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="panel" style={{ width: 400, maxWidth: '90%' }}>
              <h3>Assign User</h3>
              <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
                Assign user to {selectedIds.length} recurring ticket(s).
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>User</label>
                <select
                  value={selectedValue}
                  onChange={(e) => setSelectedValue(e.target.value)}
                  style={{ width: '100%', padding: 8 }}
                >
                  <option value="">Select user...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowAssignDialog(false); setSelectedValue('') }}>
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (!selectedValue) {
                      showNotification('error', 'Please select a user')
                      return
                    }
                    handleBulkUpdate({ assignedUserId: selectedValue })
                    setShowAssignDialog(false)
                    setSelectedValue('')
                  }} 
                  style={{ background: '#5b9cff', color: 'white' }}
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

