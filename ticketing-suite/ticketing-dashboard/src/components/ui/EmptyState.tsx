import React from 'react'
import { Box, Typography, Button, SvgIcon } from '@mui/material'
import {
  Inbox as InboxIcon,
  SearchOff as SearchOffIcon,
  ErrorOutline as ErrorIcon,
  FolderOpen as FolderIcon,
} from '@mui/icons-material'

interface EmptyStateProps {
  icon?: 'inbox' | 'search' | 'error' | 'folder' | React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

const iconMap = {
  inbox: InboxIcon,
  search: SearchOffIcon,
  error: ErrorIcon,
  folder: FolderIcon,
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  action,
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
          {description}
        </Typography>
      )}
      
      {action && (
        <Button
          variant="contained"
          onClick={action.onClick}
          aria-label={action.label}
        >
          {action.label}
        </Button>
      )}
    </Box>
  )
}
