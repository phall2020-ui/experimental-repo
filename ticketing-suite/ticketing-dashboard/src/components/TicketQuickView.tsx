import React, { useState, useEffect } from 'react'
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Divider,
  Stack,
  Chip,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Avatar
} from '@mui/material'
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material'
import { getTicket, updateTicket, type Ticket } from '../lib/api'
import { PriorityBadge } from './ui/PriorityBadge'
import { StatusChip } from './ui/StatusChip'
import { useNavigate } from 'react-router-dom'
import { STATUS_OPTIONS } from '../lib/statuses'

interface TicketQuickViewProps {
  ticketId: string | null
  open: boolean
  onClose: () => void
  onNavigate?: (direction: 'prev' | 'next') => void
  canNavigate?: { prev: boolean; next: boolean }
  users?: any[]
  sites?: any[]
  types?: any[]
}

export default function TicketQuickView({
  ticketId,
  open,
  onClose,
  onNavigate,
  canNavigate = { prev: false, next: false },
  users = [],
  sites = [],
  types = []
}: TicketQuickViewProps) {
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editedTicket, setEditedTicket] = useState<Partial<Ticket>>({})

  useEffect(() => {
    if (ticketId && open) {
      loadTicket()
    }
  }, [ticketId, open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      
      if (e.key === 'Escape') {
        if (editMode) {
          setEditMode(false)
        } else {
          onClose()
        }
      } else if (e.key === 'ArrowLeft' && canNavigate.prev && !editMode) {
        onNavigate?.('prev')
      } else if (e.key === 'ArrowRight' && canNavigate.next && !editMode) {
        onNavigate?.('next')
      } else if (e.key === 'e' && !editMode) {
        setEditMode(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, editMode, canNavigate, onNavigate, onClose])

  const loadTicket = async () => {
    if (!ticketId) return
    
    setLoading(true)
    setError(null)
    try {
      const data = await getTicket(ticketId)
      setTicket(data)
      setEditedTicket(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!ticketId || !ticket) return

    setSaving(true)
    setError(null)
    try {
      const updates: any = {}
      if (editedTicket.status !== ticket.status) updates.status = editedTicket.status
      if (editedTicket.priority !== ticket.priority) updates.priority = editedTicket.priority
      if (editedTicket.assignedUserId !== ticket.assignedUserId) updates.assignedUserId = editedTicket.assignedUserId
      if (editedTicket.description !== ticket.description) updates.description = editedTicket.description
      if (editedTicket.details !== ticket.details) updates.details = editedTicket.details

      await updateTicket(ticketId, updates)
      await loadTicket()
      setEditMode(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to save ticket')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedTicket(ticket || {})
    setEditMode(false)
    setError(null)
  }

  const handleOpenFull = () => {
    if (ticketId) {
      navigate(`/tickets/${ticketId}`)
      onClose()
    }
  }

  const assignedUser = users.find(u => u.id === ticket?.assignedUserId)

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 500 },
          maxWidth: '100%'
        }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              {onNavigate && (
                <>
                  <IconButton
                    size="small"
                    onClick={() => onNavigate('prev')}
                    disabled={!canNavigate.prev}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onNavigate('next')}
                    disabled={!canNavigate.next}
                  >
                    <ArrowForwardIcon />
                  </IconButton>
                  <Divider orientation="vertical" flexItem />
                </>
              )}
              <Typography variant="h6">Quick View</Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <IconButton size="small" onClick={handleOpenFull} title="Open full view">
                <OpenInNewIcon />
              </IconButton>
              <IconButton size="small" onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {ticket && !loading && (
            <Stack spacing={3}>
              {/* Status and Priority */}
              <Stack direction="row" spacing={1}>
                <StatusChip status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
              </Stack>

              {/* Description */}
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                {editMode ? (
                  <TextField
                    fullWidth
                    value={editedTicket.description || ''}
                    onChange={(e) => setEditedTicket({ ...editedTicket, description: e.target.value })}
                    multiline
                    rows={2}
                  />
                ) : (
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {ticket.description}
                  </Typography>
                )}
              </Box>

              {/* Details */}
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Details
                </Typography>
                {editMode ? (
                  <TextField
                    fullWidth
                    value={editedTicket.details || ''}
                    onChange={(e) => setEditedTicket({ ...editedTicket, details: e.target.value })}
                    multiline
                    rows={4}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {ticket.details || 'No details provided'}
                  </Typography>
                )}
              </Box>

              <Divider />

              {/* Quick Actions */}
              {editMode ? (
                <Stack spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={editedTicket.status || ''}
                      onChange={(e) => setEditedTicket({ ...editedTicket, status: e.target.value as any })}
                      label="Status"
                    >
                      {STATUS_OPTIONS.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={editedTicket.priority || ''}
                      onChange={(e) => setEditedTicket({ ...editedTicket, priority: e.target.value as any })}
                      label="Priority"
                    >
                      <MenuItem value="P1">P1</MenuItem>
                      <MenuItem value="P2">P2</MenuItem>
                      <MenuItem value="P3">P3</MenuItem>
                      <MenuItem value="P4">P4</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Assigned To</InputLabel>
                    <Select
                      value={editedTicket.assignedUserId || ''}
                      onChange={(e) => setEditedTicket({ ...editedTicket, assignedUserId: e.target.value || null })}
                      label="Assigned To"
                    >
                      <MenuItem value="">Unassigned</MenuItem>
                      {users.map(user => (
                        <MenuItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              ) : (
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Assigned To"
                      secondary={assignedUser ? (assignedUser.name || assignedUser.email) : 'Unassigned'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Type"
                      secondary={ticket.typeKey}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Created"
                      secondary={new Date(ticket.createdAt).toLocaleString()}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Updated"
                      secondary={new Date(ticket.updatedAt).toLocaleString()}
                    />
                  </ListItem>
                </List>
              )}
            </Stack>
          )}
        </Box>

        {/* Footer Actions */}
        {ticket && !loading && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            {editMode ? (
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  startIcon={<CancelIcon />}
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Stack>
            ) : (
              <Button
                fullWidth
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setEditMode(true)}
              >
                Edit Ticket
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Drawer>
  )
}
