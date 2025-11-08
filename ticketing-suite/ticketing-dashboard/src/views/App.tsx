import { Outlet, useNavigate, Link } from 'react-router-dom'
import React from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  TextField,
  Chip,
  Box,
  Container,
  Tooltip,
} from '@mui/material'
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  ConfirmationNumber as TicketIcon,
  Favorite as HealthIcon,
  Person as PersonIcon,
  People as PeopleIcon,
} from '@mui/icons-material'
import UserRegistration from '../components/UserRegistration'
import { useNotifications } from '../lib/notifications'
import { useThemeMode } from '../theme/ThemeProvider'

export default function App() {
  const navigate = useNavigate()
  const { showNotification } = useNotifications()
  const { mode, toggleTheme } = useThemeMode()
  const [token, setToken] = React.useState(localStorage.getItem('token') || '')
  const [user, setUser] = React.useState(localStorage.getItem('userId') || '')
  const [showUserReg, setShowUserReg] = React.useState(false)
  const [userRole, setUserRole] = React.useState<'ADMIN' | 'USER' | null>(null)
  
  const save = () => { 
    localStorage.setItem('token', token)
    localStorage.setItem('userId', user)
    showNotification('success', 'Settings saved')
    navigate(0) 
  }
  
  React.useEffect(() => {
    // Try to decode JWT to get user role
    const t = localStorage.getItem('token') || token
    if (t) {
      try {
        const payload = JSON.parse(atob(t.split('.')[1]))
        setUserRole(payload.role || null)
      } catch {}
    }
  }, [token])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', marginRight: 'auto' }}>
            <TicketIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="div" sx={{ color: 'text.primary', fontWeight: 700 }}>
              Ticketing Dashboard
            </Typography>
          </Link>
          
          <Chip 
            label={`API: ${import.meta.env.VITE_API_BASE || 'http://localhost:3000'}`} 
            size="small"
            variant="outlined"
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          />
          
          <Tooltip title="Health Dashboard">
            <Button
              component={Link}
              to="/health"
              startIcon={<HealthIcon />}
              size="small"
              sx={{ display: { xs: 'none', md: 'flex' } }}
              aria-label="Health dashboard"
            >
              Health
            </Button>
          </Tooltip>
          
          <Tooltip title="User Profile">
            <Button
              component={Link}
              to="/profile"
              startIcon={<PersonIcon />}
              size="small"
              sx={{ display: { xs: 'none', md: 'flex' } }}
              aria-label="User profile"
            >
              Profile
            </Button>
          </Tooltip>
          
          {userRole === 'ADMIN' && (
            <Tooltip title="Manage Users">
              <Button
                onClick={() => setShowUserReg(true)}
                startIcon={<PeopleIcon />}
                size="small"
                sx={{ display: { xs: 'none', md: 'flex' } }}
                aria-label="Manage users"
              >
                Users
              </Button>
            </Tooltip>
          )}
          
          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton onClick={toggleTheme} color="inherit" aria-label="Toggle theme">
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
        
        <Toolbar sx={{ flexWrap: 'wrap', gap: 1, py: 1 }}>
          <TextField
            size="small"
            placeholder="Bearer token"
            value={token}
            onChange={e => setToken(e.target.value)}
            sx={{ flex: { xs: '1 1 100%', sm: '1 1 250px' }, minWidth: 200 }}
            inputProps={{ 'aria-label': 'Bearer token' }}
          />
          <TextField
            size="small"
            placeholder="Your User ID"
            value={user}
            onChange={e => setUser(e.target.value)}
            sx={{ flex: { xs: '1 1 100%', sm: '0 1 150px' }, minWidth: 150 }}
            inputProps={{ 'aria-label': 'User ID' }}
          />
          <Button 
            variant="contained" 
            onClick={save}
            aria-label="Save settings"
          >
            Save
          </Button>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3 }}>
        <Outlet />
      </Container>
      
      <Box 
        component="footer" 
        sx={{ 
          py: 2, 
          px: 3, 
          mt: 'auto',
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          Tip: paste a JWT for staging/prod. Locally, your API may accept a dev token.
        </Typography>
      </Box>
      
      {showUserReg && (
        <UserRegistration
          onClose={() => setShowUserReg(false)}
          onSuccess={() => {
            setShowUserReg(false)
          }}
        />
      )}
    </Box>
  )
}
