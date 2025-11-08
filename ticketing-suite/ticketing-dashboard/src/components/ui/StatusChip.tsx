import React from 'react'
import { Chip, ChipProps } from '@mui/material'

type TicketStatus = 'NEW' | 'TRIAGE' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED'

interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: TicketStatus
}

const statusConfig: Record<TicketStatus, { color: ChipProps['color']; label: string }> = {
  NEW: { color: 'info', label: 'New' },
  TRIAGE: { color: 'warning', label: 'Triage' },
  IN_PROGRESS: { color: 'primary', label: 'In Progress' },
  PENDING: { color: 'warning', label: 'Pending' },
  RESOLVED: { color: 'success', label: 'Resolved' },
  CLOSED: { color: 'default', label: 'Closed' },
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, ...props }) => {
  const config = statusConfig[status]
  
  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      variant="outlined"
      {...props}
      aria-label={`Status: ${config.label}`}
    />
  )
}
