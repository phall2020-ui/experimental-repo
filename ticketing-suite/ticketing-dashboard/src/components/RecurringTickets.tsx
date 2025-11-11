import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRecurringTickets } from '../hooks/useTickets'
import { useUsers, useIssueTypes, useSites } from '../hooks/useDirectory'

const frequencyLabels: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly'
}

export default function RecurringTickets() {
  const navigate = useNavigate()
  const { data: schedules = [], isLoading } = useRecurringTickets()
  const { data: users = [] } = useUsers()
  const { data: issueTypes = [] } = useIssueTypes()
  const { data: sites = [] } = useSites()

  const upcoming = React.useMemo(() => {
    const now = new Date()
    return schedules
      .filter(schedule => {
        const triggerDate = new Date(schedule.nextScheduledAt)
        return triggerDate > now && schedule.isActive
      })
      .sort((a, b) => new Date(a.nextScheduledAt).getTime() - new Date(b.nextScheduledAt).getTime())
  }, [schedules])

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
          <div className="h1">Future Activities</div>
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
                  <th style={{ width: 140 }}>Ticket</th>
                  <th>Description</th>
                  <th style={{ width: 160 }}>Site</th>
                  <th>Type</th>
                  <th>Assigned</th>
                  <th>Due Date</th>
                  <th>Frequency</th>
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
                      <td className="text-modern">{dueDate.toLocaleDateString()}</td>
                      <td className="text-modern">{frequencyLabels[schedule.frequency] ?? schedule.frequency}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        )}
      </div>
    </div>
  )
}

