import React from 'react'
import { Chip, ChipProps, keyframes } from '@mui/material'
import {
  Whatshot as CriticalIcon,
  Warning as HighIcon,
  Info as MediumIcon,
  Assignment as LowIcon
} from '@mui/icons-material'

type Priority = 'High' | 'Medium' | 'Low'

interface PriorityBadgeProps extends Omit<ChipProps, 'color'> {
  priority: Priority
  isOverdue?: boolean
  showIcon?: boolean
}

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
`

const priorityConfig: Record<Priority, { 
  color: ChipProps['color']
  label: string
  icon: React.ReactElement
  bgColor: string
}> = {
  High: { 
    color: 'error', 
    label: 'High', 
    icon: <CriticalIcon />,
    bgColor: '#d32f2f'
  },
  Medium: { 
    color: 'warning', 
    label: 'Medium', 
    icon: <HighIcon />,
    bgColor: '#ed6c02'
  },
  Low: { 
    color: 'default', 
    label: 'Low', 
    icon: <LowIcon />,
    bgColor: '#757575'
  },
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ 
  priority, 
  isOverdue = false,
  showIcon = true,
  ...props 
}) => {
  const config = priorityConfig[priority]
  
  return (
    <Chip
      label={`${config.label} Priority`}
      color={config.color}
      size="small"
      icon={showIcon ? config.icon : undefined}
      {...props}
      aria-label={`${config.label} priority`}
      sx={{
        fontWeight: 600,
        ...(isOverdue && (priority === 'High' || priority === 'Medium') && {
          animation: `${pulse} 2s ease-in-out infinite`,
          boxShadow: `0 0 8px ${config.bgColor}`,
        }),
        ...props.sx
      }}
    />
  )
}
