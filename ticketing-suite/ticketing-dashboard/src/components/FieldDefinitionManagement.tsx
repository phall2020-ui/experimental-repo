import React from 'react'
import { listFieldDefinitions, createFieldDefinition, updateFieldDefinition, deleteFieldDefinition, type FieldDefOpt } from '../lib/directory'

interface FieldDefinitionManagementProps {
  onClose: () => void
  onSuccess?: () => void
}

interface FieldDefWithId extends FieldDefOpt {
  id?: string
}

export default function FieldDefinitionManagement({ onClose, onSuccess }: FieldDefinitionManagementProps) {
  const [fields, setFields] = React.useState<FieldDefWithId[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [showCreate, setShowCreate] = React.useState(false)
  const [formData, setFormData] = React.useState({
    key: '',
    label: '',
    datatype: 'string' as 'string' | 'number' | 'boolean' | 'date' | 'enum',
    required: false,
    enumOptions: '',
    isIndexed: false
  })

  React.useEffect(() => {
    loadFields()
  }, [])

  const loadFields = async () => {
    setLoading(true)
    try {
      const data = await listFieldDefinitions()
      setFields(data.map((f, idx) => ({ ...f, id: f.key })))
      setError(null)
    } catch (e: any) {
      setError(e?.message || 'Failed to load field definitions')
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
      const enumOptions = formData.datatype === 'enum' && formData.enumOptions
        ? formData.enumOptions.split(',').map(s => s.trim()).filter(Boolean)
        : undefined

      await createFieldDefinition({
        key: formData.key,
        label: formData.label,
        datatype: formData.datatype,
        required: formData.required,
        enumOptions,
        isIndexed: formData.isIndexed
      })
      
      setFormData({
        key: '',
        label: '',
        datatype: 'string',
        required: false,
        enumOptions: '',
        isIndexed: false
      })
      setShowCreate(false)
      await loadFields()
      onSuccess?.()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create field definition')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this field definition? This cannot be undone.')) return

    try {
      await deleteFieldDefinition(id)
      await loadFields()
      onSuccess?.()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to delete field definition')
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
      <div className="panel" style={{ maxWidth: 800, width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="h1">Custom Field Definitions (Admin Only)</div>
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
            {showCreate ? 'Cancel' : '+ Create New Field Definition'}
          </button>

          {showCreate && (
            <form onSubmit={handleCreate} style={{ marginBottom: 16, padding: 16, background: '#0e141c', borderRadius: 8 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Key (unique identifier)</label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={e => setFormData({ ...formData, key: e.target.value })}
                    placeholder="e.g., priority_level, department"
                    style={{ width: '100%' }}
                    required
                  />
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                    Use lowercase letters, numbers, and underscores only
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Label (display name)</label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={e => setFormData({ ...formData, label: e.target.value })}
                    placeholder="e.g., Priority Level, Department"
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Data Type</label>
                  <select
                    value={formData.datatype}
                    onChange={e => setFormData({ ...formData, datatype: e.target.value as any })}
                    style={{ width: '100%' }}
                  >
                    <option value="string">String (text)</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean (true/false)</option>
                    <option value="date">Date</option>
                    <option value="enum">Enum (dropdown)</option>
                  </select>
                </div>

                {formData.datatype === 'enum' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Enum Options (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.enumOptions}
                      onChange={e => setFormData({ ...formData, enumOptions: e.target.value })}
                      placeholder="e.g., Low, Medium, High, Critical"
                      style={{ width: '100%' }}
                      required={formData.datatype === 'enum'}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.required}
                      onChange={e => setFormData({ ...formData, required: e.target.checked })}
                    />
                    <span>Required field</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.isIndexed}
                      onChange={e => setFormData({ ...formData, isIndexed: e.target.checked })}
                    />
                    <span>Indexed (for faster searches)</span>
                  </label>
                </div>
              </div>

              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                <button type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="primary">Create Field</button>
              </div>
            </form>
          )}
        </div>

        {loading ? (
          <div className="muted">Loading field definitions...</div>
        ) : fields.length === 0 ? (
          <div className="muted">No custom field definitions found.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {fields.map(field => (
              <div
                key={field.key}
                style={{
                  padding: 12,
                  background: '#0e141c',
                  borderRadius: 8,
                  border: '1px solid #1c2532'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{field.label}</div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
                      Key: {field.key} • Type: {field.datatype}
                      {field.required && ' • Required'}
                      {field.isIndexed && ' • Indexed'}
                    </div>
                    {field.datatype === 'enum' && field.enumOptions && (
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        <span className="muted">Options: </span>
                        {field.enumOptions.map((opt, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              marginRight: 4,
                              background: '#1c2532',
                              borderRadius: 4,
                              fontSize: 11
                            }}
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(field.key)}
                    style={{ fontSize: 11, padding: '4px 8px', background: '#5a1a1a', borderColor: '#7a2a2a' }}
                  >
                    Delete
                  </button>
                </div>
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
