import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  Paper,
  FormControlLabel,
  Checkbox,
  FormGroup,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNotifications } from '../lib/notifications'
import { useI18n } from '../lib/i18n'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const client = axios.create({ baseURL: API_BASE })
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || ''
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default function UserProfile() {
  const nav = useNavigate()
  const { showNotification } = useNotifications()
  const { language, setLanguage } = useI18n()
  const [user, setUser] = React.useState<{ name?: string; email?: string; role?: string } | null>(null)
  const [emailNotifications, setEmailNotifications] = React.useState({
    ticketCreated: true,
    ticketUpdated: true,
    ticketAssigned: true,
    ticketCommented: true,
    ticketResolved: true,
  })
  const [preferences, setPreferences] = React.useState(() => {
    const saved = localStorage.getItem('userPreferences')
    return saved ? JSON.parse(saved) : {
      theme: 'dark',
      language: 'en',
      defaultFilters: {},
      notifications: true
    }
  })

  React.useEffect(() => {
    // Try to decode user info from JWT
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({
          email: payload.email || 'Unknown',
          name: payload.name || 'Unknown',
          role: payload.role || 'USER'
        })
        
        // Fetch email notification preferences
        fetchEmailNotifications()
      } catch {
        setUser({ email: 'Unknown', name: 'Unknown', role: 'USER' })
      }
    }
  }, [])

  const fetchEmailNotifications = async () => {
    try {
      const response = await client.get('/users/profile')
      if (response.data?.emailNotifications) {
        setEmailNotifications(response.data.emailNotifications)
      }
    } catch (error) {
      console.error('Failed to fetch email notifications:', error)
    }
  }

  const savePreferences = () => {
    localStorage.setItem('userPreferences', JSON.stringify(preferences))
    showNotification('success', 'Preferences saved')
  }

  const saveEmailNotifications = async () => {
    try {
      await client.patch('/users/profile/email-notifications', { emailNotifications })
      showNotification('success', 'Email notification preferences saved')
    } catch (error: any) {
      showNotification('error', error?.response?.data?.message || 'Failed to save email preferences')
    }
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" component="h1">
              User Profile & Settings
            </Typography>
            <Button
              onClick={() => nav(-1)}
              startIcon={<ArrowBackIcon />}
              variant="outlined"
            >
              Back
            </Button>
          </Box>

          {/* User Info */}
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              User Information
            </Typography>
            <Stack spacing={2}>
              <Box display="flex">
                <Typography sx={{ width: 150, color: 'text.secondary' }}>Name:</Typography>
                <Typography>{user?.name || 'Not available'}</Typography>
              </Box>
              <Box display="flex">
                <Typography sx={{ width: 150, color: 'text.secondary' }}>Email:</Typography>
                <Typography>{user?.email || 'Not available'}</Typography>
              </Box>
              <Box display="flex">
                <Typography sx={{ width: 150, color: 'text.secondary' }}>Role:</Typography>
                <Typography>{user?.role || 'USER'}</Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Preferences */}
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Preferences
            </Typography>
            
            <Stack spacing={3} sx={{ mt: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="theme-label">Theme</InputLabel>
                <Select
                  labelId="theme-label"
                  value={preferences.theme}
                  onChange={e => setPreferences({ ...preferences, theme: e.target.value })}
                  label="Theme"
                >
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="auto">Auto (System)</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel id="language-label">Language</InputLabel>
                <Select
                  labelId="language-label"
                  value={language}
                  onChange={e => {
                    const lang = e.target.value as 'en' | 'es' | 'fr' | 'de'
                    setLanguage(lang)
                    setPreferences({ ...preferences, language: lang })
                  }}
                  label="Language"
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Español</MenuItem>
                  <MenuItem value="fr">Français</MenuItem>
                  <MenuItem value="de">Deutsch</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                onClick={savePreferences}
                sx={{ alignSelf: 'flex-start' }}
              >
                Save Preferences
              </Button>
            </Stack>
          </Paper>

          {/* Email Notifications */}
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Email Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose which notifications you want to receive via email
            </Typography>
            
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={emailNotifications.ticketCreated}
                    onChange={e => setEmailNotifications({ ...emailNotifications, ticketCreated: e.target.checked })}
                  />
                }
                label="Ticket Created"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={emailNotifications.ticketUpdated}
                    onChange={e => setEmailNotifications({ ...emailNotifications, ticketUpdated: e.target.checked })}
                  />
                }
                label="Ticket Updated"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={emailNotifications.ticketAssigned}
                    onChange={e => setEmailNotifications({ ...emailNotifications, ticketAssigned: e.target.checked })}
                  />
                }
                label="Ticket Assigned to Me"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={emailNotifications.ticketCommented}
                    onChange={e => setEmailNotifications({ ...emailNotifications, ticketCommented: e.target.checked })}
                  />
                }
                label="New Comment on Ticket"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={emailNotifications.ticketResolved}
                    onChange={e => setEmailNotifications({ ...emailNotifications, ticketResolved: e.target.checked })}
                  />
                }
                label="Ticket Resolved"
              />
            </FormGroup>

            <Button
              variant="contained"
              onClick={saveEmailNotifications}
              sx={{ mt: 2 }}
            >
              Save Email Preferences
            </Button>
          </Paper>
        </CardContent>
      </Card>
    </Box>
  )
}
