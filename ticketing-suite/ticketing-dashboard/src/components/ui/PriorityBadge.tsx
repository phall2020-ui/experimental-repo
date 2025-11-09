import React from 'react'
import { Chip, ChipProps, keyframes } from '@mui/material'
import {
  Whatshot as CriticalIcon,
  Warning as HighIcon,
  Info as MediumIcon,
  Assignment as LowIcon
} from '@mui/icons-material'

type Priority = 'P1' | 'P2' | 'P3' | 'P4'

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
  P1: { 
    color: 'error', 
    label: 'Critical', 
    icon: <CriticalIcon />,
    bgColor: '#d32f2f'
  },
  P2: { 
    color: 'warning', 
    label: 'High', 
    icon: <HighIcon />,
    bgColor: '#ed6c02'
  },
  P3: { 
    color: 'info', 
    label: 'Medium', 
    icon: <MediumIcon />,
    bgColor: '#0288d1'
  },
  P4: { 
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
      label={`${priority} - ${config.label}`}
      color={config.color}
      size="small"
      icon={showIcon ? config.icon : undefined}
      {...props}
      aria-label={`Priority ${priority} - ${config.label}`}
      sx={{
        fontWeight: 600,
        ...(isOverdue && (priority === 'P1' || priority === 'P2') && {
          animation: `${pulse} 2s ease-in-out infinite`,
          boxShadow: `0 0 8px ${config.bgColor}`,
        }),
        ...props.sx
      }}
    />
  )
}
