import React from 'react'
import { listSitesDetailed, createSite, updateSite, deleteSite, type Site } from '../lib/api'
import { useNotifications } from '../lib/notifications'
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material'

export default function SiteManagement() {
  const { showNotification } = useNotifications()
  const [sites, setSites] = React.useState<Site[]>([])
  const [loading, setLoading] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingSite, setEditingSite] = React.useState<Site | null>(null)
  const [formData, setFormData] = React.useState({ name: '', location: '' })
  const [error, setError] = React.useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [siteToDelete, setSiteToDelete] = React.useState<Site | null>(null)

  const fetchSites = async () => {
    setLoading(true)
    try {
      const data = await listSitesDetailed()
      setSites(data)
    } catch (e: any) {
      showNotification('error', e?.response?.data?.message || 'Failed to load sites')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchSites()
  }, [])

  const handleOpenDialog = (site?: Site) => {
    if (site) {
      setEditingSite(site)
      setFormData({ name: site.name, location: site.location || '' })
    } else {
      setEditingSite(null)
      setFormData({ name: '', location: '' })
    }
    setError('')
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingSite(null)
    setFormData({ name: '', location: '' })
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Site name is required')
      return
    }

    try {
      if (editingSite) {
        await updateSite(editingSite.id, {
          name: formData.name,
          location: formData.location || undefined,
        })
        showNotification('success', 'Site updated successfully')
      } else {
        await createSite({
          name: formData.name,
          location: formData.location || undefined,
        })
        showNotification('success', 'Site created successfully')
      }
      handleCloseDialog()
      fetchSites()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save site')
    }
  }

  const handleDeleteClick = (site: Site) => {
    setSiteToDelete(site)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!siteToDelete) return

    try {
      await deleteSite(siteToDelete.id)
      showNotification('success', 'Site deleted successfully')
      setDeleteConfirmOpen(false)
      setSiteToDelete(null)
      fetchSites()
    } catch (e: any) {
      showNotification('error', e?.response?.data?.message || 'Failed to delete site')
      setDeleteConfirmOpen(false)
      setSiteToDelete(null)
    }
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Site Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage locations and sites for your organization
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            aria-label="Add new site"
          >
            Add Site
          </Button>
        </Stack>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell align="right" sx={{ width: 120 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && sites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    Loading sites...
                  </TableCell>
                </TableRow>
              ) : sites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Box sx={{ py: 4 }}>
                      <LocationIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body1" color="text.secondary">
                        No sites found. Click "Add Site" to create one.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                sites.map((site) => (
                  <TableRow key={site.id} hover>
                    <TableCell>
                      <Typography variant="body1" fontWeight={500}>
                        {site.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {site.location || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(site)}
                        aria-label={`Edit site ${site.name}`}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(site)}
                        aria-label={`Delete site ${site.name}`}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editingSite ? 'Edit Site' : 'Add New Site'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && (
                <Alert severity="error" onClose={() => setError('')}>
                  {error}
                </Alert>
              )}
              <TextField
                autoFocus
                required
                fullWidth
                label="Site Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Office, Building A"
                inputProps={{ 'aria-label': 'Site name' }}
              />
              <TextField
                fullWidth
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., New York, NY"
                inputProps={{ 'aria-label': 'Site location' }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingSite ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Site</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the site "{siteToDelete?.name}"? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
