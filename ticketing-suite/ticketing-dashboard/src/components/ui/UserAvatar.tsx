import React from 'react'
import { Avatar, Tooltip } from '@mui/material'
import { Person as PersonIcon } from '@mui/icons-material'

interface UserAvatarProps {
  name?: string
  email?: string
  size?: number
  showTooltip?: boolean
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  email,
  size = 32,
  showTooltip = true,
}) => {
  const displayName = name || email
  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  const avatar = (
    <Avatar
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        bgcolor: 'primary.main',
      }}
      aria-label={displayName || 'User avatar'}
    >
      {displayName ? initials : <PersonIcon sx={{ fontSize: size * 0.6 }} />}
    </Avatar>
  )

  if (showTooltip && displayName) {
    return <Tooltip title={displayName}>{avatar}</Tooltip>
  }

  return avatar
}
