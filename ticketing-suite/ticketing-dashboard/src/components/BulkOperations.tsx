import React, { useState } from 'react'
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Stack,
  Alert,
  CircularProgress
} from '@mui/material'
import {
  CheckBox as CheckBoxIcon,
  MoreVert as MoreIcon,
  Close as CloseIcon,
  Done as DoneIcon
} from '@mui/icons-material'
import { Ticket } from '../lib/api'

interface BulkOperationsProps {
  selectedTickets: Ticket[]
  onClearSelection: () => void
  onBulkUpdate: (updates: any) => Promise<void>
  users: any[]
}

export default function BulkOperations({
  selectedTickets,
  onClearSelection,
  onBulkUpdate,
  users
}: BulkOperationsProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'status' | 'priority' | 'assign' | null>(null)
  const [selectedValue, setSelectedValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleOpenDialog = (type: 'status' | 'priority' | 'assign') => {
    setDialogType(type)
    setSelectedValue('')
    setError(null)
    setDialogOpen(true)
    handleMenuClose()
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setDialogType(null)
    setSelectedValue('')
    setError(null)
  }

  const handleApplyBulkUpdate = async () => {
    if (!selectedValue || !dialogType) return

    setLoading(true)
    setError(null)

    try {
      const updates: any = {}
      
      switch (dialogType) {
        case 'status':
          updates.status = selectedValue
          break
        case 'priority':
          updates.priority = selectedValue
          break
        case 'assign':
          updates.assignedUserId = selectedValue === 'unassign' ? null : selectedValue
          break
      }

      await onBulkUpdate(updates)
      handleCloseDialog()
      onClearSelection()
    } catch (err: any) {
      setError(err?.message || 'Failed to update tickets')
    } finally {
      setLoading(false)
    }
  }

  if (selectedTickets.length === 0) return null

  const getDialogTitle = () => {
    switch (dialogType) {
      case 'status':
        return 'Change Status'
      case 'priority':
        return 'Change Priority'
      case 'assign':
        return 'Assign Tickets'
      default:
        return ''
    }
  }

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          px: 3,
          py: 2,
          borderRadius: 2,
          boxShadow: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          zIndex: 1300,
          minWidth: 400
        }}
      >
        <CheckBoxIcon />
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {selectedTickets.length} ticket{selectedTickets.length !== 1 ? 's' : ''} selected
        </Typography>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Button
          variant="contained"
          color="inherit"
          size="small"
          onClick={handleMenuOpen}
          endIcon={<MoreIcon />}
          sx={{ color: 'primary.main' }}
        >
          Actions
        </Button>
        
        <Button
          variant="text"
          size="small"
          onClick={onClearSelection}
          sx={{ color: 'primary.contrastText', minWidth: 'auto' }}
        >
          <CloseIcon />
        </Button>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleOpenDialog('status')}>
          Change Status
        </MenuItem>
        <MenuItem onClick={() => handleOpenDialog('priority')}>
          Change Priority
        </MenuItem>
        <MenuItem onClick={() => handleOpenDialog('assign')}>
          Assign to User
        </MenuItem>
      </Menu>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{getDialogTitle()}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Alert severity="info">
              This will update {selectedTickets.length} ticket{selectedTickets.length !== 1 ? 's' : ''}
            </Alert>

            <FormControl fullWidth>
              <InputLabel>
                {dialogType === 'status' && 'New Status'}
                {dialogType === 'priority' && 'New Priority'}
                {dialogType === 'assign' && 'Assign To'}
              </InputLabel>
              <Select
                value={selectedValue}
                onChange={(e) => setSelectedValue(e.target.value)}
                label={
                  dialogType === 'status' ? 'New Status' :
                  dialogType === 'priority' ? 'New Priority' :
                  'Assign To'
                }
              >
                {dialogType === 'status' && (
                  <>
                    <MenuItem value="NEW">NEW</MenuItem>
                    <MenuItem value="TRIAGE">TRIAGE</MenuItem>
                    <MenuItem value="IN_PROGRESS">IN_PROGRESS</MenuItem>
                    <MenuItem value="PENDING">PENDING</MenuItem>
                    <MenuItem value="RESOLVED">RESOLVED</MenuItem>
                    <MenuItem value="CLOSED">CLOSED</MenuItem>
                  </>
                )}
                
                {dialogType === 'priority' && (
                  <>
                    <MenuItem value="P1">P1 - Critical</MenuItem>
                    <MenuItem value="P2">P2 - High</MenuItem>
                    <MenuItem value="P3">P3 - Medium</MenuItem>
                    <MenuItem value="P4">P4 - Low</MenuItem>
                  </>
                )}
                
                {dialogType === 'assign' && (
                  <>
                    <MenuItem value="unassign">Unassign</MenuItem>
                    {users.map(user => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </MenuItem>
                    ))}
                  </>
                )}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleApplyBulkUpdate}
            variant="contained"
            disabled={!selectedValue || loading}
            startIcon={loading ? <CircularProgress size={16} /> : <DoneIcon />}
          >
            {loading ? 'Updating...' : 'Apply to All'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
