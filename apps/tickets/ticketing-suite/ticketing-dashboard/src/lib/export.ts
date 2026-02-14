import type { Ticket } from './api'

export function exportToCSV(tickets: Ticket[], filename = 'tickets.csv') {
  if (tickets.length === 0) {
    throw new Error('No tickets to export')
  }

  // Define CSV headers
  const headers = [
    'ID',
    'Description',
    'Details',
    'Status',
    'Priority',
    'Type',
    'Site ID',
    'Assigned User ID',
    'Created At',
    'Updated At',
    'Due Date',
    'First Response At',
    'Resolved At'
  ]

  // Convert tickets to CSV rows
  const rows = tickets.map(ticket => [
    ticket.id,
    `"${(ticket.description || '').replace(/"/g, '""')}"`,
    `"${(ticket.details || '').replace(/"/g, '""')}"`,
    ticket.status,
    ticket.priority,
    ticket.typeKey,
    ticket.siteId,
    ticket.assignedUserId || '',
    ticket.createdAt,
    ticket.updatedAt,
    ticket.dueAt || '',
    ticket.firstResponseAt || '',
    ticket.resolvedAt || ''
  ])

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportToJSON(tickets: Ticket[], filename = 'tickets.json') {
  if (tickets.length === 0) {
    throw new Error('No tickets to export')
  }

  const jsonContent = JSON.stringify(tickets, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

