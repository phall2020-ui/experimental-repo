import React from 'react'
import { listIssueTypes, createIssueType, updateIssueType, deleteIssueType, type IssueTypeOpt } from '../lib/directory'

interface IssueTypeManagementProps {
  onClose: () => void
  onSuccess?: () => void
}

interface IssueTypeWithId extends IssueTypeOpt {
  id?: string
}

export default function IssueTypeManagement({ onClose, onSuccess }: IssueTypeManagementProps) {
  const [types, setTypes] = React.useState<IssueTypeWithId[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [showCreate, setShowCreate] = React.useState(false)
  const [formData, setFormData] = React.useState({ key: '', label: '' })

  React.useEffect(() => {
    loadTypes()
  }, [])

  const loadTypes = async () => {
    setLoading(true)
    try {
      const data = await listIssueTypes()
      setTypes(data.map((t, idx) => ({ ...t, id: t.key })))
      setError(null)
    } catch (e: any) {
      setError(e?.message || 'Failed to load issue types')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.key || !formData.label) {
      setError('Key and label are required')
      return
    }

    try {
      await createIssueType({ key: formData.key, label: formData.label })
      setFormData({ key: '', label: '' })
      setShowCreate(false)
      await loadTypes()
      onSuccess?.()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create issue type')
    }
  }

  const handleUpdate = async (id: string, data: { label: string }) => {
    try {
      await updateIssueType(id, data)
      setEditingId(null)
      await loadTypes()
      onSuccess?.()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to update issue type')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this issue type?')) return

    try {
      await deleteIssueType(id)
      await loadTypes()
      onSuccess?.()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to delete issue type')
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
      <div className="panel" style={{ maxWidth: 700, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="h1">Issue Type Management (Admin Only)</div>
          <button onClick={onClose}>✕</button>
        </div>

        {error && (
          <div style={{ color: '#ffb3b3', marginBottom: 12, padding: 8, background: '#2a1a1a', borderRadius: 4 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <button
            className="primary"
            onClick={() => setShowCreate(!showCreate)}
            style={{ marginBottom: 12 }}
          >
            {showCreate ? 'Cancel' : '+ Create New Issue Type'}
          </button>

          {showCreate && (
            <form onSubmit={handleCreate} style={{ marginBottom: 16, padding: 12, background: '#0e141c', borderRadius: 8 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Key (unique identifier)</label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={e => setFormData({ ...formData, key: e.target.value })}
                  placeholder="e.g., BUG, FEATURE, TASK"
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Label (display name)</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={e => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Bug Report, Feature Request"
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <button type="submit" className="primary">Create Issue Type</button>
            </form>
          )}
        </div>

        {loading ? (
          <div className="muted">Loading issue types...</div>
        ) : types.length === 0 ? (
          <div className="muted">No issue types found.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {types.map(type => (
              <div
                key={type.key}
                style={{
                  padding: 12,
                  background: '#0e141c',
                  borderRadius: 8,
                  border: '1px solid #1c2532'
                }}
              >
                {editingId === type.key ? (
                  <div>
                    <input
                      type="text"
                      defaultValue={type.label}
                      onBlur={(e) => {
                        if (e.target.value !== type.label) {
                          handleUpdate(type.key, { label: e.target.value })
                        } else {
                          setEditingId(null)
                        }
                      }}
                      style={{ width: '100%', marginBottom: 8 }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{type.label}</div>
                      <div className="muted" style={{ fontSize: 12 }}>Key: {type.key}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setEditingId(type.key)}
                        style={{ fontSize: 11, padding: '4px 8px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(type.key)}
                        style={{ fontSize: 11, padding: '4px 8px', background: '#5a1a1a', borderColor: '#7a2a2a' }}
                      >
                        Deactivate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
