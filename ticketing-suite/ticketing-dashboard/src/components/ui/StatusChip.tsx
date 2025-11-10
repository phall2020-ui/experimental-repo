import React from 'react'
import { Chip, ChipProps } from '@mui/material'
import { STATUS_LABELS, type TicketStatusValue } from '../../lib/statuses'

interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: TicketStatusValue
}

const statusColors: Record<TicketStatusValue, ChipProps['color']> = {
  AWAITING_RESPONSE: 'info',
  ADE_TO_RESPOND: 'primary',
  ON_HOLD: 'warning',
  CLOSED: 'default',
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, ...props }) => {
  const label = STATUS_LABELS[status]
  const color = statusColors[status]
  
  return (
    <Chip
      label={label}
      color={color}
      size="small"
      variant="outlined"
      {...props}
      aria-label={`Status: ${label}`}
    />
  )
}
