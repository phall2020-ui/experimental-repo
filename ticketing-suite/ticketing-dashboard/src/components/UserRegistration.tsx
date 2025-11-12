import React from 'react'
import {
  Box,
  Button,
  Alert,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Typography,
} from '@mui/material'
import { updateUser, deleteUser, resetUserPassword, type UserOpt } from '../lib/directory'
import { useUsers } from '../hooks/useDirectory'
import { Modal } from './common/Modal'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
const client = axios.create({ baseURL: API_BASE })
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || ''
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

interface UserRegistrationProps {
  onClose: () => void
  onSuccess?: () => void
}

export default function UserRegistration({ onClose, onSuccess }: UserRegistrationProps) {
  const { data: users = [], refetch: refetchUsers } = useUsers()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editData, setEditData] = React.useState<{ name: string; email: string; role: 'USER' | 'ADMIN' }>({ name: '', email: '', role: 'USER' })
  const [showPassword, setShowPassword] = React.useState(false)
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    name: '',
    role: 'USER' as 'USER' | 'ADMIN',
    tenantId: ''
  })

  React.useEffect(() => {
    // Try to get tenantId from JWT token (if available)
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.tenantId) {
          setFormData(prev => ({ ...prev, tenantId: payload.tenantId }))
        }
      } catch {}
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email || !formData.password || !formData.name) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await client.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        tenantId: formData.tenantId
      })
      onSuccess?.()
      refetchUsers()
      setFormData({ email: '', password: '', name: '', role: 'USER', tenantId: formData.tenantId })
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to register user')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: UserOpt) => {
    setEditingId(user.id)
    setEditData({ name: user.name, email: user.email, role: user.role })
  }

  const handleSaveEdit = async (userId: string) => {
    try {
      await updateUser(userId, editData)
      setEditingId(null)
      refetchUsers()
      onSuccess?.()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to update user')
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    try {
      await deleteUser(userId)
      refetchUsers()
      onSuccess?.()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to delete user')
    }
  }

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('Enter new password (minimum 6 characters):')
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    try {
      await resetUserPassword(userId, newPassword)
      alert('Password reset successfully')
      onSuccess?.()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to reset password')
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Register New User (Admin Only)"
      maxWidth="md"
      actions={
        <>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="user-registration-form"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register User'}
          </Button>
        </>
      }
    >
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" id="user-registration-form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              required
              type="email"
              size="small"
              label="Email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="user@example.com"
              inputProps={{ 'aria-label': 'Email' }}
            />

            <TextField
              fullWidth
              required
              type={showPassword ? 'text' : 'password'}
              size="small"
              label="Password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 6 characters"
              inputProps={{ minLength: 6, 'aria-label': 'Password' }}
              InputProps={{
                endAdornment: (
                  <Button
                    size="small"
                    onClick={() => setShowPassword(!showPassword)}
                    sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                )
              }}
            />

            <TextField
              fullWidth
              required
              size="small"
              label="Name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Full name"
              inputProps={{ 'aria-label': 'Name' }}
            />

            <FormControl fullWidth size="small" required>
              <InputLabel id="role-label">Role</InputLabel>
              <Select
                labelId="role-label"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as 'USER' | 'ADMIN' })}
                label="Role"
                aria-label="Role"
              >
                <MenuItem value="USER">USER</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
              </Select>
            </FormControl>

            {formData.tenantId && (
              <TextField
                fullWidth
                size="small"
                label="Tenant ID"
                value={formData.tenantId}
                onChange={e => setFormData({ ...formData, tenantId: e.target.value })}
                placeholder="Tenant ID (auto-filled from token)"
                inputProps={{ 'aria-label': 'Tenant ID' }}
              />
            )}
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box>
          <Typography variant="h6" gutterBottom>
            Existing Users
          </Typography>
          {users.length === 0 ? (
            <Typography color="text.secondary">No users found.</Typography>
          ) : (
            <table style={{ width: '100%', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Name</th>
                  <th style={{ textAlign: 'left' }}>Email</th>
                  <th style={{ textAlign: 'left' }}>Role</th>
                  <th style={{ textAlign: 'left' }}>Last Login</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      {editingId === u.id ? (
                        <input
                          type="text"
                          value={editData.name}
                          onChange={e => setEditData({ ...editData, name: e.target.value })}
                          style={{ width: '100%' }}
                        />
                      ) : (
                        u.name
                      )}
                    </td>
                    <td>
                      {editingId === u.id ? (
                        <input
                          type="email"
                          value={editData.email}
                          onChange={e => setEditData({ ...editData, email: e.target.value })}
                          style={{ width: '100%' }}
                        />
                      ) : (
                        u.email
                      )}
                    </td>
                    <td>
                      {editingId === u.id ? (
                        <select
                          value={editData.role}
                          onChange={e => setEditData({ ...editData, role: e.target.value as 'USER' | 'ADMIN' })}
                          style={{ width: '100%' }}
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      ) : (
                        <span className={`badge ${u.role === 'ADMIN' ? 'High' : 'Low'}`}>{u.role}</span>
                      )}
                    </td>
                    <td>
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {editingId === u.id ? (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button onClick={() => handleSaveEdit(u.id)} style={{ fontSize: 11 }}>Save</button>
                          <button onClick={() => setEditingId(null)} style={{ fontSize: 11 }}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button onClick={() => handleEdit(u)} style={{ fontSize: 11 }}>Edit</button>
                          <button onClick={() => handleResetPassword(u.id)} style={{ fontSize: 11 }}>Reset PW</button>
                          <button onClick={() => handleDelete(u.id)} style={{ fontSize: 11, background: '#5a1a1a', borderColor: '#7a2a2a' }}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Box>
      </Box>
    </Modal>
  )
}
