import React from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
} from '@mui/material'
import { Login as LoginIcon } from '@mui/icons-material'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password })
      localStorage.setItem('token', res.data.token)
      nav('/')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
        },
      }}
    >
      <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: 5,
            width: '100%',
            maxWidth: 440,
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  boxShadow: '0 8px 16px rgba(102, 126, 234, 0.4)',
                }}
              >
                <LoginIcon sx={{ fontSize: 32, color: '#fff' }} />
              </Box>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: '#1A1A1A' }}>
                Welcome Back
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Sign in to access your ticketing dashboard
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleLogin}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="user@example.com"
                  autoComplete="email"
                  autoFocus
                  inputProps={{
                    'aria-label': 'Email address',
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  autoComplete="current-password"
                  inputProps={{
                    'aria-label': 'Password',
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{
                    mt: 2,
                    py: 1.5,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                    },
                  }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Stack>
            </form>
          </Stack>
        </Paper>
      </Container>
    </Box>
  )
}
