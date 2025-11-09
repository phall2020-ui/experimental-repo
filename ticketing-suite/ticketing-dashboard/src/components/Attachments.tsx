import React from 'react'
import { presignAttachment, finalizeAttachment, listAttachments, deleteAttachment, type Attachment, type PresignResponse } from '../lib/api'

interface AttachmentsProps {
  ticketId: string
}

interface FileUpload {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  attachmentId?: string
}

export default function Attachments({ ticketId }: AttachmentsProps) {
  const [uploads, setUploads] = React.useState<FileUpload[]>([])
  const [attachments, setAttachments] = React.useState<Attachment[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [deleting, setDeleting] = React.useState<string | null>(null)

  // Load existing attachments
  React.useEffect(() => {
    loadAttachments()
  }, [ticketId])

  const loadAttachments = async () => {
    setLoading(true)
    try {
      const data = await listAttachments(ticketId)
      setAttachments(data)
      setError(null)
    } catch (e: any) {
      console.error('Failed to load attachments:', e)
      setError(e?.message || 'Failed to load attachments')
    } finally {
      setLoading(false)
    }
  }

  const calculateChecksum = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const uploadFile = async (file: File) => {
    const upload: FileUpload = { file, progress: 0, status: 'pending' }
    setUploads(prev => [...prev, upload])

    try {
      // Step 1: Get presigned URL
      setUploads(prev => prev.map(u => 
        u.file === file ? { ...u, status: 'uploading', progress: 10 } : u
      ))

      const presign = await presignAttachment(ticketId, file.name, file.type)
      
      // Step 2: Upload to S3
      const formData = new FormData()
      Object.entries(presign.fields).forEach(([key, value]) => {
        formData.append(key, value)
      })
      formData.append('file', file)

      const xhr = new XMLHttpRequest()
      
      return new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = 10 + (e.loaded / e.total) * 70 // 10-80%
            setUploads(prev => prev.map(u => 
              u.file === file ? { ...u, progress } : u
            ))
          }
        })

        xhr.addEventListener('load', async () => {
          if (xhr.status === 204 || xhr.status === 200) {
            try {
              // Step 3: Finalize
              setUploads(prev => prev.map(u => 
                u.file === file ? { ...u, progress: 90 } : u
              ))

              const checksum = await calculateChecksum(file)
              await finalizeAttachment(ticketId, presign.attachmentId, file.size, checksum)

              setUploads(prev => prev.map(u => 
                u.file === file ? { ...u, status: 'success', progress: 100 } : u
              ))
              
              // Reload attachments list
              await loadAttachments()
              resolve()
            } catch (e: any) {
              setUploads(prev => prev.map(u => 
                u.file === file ? { 
                  ...u, 
                  status: 'error', 
                  error: e?.message || 'Failed to finalize upload' 
                } : u
              ))
              reject(e)
            }
          } else {
            setUploads(prev => prev.map(u => 
              u.file === file ? { 
                ...u, 
                status: 'error', 
                error: `Upload failed: ${xhr.statusText}` 
              } : u
            ))
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        })

        xhr.addEventListener('error', () => {
          setUploads(prev => prev.map(u => 
            u.file === file ? { 
              ...u, 
              status: 'error', 
              error: 'Network error during upload' 
            } : u
          ))
          reject(new Error('Network error'))
        })

        xhr.open('POST', presign.url)
        xhr.send(formData)
      })
    } catch (e: any) {
      setUploads(prev => prev.map(u => 
        u.file === file ? { 
          ...u, 
          status: 'error', 
          error: e?.message || 'Failed to start upload' 
        } : u
      ))
      setError(e?.message || 'Failed to upload file')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => uploadFile(file))
    e.target.value = '' // Reset input
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return

    setDeleting(attachmentId)
    try {
      await deleteAttachment(ticketId, attachmentId)
      await loadAttachments()
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to delete attachment')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Attachments</div>
      
      {error && (
        <div style={{ color: '#ffb3b3', marginBottom: 12, padding: 8, background: '#2a1a1a', borderRadius: 4 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          <input
            type="file"
            onChange={handleFileSelect}
            multiple
            style={{ display: 'none' }}
            id="file-upload"
          />
          <button
            type="button"
            className="primary"
            onClick={() => document.getElementById('file-upload')?.click()}
            style={{ cursor: 'pointer' }}
          >
            📎 Upload Files
          </button>
        </label>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          Select one or more files to upload
        </div>
      </div>

      {/* Existing attachments */}
      {loading && attachments.length === 0 && (
        <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Loading attachments...
        </div>
      )}

      {attachments.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
            Existing Files ({attachments.length})
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {attachments.map((att) => (
              <div
                key={att.id}
                style={{
                  padding: 12,
                  background: '#0e141c',
                  borderRadius: 8,
                  border: '1px solid #1c2532',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{att.filename}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {formatFileSize(att.sizeBytes)} • {new Date(att.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href={att.downloadUrl}
                    download={att.filename}
                    style={{
                      padding: '6px 12px',
                      background: '#5b9cff',
                      color: '#fff',
                      borderRadius: 4,
                      textDecoration: 'none',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    ⬇ Download
                  </a>
                  <button
                    onClick={() => handleDelete(att.id)}
                    disabled={deleting === att.id}
                    style={{
                      padding: '6px 12px',
                      background: '#5a1a1a',
                      borderColor: '#7a2a2a',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                    title="Delete attachment"
                  >
                    {deleting === att.id ? 'Deleting...' : '🗑 Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
            Uploads in Progress
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {uploads.map((upload, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  background: '#0e141c',
                  borderRadius: 8,
                  border: '1px solid #1c2532'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{upload.file.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {formatFileSize(upload.file.size)}
                    </div>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    {upload.status === 'uploading' && (
                      <span className="muted">Uploading... {Math.round(upload.progress)}%</span>
                    )}
                    {upload.status === 'success' && (
                      <span style={{ color: '#2ecc71' }}>✓ Uploaded</span>
                    )}
                    {upload.status === 'error' && (
                      <span style={{ color: '#e74c3c' }}>✗ Error</span>
                    )}
                    {upload.status === 'pending' && (
                      <span className="muted">Pending...</span>
                    )}
                  </div>
                </div>
                
                {upload.status === 'uploading' && (
                  <div style={{
                    width: '100%',
                    height: 4,
                    background: '#1c2532',
                    borderRadius: 2,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${upload.progress}%`,
                      height: '100%',
                      background: '#5b9cff',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                )}
                
                {upload.error && (
                  <div style={{ color: '#ffb3b3', fontSize: 12, marginTop: 4 }}>
                    {upload.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && attachments.length === 0 && uploads.length === 0 && (
        <div className="muted" style={{ fontSize: 13 }}>
          No attachments yet. Click "Upload Files" to add attachments.
        </div>
      )}
    </div>
  )
}

