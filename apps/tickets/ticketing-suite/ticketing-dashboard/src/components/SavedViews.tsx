import React, { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Divider
} from '@mui/material'
import {
  Delete as DeleteIcon,
  PushPin as PinIcon,
  MoreVert as MoreIcon,
  Star as StarIcon
} from '@mui/icons-material'
import { useSavedViews, type SavedView } from '../hooks/useSavedViews'

const BUILT_IN_VIEW_IDS = new Set(['my-tickets', 'unassigned', 'high-priority', 'recently-updated'])

interface SavedViewsProps {
  currentFilters?: any
  onApplyView: (view: SavedView) => void
}

export default function SavedViews({ onApplyView }: SavedViewsProps) {
  const {
    views,
    customViews,
    deleteView,
    togglePin,
    setDefaultView,
    applyView
  } = useSavedViews()

  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)

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
      {customViews.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            size="small"
            onClick={() => setManageDialogOpen(true)}
            variant="text"
          >
            Manage Views ({customViews.length})
          </Button>
        </Box>
      )}

      {/* Manage Views Dialog */}
      <Dialog open={manageDialogOpen} onClose={() => setManageDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Manage Saved Views</DialogTitle>
        <DialogContent>
          <List>
            {views.map((view, index) => {
              const isDefault = view.id === selectedViewId
              const isBuiltIn = BUILT_IN_VIEW_IDS.has(view.id)
              
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
