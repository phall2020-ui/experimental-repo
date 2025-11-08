import React from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

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
    <div className="container" style={{ maxWidth: 400, margin: '100px auto' }}>
      <div className="panel">
        <h1>🔐 Login</h1>
        <form onSubmit={handleLogin}>
          {error && <div style={{ color: '#ffb3b3', marginBottom: 12 }}>{error}</div>}
          <div style={{ marginBottom: 12 }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="user@example.com"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Enter password"
            />
          </div>
          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
