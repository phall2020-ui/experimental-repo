import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      aria-labelledby="modal-title"
    >
      <DialogTitle id="modal-title" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box component="span">{title}</Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ marginLeft: 'auto' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {children}
      </DialogContent>
      {actions && (
        <DialogActions>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  )
}
