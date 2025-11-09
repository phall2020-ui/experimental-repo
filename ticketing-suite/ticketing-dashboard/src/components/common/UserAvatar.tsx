import React from 'react'
import { Avatar, Tooltip } from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import { type UserOpt } from '../../lib/directory'

interface UserAvatarProps {
  user?: UserOpt
  size?: number
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 32 }) => {
  if (!user) {
    return (
      <Avatar sx={{ width: size, height: size, bgcolor: 'action.disabled' }}>
        <PersonIcon sx={{ fontSize: size * 0.6 }} />
      </Avatar>
    )
  }

  const initials = (user.name || user.email || '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Tooltip title={user.name || user.email} arrow>
      <Avatar
        sx={{
          width: size,
          height: size,
          bgcolor: 'primary.main',
          fontSize: size * 0.4,
          fontWeight: 600,
        }}
      >
        {initials}
      </Avatar>
    </Tooltip>
  )
}
