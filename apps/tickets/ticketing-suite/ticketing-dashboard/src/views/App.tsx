import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import React from 'react'
import { AppBar, Toolbar, Typography, Button, Box, Container, Tooltip, IconButton, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider } from '@mui/material'
import {
  ConfirmationNumber as TicketIcon,
  Add as AddIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  LocationOn as LocationIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
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
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  
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

  const handleLogout = React.useCallback(() => {
    localStorage.removeItem('token')
    navigate('/login')
  }, [navigate])

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen)

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ flexWrap: 'wrap', gap: 1, minHeight: { xs: 56, sm: 64 } }}>
          {/* Mobile menu button - visible only on small screens */}
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={toggleMobileMenu}
            sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }}
          >
            <MenuIcon />
          </IconButton>

          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', marginRight: 'auto' }}>
            <TicketIcon sx={{ mr: { xs: 0.5, sm: 1 }, color: 'primary.main' }} />
            <Typography variant="h6" component="div" sx={{ color: 'text.primary', fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Ticketing Dashboard
            </Typography>
          </Link>
          
          {/* Desktop navigation - hidden on mobile */}
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
          
          <Tooltip title="Logout">
            <Button
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              size="small"
              color="inherit"
              sx={{ display: { xs: 'none', md: 'flex' } }}
              aria-label="Logout"
            >
              Logout
            </Button>
          </Tooltip>

          {/* Mobile "New Ticket" FAB-style button - visible only on small screens */}
          <IconButton
            color="primary"
            aria-label="Create ticket"
            onClick={handleOpenCreateTicket}
            sx={{ 
              display: { xs: 'flex', md: 'none' },
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              width: 44,
              height: 44
            }}
          >
            <AddIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer Menu */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: 280,
          },
        }}
      >
        <Box sx={{ py: 2 }}>
          <Box sx={{ px: 2, pb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Menu
            </Typography>
          </Box>
          <Divider />
          <List>
            <ListItem disablePadding>
              <ListItemButton 
                onClick={() => {
                  handleOpenCreateTicket()
                  closeMobileMenu()
                }}
                sx={{ minHeight: 48 }}
              >
                <ListItemIcon>
                  <AddIcon />
                </ListItemIcon>
                <ListItemText primary="New Ticket" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton 
                component={Link} 
                to="/profile"
                onClick={closeMobileMenu}
                sx={{ minHeight: 48 }}
              >
                <ListItemIcon>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText primary="Profile" />
              </ListItemButton>
            </ListItem>
            {userRole === 'ADMIN' && (
              <ListItem disablePadding>
                <ListItemButton 
                  onClick={() => {
                    setShowUserReg(true)
                    closeMobileMenu()
                  }}
                  sx={{ minHeight: 48 }}
                >
                  <ListItemIcon>
                    <PeopleIcon />
                  </ListItemIcon>
                  <ListItemText primary="Manage Users" />
                </ListItemButton>
              </ListItem>
            )}
            <ListItem disablePadding>
              <ListItemButton 
                component={Link} 
                to="/sites"
                onClick={closeMobileMenu}
                sx={{ minHeight: 48 }}
              >
                <ListItemIcon>
                  <LocationIcon />
                </ListItemIcon>
                <ListItemText primary="Sites" />
              </ListItemButton>
            </ListItem>
          </List>
          <Divider />
          <List>
            <ListItem disablePadding>
              <ListItemButton 
                onClick={() => {
                  handleLogout()
                  closeMobileMenu()
                }}
                sx={{ minHeight: 48 }}
              >
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
      
      <Container maxWidth="xl" sx={{ flexGrow: 1, py: { xs: 2, sm: 3 }, px: { xs: 2, sm: 3 } }}>
        <Outlet />
      </Container>
      
      <Box 
        component="footer" 
        sx={{ 
          py: 2, 
          px: { xs: 2, sm: 3 }, 
          mt: 'auto',
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
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
