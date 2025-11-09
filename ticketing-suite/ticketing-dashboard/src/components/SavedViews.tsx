import React, { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Typography,
  Divider,
  Stack
} from '@mui/material'
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  PushPin as PinIcon,
  MoreVert as MoreIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material'
import { useSavedViews, type SavedView } from '../hooks/useSavedViews'

interface SavedViewsProps {
  currentFilters: any
  onApplyView: (view: SavedView) => void
}

export default function SavedViews({ currentFilters, onApplyView }: SavedViewsProps) {
  const {
    views,
    pinnedViews,
    customViews,
    currentViewId,
    createView,
    deleteView,
    togglePin,
    setDefaultView,
    applyView
  } = useSavedViews()

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [viewName, setViewName] = useState('')
  const [viewDescription, setViewDescription] = useState('')
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)

  const handleSaveView = () => {
    if (!viewName.trim()) return

    createView({
      name: viewName,
      description: viewDescription,
      filters: currentFilters,
      isPinned: false
    })

    setViewName('')
    setViewDescription('')
    setSaveDialogOpen(false)
  }

  const handleApplyView = (viewId: string) => {
    const view = applyView(viewId)
    if (view) {
      onApplyView(view)
    }
  }

  const handleDeleteView = (viewId: string) => {
    if (window.confirm('Are you sure you want to delete this view?')) {
      deleteView(viewId)
    }
    setMenuAnchor(null)
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, viewId: string) => {
    setMenuAnchor(event.currentTarget)
    setSelectedViewId(viewId)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setSelectedViewId(null)
  }

  const handleTogglePin = () => {
    if (selectedViewId) {
      togglePin(selectedViewId)
    }
    handleMenuClose()
  }

  const handleSetDefault = () => {
    if (selectedViewId) {
      setDefaultView(selectedViewId)
    }
    handleMenuClose()
  }

  return (
    <>
      {/* Quick Access Buttons */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {pinnedViews.map(view => (
          <Chip
            key={view.id}
            label={view.name}
            onClick={() => handleApplyView(view.id)}
            color={currentViewId === view.id ? 'primary' : 'default'}
            variant={currentViewId === view.id ? 'filled' : 'outlined'}
            icon={view.isDefault ? <StarIcon /> : undefined}
            size="small"
          />
        ))}
        
        <Button
          size="small"
          startIcon={<SaveIcon />}
          onClick={() => setSaveDialogOpen(true)}
          variant="outlined"
        >
          Save View
        </Button>

        {customViews.length > 0 && (
          <Button
            size="small"
            onClick={() => setManageDialogOpen(true)}
            variant="text"
          >
            Manage Views ({customViews.length})
          </Button>
        )}
      </Box>

      {/* Save View Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Current View</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="View Name"
              fullWidth
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="e.g., My Open Tickets"
              required
            />
            <TextField
              label="Description (optional)"
              fullWidth
              multiline
              rows={2}
              value={viewDescription}
              onChange={(e) => setViewDescription(e.target.value)}
              placeholder="Describe what this view shows..."
            />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Current filters will be saved with this view
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveView} variant="contained" disabled={!viewName.trim()}>
            Save View
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Views Dialog */}
      <Dialog open={manageDialogOpen} onClose={() => setManageDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Manage Saved Views</DialogTitle>
        <DialogContent>
          <List>
            {views.map((view, index) => {
              const isDefault = view.id === selectedViewId
              const isBuiltIn = ['my-tickets', 'unassigned', 'high-priority', 'recently-updated'].includes(view.id)
              
              return (
                <React.Fragment key={view.id}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {view.name}
                          {view.isDefault && <StarIcon fontSize="small" color="primary" />}
                          {view.isPinned && <PinIcon fontSize="small" color="action" />}
                          {isBuiltIn && <Chip label="Built-in" size="small" />}
                        </Box>
                      }
                      secondary={view.description || 'No description'}
                    />
                    <ListItemSecondaryAction>
                      <Button
                        size="small"
                        onClick={() => handleApplyView(view.id)}
                        sx={{ mr: 1 }}
                      >
                        Apply
                      </Button>
                      <IconButton
                        edge="end"
                        onClick={(e) => handleMenuOpen(e, view.id)}
                      >
                        <MoreIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              )
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleTogglePin}>
          <PinIcon sx={{ mr: 1 }} fontSize="small" />
          {views.find(v => v.id === selectedViewId)?.isPinned ? 'Unpin' : 'Pin to Quick Access'}
        </MenuItem>
        <MenuItem onClick={handleSetDefault}>
          <StarIcon sx={{ mr: 1 }} fontSize="small" />
          Set as Default
        </MenuItem>
        {selectedViewId && !['my-tickets', 'unassigned', 'high-priority', 'recently-updated'].includes(selectedViewId) && (
          <>
            <Divider />
            <MenuItem onClick={() => selectedViewId && handleDeleteView(selectedViewId)} sx={{ color: 'error.main' }}>
              <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
              Delete View
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  )
}
