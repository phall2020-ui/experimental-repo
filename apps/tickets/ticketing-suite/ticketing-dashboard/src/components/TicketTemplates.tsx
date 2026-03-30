import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Box,
  Typography,
  TextField,
  Stack,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  Divider,
  Alert
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Star as StarIcon,
  Category as CategoryIcon
} from '@mui/icons-material'
import { useTicketTemplates, type TicketTemplate } from '../hooks/useTicketTemplates'

interface TicketTemplatesProps {
  open: boolean
  onClose: () => void
  onSelectTemplate: (template: TicketTemplate) => void
}

export default function TicketTemplates({ open, onClose, onSelectTemplate }: TicketTemplatesProps) {
  const {
    templates,
    categories,
    customTemplates,
    popularTemplates,
    deleteTemplate,
    incrementUsage
  } = useTicketTemplates()

  const [selectedTab, setSelectedTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const handleSelectTemplate = (template: TicketTemplate) => {
    incrementUsage(template.id)
    onSelectTemplate(template)
    onClose()
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, templateId: string) => {
    event.stopPropagation()
    setMenuAnchor(event.currentTarget)
    setSelectedTemplateId(templateId)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setSelectedTemplateId(null)
  }

  const handleDelete = () => {
    if (selectedTemplateId && window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(selectedTemplateId)
    }
    handleMenuClose()
  }

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (selectedTab === 0) return matchesSearch // All
    if (selectedTab === 1) return matchesSearch && popularTemplates.includes(t) // Popular
    if (selectedTab === 2) return matchesSearch && !t.isGlobal // Custom
    
    const category = categories[selectedTab - 3]
    return matchesSearch && t.category === category
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Ticket Templates</Typography>
          <Button startIcon={<AddIcon />} variant="outlined" size="small">
            Create Template
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={2}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)} variant="scrollable">
            <Tab label="All" />
            <Tab label={`Popular (${popularTemplates.length})`} icon={<StarIcon fontSize="small" />} iconPosition="start" />
            <Tab label={`Custom (${customTemplates.length})`} />
            {categories.map(cat => (
              <Tab key={cat} label={cat} icon={<CategoryIcon fontSize="small" />} iconPosition="start" />
            ))}
          </Tabs>

          {filteredTemplates.length === 0 ? (
            <Alert severity="info">
              No templates found. {searchQuery && 'Try a different search term.'}
            </Alert>
          ) : (
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {filteredTemplates.map((template, index) => (
                <React.Fragment key={template.id}>
                  {index > 0 && <Divider />}
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => handleSelectTemplate(template)}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {template.name}
                            {template.isGlobal && <Chip label="Built-in" size="small" />}
                            {template.usageCount && template.usageCount > 0 && (
                              <Chip label={`Used ${template.usageCount}x`} size="small" variant="outlined" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Stack spacing={0.5}>
                            <Typography variant="body2" color="text.secondary">
                              {template.description || 'No description'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              <Chip label={template.template.priority} size="small" />
                              <Chip label={template.template.status} size="small" />
                              {template.category && <Chip label={template.category} size="small" variant="outlined" />}
                            </Box>
                          </Stack>
                        }
                      />
                      {!template.isGlobal && (
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={(e) => handleMenuOpen(e, template.id)}
                          >
                            <MoreIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      )}
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete Template
        </MenuItem>
      </Menu>
    </Dialog>
  )
}
