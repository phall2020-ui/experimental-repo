import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material'
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material'
import { useHealth, useHealthDb, useHealthRedis } from '../lib/hooks'

export default function HealthDashboard() {
  const nav = useNavigate()
  const [lastUpdate, setLastUpdate] = React.useState<Date>(new Date())
  
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useHealth()
  const { data: dbHealth, isLoading: dbLoading, refetch: refetchDb } = useHealthDb()
  const { data: redisHealth, isLoading: redisLoading, refetch: refetchRedis } = useHealthRedis()

  const isLoading = healthLoading || dbLoading || redisLoading

  const refreshAll = () => {
    refetchHealth()
    refetchDb()
    refetchRedis()
    setLastUpdate(new Date())
  }

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' => {
    if (status === 'ok' || status === 'up') return 'success'
    if (status === 'error' || status === 'down') return 'error'
    return 'warning'
  }

  const getStatusIcon = (status: string) => {
    if (status === 'ok' || status === 'up') return <CheckIcon />
    if (status === 'error' || status === 'down') return <ErrorIcon />
    return <WarningIcon />
  }

  const renderHealthCard = (title: string, health: any, loading: boolean) => (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{title}</Typography>
            <Chip
              icon={getStatusIcon(health?.status || 'error')}
              label={health?.status?.toUpperCase() || 'UNKNOWN'}
              color={getStatusColor(health?.status || 'error')}
              size="small"
            />
          </Box>

          {loading && <CircularProgress size={24} />}

          {health?.info && Object.entries(health.info).map(([key, value]: [string, any]) => (
            <Box key={key}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                {key}
              </Typography>
              <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(value, null, 2)}
              </Typography>
            </Box>
          ))}

          {health?.error && Object.entries(health.error).map(([key, value]: [string, any]) => (
            <Box key={key}>
              <Typography variant="body2" fontWeight={600} color="error" gutterBottom>
                {key}
              </Typography>
              <Typography variant="caption" color="error">
                {value.message || 'Unknown error'}
              </Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  )

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1">
          System Health Dashboard
        </Typography>
        
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
          
          <Tooltip title="Refresh">
            <IconButton onClick={refreshAll} disabled={isLoading} aria-label="Refresh health status">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            startIcon={<BackIcon />}
            onClick={() => nav(-1)}
            variant="outlined"
            size="small"
          >
            Back
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          {renderHealthCard('Overall System', health, healthLoading)}
        </Grid>
        
        <Grid item xs={12} md={6}>
          {renderHealthCard('Database', dbHealth, dbLoading)}
        </Grid>
        
        <Grid item xs={12} md={6}>
          {renderHealthCard('Redis', redisHealth, redisLoading)}
        </Grid>
      </Grid>
    </Box>
  )
}
