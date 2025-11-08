import React from 'react'
import { Chip, ChipProps } from '@mui/material'

type Priority = 'P1' | 'P2' | 'P3' | 'P4'

interface PriorityBadgeProps extends Omit<ChipProps, 'color'> {
  priority: Priority
}

const priorityConfig: Record<Priority, { color: ChipProps['color']; label: string }> = {
  P1: { color: 'error', label: 'P1 - Critical' },
  P2: { color: 'warning', label: 'P2 - High' },
  P3: { color: 'info', label: 'P3 - Medium' },
  P4: { color: 'default', label: 'P4 - Low' },
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, ...props }) => {
  const config = priorityConfig[priority]
  
  return (
    <Chip
      label={priority}
      color={config.color}
      size="small"
      {...props}
      aria-label={config.label}
    />
  )
}
