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
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNotifications } from '../lib/notifications'
import { useI18n } from '../lib/i18n'

export default function UserProfile() {
  const nav = useNavigate()
  const { showNotification } = useNotifications()
  const { language, setLanguage } = useI18n()
  const [user, setUser] = React.useState<{ name?: string; email?: string; role?: string } | null>(null)
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
      } catch {
        setUser({ email: 'Unknown', name: 'Unknown', role: 'USER' })
      }
    }
  }, [])

  const savePreferences = () => {
    localStorage.setItem('userPreferences', JSON.stringify(preferences))
    showNotification('success', 'Preferences saved')
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
          <Paper variant="outlined" sx={{ p: 3 }}>
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
        </CardContent>
      </Card>
    </Box>
  )
}
