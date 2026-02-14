import React from 'react'
import { Box, Skeleton as MuiSkeleton, Stack } from '@mui/material'

interface SkeletonProps {
  variant?: 'table' | 'card' | 'text' | 'avatar' | 'form'
  rows?: number
}

export const Skeleton: React.FC<SkeletonProps> = ({ variant = 'text', rows = 3 }) => {
  if (variant === 'table') {
    return (
      <Box sx={{ width: '100%' }}>
        {Array.from({ length: rows }).map((_, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              gap: 2,
              py: 1.5,
              borderBottom: index < rows - 1 ? 1 : 0,
              borderColor: 'divider',
            }}
          >
            <MuiSkeleton variant="rectangular" width={60} height={20} />
            <MuiSkeleton variant="rectangular" sx={{ flex: 1 }} height={20} />
            <MuiSkeleton variant="rectangular" width={100} height={20} />
            <MuiSkeleton variant="rectangular" width={80} height={20} />
            <MuiSkeleton variant="rectangular" width={120} height={20} />
          </Box>
        ))}
      </Box>
    )
  }

  if (variant === 'card') {
    return (
      <Stack spacing={2}>
        {Array.from({ length: rows }).map((_, index) => (
          <Box
            key={index}
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <MuiSkeleton variant="text" width="60%" height={30} />
            <MuiSkeleton variant="text" width="100%" />
            <MuiSkeleton variant="text" width="80%" />
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <MuiSkeleton variant="rectangular" width={60} height={24} />
              <MuiSkeleton variant="rectangular" width={80} height={24} />
            </Box>
          </Box>
        ))}
      </Stack>
    )
  }

  if (variant === 'form') {
    return (
      <Stack spacing={2}>
        {Array.from({ length: rows }).map((_, index) => (
          <Box key={index}>
            <MuiSkeleton variant="text" width={100} height={20} sx={{ mb: 0.5 }} />
            <MuiSkeleton variant="rectangular" width="100%" height={40} />
          </Box>
        ))}
      </Stack>
    )
  }

  if (variant === 'avatar') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <MuiSkeleton variant="circular" width={40} height={40} />
        <Stack spacing={1} sx={{ flex: 1 }}>
          <MuiSkeleton variant="text" width="40%" />
          <MuiSkeleton variant="text" width="60%" />
        </Stack>
      </Box>
    )
  }

  return (
    <Stack spacing={1}>
      {Array.from({ length: rows }).map((_, index) => (
        <MuiSkeleton key={index} variant="text" />
      ))}
    </Stack>
  )
}
