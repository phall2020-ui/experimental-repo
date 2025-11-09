import React from 'react'
import { Box, Typography, Button, SvgIcon, Stack } from '@mui/material'
import {
  Inbox as InboxIcon,
  SearchOff as SearchOffIcon,
  ErrorOutline as ErrorIcon,
  FolderOpen as FolderIcon,
  FilterAlt as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material'

interface EmptyStateProps {
  icon?: 'inbox' | 'search' | 'error' | 'folder' | 'filter' | 'success' | 'assignment' | React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  suggestions?: string[]
}

const iconMap = {
  inbox: InboxIcon,
  search: SearchOffIcon,
  error: ErrorIcon,
  folder: FolderIcon,
  filter: FilterIcon,
  success: CheckCircleIcon,
  assignment: AssignmentIcon,
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  action,
  secondaryAction,
  suggestions,
}) => {
  const IconComponent = typeof icon === 'string' ? iconMap[icon as keyof typeof iconMap] : null

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 2,
        textAlign: 'center',
      }}
      role="status"
      aria-live="polite"
    >
      {IconComponent ? (
        <IconComponent
          sx={{
            fontSize: 64,
            color: 'text.disabled',
            mb: 2,
          }}
          aria-hidden="true"
        />
      ) : (
        icon
      )}
      
      <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
          {description}
        </Typography>
      )}

      {suggestions && suggestions.length > 0 && (
        <Box sx={{ mb: 3, maxWidth: 500 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
            Try:
          </Typography>
          <Stack spacing={0.5} alignItems="center">
            {suggestions.map((suggestion, index) => (
              <Typography key={index} variant="body2" color="text.secondary">
                • {suggestion}
              </Typography>
            ))}
          </Stack>
        </Box>
      )}
      
      {(action || secondaryAction) && (
        <Stack direction="row" spacing={2}>
          {action && (
            <Button
              variant="contained"
              onClick={action.onClick}
              aria-label={action.label}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outlined"
              onClick={secondaryAction.onClick}
              aria-label={secondaryAction.label}
            >
              {secondaryAction.label}
            </Button>
          )}
        </Stack>
      )}
    </Box>
  )
}
