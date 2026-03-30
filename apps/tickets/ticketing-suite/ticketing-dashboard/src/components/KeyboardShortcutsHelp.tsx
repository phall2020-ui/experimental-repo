import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Chip,
  Grid,
  IconButton,
  Divider,
  Stack
} from '@mui/material'
import { Close as CloseIcon, Keyboard as KeyboardIcon } from '@mui/icons-material'
import { KeyboardShortcut, SHORTCUT_CATEGORIES } from '../hooks/useKeyboardShortcuts'

interface KeyboardShortcutsHelpProps {
  open: boolean
  onClose: () => void
  shortcuts: KeyboardShortcut[]
}

const KeyDisplay: React.FC<{ keys: string[] }> = ({ keys }) => (
  <Stack direction="row" spacing={0.5} alignItems="center">
    {keys.map((key, index) => (
      <React.Fragment key={index}>
        {index > 0 && <Typography variant="body2" sx={{ mx: 0.5 }}>+</Typography>}
        <Chip
          label={key}
          size="small"
          sx={{
            fontFamily: 'monospace',
            fontWeight: 600,
            minWidth: 32,
            height: 24,
            '& .MuiChip-label': {
              px: 1
            }
          }}
        />
      </React.Fragment>
    ))}
  </Stack>
)

export default function KeyboardShortcutsHelp({ open, onClose, shortcuts }: KeyboardShortcutsHelpProps) {
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || SHORTCUT_CATEGORIES.GENERAL
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  const formatKeys = (shortcut: KeyboardShortcut): string[] => {
    const keys: string[] = []
    if (shortcut.ctrl) keys.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
    if (shortcut.shift) keys.push('Shift')
    if (shortcut.alt) keys.push('Alt')
    keys.push(shortcut.key.toUpperCase())
    return keys
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <KeyboardIcon />
            <Typography variant="h6">Keyboard Shortcuts</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <Box key={category}>
              <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 600 }}>
                {category}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {categoryShortcuts.map((shortcut, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Typography variant="body2">{shortcut.description}</Typography>
                      <KeyDisplay keys={formatKeys(shortcut)} />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Stack>
        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.main', color: 'info.contrastText', borderRadius: 1 }}>
          <Typography variant="body2">
            <strong>Tip:</strong> Press <Chip label="?" size="small" sx={{ mx: 0.5 }} /> anytime to view this help dialog
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
