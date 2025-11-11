import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import React from 'react'
import { AppBar, Toolbar, Typography, Button, Box, Container, Tooltip } from '@mui/material'
import {
  ConfirmationNumber as TicketIcon,
  Add as AddIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material'
import UserRegistration from '../components/UserRegistration'
import IssueTypeManagement from '../components/IssueTypeManagement'
import FieldDefinitionManagement from '../components/FieldDefinitionManagement'
import NotificationBell from '../components/NotificationBell'
import { useNotifications } from '../lib/notifications'

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showNotification } = useNotifications()
  const [showUserReg, setShowUserReg] = React.useState(false)
  const [showIssueTypes, setShowIssueTypes] = React.useState(false)
  const [showFieldDefs, setShowFieldDefs] = React.useState(false)
  const [userRole, setUserRole] = React.useState<'ADMIN' | 'USER' | null>(null)
  
  React.useEffect(() => {
    // Try to decode JWT to get user role
    const t = localStorage.getItem('token') || ''
    if (t) {
      try {
        const payload = JSON.parse(atob(t.split('.')[1]))
        setUserRole(payload.role || null)
      } catch {
        setUserRole(null)
      }
    } else {
      setUserRole(null)
    }
  }, [])

  const handleOpenCreateTicket = React.useCallback(() => {
    const open = () => window.dispatchEvent(new Event('open-create-ticket'))
    if (location.pathname !== '/') {
      navigate('/')
      setTimeout(open, 0)
    } else {
      open()
    }
  }, [location.pathname, navigate])

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
          
          <Tooltip title="Create Ticket">
            <Button
              onClick={handleOpenCreateTicket}
              startIcon={<AddIcon />}
              size="small"
              variant="contained"
              color="primary"
              sx={{ display: { xs: 'none', md: 'flex' } }}
              aria-label="Create ticket"
            >
              New Ticket
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
          
          <Tooltip title="Manage Sites">
            <Button
              component={Link}
              to="/sites"
              startIcon={<LocationIcon />}
              size="small"
              sx={{ display: { xs: 'none', md: 'flex' } }}
              aria-label="Manage sites"
            >
              Sites
            </Button>
          </Tooltip>

          <NotificationBell />
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
      
      {showIssueTypes && (
        <IssueTypeManagement
          onClose={() => setShowIssueTypes(false)}
          onSuccess={() => {
            showNotification('success', 'Issue types updated')
          }}
        />
      )}
      
      {showFieldDefs && (
        <FieldDefinitionManagement
          onClose={() => setShowFieldDefs(false)}
          onSuccess={() => {
            showNotification('success', 'Field definitions updated')
          }}
        />
      )}
    </Box>
  )
}
