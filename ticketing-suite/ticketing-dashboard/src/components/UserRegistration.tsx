import React from 'react'
import { listUsers, updateUser, deleteUser, resetUserPassword, type UserOpt } from '../lib/directory'
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
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [users, setUsers] = React.useState<UserOpt[]>([])
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editData, setEditData] = React.useState<{ name: string; email: string; role: 'USER' | 'ADMIN' }>({ name: '', email: '', role: 'USER' })
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    name: '',
    role: 'USER' as 'USER' | 'ADMIN',
    tenantId: '' // This should come from the current user's tenant
  })

  React.useEffect(() => {
    loadUsers()
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

  const loadUsers = async () => {
    try {
      const data = await listUsers()
      setUsers(data)
    } catch (e) {
      console.error('Failed to load users', e)
    }
  }

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
      loadUsers()
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
      await loadUsers()
      onSuccess?.()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to update user')
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    try {
      await deleteUser(userId)
      await loadUsers()
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="panel" style={{ maxWidth: 600, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="h1">Register New User (Admin Only)</div>
          <button onClick={onClose}>✕</button>
        </div>

        {error && (
          <div style={{ color: '#ffb3b3', marginBottom: 12, padding: 8, background: '#2a1a1a', borderRadius: 4 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row" style={{ marginTop: 12 }}>
            <label style={{ width: 150 }}>Email *</label>
            <input
              type="email"
              style={{ flex: 1 }}
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="user@example.com"
            />
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <label style={{ width: 150 }}>Password *</label>
            <input
              type="password"
              style={{ flex: 1 }}
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="Minimum 6 characters"
              minLength={6}
            />
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <label style={{ width: 150 }}>Name *</label>
            <input
              style={{ flex: 1 }}
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Full name"
            />
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <label style={{ width: 150 }}>Role *</label>
            <select
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value as 'USER' | 'ADMIN' })}
              style={{ flex: 1 }}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>

          {formData.tenantId && (
            <div className="row" style={{ marginTop: 12 }}>
              <label style={{ width: 150 }}>Tenant ID</label>
              <input
                style={{ flex: 1 }}
                value={formData.tenantId}
                onChange={e => setFormData({ ...formData, tenantId: e.target.value })}
                placeholder="Tenant ID (auto-filled from token)"
              />
            </div>
          )}

          <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Registering...' : 'Register User'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #1c2532' }}>
          <div className="h2" style={{ marginBottom: 12 }}>Existing Users</div>
          {users.length === 0 ? (
            <div className="muted">No users found.</div>
          ) : (
            <table style={{ width: '100%', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Name</th>
                  <th style={{ textAlign: 'left' }}>Email</th>
                  <th style={{ textAlign: 'left' }}>Role</th>
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
                        <span className={`badge ${u.role === 'ADMIN' ? 'P1' : 'P3'}`}>{u.role}</span>
                      )}
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
        </div>
      </div>
    </div>
  )
}

